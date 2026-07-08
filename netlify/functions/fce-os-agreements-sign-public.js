const crypto = require('crypto');
const {
  json,
  parseJsonBody,
  supabaseFetch,
  nowIso,
  getRequesterIp,
  cleanUserAgent,
  findAgreementByToken,
  agreementPublicError,
  moveLeadStage,
} = require('./fce-os-utils');
const {
  TERMS_SECTIONS,
  uploadObjectToStorage,
  processSignedArtifacts,
} = require('./fce-os-agreement-artifacts');

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
  const acceptedSections = Array.isArray(payload.acceptedSections) ? payload.acceptedSections : [];

  if (!token || !typedName || !signatureBase64) {
    return json(400, { error: 'token, typedName, and signatureBase64 are required' });
  }

  const requiredSections = TERMS_SECTIONS.filter((section) => section.requiresInitials).map((section) => section.number);
  const normalizedAcceptedSections = new Set(
    acceptedSections
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
  );
  const missingSections = requiredSections.filter((number) => !normalizedAcceptedSections.has(number));
  if (missingSections.length) {
    return json(400, { error: 'Please initial all required terms sections before signing.' });
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

    const signaturePath = `agreements/${agreement.id}/signature/${Date.now()}-${crypto.randomUUID()}.png`;
    const signatureStorage = await uploadObjectToStorage({
      path: signaturePath,
      mimeType: 'image/png',
      buffer,
      upsert: false,
    });

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
        signature_storage_bucket: signatureStorage.bucket,
        signature_storage_path: signatureStorage.path,
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

    let artifactResult = {
      manualResendRequired: false,
      downloadUrl: null,
      errors: [],
    };

    try {
      const agreementRows = await supabaseFetch(`/rest/v1/agreements?id=eq.${encodeURIComponent(updated.id)}&select=id,renter_full_name,renter_email,renter_phone,rental_vehicle,rental_start_date,rental_end_date,delivery_preference,agreement_terms,deposit_amount_cents,pickup_time,return_time,daily_rate_cents,total_price_cents,miles_included_per_day,mileage_overage_rate_cents,fuel_terms,additional_driver_names,signed_pdf_storage_bucket,signed_pdf_storage_path&limit=1`);
      const agreementForArtifacts = agreementRows[0];

      artifactResult = await processSignedArtifacts({
        agreement: agreementForArtifacts,
        typedName,
        signedAt,
        signerIp: getRequesterIp(event),
        signaturePngBuffer: buffer,
      });
    } catch (artifactError) {
      artifactResult = {
        manualResendRequired: true,
        downloadUrl: null,
        errors: [artifactError.message || 'Signed copy generation/email failed after signature commit'],
      };

      try {
        await supabaseFetch(`/rest/v1/agreements?id=eq.${encodeURIComponent(updated.id)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            manual_resend_required: true,
            signed_pdf_error: artifactResult.errors[0],
          }),
        });
      } catch {
        // Non-fatal by design: signing must remain successful even if post-sign persistence fails.
      }
    }

    return json(200, {
      success: true,
      agreement: {
        id: updated.id,
        status: updated.status,
        signedAt: updated.signed_at,
      },
      signedCopy: {
        manualResendRequired: artifactResult.manualResendRequired,
        downloadUrl: artifactResult.downloadUrl,
        errors: artifactResult.errors,
      },
    });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to sign agreement' });
  }
};
