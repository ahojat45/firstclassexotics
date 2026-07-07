const {
  json,
  supabaseFetch,
  nowIso,
  findAgreementByToken,
  agreementPublicError,
} = require('./fce-os-utils');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const token = event.queryStringParameters?.t || '';
  if (!token) {
    return json(400, { error: 'Missing agreement token' });
  }

  try {
    const agreement = await findAgreementByToken(
      token,
      'id,status,token_expires_at,voided_at,signed_at,renter_full_name,renter_email,renter_phone,rental_vehicle,rental_start_date,rental_end_date,delivery_preference,agreement_terms,deposit_amount_cents,deposit_status,viewed_at'
    );

    if (!agreement) {
      return json(404, { error: 'Agreement not found' });
    }

    const stateError = agreementPublicError(agreement);
    if (stateError === 'Agreement already signed') return json(409, { error: stateError });
    if (stateError === 'Agreement voided') return json(410, { error: stateError });
    if (stateError === 'Agreement link expired') return json(410, { error: stateError });

    if (!agreement.viewed_at) {
      const [updated] = await supabaseFetch(`/rest/v1/agreements?id=eq.${encodeURIComponent(agreement.id)}&signed_at=is.null&status=eq.sent&select=id,status,viewed_at`, {
        method: 'PATCH',
        headers: {
          Prefer: 'return=representation',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'viewed',
          viewed_at: nowIso(),
        }),
      });
      if (updated) {
        agreement.status = updated.status;
        agreement.viewed_at = updated.viewed_at;
      }
    }

    return json(200, {
      agreement: {
        id: agreement.id,
        status: agreement.status,
        tokenExpiresAt: agreement.token_expires_at,
        renterFullName: agreement.renter_full_name,
        renterEmail: agreement.renter_email,
        renterPhone: agreement.renter_phone,
        rentalVehicle: agreement.rental_vehicle,
        rentalStartDate: agreement.rental_start_date,
        rentalEndDate: agreement.rental_end_date,
        deliveryPreference: agreement.delivery_preference,
        agreementTerms: agreement.agreement_terms,
        depositAmountCents: agreement.deposit_amount_cents,
        depositStatus: agreement.deposit_status,
      },
    });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to load agreement' });
  }
};
