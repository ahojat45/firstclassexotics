const crypto = require('crypto');

const SESSION_COOKIE = 'fce_os_session';
const STAGE_ORDER = ['New', 'Contacted', 'Quoted', 'Booked', 'Lost'];

function json(statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
    body: JSON.stringify(payload),
  };
}

function parseJsonBody(event) {
  if (!event.body) return {};
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function getCookie(event, name) {
  const raw = event.headers?.cookie || event.headers?.Cookie || '';
  const parts = raw.split(';').map((p) => p.trim());
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(part.slice(idx + 1));
  }
  return null;
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64url(input) {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
  return Buffer.from(padded, 'base64').toString('utf8');
}

function createSessionToken(secret, ttlSeconds = 60 * 60 * 12) {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    iat: Math.floor(Date.now() / 1000),
  };
  const payloadPart = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(payloadPart).digest('hex');
  return `${payloadPart}.${sig}`;
}

function verifySessionToken(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadPart, sig] = parts;
  if (sig.length !== 64) return false;
  const expected = crypto.createHmac('sha256', secret).update(payloadPart).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;

  try {
    const payload = JSON.parse(fromBase64url(payloadPart));
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function sessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200${secure}`;
}

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}

function requireAuth(event) {
  const secret = process.env.FCE_OS_SESSION_SECRET;
  if (!secret) {
    return { ok: false, response: json(500, { error: 'Missing FCE_OS_SESSION_SECRET' }) };
  }

  const token = getCookie(event, SESSION_COOKIE);
  if (!verifySessionToken(token, secret)) {
    return { ok: false, response: json(401, { error: 'Unauthorized' }) };
  }

  return { ok: true };
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'fce-os-documents';

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return { url: url.replace(/\/$/, ''), serviceKey, bucket };
}

async function supabaseFetch(path, { method = 'GET', body, headers = {} } = {}) {
  const { url, serviceKey } = getSupabaseConfig();
  const target = `${url}${path}`;

  const response = await fetch(target, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...headers,
    },
    body,
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    const detail = typeof parsed === 'string' ? parsed : parsed?.message || parsed?.error || JSON.stringify(parsed);
    throw new Error(`Supabase error (${response.status}): ${detail}`);
  }

  return parsed;
}

function encodeFormBody(data) {
  return new URLSearchParams(data).toString();
}

function cleanPhone(phone) {
  return String(phone || '').trim();
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function leadDaysInStage(stageChangedAt) {
  const ts = Date.parse(stageChangedAt);
  if (Number.isNaN(ts)) return 0;
  const ms = Date.now() - ts;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

async function getLeadSourceMap() {
  const rows = await supabaseFetch('/rest/v1/lead_sources?select=id,code,label,requires_referred_by');
  const map = new Map();
  rows.forEach((row) => map.set(row.code, row));
  return map;
}

async function createCustomerAndLead(input) {
  const sourceMap = await getLeadSourceMap();
  const source = sourceMap.get(input.source || 'Website') || sourceMap.get('Website');
  if (!source) {
    throw new Error('Lead source seed data missing');
  }

  const customerPayload = {
    full_name: input.fullName,
    email: input.email || null,
    phone: cleanPhone(input.phone || null),
    address: input.address || null,
    notes: input.notes || null,
    source_id: source.id,
    referred_by: input.referredBy || null,
    status: 'lead',
    requested_vehicle: input.requestedVehicle || null,
    requested_start_date: parseDate(input.requestedStartDate),
    requested_end_date: parseDate(input.requestedEndDate),
    delivery_preference: input.deliveryPreference || null,
  };

  const [customer] = await supabaseFetch('/rest/v1/customers?select=*', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(customerPayload),
  });

  const [lead] = await supabaseFetch('/rest/v1/leads?select=*', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer_id: customer.id,
      stage: 'New',
      stage_changed_at: new Date().toISOString(),
    }),
  });

  await supabaseFetch('/rest/v1/lead_stage_history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lead_id: lead.id,
      from_stage: null,
      to_stage: 'New',
      changed_by: input.changedBy || 'system',
      note: input.note || null,
    }),
  });

  return { customer, lead };
}

async function moveLeadStage({ leadId, stage, changedBy = 'dashboard', note = null }) {
  if (!STAGE_ORDER.includes(stage)) {
    throw new Error('Invalid stage value');
  }

  const currentRows = await supabaseFetch(`/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&select=*`);
  if (!currentRows.length) {
    throw new Error('Lead not found');
  }

  const current = currentRows[0];
  const prev = current.stage;

  const [updated] = await supabaseFetch(`/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&select=*`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stage,
      stage_changed_at: new Date().toISOString(),
    }),
  });

  await supabaseFetch('/rest/v1/lead_stage_history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lead_id: leadId,
      from_stage: prev,
      to_stage: stage,
      changed_by: changedBy,
      note,
    }),
  });

  if (stage === 'Booked') {
    await supabaseFetch(`/rest/v1/customers?id=eq.${encodeURIComponent(updated.customer_id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'customer' }),
    });
  }

  return updated;
}

function daysTo(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = target.getTime() - today.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

module.exports = {
  STAGE_ORDER,
  json,
  parseJsonBody,
  requireAuth,
  createSessionToken,
  sessionCookie,
  clearSessionCookie,
  createCustomerAndLead,
  moveLeadStage,
  supabaseFetch,
  getSupabaseConfig,
  encodeFormBody,
  leadDaysInStage,
  daysTo,
};