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

  if (!name || !email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name and email are required' }) };
  }

  const attributes = { FIRSTNAME: name };

  // Only store a textable number when a valid US phone is given AND SMS consent is checked.
  // A malformed/empty phone is skipped so it never fails the contact create — email still saves.
  if (smsConsent && phone) {
    const digits = String(phone).replace(/\D/g, '');
    let smsE164 = '';
    if (digits.length === 10) smsE164 = '+1' + digits;
    else if (digits.length === 11 && digits.startsWith('1')) smsE164 = '+' + digits;
    if (smsE164) attributes.SMS = smsE164;
  }

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
