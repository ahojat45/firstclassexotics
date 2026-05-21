exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let name, email;
  try {
    ({ name, email } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!name || !email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name and email are required' }) };
  }

  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      email,
      attributes: { FIRSTNAME: name },
      listIds: [2],
      updateEnabled: true,
    }),
  });

  if (res.ok || res.status === 204) {
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  const err = await res.text();
  return { statusCode: 502, body: JSON.stringify({ error: err }) };
};
