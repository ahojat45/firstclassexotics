const crypto = require('crypto');
const {
  json,
  parseJsonBody,
  requireAuth,
  getSupabaseConfig,
  supabaseFetch,
} = require('./fce-os-utils');

function cleanFileName(value) {
  return String(value || 'upload')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function detectMimeType(fileName, mimeType) {
  const normalizedMime = String(mimeType || '').trim().toLowerCase();
  if (ALLOWED_MIME_TYPES.has(normalizedMime)) return normalizedMime;

  const lowerName = String(fileName || '').toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.heic')) return 'image/heic';
  if (lowerName.endsWith('.heif')) return 'image/heif';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';

  return null;
}

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

  const customerId = payload.customerId;
  const docType = payload.docType;
  const expirationDate = payload.expirationDate || null;
  const fileBase64 = payload.fileBase64;
  const fileName = cleanFileName(payload.fileName || 'document');
  const mimeType = detectMimeType(fileName, payload.mimeType);

  if (!customerId || !docType || !fileBase64) {
    return json(400, { error: 'customerId, docType, and fileBase64 are required' });
  }

  if (!['dl', 'insurance'].includes(docType)) {
    return json(400, { error: 'docType must be dl or insurance' });
  }

  if (!mimeType) {
    return json(400, { error: 'Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, HEIC.' });
  }

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    const { url, serviceKey, bucket } = getSupabaseConfig();

    const random = crypto.randomUUID();
    const path = `${customerId}/${docType}/${Date.now()}-${random}-${fileName}`;

    const uploadResponse = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: buffer,
    });

    const uploadText = await uploadResponse.text();
    if (!uploadResponse.ok) {
      return json(500, { error: `Storage upload failed: ${uploadText}` });
    }

    const [document] = await supabaseFetch('/rest/v1/documents?on_conflict=customer_id,doc_type&select=*', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: customerId,
        doc_type: docType,
        storage_bucket: bucket,
        storage_path: path,
        mime_type: mimeType,
        file_size_bytes: buffer.byteLength,
        expiration_date: expirationDate,
      }),
    });

    const customerPatch = {};
    if (docType === 'dl') {
      customerPatch.dl_document_id = document.id;
      customerPatch.dl_expiration_date = expirationDate;
    }
    if (docType === 'insurance') {
      customerPatch.insurance_document_id = document.id;
      customerPatch.insurance_expiration_date = expirationDate;
    }

    await supabaseFetch(`/rest/v1/customers?id=eq.${encodeURIComponent(customerId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerPatch),
    });

    return json(200, { success: true, document });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to upload document' });
  }
};