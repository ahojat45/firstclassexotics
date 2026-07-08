const {
  json,
  parseJsonBody,
  requireAuth,
  supabaseFetch,
  agreementPublicError,
} = require('./fce-os-utils');
const {
  downloadObjectFromStorage,
  processSignedArtifacts,
} = require('./fce-os-agreement-artifacts');

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

  const agreementId = String(payload.agreementId || '').trim();
  if (!agreementId) {
    return json(400, { error: 'agreementId is required' });
  }

  try {
    const rows = await supabaseFetch(`/rest/v1/agreements?id=eq.${encodeURIComponent(agreementId)}&select=id,status,signed_at,voided_at,token_expires_at,signature_typed_name,signature_storage_bucket,signature_storage_path,signed_ip,renter_full_name,renter_email,renter_phone,rental_vehicle,rental_start_date,rental_end_date,delivery_preference,agreement_terms,deposit_amount_cents,pickup_time,return_time,daily_rate_cents,total_price_cents,miles_included_per_day,mileage_overage_rate_cents,fuel_terms,additional_driver_names&limit=1`);

    if (!rows.length) {
      return json(404, { error: 'Agreement not found' });
    }

    const agreement = rows[0];
    const stateError = agreementPublicError(agreement);
    if (stateError && stateError !== 'Agreement already signed') {
      return json(409, { error: stateError });
    }

    if (!agreement.signature_storage_bucket || !agreement.signature_storage_path) {
      return json(409, { error: 'Signature image is missing; cannot regenerate signed copy' });
    }

    const signaturePngBuffer = await downloadObjectFromStorage({
      bucket: agreement.signature_storage_bucket,
      path: agreement.signature_storage_path,
    });

    const artifactResult = await processSignedArtifacts({
      agreement,
      typedName: agreement.signature_typed_name || agreement.renter_full_name || 'Signed Customer',
      signedAt: agreement.signed_at,
      signerIp: agreement.signed_ip,
      signaturePngBuffer,
    });

    return json(200, {
      success: true,
      signedCopy: {
        manualResendRequired: artifactResult.manualResendRequired,
        downloadUrl: artifactResult.downloadUrl,
        errors: artifactResult.errors,
      },
    });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to resend signed copy' });
  }
};
