import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../api/brief.mjs';

const validBrief = {
  channel: 'Example Channel',
  channelSize: '10K–100K subscribers',
  handle: '@example',
  deadline: 'Next Friday',
  details: 'A Minecraft survival video thumbnail.'
};

const request = body => new Request('https://www.larzyfx.com/api/brief', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

test('sends a valid project brief to the requested inbox', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.BRIEF_FROM_EMAIL;
  let delivery;
  try {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.BRIEF_FROM_EMAIL = 'Larzy <briefs@larzyfx.com>';
    globalThis.fetch = async (url, options) => {
      delivery = { url, ...options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ id: 'test-id' }), { status: 200 });
    };
    const response = await POST(request(validBrief));
    assert.equal(response.status, 200);
    assert.equal(delivery.url, 'https://api.resend.com/emails');
    assert.deepEqual(delivery.body.to, ['larzyfx@gmail.com']);
    assert.match(delivery.body.text, /Example Channel[\s\S]*@example[\s\S]*Minecraft survival/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.BRIEF_FROM_EMAIL; else process.env.BRIEF_FROM_EMAIL = originalFrom;
  }
});

test('rejects incomplete briefs before calling the email provider', async () => {
  const response = await POST(request({ ...validBrief, handle: '' }));
  assert.equal(response.status, 400);
});

test('reports missing email configuration without claiming a send', async () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.BRIEF_FROM_EMAIL;
  try {
    delete process.env.RESEND_API_KEY;
    delete process.env.BRIEF_FROM_EMAIL;
    const response = await POST(request(validBrief));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, undefined);
  } finally {
    if (originalKey !== undefined) process.env.RESEND_API_KEY = originalKey;
    if (originalFrom !== undefined) process.env.BRIEF_FROM_EMAIL = originalFrom;
  }
});

test('does not report success when the email provider rejects delivery', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.BRIEF_FROM_EMAIL;
  try {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.BRIEF_FROM_EMAIL = 'Larzy <briefs@larzyfx.com>';
    globalThis.fetch = async () => new Response('Rejected', { status: 403 });
    const response = await POST(request(validBrief));
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /could not be emailed/i);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.BRIEF_FROM_EMAIL; else process.env.BRIEF_FROM_EMAIL = originalFrom;
  }
});
