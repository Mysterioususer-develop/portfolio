const channelSizes = new Set([
  'Under 10K subscribers',
  '10K–100K subscribers',
  '100K–1M subscribers',
  '1M+ subscribers'
]);

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' }
});

function text(value, max) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

export async function POST(request) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return json({ error: 'Send the brief as JSON.' }, 415);
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 6000) return json({ error: 'The brief is too long.' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'The brief could not be read.' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'The brief is invalid.' }, 400);
  if (body.website) return json({ ok: true });

  const channel = text(body.channel, 160);
  const channelSize = text(body.channelSize, 40);
  const handle = text(body.handle, 80);
  const deadline = text(body.deadline ?? '', 80);
  const details = text(body.details, 3000);
  if (!channel || !channelSizes.has(channelSize) || !handle || deadline === null || !details) {
    return json({ error: 'Please complete the required fields and try again.' }, 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BRIEF_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error('Project brief email is missing RESEND_API_KEY or BRIEF_FROM_EMAIL.');
    return json({ error: 'Email submissions are temporarily unavailable. Please use Discord or X below.' }, 503);
  }

  const message = [
    'New project inquiry from the Larzy portfolio',
    '',
    `YouTube channel: ${channel}`,
    `Channel size: ${channelSize}`,
    `Discord or X handle: ${handle}`,
    `Deadline: ${deadline || 'To discuss'}`,
    '',
    'Project details:',
    details
  ].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: ['larzyfx@gmail.com'],
        subject: `New thumbnail brief — ${channel.replace(/[\r\n]+/g, ' ').slice(0, 80)}`,
        text: message
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      console.error(`Resend rejected a project brief (${response.status}).`);
      return json({ error: 'Your brief could not be emailed right now. Please use Discord or X below.' }, 502);
    }
    return json({ ok: true });
  } catch (error) {
    console.error('Project brief email request failed:', error);
    return json({ error: 'Your brief could not be emailed right now. Please use Discord or X below.' }, 502);
  }
}
