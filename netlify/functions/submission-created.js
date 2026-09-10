const { createCustomerAndLead } = require('./fce-os-utils');

// Pushover: instant phone alert on a new lead.
// Replaces the carrier email-to-SMS gateway Verizon shut off (see HANDOFF §16).
// Never throws — a failed alert must not stop the lead from being created.
async function notifyPushover(title, message) {
  const token = process.env.PUSHOVER_TOKEN;
  const user = process.env.PUSHOVER_USER;
  if (!token || !user) {
    console.log('Pushover not configured — skipping alert');
    return;
  }
  try {
    const res = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        user,
        title,
        message,
        priority: 1,
        sound: 'persistent',
        url: 'https://www.firstclassexotics.com/fce-os/',
        url_title: 'Open FCE OS',
      }),
    });
    if (!res.ok) {
      console.error('Pushover failed', res.status, await res.text());
    }
  } catch (error) {
    console.error('Pushover error', error.message);
  }
}

function line(label, value) {
  return value ? `${label}: ${value}\n` : '';
}

exports.handler = async function handler(event) {
  // Netlify Forms submission-created hook.
  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 200, body: 'Ignored malformed payload' };
  }
  const formName = payload.form_name || payload.payload?.form_name;
  const data = payload.payload?.data || {};

  // --- Alert first, on every lead form, so a Supabase problem never costs Ali the alert ---
  if (formName === 'booking' || formName === 'gift-request' || formName === 'wrap-quote') {
    const who =
      [data['first-name'], data['last-name']].filter(Boolean).join(' ').trim() ||
      data['your-name'] ||
      'Unknown';
    const phone = data.phone || data['your-phone'] || '';
    const email = data.email || data['your-email'] || '';

    const label =
      formName === 'booking' ? 'NEW RENTAL LEAD'
      : formName === 'gift-request' ? 'GIFT CARD REQUEST'
      : 'WRAP QUOTE';

    let body = line('Phone', phone) + line('Email', email);
    if (formName === 'booking') {
      body +=
        line('Car', data.vehicle) +
        line('Dates', [data['start-date'], data['end-date']].filter(Boolean).join(' to ')) +
        line('Delivery', data.delivery);
    } else if (formName === 'gift-request') {
      body +=
        line('For', data['recipient-name']) +
        line('Amount', data['gift-amount'] === 'custom' ? data['custom-amount'] : data['gift-amount']) +
        line('Occasion', data.occasion);
    } else {
      body +=
        line('Vehicle', [data.year, data.vehicle].filter(Boolean).join(' ')) +
        line('Finish', data.finish) +
        line('Best time', data['call-time']);
    }
    body += line('Note', data.message);

    await notifyPushover(`${label}: ${who}`, body.trim() || 'No details submitted');
  }

  // --- FCE OS lead creation is booking-only, unchanged ---
  if (formName !== 'booking') {
    return { statusCode: 200, body: 'Alerted; non-booking form, no lead created' };
  }

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
    return { statusCode: 500, body: `Failed to create lead: ${error.message}` };
  }
};
