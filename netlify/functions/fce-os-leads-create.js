const {
  json,
  parseJsonBody,
  requireAuth,
  createCustomerAndLead,
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

  const source = payload.source || 'Phone';
  if (!['Phone', 'Instagram', 'Referral', 'Website'].includes(source)) {
    return json(400, { error: 'Invalid source' });
  }

  if (!payload.fullName || !payload.phone) {
    return json(400, { error: 'fullName and phone are required' });
  }

  if (source === 'Referral' && !payload.referredBy) {
    return json(400, { error: 'referredBy is required for Referral leads' });
  }

  try {
    const created = await createCustomerAndLead({
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      notes: payload.notes,
      source,
      referredBy: payload.referredBy,
      requestedVehicle: payload.requestedVehicle,
      requestedStartDate: payload.requestedStartDate,
      requestedEndDate: payload.requestedEndDate,
      deliveryPreference: payload.deliveryPreference,
      changedBy: 'dashboard',
      note: 'Manual lead entry',
    });

    return json(201, { success: true, ...created });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to create lead' });
  }
};