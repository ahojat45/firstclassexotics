exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let name, email, phone, smsConsent;
  try {
    ({ name, email, phone, smsConsent } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!name || !email || !phone) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name, email, and phone are required' }) };
  }

  // Normalize phone to E.164 when possible; otherwise store what was provided.
  const digits = String(phone).replace(/\D/g, '');
  let cell = String(phone).trim();
  if (digits.length === 10) cell = '+1' + digits;
  else if (digits.length === 11 && digits.startsWith('1')) cell = '+' + digits;

  const attributes = {
    FIRSTNAME: name,
    CELL_PHONE: cell,
    SMS_CONSENT: smsConsent ? 'yes' : 'no',
  };

  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      email,
      attributes,
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
