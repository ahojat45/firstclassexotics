const STAGES = ['New', 'Contacted', 'Quoted', 'Booked', 'Lost'];

const el = {
  loginShell: document.getElementById('loginShell'),
  appShell: document.getElementById('appShell'),
  passwordInput: document.getElementById('passwordInput'),
  loginBtn: document.getElementById('loginBtn'),
  loginError: document.getElementById('loginError'),
  refreshBtn: document.getElementById('refreshBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  quickLeadForm: document.getElementById('quickLeadForm'),
  quickLeadError: document.getElementById('quickLeadError'),
  quickLeadSuccess: document.getElementById('quickLeadSuccess'),
  leadSource: document.getElementById('leadSource'),
  referredBy: document.getElementById('referredBy'),
  pipelineBoard: document.getElementById('pipelineBoard'),
  customerSearch: document.getElementById('customerSearch'),
  customerList: document.getElementById('customerList'),
  customerDetailPanel: document.getElementById('customerDetailPanel'),
  expiringAlerts: document.getElementById('expiringAlerts'),
};

const state = {
  data: null,
  selectedCustomerId: null,
  lastAgreementLinkByCustomer: {},
};

const STAGE_LOOKUP = STAGES.reduce((acc, stage) => {
  acc[stage.toLowerCase()] = stage;
  return acc;
}, {});

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

function leadByCustomerId(customerId) {
  if (!state.data) return null;
  for (const stage of STAGES) {
    const hit = (state.data.stages[stage] || []).find((lead) => lead.customerId === customerId);
    if (hit) return hit;
  }
  return null;
}

function renderAlerts() {
  const alerts = state.data?.expiringFlags || [];
  if (!alerts.length) {
    el.expiringAlerts.innerHTML = '';
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
      return `<div class="alert"><strong>${row.fullName}</strong>: ${detail}</div>`;
    })
    .join('');
}

function renderPipeline() {
  const board = STAGES.map((stage) => {
    const cards = (state.data.stages[stage] || [])
      .map((lead) => {
        const sourceTag = lead.referredBy ? `${lead.source} (${lead.referredBy})` : lead.source;
        const requestedDates = [lead.requestedStartDate, lead.requestedEndDate].filter(Boolean).join(' to ');
        return `
          <div class="card" draggable="true" data-lead-id="${lead.id}">
            <div class="name">${lead.fullName || 'Unnamed lead'}</div>
            <div class="meta">${sourceTag}</div>
            <div class="meta">${lead.phone || ''} ${lead.email ? `| ${lead.email}` : ''}</div>
            <div class="meta">${lead.requestedVehicle || 'No requested vehicle yet'}</div>
            <div class="meta">${requestedDates || 'Dates not set'}</div>
            <div class="stage-days">${lead.daysInStage} day(s) in stage</div>
            <select data-lead-move="${lead.id}">
              ${STAGES.map((s) => `<option value="${s}" ${s === lead.stage ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button class="ghost" type="button" data-lead-delete="${lead.id}" data-customer-id="${lead.customerId || ''}" data-lead-name="${lead.fullName || ''}">Delete</button>
          </div>
        `;
      })
      .join('');

    return `
      <section class="stage" data-stage="${stage}">
        <h4>${stage}</h4>
        ${cards || '<div class="muted">No leads</div>'}
      </section>
    `;
  }).join('');

  el.pipelineBoard.innerHTML = board;

  document.querySelectorAll('[data-lead-move]').forEach((select) => {
    select.addEventListener('change', async (event) => {
      const leadId = event.target.getAttribute('data-lead-move');
      await moveLead(leadId, event.target.value);
    });
  });

  document.querySelectorAll('.card[draggable="true"]').forEach((card) => {
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
}

function renderCustomerList() {
  const q = el.customerSearch.value.trim().toLowerCase();
  const rows = (state.data.customers || []).filter((row) => {
    const hay = `${row.full_name || ''} ${row.phone || ''} ${row.email || ''}`.toLowerCase();
    return hay.includes(q);
  });

  el.customerList.innerHTML = rows
    .map((row) => {
      const activeClass = row.id === state.selectedCustomerId ? 'active' : '';
      const lead = leadByCustomerId(row.id);
      const sourceCode = typeof row.source === 'string' ? row.source : (row.source?.code || 'Unknown');
      return `
        <div class="customer-item ${activeClass}" data-customer-id="${row.id}">
          <div><strong>${row.full_name}</strong></div>
          <small>${row.phone || ''} ${row.email ? `| ${row.email}` : ''}</small>
          <small>Source: ${sourceCode} | Status: ${row.status}</small>
          <small>Stage: ${lead?.stage || 'No lead'}</small>
        </div>
      `;
    })
    .join('') || '<div class="muted">No customers match your search.</div>';

  document.querySelectorAll('[data-customer-id]').forEach((row) => {
    row.addEventListener('click', () => {
      state.selectedCustomerId = row.getAttribute('data-customer-id');
      renderCustomerList();
      renderCustomerDetail();
    });
  });
}

function renderHistoryForLead(leadId) {
  const history = (state.data.stageHistory || []).filter((item) => item.lead_id === leadId).slice(0, 20);
  if (!history.length) return '<div class="muted">No stage history yet.</div>';

  return history.map((item) => {
    const from = item.from_stage || 'Start';
    return `<div class="muted">${new Date(item.changed_at).toLocaleString()} | ${from} -> ${item.to_stage} (${item.changed_by})</div>`;
  }).join('');
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
    ? `<span class="manual-flag">Manual resend required${agreement.signed_pdf_error ? `: ${agreement.signed_pdf_error}` : agreement.signed_email_error ? `: ${agreement.signed_email_error}` : ''}</span>`
    : '<span class="muted">Signed copy delivery healthy</span>';

  return `<div class="agreement-row" data-agreement-id="${agreement.id}">
    <strong>${agreement.status}</strong>
    <span>Created ${new Date(agreement.created_at).toLocaleString()}</span>
    <span>Deposit: $${centsToDollars(agreement.deposit_amount_cents)} (${agreement.deposit_status})</span>
    <span>Pickup: ${agreement.pickup_time ? new Date(agreement.pickup_time).toLocaleString() : 'N/A'} | Return: ${agreement.return_time ? new Date(agreement.return_time).toLocaleString() : 'N/A'}</span>
    <span>${rentalSummary}</span>
    <div class="agreement-row-actions">${signedCopyLine}${resendButton}</div>
    ${manualFlag}
  </div>`;
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

  el.customerDetailPanel.innerHTML = `
    <div class="panel-head"><h3>${customer.full_name}</h3></div>
    <div style="margin-bottom:0.75rem"><button id="customerDeleteBtn" class="ghost" type="button">Delete Customer + Lead</button></div>
    <form id="customerEditForm" class="grid-form">
      <input name="full_name" value="${customer.full_name || ''}" placeholder="Full name">
      <input name="phone" value="${customer.phone || ''}" placeholder="Phone">
      <input name="email" value="${customer.email || ''}" placeholder="Email">
      <input name="address" value="${customer.address || ''}" placeholder="Address">
      <input name="requested_vehicle" value="${customer.requested_vehicle || ''}" placeholder="Requested car">
      <input name="requested_start_date" type="date" value="${customer.requested_start_date || ''}">
      <input name="requested_end_date" type="date" value="${customer.requested_end_date || ''}">
      <input name="delivery_preference" value="${customer.delivery_preference || ''}" placeholder="Delivery preference">
      <textarea name="notes" placeholder="Notes">${customer.notes || ''}</textarea>
      <button class="primary" type="submit">Save Customer</button>
    </form>

    <h3 style="margin-top:1rem">Documents</h3>
    <div class="doc-grid">
      <form class="doc-form" data-doc-type="dl">
        <strong>Driver License</strong>
        <input type="date" name="expirationDate" value="${customer.dl_expiration_date || ''}" required>
        <input type="file" name="file" accept="image/*" required>
        <button class="primary" type="submit">Upload DL</button>
      </form>
      <form class="doc-form" data-doc-type="insurance">
        <strong>Insurance Card</strong>
        <input type="date" name="expirationDate" value="${customer.insurance_expiration_date || ''}" required>
        <input type="file" name="file" accept="image/*" required>
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
        <input type="datetime-local" name="pickupTime" value="${toLocalDateTimeInput(newestAgreement?.pickup_time)}" required>
        <input type="datetime-local" name="returnTime" value="${toLocalDateTimeInput(newestAgreement?.return_time)}" required>
        <input type="text" name="fuelTerms" placeholder="Fuel terms (e.g. return full)" value="${newestAgreement?.fuel_terms || ''}">
        <input type="text" name="additionalDriverNames" placeholder="Additional drivers (comma separated)" value="${newestAgreement?.additional_driver_names || ''}">
        <input type="number" name="expiryHours" min="1" max="168" value="48" placeholder="Link expiry hours">
        <button class="primary" type="submit">Create Mobile Signing Link</button>
      </form>
      <div class="muted" id="agreementLinkResult">${state.lastAgreementLinkByCustomer[customer.id] ? `<a href="${state.lastAgreementLinkByCustomer[customer.id]}" target="_blank" rel="noopener">Open latest signing link</a>` : 'No new link generated in this session.'}</div>
      ${newestAgreement ? `<div class="muted">Latest agreement: ${newestAgreement.status} | expires ${new Date(newestAgreement.token_expires_at).toLocaleString()}</div>` : '<div class="muted">No agreements yet for this customer.</div>'}
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
      document.getElementById('agreementLinkResult').innerHTML = `<a href="${result.signingLink}" target="_blank" rel="noopener">Open signing link</a>`;
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
    await loadDashboard();
  } catch (error) {
    el.quickLeadError.textContent = error.message;
  }
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

  renderAlerts();
  renderPipeline();
  renderCustomerList();
  renderCustomerDetail();
}

el.loginBtn.addEventListener('click', login);
el.passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') login();
});
el.logoutBtn.addEventListener('click', logout);
el.refreshBtn.addEventListener('click', () => loadDashboard(false));
el.quickLeadForm.addEventListener('submit', createQuickLead);
el.customerSearch.addEventListener('input', renderCustomerList);
el.leadSource.addEventListener('change', () => {
  if (el.leadSource.value === 'Referral') {
    el.referredBy.classList.remove('hidden');
  } else {
    el.referredBy.classList.add('hidden');
    el.referredBy.value = '';
  }
});

checkSession();
