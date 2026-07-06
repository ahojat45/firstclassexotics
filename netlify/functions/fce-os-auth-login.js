const {
  json,
  parseJsonBody,
  createSessionToken,
  sessionCookie,
} = require('./fce-os-utils');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const configuredPassword = process.env.FCE_OS_DASHBOARD_PASSWORD;
  const sessionSecret = process.env.FCE_OS_SESSION_SECRET;

  if (!configuredPassword) {
    return json(500, { error: 'Missing FCE_OS_DASHBOARD_PASSWORD env var' });
  }
  if (!sessionSecret) {
    return json(500, { error: 'Missing FCE_OS_SESSION_SECRET env var' });
  }

  let payload;
  try {
    payload = parseJsonBody(event);
  } catch {
    return json(400, { error: 'Invalid request body' });
  }

  if ((payload.password || '') !== configuredPassword) {
    return json(401, { error: 'Invalid password' });
  }

  const token = createSessionToken(sessionSecret);

  return json(
    200,
    { success: true },
    {
      'Set-Cookie': sessionCookie(token),
    },
  );
};