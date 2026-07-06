const { createCustomerAndLead } = require('./fce-os-utils');

exports.handler = async function handler(event) {
  // Netlify Forms submission-created hook.
  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 200, body: 'Ignored malformed payload' };
  }
  const formName = payload.form_name || payload.payload?.form_name;
  if (formName !== 'booking') {
    return { statusCode: 200, body: 'Ignored non-booking form' };
  }

  const data = payload.payload?.data || {};

  const fullName = [data['first-name'], data['last-name']].filter(Boolean).join(' ').trim();
  if (!fullName || !data.phone) {
    return { statusCode: 200, body: 'Missing required booking fields' };
  }

  try {
    await createCustomerAndLead({
      fullName,
      email: data.email || null,
      phone: data.phone || null,
      notes: data.message || null,
      source: 'Website',
      requestedVehicle: data.vehicle || null,
      requestedStartDate: data['start-date'] || null,
      requestedEndDate: data['end-date'] || null,
      deliveryPreference: data.delivery || null,
      changedBy: 'netlify-form',
      note: 'Created from website booking form submission',
    });

    return { statusCode: 200, body: 'Lead created' };
  } catch (error) {
    console.error('submission-created error', error);
    return { statusCode: 500, body: 'Failed to create lead' };
  }
};