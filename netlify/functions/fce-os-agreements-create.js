const {
  json,
  parseJsonBody,
  requireAuth,
  supabaseFetch,
  nowIso,
  buildBaseUrl,
  createAgreementToken,
  hashAgreementToken,
  tokenExpiryIso,
} = require('./fce-os-utils');

const DEFAULT_TERMS = [
  'I confirm the provided information is accurate.',
  'I accept responsibility for the vehicle during the rental term.',
  'I agree to return the vehicle in the same condition, normal wear excepted.',
  'I understand any damage, tolls, tickets, or violations are my responsibility.',
].join(' ');

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

  if (!payload.customerId && !payload.leadId) {
    return json(400, { error: 'customerId or leadId is required' });
  }

  try {
    let customer = null;
    let lead = null;

    if (payload.leadId) {
      const leadRows = await supabaseFetch(`/rest/v1/leads?id=eq.${encodeURIComponent(payload.leadId)}&select=id,customer_id,customer:customers(id,full_name,email,phone,requested_vehicle,requested_start_date,requested_end_date,delivery_preference)&limit=1`);
      if (!leadRows.length) {
        return json(404, { error: 'Lead not found' });
      }
      lead = leadRows[0];
      customer = lead.customer;
    } else {
      const customerRows = await supabaseFetch(`/rest/v1/customers?id=eq.${encodeURIComponent(payload.customerId)}&select=id,full_name,email,phone,requested_vehicle,requested_start_date,requested_end_date,delivery_preference&limit=1`);
      if (!customerRows.length) {
        return json(404, { error: 'Customer not found' });
      }
      customer = customerRows[0];
    }

    if (!customer?.id) {
      return json(400, { error: 'Unable to resolve customer for agreement' });
    }

    const token = createAgreementToken();
    const tokenHash = hashAgreementToken(token);
    const now = nowIso();
    const expiresAt = tokenExpiryIso(Number(payload.expiryHours) || 48);

    const [agreement] = await supabaseFetch('/rest/v1/agreements?select=*', {
      method: 'POST',
      headers: {
        Prefer: 'return=representation',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: customer.id,
        lead_id: lead?.id || null,
        status: 'sent',
        token_hash: tokenHash,
        token_expires_at: expiresAt,
        sent_at: now,
        renter_full_name: customer.full_name,
        renter_email: customer.email || null,
        renter_phone: customer.phone || null,
        rental_vehicle: customer.requested_vehicle || null,
        rental_start_date: customer.requested_start_date || null,
        rental_end_date: customer.requested_end_date || null,
        delivery_preference: customer.delivery_preference || null,
        agreement_terms: payload.agreementTerms || DEFAULT_TERMS,
        deposit_amount_cents: Number(payload.depositAmountCents) || 0,
        deposit_status: payload.depositStatus || 'none',
        created_by: 'dashboard',
      }),
    });

    const link = `${buildBaseUrl(event)}/fce-os/agreement.html?t=${encodeURIComponent(token)}`;

    return json(201, {
      success: true,
      agreement: {
        id: agreement.id,
        customerId: agreement.customer_id,
        leadId: agreement.lead_id,
        status: agreement.status,
        tokenExpiresAt: agreement.token_expires_at,
        sentAt: agreement.sent_at,
      },
      signingLink: link,
    });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to create agreement' });
  }
};
