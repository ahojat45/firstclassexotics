const {
  json,
  parseJsonBody,
  requireAuth,
  supabaseFetch,
} = require('./fce-os-utils');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const auth = requireAuth(event);
  if (!auth.ok) return auth.response;

  let payload;
  try {
    payload = parseJsonBody(event);
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const customerId = payload.customerId;
  if (!customerId) return json(400, { error: 'customerId is required' });

  const update = {};
  const allowed = [
    'full_name',
    'email',
    'phone',
    'address',
    'notes',
    'requested_vehicle',
    'requested_start_date',
    'requested_end_date',
    'delivery_preference',
    'referred_by',
    'status',
  ];

  allowed.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      update[field] = payload[field];
    }
  });

  if (!Object.keys(update).length) {
    return json(400, { error: 'No updatable fields provided' });
  }

  try {
    const [customer] = await supabaseFetch(`/rest/v1/customers?id=eq.${encodeURIComponent(customerId)}&select=*`, {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    });

    return json(200, { success: true, customer });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to update customer' });
  }
};