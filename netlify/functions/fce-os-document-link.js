const {
  json,
  requireAuth,
  supabaseFetch,
  getSupabaseConfig,
} = require('./fce-os-utils');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const auth = requireAuth(event);
  if (!auth.ok) return auth.response;

  const docId = event.queryStringParameters?.documentId;
  if (!docId) return json(400, { error: 'documentId is required' });

  try {
    const docs = await supabaseFetch(`/rest/v1/documents?id=eq.${encodeURIComponent(docId)}&select=id,storage_bucket,storage_path`);
    if (!docs.length) return json(404, { error: 'Document not found' });

    const doc = docs[0];
    const signed = await supabaseFetch(`/storage/v1/object/sign/${doc.storage_bucket}/${doc.storage_path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expiresIn: 3600,
      }),
    });

    const { url } = getSupabaseConfig();
    return json(200, { success: true, signedUrl: `${url}/storage/v1${signed.signedURL}` });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to create document link' });
  }
};