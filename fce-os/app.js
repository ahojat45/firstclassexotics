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
};

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
      return `
        <div class="customer-item ${activeClass}" data-customer-id="${row.id}">
          <div><strong>${row.full_name}</strong></div>
          <small>${row.phone || ''} ${row.email ? `| ${row.email}` : ''}</small>
          <small>Source: ${row.source?.code || 'Unknown'} | Status: ${row.status}</small>
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

  el.customerDetailPanel.innerHTML = `
    <div class="panel-head"><h3>${customer.full_name}</h3></div>
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

    <div class="error" id="customerDetailError"></div>
    <div class="success" id="customerDetailSuccess"></div>
  `;

  const editForm = document.getElementById('customerEditForm');
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
  const data = await api('/.netlify/functions/fce-os-dashboard', { method: 'GET' });
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
