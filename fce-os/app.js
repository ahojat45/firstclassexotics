const STAGES = ['New', 'Contacted', 'Quoted', 'Booked', 'Lost'];
const VIEWS = ['overview', 'pipeline', 'customers', 'documents'];

const el = {
  loginShell: document.getElementById('loginShell'),
  appShell: document.getElementById('appShell'),
  passwordInput: document.getElementById('passwordInput'),
  loginBtn: document.getElementById('loginBtn'),
  loginError: document.getElementById('loginError'),
  refreshBtn: document.getElementById('refreshBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  globalSearch: document.getElementById('globalSearch'),
  navButtons: Array.from(document.querySelectorAll('[data-view]')),
  viewPanels: Array.from(document.querySelectorAll('[data-view-panel]')),
  quickLeadForm: document.getElementById('quickLeadForm'),
  quickLeadError: document.getElementById('quickLeadError'),
  quickLeadSuccess: document.getElementById('quickLeadSuccess'),
  leadSource: document.getElementById('leadSource'),
  referredBy: document.getElementById('referredBy'),
  overviewPanel: document.getElementById('overviewPanel'),
  pipelineBoard: document.getElementById('pipelineBoard'),
  pipelineSearch: document.getElementById('pipelineSearch'),
  pipelineFilterChips: document.getElementById('pipelineFilterChips'),
  pipelineViewToggle: document.getElementById('pipelineViewToggle'),
  pipelineQuickAddToggle: document.getElementById('pipelineQuickAddToggle'),
  pipelineQuickAdd: document.getElementById('pipelineQuickAdd'),
  customerSearch: document.getElementById('customerSearch'),
  customerList: document.getElementById('customerList'),
  customerDetailPanel: document.getElementById('customerDetailPanel'),
  documentSearch: document.getElementById('documentSearch'),
  documentList: document.getElementById('documentList'),
  expiringAlerts: document.getElementById('expiringAlerts'),
};

const state = {
  data: null,
  selectedCustomerId: null,
  lastAgreementLinkByCustomer: {},
  activeView: 'overview',
  pipelineView: 'table',
  pipelineStageFilter: 'All',
  globalSearch: '',
  pipelineSearch: '',
  customerSearch: '',
  documentSearch: '',
};

const STAGE_LOOKUP = STAGES.reduce((acc, stage) => {
  acc[stage.toLowerCase()] = stage;
  return acc;
}, {});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeStageName(stage) {
  const value = String(stage || '').trim();
  if (!value) return null;
  return STAGE_LOOKUP[value.toLowerCase()] || null;
}

function normalizeLead(lead = {}) {
  const source = typeof lead.source === 'string'
    ? lead.source
    : (lead.source?.code || lead.source?.label || 'Website');

  return {
    id: lead.id,
    customerId: lead.customerId || lead.customer_id || lead.customer?.id || null,
    stage: normalizeStageName(lead.stage) || 'New',
    stageChangedAt: lead.stageChangedAt || lead.stage_changed_at || null,
    daysInStage: Number.isFinite(Number(lead.daysInStage)) ? Number(lead.daysInStage) : 0,
    fullName: lead.fullName || lead.full_name || lead.customer?.full_name || null,
    phone: lead.phone || lead.customer?.phone || null,
    email: lead.email || lead.customer?.email || null,
    notes: lead.notes || lead.customer?.notes || null,
    source,
    referredBy: lead.referredBy || lead.referred_by || null,
    requestedVehicle: lead.requestedVehicle || lead.requested_vehicle || lead.customer?.requested_vehicle || null,
    requestedStartDate: lead.requestedStartDate || lead.requested_start_date || lead.customer?.requested_start_date || null,
    requestedEndDate: lead.requestedEndDate || lead.requested_end_date || lead.customer?.requested_end_date || null,
    deliveryPreference: lead.deliveryPreference || lead.delivery_preference || lead.customer?.delivery_preference || null,
  };
}

function normalizeCustomer(customer = {}) {
  const source = typeof customer.source === 'string'
    ? { code: customer.source, label: customer.source }
    : (customer.source || null);

  return {
    ...customer,
    id: customer.id || customer.customer_id || null,
    full_name: customer.full_name || customer.fullName || null,
    phone: customer.phone || null,
    email: customer.email || null,
    status: customer.status || 'active',
    source,
  };
}

function normalizeDashboardData(raw = {}) {
  const stages = STAGES.reduce((acc, stage) => {
    acc[stage] = [];
    return acc;
  }, {});

  if (raw.stages && typeof raw.stages === 'object') {
    Object.entries(raw.stages).forEach(([key, value]) => {
      const canonical = normalizeStageName(key);
      if (!canonical || !Array.isArray(value)) return;
      stages[canonical] = value.map((lead) => {
        const normalized = normalizeLead(lead);
        normalized.stage = canonical;
        return normalized;
      });
    });
  }

  const hasStageRows = STAGES.some((stage) => stages[stage].length > 0);
  if (!hasStageRows && Array.isArray(raw.leads)) {
    raw.leads.forEach((lead) => {
      const normalized = normalizeLead(lead);
      const stage = normalizeStageName(normalized.stage) || 'New';
      normalized.stage = stage;
      stages[stage].push(normalized);
    });
  }

  const customersRaw = Array.isArray(raw.customers)
    ? raw.customers
    : (raw.customers && typeof raw.customers === 'object' ? Object.values(raw.customers) : []);

  return {
    stages,
    customers: customersRaw.map((customer) => normalizeCustomer(customer)).filter((customer) => customer.id),
    stageHistory: Array.isArray(raw.stageHistory) ? raw.stageHistory : [],
    expiringFlags: Array.isArray(raw.expiringFlags) ? raw.expiringFlags : [],
    agreements: Array.isArray(raw.agreements) ? raw.agreements : [],
  };
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function showLogin() {
  el.loginShell.classList.remove('hidden');
  el.appShell.classList.add('hidden');
}

function showApp() {
  el.loginShell.classList.add('hidden');
  el.appShell.classList.remove('hidden');
}

function setActiveView(view) {
  if (!VIEWS.includes(view)) return;
  state.activeView = view;

  el.navButtons.forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-view') === view);
  });

  el.viewPanels.forEach((panel) => {
    panel.classList.toggle('hidden', panel.getAttribute('data-view-panel') !== view);
  });

  if (view === 'pipeline') {
    el.pipelineQuickAdd.classList.add('hidden');
  }

  if (view === 'customers' || view === 'documents') {
    renderCustomerDetail();
  }
}

async function checkSession() {
  try {
    await api('/.netlify/functions/fce-os-auth-session', { method: 'GET' });
    showApp();
    await loadDashboard();
  } catch {
    showLogin();
  }
}

async function login() {
  el.loginError.textContent = '';
  try {
    await api('/.netlify/functions/fce-os-auth-login', {
      method: 'POST',
      body: JSON.stringify({ password: el.passwordInput.value.trim() }),
    });
    el.passwordInput.value = '';
    showApp();
    await loadDashboard();
  } catch (error) {
    el.loginError.textContent = error.message;
  }
}

async function logout() {
  await api('/.netlify/functions/fce-os-auth-logout', { method: 'POST', body: '{}' });
  showLogin();
}

function allLeads() {
  if (!state.data) return [];
  return STAGES.flatMap((stage) => state.data.stages[stage] || []);
}

function leadByCustomerId(customerId) {
  return allLeads().find((lead) => lead.customerId === customerId) || null;
}

function customerDocumentSummary(customer) {
  const docs = [
    { type: 'DL', label: 'Driver License', documentId: customer.dl_document_id, expirationDate: customer.dl_expiration_date },
    { type: 'Insurance', label: 'Insurance Card', documentId: customer.insurance_document_id, expirationDate: customer.insurance_expiration_date },
  ];

  const statuses = docs.map((doc) => ({ ...doc, ...documentState(doc.expirationDate, !!doc.documentId) }));
  if (statuses.some((doc) => doc.state === 'expired')) return { label: 'Expired', tone: 'danger' };
  if (statuses.some((doc) => doc.state === 'expiring')) return { label: 'Expiring', tone: 'warning' };
  if (statuses.some((doc) => doc.state === 'valid')) return { label: 'Valid', tone: 'success' };
  return { label: 'Missing', tone: 'muted' };
}

function documentState(expirationDate, hasDocument) {
  if (!hasDocument) return { state: 'missing', label: 'Missing', days: null, tone: 'muted' };
  const days = expirationDate ? daysTo(expirationDate) : null;
  if (days === null) return { state: 'missing', label: 'Missing date', days: null, tone: 'muted' };
  if (days < 0) return { state: 'expired', label: `Expired ${Math.abs(days)}d`, days, tone: 'danger' };
  if (days <= 30) return { state: 'expiring', label: `${days}d left`, days, tone: 'warning' };
  return { state: 'valid', label: `${days}d left`, days, tone: 'success' };
}

function badgeHtml(label, tone = 'neutral', extraClass = '') {
  return `<span class="badge badge-${tone} ${extraClass}">${escapeHtml(label)}</span>`;
}

function initials(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return '??';
  return parts.map((part) => part[0]).join('').toUpperCase();
}

function isDateOnlyString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

function parseDateOnlyLocal(value) {
  const [year, month, day] = String(value).split('-').map((part) => Number(part));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function daysTo(value) {
  if (!value) return null;

  const target = isDateOnlyString(value)
    ? parseDateOnlyLocal(value)
    : new Date(value);

  if (!target || Number.isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function formatDate(value) {
  if (!value) return '—';

  const date = isDateOnlyString(value)
    ? parseDateOnlyLocal(value)
    : new Date(value);

  if (!date) return '—';
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function formatCompactDates(lead) {
  const start = lead.requestedStartDate ? formatDate(lead.requestedStartDate) : '—';
  const end = lead.requestedEndDate ? formatDate(lead.requestedEndDate) : '—';
  return `${start} → ${end}`;
}

function formatDays(value) {
  const number = Number(value || 0);
  return `${number} day${number === 1 ? '' : 's'}`;
}

function centsToDollars(cents) {
  const value = Number(cents || 0);
  if (!Number.isFinite(value)) return '';
  return (value / 100).toFixed(2);
}

function dollarsToCents(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100);
}

function toLocalDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function createAgreementRowHtml(agreement) {
  const rentalSummary = [
    `Daily $${centsToDollars(agreement.daily_rate_cents)}`,
    `Total $${centsToDollars(agreement.total_price_cents)}`,
    `${agreement.miles_included_per_day || 0} mi/day`,
    `Overage $${centsToDollars(agreement.mileage_overage_rate_cents)}/mi`,
  ].join(' | ');

  const signedCopyLine = agreement.signed_pdf_storage_path
    ? '<button class="ghost agreement-action-btn" type="button" data-agreement-download="1">Download Signed PDF</button>'
    : '<span class="muted">Signed PDF pending</span>';

  const resendButton = agreement.manual_resend_required
    ? '<button class="ghost agreement-action-btn" type="button" data-agreement-resend="1">Retry PDF/Email</button>'
    : '';

  const manualFlag = agreement.manual_resend_required
    ? `<span class="manual-flag">Manual resend required${agreement.signed_pdf_error ? `: ${escapeHtml(agreement.signed_pdf_error)}` : agreement.signed_email_error ? `: ${escapeHtml(agreement.signed_email_error)}` : ''}</span>`
    : '<span class="muted">Signed copy delivery healthy</span>';

  return `<div class="agreement-row" data-agreement-id="${escapeHtml(agreement.id)}">
    <strong>${escapeHtml(agreement.status)}</strong>
    <span>Created ${formatDateTime(agreement.created_at)}</span>
    <span>Deposit: $${centsToDollars(agreement.deposit_amount_cents)} (${escapeHtml(agreement.deposit_status)})</span>
    <span>Pickup: ${formatDateTime(agreement.pickup_time)} | Return: ${formatDateTime(agreement.return_time)}</span>
    <span>${escapeHtml(rentalSummary)}</span>
    <div class="agreement-row-actions">${signedCopyLine}${resendButton}</div>
    ${manualFlag}
  </div>`;
}

function renderAlertsIntoOverview() {
  const alerts = state.data?.expiringFlags || [];
  if (!alerts.length) {
    el.expiringAlerts.innerHTML = '<div class="muted">No expiring documents right now.</div>';
    return;
  }

  el.expiringAlerts.innerHTML = alerts
    .map((row) => {
      const detail = row.alerts
        .map((alert) => {
          if (alert.days < 0) return `${alert.type.toUpperCase()} expired ${Math.abs(alert.days)} day(s) ago`;
          if (alert.days === 0) return `${alert.type.toUpperCase()} expires today`;
          return `${alert.type.toUpperCase()} expires in ${alert.days} day(s)`;
        })
        .join(' | ');
      return `<div class="alert"><strong>${escapeHtml(row.fullName)}</strong>: ${escapeHtml(detail)}</div>`;
    })
    .join('');
}

function leadMatchesSearch(lead, search) {
  if (!search) return true;
  const hay = [
    lead.fullName,
    lead.phone,
    lead.email,
    lead.requestedVehicle,
    lead.stage,
    lead.source,
  ].join(' ').toLowerCase();
  return hay.includes(search);
}

function customerMatchesSearch(customer, search) {
  if (!search) return true;
  const lead = leadByCustomerId(customer.id);
  const hay = [
    customer.full_name,
    customer.phone,
    customer.email,
    customer.requested_vehicle,
    lead?.requestedVehicle,
  ].join(' ').toLowerCase();
  return hay.includes(search);
}

function documentMatchesSearch(row, search) {
  if (!search) return true;
  const hay = [row.customerName, row.phone, row.vehicle, row.type, row.label].join(' ').toLowerCase();
  return hay.includes(search);
}

function filteredPipelineLeads() {
  const search = `${state.globalSearch} ${state.pipelineSearch}`.trim().toLowerCase();
  const leads = allLeads().filter((lead) => leadMatchesSearch(lead, search));
  if (state.pipelineStageFilter === 'All') return leads;
  return leads.filter((lead) => lead.stage === state.pipelineStageFilter);
}

function filteredCustomers() {
  const search = `${state.globalSearch} ${state.customerSearch}`.trim().toLowerCase();
  return (state.data?.customers || []).filter((customer) => customerMatchesSearch(customer, search));
}

function flattenedDocuments() {
  const docs = [];
  (state.data?.customers || []).forEach((customer) => {
    const lead = leadByCustomerId(customer.id);
    const rows = [
      {
        customerId: customer.id,
        customerName: customer.full_name,
        phone: customer.phone,
        vehicle: lead?.requestedVehicle || customer.requested_vehicle || null,
        type: 'DL',
        label: 'Driver License',
        documentId: customer.dl_document_id,
        expirationDate: customer.dl_expiration_date,
      },
      {
        customerId: customer.id,
        customerName: customer.full_name,
        phone: customer.phone,
        vehicle: lead?.requestedVehicle || customer.requested_vehicle || null,
        type: 'Insurance',
        label: 'Insurance Card',
        documentId: customer.insurance_document_id,
        expirationDate: customer.insurance_expiration_date,
      },
    ];

    rows.forEach((row) => {
      if (!row.documentId) return;
      const stateInfo = documentState(row.expirationDate, true);
      docs.push({ ...row, ...stateInfo });
    });
  });

  docs.sort((a, b) => {
    if (a.state === 'expired' && b.state !== 'expired') return -1;
    if (b.state === 'expired' && a.state !== 'expired') return 1;
    if (a.days === null && b.days === null) return 0;
    if (a.days === null) return 1;
    if (b.days === null) return -1;
    return a.days - b.days;
  });

  const search = `${state.globalSearch} ${state.documentSearch}`.trim().toLowerCase();
  return docs.filter((doc) => documentMatchesSearch(doc, search));
}

function renderOverview() {
  const leads = allLeads();
  const counts = STAGES.reduce((acc, stage) => {
    acc[stage] = state.data?.stages?.[stage]?.length || 0;
    return acc;
  }, {});

  const avgDays = leads.length
    ? (leads.reduce((sum, lead) => sum + Number(lead.daysInStage || 0), 0) / leads.length)
    : 0;

  const urgentLeads = [...leads]
    .sort((a, b) => Number(b.daysInStage || 0) - Number(a.daysInStage || 0))
    .filter((lead) => Number(lead.daysInStage || 0) >= 3)
    .slice(0, 8);

  const needsAttention = urgentLeads.length
    ? urgentLeads.map((lead) => {
      const vehicle = lead.requestedVehicle ? ` • ${escapeHtml(lead.requestedVehicle)}` : '';
      return `<div class="attention-row" data-open-customer="${escapeHtml(lead.customerId || '')}">
        <div>
          <strong>${escapeHtml(lead.fullName || 'Unnamed lead')}</strong>
          <div class="muted">${escapeHtml(lead.phone || 'No phone')}${vehicle}</div>
        </div>
        <div class="attention-meta">
          ${badgeHtml(lead.stage, stageTone(lead.stage))}
          <span>${formatDays(lead.daysInStage)} in stage</span>
        </div>
      </div>`;
    }).join('')
    : '<div class="muted">No aged leads right now.</div>';

  const kpis = [
    { label: 'New leads', value: counts.New },
    { label: 'Quoted', value: counts.Quoted },
    { label: 'Booked', value: counts.Booked },
    { label: 'Avg. days in stage', value: leads.length ? avgDays.toFixed(1) : '0.0' },
  ];

  el.overviewPanel.innerHTML = `
    <section class="panel overview-hero">
      <div class="panel-head">
        <div>
          <h3>Overview</h3>
          <small>Time-sensitive items, KPI snapshot, and leads that need a nudge.</small>
        </div>
      </div>
      <div id="expiringAlerts" class="alerts"></div>
      <div class="kpi-grid">
        ${kpis.map((kpi) => `<div class="kpi-card"><span>${escapeHtml(kpi.label)}</span><strong>${escapeHtml(String(kpi.value))}</strong></div>`).join('')}
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><h3>Needs attention</h3><small>Sorted by time in stage.</small></div>
      <div class="attention-list">${needsAttention}</div>
    </section>
  `;

  const overviewAlerts = document.getElementById('expiringAlerts');
  if (overviewAlerts) {
    overviewAlerts.innerHTML = state.data?.expiringFlags?.length ? state.data.expiringFlags.map((row) => {
      const detail = row.alerts.map((alert) => {
        if (alert.days < 0) return `${alert.type.toUpperCase()} expired ${Math.abs(alert.days)} day(s) ago`;
        if (alert.days === 0) return `${alert.type.toUpperCase()} expires today`;
        return `${alert.type.toUpperCase()} expires in ${alert.days} day(s)`;
      }).join(' | ');
      return `<div class="alert"><strong>${escapeHtml(row.fullName)}</strong>: ${escapeHtml(detail)}</div>`;
    }).join('') : '<div class="muted">No expiring documents right now.</div>';
  }

  document.querySelectorAll('[data-open-customer]').forEach((row) => {
    row.addEventListener('click', () => {
      const customerId = row.getAttribute('data-open-customer');
      if (customerId) openCustomer(customerId, 'customers');
    });
  });
}

function stageTone(stage) {
  switch (stage) {
    case 'New': return 'blue';
    case 'Quoted': return 'purple';
    case 'Booked': return 'green';
    case 'Lost': return 'danger';
    default: return 'gold';
  }
}

function renderPipeline() {
  const leads = filteredPipelineLeads();
  const counts = STAGES.reduce((acc, stage) => {
    acc[stage] = state.data?.stages?.[stage]?.length || 0;
    return acc;
  }, {});

  el.pipelineFilterChips.innerHTML = ['All', ...STAGES].map((stage) => {
    const count = stage === 'All' ? allLeads().length : counts[stage];
    const active = state.pipelineStageFilter === stage ? 'active' : '';
    return `<button class="chip ${active}" type="button" data-pipeline-stage="${escapeHtml(stage)}">${escapeHtml(stage)} <span>${count}</span></button>`;
  }).join('');

  el.pipelineViewToggle.innerHTML = `
    <button class="chip ${state.pipelineView === 'table' ? 'active' : ''}" type="button" data-pipeline-view="table">Table</button>
    <button class="chip ${state.pipelineView === 'kanban' ? 'active' : ''}" type="button" data-pipeline-view="kanban">Kanban</button>
  `;

  if (state.pipelineView === 'table') {
    el.pipelineBoard.innerHTML = `
      <div class="table-wrap">
        <table class="crm-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Vehicle</th>
              <th>Dates</th>
              <th>Stage</th>
              <th>Days</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${leads.map((lead) => {
              const sourceTag = lead.referredBy ? `${lead.source} (${lead.referredBy})` : lead.source;
              return `
                <tr draggable="true" data-lead-id="${escapeHtml(lead.id)}" data-customer-id="${escapeHtml(lead.customerId || '')}">
                  <td>
                    <div class="row-client">
                      <div class="avatar">${escapeHtml(initials(lead.fullName))}</div>
                      <div>
                        <strong>${escapeHtml(lead.fullName || 'Unnamed lead')}</strong>
                        <div class="muted">${escapeHtml(lead.phone || 'No phone')}${lead.email ? ` • ${escapeHtml(lead.email)}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>${escapeHtml(lead.requestedVehicle || 'No vehicle yet')}</div>
                    <div class="muted">${escapeHtml(sourceTag)}</div>
                  </td>
                  <td>
                    <div>${escapeHtml(formatCompactDates(lead))}</div>
                    <div class="muted">${escapeHtml(lead.stageChangedAt ? formatDate(lead.stageChangedAt) : 'No stage timestamp')}</div>
                  </td>
                  <td>${badgeHtml(lead.stage, stageTone(lead.stage))}</td>
                  <td><span class="days-pill">${escapeHtml(formatDays(lead.daysInStage))}</span></td>
                  <td>
                    <div class="row-actions">
                      <select data-lead-move="${escapeHtml(lead.id)}">
                        ${STAGES.map((stage) => `<option value="${stage}" ${stage === lead.stage ? 'selected' : ''}>${stage}</option>`).join('')}
                      </select>
                      <button class="ghost" type="button" data-lead-open="${escapeHtml(lead.customerId || '')}">Open</button>
                      <button class="ghost danger-action" type="button" data-lead-delete="${escapeHtml(lead.id)}" data-customer-id="${escapeHtml(lead.customerId || '')}" data-lead-name="${escapeHtml(lead.fullName || '')}">Delete</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="6" class="muted">No leads match the current filter.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } else {
    el.pipelineBoard.innerHTML = `
      <div class="pipeline-kanban">
        ${STAGES.map((stage) => {
          const stageLeads = leads.filter((lead) => lead.stage === stage);
          return `
            <section class="stage" data-stage="${escapeHtml(stage)}">
              <div class="stage-head">
                <h4>${escapeHtml(stage)}</h4>
                <span>${stageLeads.length}</span>
              </div>
              ${stageLeads.map((lead) => {
                const sourceTag = lead.referredBy ? `${lead.source} (${lead.referredBy})` : lead.source;
                const requestedDates = [lead.requestedStartDate, lead.requestedEndDate].filter(Boolean).join(' to ');
                return `
                  <div class="card compact" draggable="true" data-lead-id="${escapeHtml(lead.id)}">
                    <div class="card-top">
                      <div>
                        <div class="name">${escapeHtml(lead.fullName || 'Unnamed lead')}</div>
                        <div class="meta">${escapeHtml(sourceTag)}</div>
                      </div>
                      ${badgeHtml(lead.stage, stageTone(lead.stage))}
                    </div>
                    <div class="meta">${escapeHtml(lead.phone || '')}${lead.email ? ` • ${escapeHtml(lead.email)}` : ''}</div>
                    <div class="meta">${escapeHtml(lead.requestedVehicle || 'No requested vehicle yet')}</div>
                    <div class="meta">${escapeHtml(requestedDates || 'Dates not set')}</div>
                    <div class="stage-days">${escapeHtml(formatDays(lead.daysInStage))} in stage</div>
                    <div class="row-actions row-actions-tight">
                      <select data-lead-move="${escapeHtml(lead.id)}">
                        ${STAGES.map((s) => `<option value="${s}" ${s === lead.stage ? 'selected' : ''}>${s}</option>`).join('')}
                      </select>
                      <button class="ghost" type="button" data-lead-open="${escapeHtml(lead.customerId || '')}">Open</button>
                      <button class="ghost danger-action" type="button" data-lead-delete="${escapeHtml(lead.id)}" data-customer-id="${escapeHtml(lead.customerId || '')}" data-lead-name="${escapeHtml(lead.fullName || '')}">Delete</button>
                    </div>
                  </div>
                `;
              }).join('') || '<div class="muted">No leads in this stage.</div>'}
            </section>
          `;
        }).join('')}
      </div>
    `;
  }

  document.querySelectorAll('[data-pipeline-stage]').forEach((button) => {
    button.addEventListener('click', () => {
      state.pipelineStageFilter = button.getAttribute('data-pipeline-stage') || 'All';
      renderPipeline();
    });
  });

  document.querySelectorAll('[data-pipeline-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.pipelineView = button.getAttribute('data-pipeline-view') || 'table';
      renderPipeline();
    });
  });

  document.querySelectorAll('[data-lead-move]').forEach((select) => {
    select.addEventListener('change', async (event) => {
      const leadId = event.target.getAttribute('data-lead-move');
      await moveLead(leadId, event.target.value);
    });
  });

  document.querySelectorAll('.card[draggable="true"], tr[draggable="true"]').forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/lead-id', card.getAttribute('data-lead-id'));
    });
  });

  document.querySelectorAll('.stage').forEach((stageColumn) => {
    stageColumn.addEventListener('dragover', (event) => event.preventDefault());
    stageColumn.addEventListener('drop', async (event) => {
      event.preventDefault();
      const leadId = event.dataTransfer.getData('text/lead-id');
      const stage = stageColumn.getAttribute('data-stage');
      if (leadId && stage) {
        await moveLead(leadId, stage);
      }
    });
  });

  document.querySelectorAll('[data-lead-delete]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const target = event.currentTarget;
      const leadId = target.getAttribute('data-lead-delete');
      const customerId = target.getAttribute('data-customer-id');
      const leadName = target.getAttribute('data-lead-name') || 'this lead';

      const confirmed = window.confirm(`Delete this lead? This can't be undone.\n\n${leadName}`);
      if (!confirmed) return;

      try {
        await deleteLeadCustomer({ leadId, customerId });
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  document.querySelectorAll('[data-lead-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const customerId = button.getAttribute('data-lead-open');
      if (customerId) openCustomer(customerId, 'customers');
    });
  });
}

function renderCustomerList() {
  const rows = filteredCustomers();

  el.customerList.innerHTML = `
    <div class="table-wrap">
      <table class="crm-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Last vehicle</th>
            <th>Documents</th>
            <th>Lead</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => {
            const lead = leadByCustomerId(row.id);
            const docSummary = customerDocumentSummary(row);
            return `
              <tr class="selectable-row ${row.id === state.selectedCustomerId ? 'active' : ''}" data-customer-id="${escapeHtml(row.id)}">
                <td>
                  <div class="row-client">
                    <div class="avatar">${escapeHtml(initials(row.full_name))}</div>
                    <div>
                      <strong>${escapeHtml(row.full_name || 'Unnamed customer')}</strong>
                      <div class="muted">${escapeHtml(row.phone || 'No phone')}${row.email ? ` • ${escapeHtml(row.email)}` : ''}</div>
                    </div>
                  </div>
                </td>
                <td>${escapeHtml(lead?.requestedVehicle || row.requested_vehicle || '—')}</td>
                <td>${badgeHtml(docSummary.label, docSummary.tone)}</td>
                <td>${lead ? badgeHtml(lead.stage, stageTone(lead.stage)) : badgeHtml('No lead', 'muted')}</td>
                <td><button class="ghost" type="button" data-customer-open="${escapeHtml(row.id)}">Open</button></td>
              </tr>
            `;
          }).join('') || '<tr><td colspan="5" class="muted">No customers match your search.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll('[data-customer-id], [data-customer-open]').forEach((row) => {
    row.addEventListener('click', () => {
      const customerId = row.getAttribute('data-customer-id') || row.getAttribute('data-customer-open');
      if (customerId) openCustomer(customerId, 'customers');
    });
  });
}

function renderDocumentsView() {
  const rows = flattenedDocuments();

  el.documentList.innerHTML = `
    <div class="table-wrap">
      <table class="crm-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Type</th>
            <th>Vehicle</th>
            <th>Expires</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr class="selectable-row ${row.state === 'expired' ? 'danger-row' : ''}" data-customer-id="${escapeHtml(row.customerId)}">
              <td>
                <strong>${escapeHtml(row.customerName || 'Unnamed customer')}</strong>
                <div class="muted">${escapeHtml(row.phone || 'No phone')}</div>
              </td>
              <td>${escapeHtml(row.label)}</td>
              <td>${escapeHtml(row.vehicle || '—')}</td>
              <td>${escapeHtml(formatDate(row.expirationDate))}</td>
              <td>${badgeHtml(row.label.includes('Insurance') ? row.state : row.state, row.state === 'expired' ? 'danger' : row.state === 'expiring' ? 'warning' : 'success')}</td>
              <td>
                <div class="row-actions">
                  <button class="ghost" type="button" data-doc-open="${escapeHtml(row.documentId)}" data-doc-label="${escapeHtml(row.label)}">View</button>
                  <button class="ghost" type="button" data-customer-open="${escapeHtml(row.customerId)}">Open customer</button>
                </div>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="6" class="muted">No documents match your search.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll('[data-doc-open]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const documentId = button.getAttribute('data-doc-open');
      const label = button.getAttribute('data-doc-label') || 'Document';
      if (!documentId) return;

      try {
        const result = await api(`/.netlify/functions/fce-os-document-download-link?documentId=${encodeURIComponent(documentId)}`, { method: 'GET' });
        window.open(result.signedUrl, '_blank', 'noopener');
      } catch (error) {
        window.alert(`${label}: ${error.message}`);
      }
    });
  });

  document.querySelectorAll('[data-customer-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const customerId = button.getAttribute('data-customer-open');
      if (customerId) openCustomer(customerId, 'customers');
    });
  });
}

function renderHistoryForLead(leadId) {
  const history = (state.data.stageHistory || []).filter((item) => item.lead_id === leadId).slice(0, 20);
  if (!history.length) return '<div class="muted">No stage history yet.</div>';

  return history.map((item) => {
    const from = item.from_stage || 'Start';
    return `<div class="muted">${escapeHtml(formatDateTime(item.changed_at))} | ${escapeHtml(from)} -> ${escapeHtml(item.to_stage)} (${escapeHtml(item.changed_by)})</div>`;
  }).join('');
}

function renderCustomerDetail() {
  if (!state.selectedCustomerId) {
    el.customerDetailPanel.innerHTML = '<div class="panel-head"><h3>Customer Detail</h3></div><div class="muted">Select a customer from the list.</div>';
    return;
  }

  const customer = (state.data.customers || []).find((c) => c.id === state.selectedCustomerId);
  if (!customer) {
    el.customerDetailPanel.innerHTML = '<div class="muted">Customer not found.</div>';
    return;
  }

  const lead = leadByCustomerId(customer.id);
  const customerAgreements = (state.data.agreements || []).filter((row) => row.customer_id === customer.id);
  const newestAgreement = customerAgreements[0] || null;
  const docSummary = customerDocumentSummary(customer);

  el.customerDetailPanel.innerHTML = `
    <div class="panel-head">
      <div>
        <h3>${escapeHtml(customer.full_name || 'Unnamed customer')}</h3>
        <small>${escapeHtml(customer.phone || 'No phone')}${customer.email ? ` • ${escapeHtml(customer.email)}` : ''}</small>
      </div>
      <div class="detail-badges">
        ${badgeHtml(docSummary.label, docSummary.tone)}
        ${lead ? badgeHtml(lead.stage, stageTone(lead.stage)) : badgeHtml('No lead', 'muted')}
      </div>
    </div>
    <div class="detail-actions">
      <button id="customerDeleteBtn" class="ghost danger-action" type="button">Delete Customer + Lead</button>
    </div>
    <form id="customerEditForm" class="grid-form">
      <input name="full_name" value="${escapeHtml(customer.full_name || '')}" placeholder="Full name">
      <input name="phone" value="${escapeHtml(customer.phone || '')}" placeholder="Phone">
      <input name="email" value="${escapeHtml(customer.email || '')}" placeholder="Email">
      <input name="address" value="${escapeHtml(customer.address || '')}" placeholder="Address">
      <input name="requested_vehicle" value="${escapeHtml(customer.requested_vehicle || '')}" placeholder="Requested car">
      <input name="requested_start_date" type="date" value="${escapeHtml(customer.requested_start_date || '')}">
      <input name="requested_end_date" type="date" value="${escapeHtml(customer.requested_end_date || '')}">
      <input name="delivery_preference" value="${escapeHtml(customer.delivery_preference || '')}" placeholder="Delivery preference">
      <textarea name="notes" placeholder="Notes">${escapeHtml(customer.notes || '')}</textarea>
      <button class="primary" type="submit">Save Customer</button>
    </form>

    <h3 style="margin-top:1rem">Documents</h3>
    <div class="doc-grid">
      <form class="doc-form" data-doc-type="dl">
        <strong>Driver License</strong>
        <div class="muted">${customer.dl_document_id ? `<button class="ghost" type="button" data-doc-download="${escapeHtml(customer.dl_document_id)}" data-doc-label="Driver License">View Driver License</button>` : 'No file uploaded yet.'}</div>
        <input type="date" name="expirationDate" value="${escapeHtml(customer.dl_expiration_date || '')}" required>
        <input type="file" name="file" accept="image/*,application/pdf" required>
        <button class="primary" type="submit">Upload DL</button>
      </form>
      <form class="doc-form" data-doc-type="insurance">
        <strong>Insurance Card</strong>
        <div class="muted">${customer.insurance_document_id ? `<button class="ghost" type="button" data-doc-download="${escapeHtml(customer.insurance_document_id)}" data-doc-label="Insurance Card">View Insurance Card</button>` : 'No file uploaded yet.'}</div>
        <input type="date" name="expirationDate" value="${escapeHtml(customer.insurance_expiration_date || '')}" required>
        <input type="file" name="file" accept="image/*,application/pdf" required>
        <button class="primary" type="submit">Upload Insurance</button>
      </form>
    </div>

    <div style="margin-top:1rem">
      <h3>Stage History</h3>
      ${lead ? renderHistoryForLead(lead.id) : '<div class="muted">No lead pipeline record for this customer.</div>'}
    </div>

    <div style="margin-top:1rem" class="agreements-section">
      <h3>Rental Agreement</h3>
      <form id="agreementCreateForm" class="agreement-create-form">
        <input type="number" name="dailyRate" min="0" step="0.01" placeholder="Daily rate ($)" required>
        <input type="number" name="totalPrice" min="0" step="0.01" placeholder="Total price ($)" required>
        <input type="number" name="milesIncludedPerDay" min="0" step="1" placeholder="Miles included/day" required>
        <input type="number" name="mileageOverageRate" min="0" step="0.01" placeholder="Overage rate per mile ($)">
        <input type="number" name="depositAmount" min="0" step="0.01" placeholder="Deposit amount ($)" required>
        <input type="datetime-local" name="pickupTime" value="${escapeHtml(toLocalDateTimeInput(newestAgreement?.pickup_time))}" required>
        <input type="datetime-local" name="returnTime" value="${escapeHtml(toLocalDateTimeInput(newestAgreement?.return_time))}" required>
        <input type="text" name="fuelTerms" placeholder="Fuel terms (e.g. return full)" value="${escapeHtml(newestAgreement?.fuel_terms || '')}">
        <input type="text" name="additionalDriverNames" placeholder="Additional drivers (comma separated)" value="${escapeHtml(newestAgreement?.additional_driver_names || '')}">
        <input type="number" name="expiryHours" min="1" max="168" value="48" placeholder="Link expiry hours">
        <button class="primary" type="submit">Create Mobile Signing Link</button>
      </form>
      <div class="muted" id="agreementLinkResult">${state.lastAgreementLinkByCustomer[customer.id] ? `<a href="${escapeHtml(state.lastAgreementLinkByCustomer[customer.id])}" target="_blank" rel="noopener">Open latest signing link</a>` : 'No new link generated in this session.'}</div>
      ${newestAgreement ? `<div class="muted">Latest agreement: ${escapeHtml(newestAgreement.status)} | expires ${escapeHtml(formatDateTime(newestAgreement.token_expires_at))}</div>` : '<div class="muted">No agreements yet for this customer.</div>'}
      <div class="agreement-list">
        ${customerAgreements.map((agreement) => createAgreementRowHtml(agreement)).join('') || ''}
      </div>
    </div>

    <div class="error" id="customerDetailError"></div>
    <div class="success" id="customerDetailSuccess"></div>
  `;

  const editForm = document.getElementById('customerEditForm');
  const customerDeleteBtn = document.getElementById('customerDeleteBtn');
  customerDeleteBtn.addEventListener('click', async () => {
    const confirmed = window.confirm(`Delete this lead? This can't be undone.\n\n${customer.full_name || ''}`);
    if (!confirmed) return;

    try {
      await deleteLeadCustomer({ customerId: customer.id, leadId: lead?.id || null });
    } catch (error) {
      document.getElementById('customerDetailError').textContent = error.message;
    }
  });

  editForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(editForm);
    const payload = { customerId: customer.id };
    for (const [k, v] of fd.entries()) {
      payload[k] = v || null;
    }

    try {
      await api('/.netlify/functions/fce-os-customer-update', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      document.getElementById('customerDetailSuccess').textContent = 'Customer updated.';
      await loadDashboard(false);
    } catch (error) {
      document.getElementById('customerDetailError').textContent = error.message;
    }
  });

  document.querySelectorAll('.doc-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const target = event.currentTarget;
      const docType = target.getAttribute('data-doc-type');
      const fileInput = target.querySelector('input[name="file"]');
      const dateInput = target.querySelector('input[name="expirationDate"]');

      const file = fileInput.files[0];
      if (!file) return;

      try {
        const b64 = await toBase64(file);
        await api('/.netlify/functions/fce-os-document-upload', {
          method: 'POST',
          body: JSON.stringify({
            customerId: customer.id,
            docType,
            expirationDate: dateInput.value,
            fileName: file.name,
            mimeType: file.type,
            fileBase64: b64,
          }),
        });
        document.getElementById('customerDetailSuccess').textContent = `${docType.toUpperCase()} uploaded.`;
        await loadDashboard(false);
      } catch (error) {
        document.getElementById('customerDetailError').textContent = error.message;
      }
    });
  });

  document.querySelectorAll('[data-doc-download]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      document.getElementById('customerDetailError').textContent = '';

      const target = event.currentTarget;
      const documentId = target.getAttribute('data-doc-download');
      const label = target.getAttribute('data-doc-label') || 'Document';
      if (!documentId) return;

      try {
        const result = await api(`/.netlify/functions/fce-os-document-download-link?documentId=${encodeURIComponent(documentId)}`, {
          method: 'GET',
        });
        window.open(result.signedUrl, '_blank', 'noopener');
      } catch (error) {
        document.getElementById('customerDetailError').textContent = `${label}: ${error.message}`;
      }
    });
  });

  const agreementForm = document.getElementById('agreementCreateForm');
  agreementForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    document.getElementById('customerDetailError').textContent = '';
    document.getElementById('customerDetailSuccess').textContent = '';

    const fd = new FormData(agreementForm);
    const dailyRateCents = dollarsToCents(fd.get('dailyRate'));
    const totalPriceCents = dollarsToCents(fd.get('totalPrice'));
    const overageRateCents = dollarsToCents(fd.get('mileageOverageRate') || 0);
    const depositAmountCents = dollarsToCents(fd.get('depositAmount'));
    const milesIncludedPerDay = Number(fd.get('milesIncludedPerDay') || 0);
    const pickupTime = String(fd.get('pickupTime') || '').trim();
    const returnTime = String(fd.get('returnTime') || '').trim();

    if (dailyRateCents === null || dailyRateCents < 0 ||
      totalPriceCents === null || totalPriceCents < 0 ||
      depositAmountCents === null || depositAmountCents < 0 ||
      !Number.isFinite(milesIncludedPerDay) || milesIncludedPerDay <= 0 ||
      !pickupTime || !returnTime) {
      document.getElementById('customerDetailError').textContent = 'Daily rate, total price, miles/day, deposit, pickup and return date/time are required before creating a signing link.';
      return;
    }

    const payload = {
      customerId: customer.id,
      leadId: lead?.id || null,
      dailyRateCents,
      totalPriceCents,
      milesIncludedPerDay,
      mileageOverageRateCents: overageRateCents || 0,
      fuelTerms: String(fd.get('fuelTerms') || '').trim() || null,
      pickupTime,
      returnTime,
      additionalDriverNames: String(fd.get('additionalDriverNames') || '').trim() || null,
      depositAmountCents,
      expiryHours: Number(fd.get('expiryHours') || 48),
    };

    try {
      const result = await api('/.netlify/functions/fce-os-agreements-create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      state.lastAgreementLinkByCustomer[customer.id] = result.signingLink;
      document.getElementById('agreementLinkResult').innerHTML = `<a href="${escapeHtml(result.signingLink)}" target="_blank" rel="noopener">Open signing link</a>`;
      document.getElementById('customerDetailSuccess').textContent = 'Agreement link created.';
      await loadDashboard(false);
    } catch (error) {
      document.getElementById('customerDetailError').textContent = error.message;
    }
  });

  document.querySelectorAll('[data-agreement-download]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const agreementId = event.currentTarget.closest('[data-agreement-id]')?.getAttribute('data-agreement-id');
      if (!agreementId) return;

      try {
        const result = await api(`/.netlify/functions/fce-os-agreements-download-link?agreementId=${encodeURIComponent(agreementId)}`, {
          method: 'GET',
        });
        window.open(result.signedUrl, '_blank', 'noopener');
      } catch (error) {
        document.getElementById('customerDetailError').textContent = error.message;
      }
    });
  });

  document.querySelectorAll('[data-agreement-resend]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const agreementId = event.currentTarget.closest('[data-agreement-id]')?.getAttribute('data-agreement-id');
      if (!agreementId) return;

      document.getElementById('customerDetailError').textContent = '';
      document.getElementById('customerDetailSuccess').textContent = '';

      try {
        const result = await api('/.netlify/functions/fce-os-agreements-resend', {
          method: 'POST',
          body: JSON.stringify({ agreementId }),
        });

        if (result.signedCopy?.manualResendRequired) {
          document.getElementById('customerDetailError').textContent = (result.signedCopy.errors || []).join(' | ') || 'Manual resend is still required.';
        } else {
          document.getElementById('customerDetailSuccess').textContent = 'Signed PDF and customer email were resent successfully.';
        }
        await loadDashboard(false);
      } catch (error) {
        document.getElementById('customerDetailError').textContent = error.message;
      }
    });
  });
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      const idx = value.indexOf(',');
      resolve(idx >= 0 ? value.slice(idx + 1) : value);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function moveLead(leadId, stage) {
  await api('/.netlify/functions/fce-os-leads-move', {
    method: 'POST',
    body: JSON.stringify({ leadId, stage }),
  });
  await loadDashboard(false);
}

async function deleteLeadCustomer({ leadId = null, customerId = null }) {
  const result = await api('/.netlify/functions/fce-os-leads-delete', {
    method: 'POST',
    body: JSON.stringify({ leadId, customerId }),
  });

  const deletedCustomerId = result?.deleted?.customerId || customerId;

  if (state.selectedCustomerId && deletedCustomerId && state.selectedCustomerId === deletedCustomerId) {
    state.selectedCustomerId = null;
  }

  await loadDashboard(true);
}

async function createQuickLead(event) {
  event.preventDefault();
  el.quickLeadError.textContent = '';
  el.quickLeadSuccess.textContent = '';

  const data = Object.fromEntries(new FormData(el.quickLeadForm).entries());
  try {
    await api('/.netlify/functions/fce-os-leads-create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    el.quickLeadForm.reset();
    el.referredBy.classList.add('hidden');
    el.quickLeadSuccess.textContent = 'Lead created in New stage.';
    state.pipelineStageFilter = 'All';
    state.pipelineView = 'table';
    await loadDashboard();
    setActiveView('pipeline');
  } catch (error) {
    el.quickLeadError.textContent = error.message;
  }
}

function openCustomer(customerId, view = 'customers') {
  state.selectedCustomerId = customerId;
  setActiveView(view);
  renderAll();
}

function renderAll() {
  renderOverview();
  renderPipeline();
  renderCustomerList();
  renderCustomerDetail();
  renderDocumentsView();
}

async function loadDashboard(resetSelection = true) {
  const response = await api('/.netlify/functions/fce-os-dashboard', { method: 'GET' });
  const data = normalizeDashboardData(response);
  state.data = data;

  if (resetSelection && data.customers.length) {
    state.selectedCustomerId = data.customers[0].id;
  }

  if (state.selectedCustomerId && !data.customers.some((x) => x.id === state.selectedCustomerId)) {
    state.selectedCustomerId = data.customers[0]?.id || null;
  }

  if (!state.selectedCustomerId && data.customers.length) {
    state.selectedCustomerId = data.customers[0].id;
  }

  renderAll();
  setActiveView(state.activeView);
}

el.loginBtn.addEventListener('click', login);
el.passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') login();
});
el.logoutBtn.addEventListener('click', logout);
el.refreshBtn.addEventListener('click', () => loadDashboard(false));
el.quickLeadForm.addEventListener('submit', createQuickLead);

el.globalSearch.addEventListener('input', () => {
  state.globalSearch = el.globalSearch.value.trim().toLowerCase();
  renderAll();
});

el.pipelineSearch.addEventListener('input', () => {
  state.pipelineSearch = el.pipelineSearch.value.trim().toLowerCase();
  renderPipeline();
});

el.customerSearch.addEventListener('input', () => {
  state.customerSearch = el.customerSearch.value.trim().toLowerCase();
  renderCustomerList();
});

el.documentSearch.addEventListener('input', () => {
  state.documentSearch = el.documentSearch.value.trim().toLowerCase();
  renderDocumentsView();
});

el.navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActiveView(button.getAttribute('data-view'));
    renderAll();
  });
});

el.pipelineQuickAddToggle.addEventListener('click', () => {
  el.pipelineQuickAdd.classList.toggle('hidden');
});

el.leadSource.addEventListener('change', () => {
  if (el.leadSource.value === 'Referral') {
    el.referredBy.classList.remove('hidden');
  } else {
    el.referredBy.classList.add('hidden');
    el.referredBy.value = '';
  }
});

checkSession();
