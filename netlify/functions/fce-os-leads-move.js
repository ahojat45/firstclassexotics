const {
  STAGE_ORDER,
  json,
  parseJsonBody,
  requireAuth,
  moveLeadStage,
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

  if (!payload.leadId || !payload.stage) {
    return json(400, { error: 'leadId and stage are required' });
  }

  if (!STAGE_ORDER.includes(payload.stage)) {
    return json(400, { error: 'Invalid stage' });
  }

  try {
    const updated = await moveLeadStage({
      leadId: payload.leadId,
      stage: payload.stage,
      changedBy: 'dashboard',
      note: payload.note || null,
    });

    return json(200, { success: true, lead: updated });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to move lead stage' });
  }
};