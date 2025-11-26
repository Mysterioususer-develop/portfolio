const path = require('path');
const fs = require('fs/promises');
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hello';

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CONTENT_PATH = path.join(DATA_DIR, 'content.json');
const CLIENTS_PATH = path.join(ROOT, 'clients.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const tokens = new Map(); // token -> expiresAt

app.use(express.json({ limit: '2mb' }));
app.use('/admin', express.static(__dirname));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(ROOT));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    const name = crypto.randomBytes(8).toString('hex');
    cb(null, `${name}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file || !file.mimetype) return cb(new Error('Invalid file'));
    if (/image\/(png|jpe?g)/i.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only PNG and JPG are allowed'));
  }
});

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function cleanTokens() {
  const now = Date.now();
  for (const [tok, expires] of tokens.entries()) {
    if (expires < now) tokens.delete(tok);
  }
}

function createToken() {
  const token = crypto.randomBytes(20).toString('hex');
  tokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

function requireAuth(req, res, next) {
  cleanTokens();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token && tokens.has(token) && tokens.get(token) > Date.now()) {
    tokens.set(token, Date.now() + TOKEN_TTL_MS);
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

async function readJson(file, fallback) {
  try {
    const txt = await fs.readFile(file, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    if (err.code === 'ENOENT' && typeof fallback !== 'undefined') return fallback;
    throw err;
  }
}

async function writeJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: ROOT }, (err, stdout, stderr) => {
      if (err) return reject({ err, stderr: (stderr || err.message || '').trim() });
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

app.post('/api/login', async (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = createToken();
  return res.json({ token, expiresIn: TOKEN_TTL_MS });
});

app.get('/api/content', async (req, res) => {
  try {
    await ensureDirs();
    const content = await readJson(CONTENT_PATH, { work: [], clients: [], reviews: [], home: {}, about: { sections: [] } });
    if (!Array.isArray(content.clients) || content.clients.length === 0) {
      const fallbackClients = await readJson(CLIENTS_PATH, []);
      if (Array.isArray(fallbackClients)) content.clients = fallbackClients;
    }
    return res.json({ content, clients: content.clients || [] });
  } catch (err) {
    console.error('Failed to read content', err);
    return res.status(500).json({ error: 'Failed to load content' });
  }
});

app.post('/api/save', requireAuth, async (req, res) => {
  try {
    await ensureDirs();
    const payload = req.body || {};
    const content = payload.content || {};
    const clients = payload.clients || content.clients || [];

    // Basic validation
    content.work = Array.isArray(content.work) ? content.work : [];
    content.clients = Array.isArray(content.clients) ? content.clients : clients;
    content.reviews = Array.isArray(content.reviews) ? content.reviews : [];
    if (!content.home) content.home = {};
    if (!content.about) content.about = { sections: [] };
    if (!Array.isArray(content.about.sections)) content.about.sections = [];

    await writeJson(CONTENT_PATH, content);
    await writeJson(CLIENTS_PATH, Array.isArray(clients) ? clients : []);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to save content', err);
    return res.status(500).json({ error: 'Failed to save content' });
  }
});

app.post('/api/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err || !req.file) {
      return res.status(400).json({ error: err?.message || 'Upload failed' });
    }
    const relativePath = path.join('uploads', path.basename(req.file.filename)).replace(/\\/g, '/');
    return res.json({ ok: true, path: relativePath });
  });
});

app.post('/api/publish', requireAuth, async (req, res) => {
  const enableEnv = process.env.ENABLE_GIT_PUBLISH;
  const runGit = (typeof enableEnv === 'undefined') ? true : enableEnv === 'true';
  if (!runGit) return res.json({ ok: true, message: 'Publish hook is disabled. Set ENABLE_GIT_PUBLISH=true to enable.' });

  try {
    const commitMsg = (req.body && req.body.message) || 'Update content';
    const safeMsg = commitMsg.replace(/"/g, '\\"');

    // Detect branch
    let branch = 'main';
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD');
      branch = stdout.trim() || branch;
    } catch (_) { /* fallback to main */ }

    // Only commit/push if there are changes
    const { stdout: statusOut } = await execAsync('git status --porcelain');
    if (!statusOut.trim()) {
      return res.json({ ok: true, message: 'No changes to publish' });
    }

    await execAsync('git add .');
    await execAsync(`git commit -m "${safeMsg}"`);

    let needsUpstream = false;
    try {
      await execAsync('git rev-parse --abbrev-ref --symbolic-full-name @{upstream}');
    } catch (_) {
      needsUpstream = true;
    }
    const pushCmd = needsUpstream ? `git push -u origin ${branch}` : 'git push';
    const { stdout } = await execAsync(pushCmd);
    return res.json({ ok: true, output: stdout || 'Publish complete' });
  } catch (e) {
    const details = e?.stderr || e?.err?.message || String(e);
    console.error('Git publish failed', details);
    return res.status(500).json({ error: 'Git publish failed', details });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

ensureDirs()
  .then(() => app.listen(PORT, () => console.log(`Admin server running at http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
  });
