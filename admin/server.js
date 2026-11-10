// Local editing server. Do not deploy this process to the public website.
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const { execFile } = require('child_process');
const express = require('express');
const multer = require('multer');

const root = path.resolve(__dirname, '..');
const contentPath = path.join(root, 'data', 'content.json');
const uploadsPath = path.join(root, 'assets', 'uploads');
const password = process.env.ADMIN_PASSWORD;
const port = Number(process.env.PORT) || 3000;
const publishEnabled = process.env.ENABLE_GIT_PUBLISH !== 'false';
const sessions = new Map();
const app = express();

if (!password || password.length < 12) {
  console.error('Set ADMIN_PASSWORD to a unique password of at least 12 characters before starting the admin server.');
  process.exit(1);
}

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

function authenticate(req, res, next) {
  const token = (req.get('Authorization') || '').replace(/^Bearer /, '');
  const expires = sessions.get(token);
  if (!expires || expires < Date.now()) return res.status(401).json({ error: 'Sign in again.' });
  sessions.set(token, Date.now() + 12 * 60 * 60 * 1000);
  next();
}

function git(...args) {
  return new Promise((resolve, reject) => execFile('git', args, { cwd: root, windowsHide: true }, (error, stdout, stderr) => {
    if (error) reject(new Error((stderr || error.message).trim()));
    else resolve(stdout.trim());
  }));
}

function imageExtension(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return '.png';
  if (buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return '.jpg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
}

function validText(value, limit = 4000) { return typeof value === 'string' && value.length <= limit; }
function validImage(value) { return validText(value, 500) && (!value || (/^assets\/[\w./% -]+$/i.test(value) && !value.split('/').includes('..')) || /^https:\/\/[^\s]+$/i.test(value)); }
function validContent(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (!Array.isArray(data.work) || data.work.length > 150 || !data.work.every(x => validText(x.label, 160) && validText(x.alt, 300) && validImage(x.src))) return false;
  if (!Array.isArray(data.clients) || data.clients.length > 150 || !data.clients.every(x => validText(x.handle, 160) && validText(x.subs, 100) && validImage(x.avatar))) return false;
  if (!Array.isArray(data.reviews) || data.reviews.length > 150 || !data.reviews.every(x => validText(x.name, 160) && validText(x.role, 160) && validText(x.quote, 4000) && validImage(x.avatar))) return false;
  if (!data.home || !Array.isArray(data.home.heroImages) || data.home.heroImages.length > 30 || new Set(data.home.heroImages).size !== data.home.heroImages.length || !data.home.heroImages.every(validImage)) return false;
  if (!Array.isArray(data.home.process) || data.home.process.length > 12 || !data.home.process.every(x => validText(x.label, 160) && validText(x.title, 160) && validText(x.body) && validText(x.alt, 300) && validImage(x.image))) return false;
  if (!data.about || !Array.isArray(data.about.sections)) return false;
  return true;
}

app.post('/api/login', (req, res) => {
  const attempt = Buffer.from(String(req.body?.password || ''));
  const expected = Buffer.from(password);
  if (attempt.length !== expected.length || !crypto.timingSafeEqual(attempt, expected)) return res.status(401).json({ error: 'Incorrect password.' });
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + 12 * 60 * 60 * 1000);
  res.json({ token });
});

app.get('/api/content', authenticate, async (_req, res) => {
  try { res.json({ content: JSON.parse(await fs.readFile(contentPath, 'utf8')), publishEnabled }); }
  catch (error) { console.error(error); res.status(500).json({ error: 'Could not read site content.' }); }
});

app.post('/api/save', authenticate, async (req, res) => {
  if (!validContent(req.body?.content)) return res.status(400).json({ error: 'Some content is invalid. Check image paths and required fields.' });
  try {
    await fs.writeFile(contentPath, `${JSON.stringify(req.body.content, null, 2)}\n`, 'utf8');
    res.json({ ok: true });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Could not save content.' }); }
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.post('/api/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose an image to upload.' });
  const ext = imageExtension(req.file.buffer);
  if (!ext) return res.status(400).json({ error: 'Use a PNG, JPG, or WebP image.' });
  try {
    await fs.mkdir(uploadsPath, { recursive: true });
    const filename = `${crypto.randomBytes(12).toString('hex')}${ext}`;
    await fs.writeFile(path.join(uploadsPath, filename), req.file.buffer, { flag: 'wx' });
    res.json({ path: `assets/uploads/${filename}` });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Could not store image.' }); }
});

app.post('/api/publish', authenticate, async (_req, res) => {
  if (!publishEnabled) return res.status(403).json({ error: 'Git publishing is off. Start the editor without ENABLE_GIT_PUBLISH=false to enable it.' });
  try {
    const branch = await git('branch', '--show-current');
    if (branch !== 'main') return res.status(409).json({ error: `Switch to main before publishing. Current branch: ${branch || '(detached)'}.` });
    await git('add', '-A', '--', 'data/content.json', 'assets/uploads');
    const changed = await git('diff', '--cached', '--name-only', '--', 'data/content.json', 'assets/uploads');
    if (!changed) return res.json({ ok: true, message: 'No saved content changes to publish.' });
    await git('commit', '-m', 'Update portfolio content', '--only', '--', 'data/content.json', 'assets/uploads');
    try {
      await git('push', 'origin', 'main');
      res.json({ ok: true, message: 'Pushed to GitHub. The Pages workflow will update the website after it finishes.' });
    } catch (error) {
      res.status(502).json({ error: `Saved in a local Git commit, but the push failed: ${error.message}. Run git push origin main after fixing access.` });
    }
  } catch (error) { console.error(error); res.status(500).json({ error: `Publishing failed: ${error.message}` }); }
});

// Serve only the editor and the public site's files. Never expose server source or node_modules.
app.get(['/admin', '/admin/'], (_req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin/admin.css', (_req, res) => res.sendFile(path.join(__dirname, 'admin.css')));
app.get('/admin/admin.js', (_req, res) => res.sendFile(path.join(__dirname, 'admin.js')));
app.use('/assets', express.static(path.join(root, 'assets')));
app.use('/data', express.static(path.join(root, 'data')));
app.get('/', (_req, res) => res.sendFile(path.join(root, 'index.html')));
for (const name of ['index.html', 'portfolio.html', 'about.html', 'contact.html', 'styles.css', 'script.js']) {
  app.get(`/${name}`, (_req, res) => res.sendFile(path.join(root, name)));
}
app.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.message });
  next(error);
});
app.use((_req, res) => res.status(404).send('Not found'));

app.listen(port, '127.0.0.1', () => console.log(`Local admin: http://127.0.0.1:${port}/admin`));
