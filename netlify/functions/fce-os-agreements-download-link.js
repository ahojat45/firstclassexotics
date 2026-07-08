const {
  json,
  requireAuth,
  supabaseFetch,
} = require('./fce-os-utils');
const { createSignedStorageUrl } = require('./fce-os-agreement-artifacts');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const auth = requireAuth(event);
  if (!auth.ok) return auth.response;

  const agreementId = String(event.queryStringParameters?.agreementId || '').trim();
  if (!agreementId) {
    return json(400, { error: 'agreementId is required' });
  }

  try {
    const rows = await supabaseFetch(`/rest/v1/agreements?id=eq.${encodeURIComponent(agreementId)}&select=id,signed_pdf_storage_bucket,signed_pdf_storage_path&limit=1`);
    if (!rows.length) {
      return json(404, { error: 'Agreement not found' });
    }

    const agreement = rows[0];
    if (!agreement.signed_pdf_storage_bucket || !agreement.signed_pdf_storage_path) {
      return json(404, { error: 'Signed PDF is not available yet' });
    }

    const signedUrl = await createSignedStorageUrl({
      bucket: agreement.signed_pdf_storage_bucket,
      path: agreement.signed_pdf_storage_path,
      expiresIn: 60 * 60,
    });

    return json(200, { success: true, signedUrl });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to create signed PDF link' });
  }
};
