const crypto = require('crypto');
const {
  json,
  parseJsonBody,
  supabaseFetch,
  getSupabaseConfig,
  nowIso,
  getRequesterIp,
  cleanUserAgent,
  findAgreementByToken,
  agreementPublicError,
  moveLeadStage,
} = require('./fce-os-utils');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  let payload;
  try {
    payload = parseJsonBody(event);
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const token = payload.token || '';
  const typedName = String(payload.typedName || '').trim();
  const signatureBase64 = String(payload.signatureBase64 || '').trim();

  if (!token || !typedName || !signatureBase64) {
    return json(400, { error: 'token, typedName, and signatureBase64 are required' });
  }

  try {
    const agreement = await findAgreementByToken(
      token,
      'id,customer_id,lead_id,status,token_expires_at,voided_at,signed_at,renter_full_name'
    );

    if (!agreement) {
      return json(404, { error: 'Agreement not found' });
    }

    const stateError = agreementPublicError(agreement);
    if (stateError === 'Agreement already signed') return json(409, { error: stateError });
    if (stateError === 'Agreement voided') return json(410, { error: stateError });
    if (stateError === 'Agreement link expired') return json(410, { error: stateError });

    if (typedName.length < 2) {
      return json(400, { error: 'Typed name is required' });
    }

    const buffer = Buffer.from(signatureBase64, 'base64');
    if (!buffer.length) {
      return json(400, { error: 'Signature image is empty' });
    }

    const { url, serviceKey, bucket } = getSupabaseConfig();
    const path = `agreements/${agreement.id}/signature/${Date.now()}-${crypto.randomUUID()}.png`;

    const uploadResponse = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'image/png',
        'x-upsert': 'false',
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      const detail = await uploadResponse.text();
      return json(500, { error: `Storage upload failed: ${detail}` });
    }

    const signedAt = nowIso();
    const [updated] = await supabaseFetch(`/rest/v1/agreements?id=eq.${encodeURIComponent(agreement.id)}&signed_at=is.null&status=not.in.(signed,voided)&select=id,customer_id,lead_id,status,signed_at`, {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'signed',
        signed_at: signedAt,
        signature_typed_name: typedName,
        signature_storage_bucket: bucket,
        signature_storage_path: path,
        signed_ip: getRequesterIp(event),
        signed_user_agent: cleanUserAgent(event.headers?.['user-agent']),
      }),
    });

    if (!updated) {
      const latestRows = await supabaseFetch(`/rest/v1/agreements?id=eq.${encodeURIComponent(agreement.id)}&select=id,status,signed_at,voided_at,token_expires_at&limit=1`);
      const latest = latestRows[0];
      const latestError = agreementPublicError(latest);
      if (latestError) {
        if (latestError === 'Agreement already signed') return json(409, { error: latestError });
        if (latestError === 'Agreement voided') return json(410, { error: latestError });
        if (latestError === 'Agreement link expired') return json(410, { error: latestError });
      }
      return json(409, { error: 'Agreement can no longer be signed' });
    }

    if (updated.lead_id) {
      await moveLeadStage({
        leadId: updated.lead_id,
        stage: 'Booked',
        changedBy: 'agreement-sign',
        note: 'Auto-booked after customer signed rental agreement',
      });
    } else {
      await supabaseFetch(`/rest/v1/customers?id=eq.${encodeURIComponent(updated.customer_id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'customer' }),
      });
    }

    return json(200, {
      success: true,
      agreement: {
        id: updated.id,
        status: updated.status,
        signedAt: updated.signed_at,
      },
    });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to sign agreement' });
  }
};
