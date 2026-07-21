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

  const leadId = String(payload.leadId || '').trim() || null;
  const customerIdInput = String(payload.customerId || '').trim() || null;

  if (!leadId && !customerIdInput) {
    return json(400, { error: 'leadId or customerId is required' });
  }

  try {
    let lead = null;
    if (leadId) {
      const leadRows = await supabaseFetch(`/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&select=id,customer_id,stage`);
      lead = leadRows[0] || null;
      if (!lead) {
        return json(404, { error: 'Lead not found' });
      }
    }

    const customerId = lead?.customer_id || customerIdInput;
    if (!customerId) {
      return json(400, { error: 'Unable to determine customerId for deletion' });
    }

    if (lead && customerIdInput && lead.customer_id !== customerIdInput) {
      return json(400, { error: 'leadId and customerId do not match' });
    }

    const [deletedCustomer] = await supabaseFetch(`/rest/v1/customers?id=eq.${encodeURIComponent(customerId)}&select=id,full_name`, {
      method: 'DELETE',
      headers: {
        Prefer: 'return=representation',
      },
    });

    if (!deletedCustomer) {
      return json(404, { error: 'Customer not found' });
    }

    return json(200, {
      success: true,
      deleted: {
        customerId: deletedCustomer.id,
        fullName: deletedCustomer.full_name || null,
        leadId: lead?.id || null,
      },
    });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to delete lead/customer' });
  }
};
