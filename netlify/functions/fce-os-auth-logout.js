const { json, clearSessionCookie } = require('./fce-os-utils');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  return json(
    200,
    { success: true },
    {
      'Set-Cookie': clearSessionCookie(),
    },
  );
};