const token = new URLSearchParams(window.location.search).get('t') || '';

const el = {
  state: document.getElementById('agreementState'),
  summary: document.getElementById('agreementSummary'),
  termsPanel: document.getElementById('agreementTermsPanel'),
  form: document.getElementById('agreementSignForm'),
  typedName: document.getElementById('typedName'),
  signaturePad: document.getElementById('signaturePad'),
  clearSignatureBtn: document.getElementById('clearSignatureBtn'),
  error: document.getElementById('agreementError'),
  success: document.getElementById('agreementSuccess'),
  downloadLink: document.getElementById('agreementDownloadLink'),
};

const ctx = el.signaturePad.getContext('2d');
let drawing = false;
let signed = false;
let activeAgreement = null;

ctx.lineWidth = 2;
ctx.lineCap = 'round';
ctx.strokeStyle = '#f5f0e8';

function resetMessages() {
  el.error.textContent = '';
  el.success.textContent = '';
  el.downloadLink.textContent = '';
}

function centsToDollars(cents) {
  const value = Number(cents || 0);
  if (!Number.isFinite(value)) return '0.00';
  return (value / 100).toFixed(2);
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function pointerPos(event) {
  const rect = el.signaturePad.getBoundingClientRect();
  const point = event.touches?.[0] || event;
  return {
    x: point.clientX - rect.left,
    y: point.clientY - rect.top,
  };
}

function startDraw(event) {
  drawing = true;
  const p = pointerPos(event);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  event.preventDefault();
}

function moveDraw(event) {
  if (!drawing) return;
  const p = pointerPos(event);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  signed = true;
  event.preventDefault();
}

function stopDraw() {
  drawing = false;
}

function clearSignature() {
  ctx.clearRect(0, 0, el.signaturePad.width, el.signaturePad.height);
  signed = false;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

function renderAgreement(agreement) {
  activeAgreement = agreement;
  const dateLine = [agreement.rentalStartDate, agreement.rentalEndDate].filter(Boolean).join(' to ') || 'Not set';
  const deposit = ((agreement.depositAmountCents || 0) / 100).toFixed(2);

  el.summary.innerHTML = `
    <div><strong>Renter:</strong> ${agreement.renterFullName || 'N/A'}</div>
    <div><strong>Email:</strong> ${agreement.renterEmail || 'N/A'}</div>
    <div><strong>Phone:</strong> ${agreement.renterPhone || 'N/A'}</div>
    <div><strong>Vehicle:</strong> ${agreement.rentalVehicle || 'N/A'}</div>
    <div><strong>Dates:</strong> ${dateLine}</div>
    <div><strong>Delivery:</strong> ${agreement.deliveryPreference || 'N/A'}</div>
    <div><strong>Deposit:</strong> $${deposit} (${agreement.depositStatus})</div>
  `;

  const rentalTermsRows = [
    ['Daily rate', `$${centsToDollars(agreement.dailyRateCents)}`],
    ['Total price', `$${centsToDollars(agreement.totalPriceCents)}`],
    ['Miles included/day', agreement.milesIncludedPerDay || 'N/A'],
    ['Overage rate/mi', `$${centsToDollars(agreement.mileageOverageRateCents)}`],
    ['Fuel terms', agreement.fuelTerms || 'N/A'],
    ['Pickup time', formatDateTime(agreement.pickupTime)],
    ['Return time', formatDateTime(agreement.returnTime)],
    ['Additional drivers', agreement.additionalDriverNames || 'N/A'],
    ['Deposit', `$${centsToDollars(agreement.depositAmountCents)}`],
  ];

  const sections = Array.isArray(agreement.termsSections) ? agreement.termsSections : [];
  const sectionsHtml = sections.map((section) => `
    <div class="terms-section">
      <strong>Section ${section.number}: ${section.title}</strong>
      <p>${section.text}</p>
      ${section.requiresInitials ? `<label class="section-initials"><input type="checkbox" data-section-initial="${section.number}"> I initial Section ${section.number}</label>` : ''}
    </div>
  `).join('');

  el.termsPanel.innerHTML = `
    <h3>Rental Terms</h3>
    <table class="terms-table">
      <tbody>
        ${rentalTermsRows.map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join('')}
      </tbody>
    </table>
    <h3>Terms Text</h3>
    <div class="terms-section"><p>${agreement.agreementTerms || 'Placeholder terms are currently active pending attorney-approved language.'}</p></div>
    <h3>Agreement Sections</h3>
    ${sectionsHtml}
  `;

  el.summary.classList.remove('hidden');
  el.termsPanel.classList.remove('hidden');

  if (agreement.isReadOnly) {
    el.form.classList.add('hidden');
    el.state.textContent = 'Agreement already signed.';
    if (agreement.signedPdfUrl) {
      el.downloadLink.innerHTML = `<a href="${agreement.signedPdfUrl}" target="_blank" rel="noopener">Download your signed PDF</a>`;
    } else if (agreement.manualResendRequired) {
      el.downloadLink.textContent = 'Signed copy is processing. Our team has been flagged for manual resend.';
    }
    return;
  }

  el.form.classList.remove('hidden');
  el.state.textContent = `Ready to sign. Link expires ${new Date(agreement.tokenExpiresAt).toLocaleString()}.`;
  if (!el.typedName.value) {
    el.typedName.value = agreement.renterFullName || '';
  }
}

async function loadAgreement() {
  resetMessages();
  if (!token) {
    el.state.textContent = 'Missing agreement token.';
    return;
  }

  try {
    const data = await api(`/.netlify/functions/fce-os-agreements-get-public?t=${encodeURIComponent(token)}`);
    renderAgreement(data.agreement);
  } catch (error) {
    el.state.textContent = 'Agreement unavailable.';
    el.error.textContent = error.message;
  }
}

async function signAgreement(event) {
  event.preventDefault();
  resetMessages();

  if (!signed) {
    el.error.textContent = 'Please draw your signature before submitting.';
    return;
  }

  const typedName = el.typedName.value.trim();
  if (!typedName) {
    el.error.textContent = 'Typed full name is required.';
    return;
  }

  const requiredSectionNumbers = (activeAgreement?.termsSections || [])
    .filter((section) => section.requiresInitials)
    .map((section) => Number(section.number));
  const acceptedSections = [];
  document.querySelectorAll('[data-section-initial]').forEach((checkbox) => {
    if (checkbox.checked) {
      acceptedSections.push(Number(checkbox.getAttribute('data-section-initial')));
    }
  });

  const missingInitials = requiredSectionNumbers.filter((number) => !acceptedSections.includes(number));
  if (missingInitials.length) {
    el.error.textContent = 'Please initial each required agreement section before signing.';
    return;
  }

  const signatureData = el.signaturePad.toDataURL('image/png');
  const signatureBase64 = signatureData.split(',')[1] || '';

  try {
    const result = await api('/.netlify/functions/fce-os-agreements-sign-public', {
      method: 'POST',
      body: JSON.stringify({ token, typedName, signatureBase64, acceptedSections }),
    });
    el.success.textContent = 'Agreement signed successfully.';
    el.form.classList.add('hidden');
    el.state.textContent = 'Agreement complete.';

    if (result.signedCopy?.downloadUrl) {
      el.downloadLink.innerHTML = `<a href="${result.signedCopy.downloadUrl}" target="_blank" rel="noopener">Download your signed PDF</a>`;
    }

    if (result.signedCopy?.manualResendRequired) {
      if (result.signedCopy?.downloadUrl) {
        el.downloadLink.innerHTML += '<div class="muted">Signature saved. Email delivery failed and has been flagged for manual resend.</div>';
      } else {
        el.downloadLink.textContent = 'Signature saved. Signed copy email/PDF delivery is queued for manual resend by the team.';
      }
    }
  } catch (error) {
    el.error.textContent = error.message;
  }
}

el.form.addEventListener('submit', signAgreement);
el.clearSignatureBtn.addEventListener('click', clearSignature);

el.signaturePad.addEventListener('mousedown', startDraw);
el.signaturePad.addEventListener('mousemove', moveDraw);
el.signaturePad.addEventListener('mouseup', stopDraw);
el.signaturePad.addEventListener('mouseleave', stopDraw);

el.signaturePad.addEventListener('touchstart', startDraw, { passive: false });
el.signaturePad.addEventListener('touchmove', moveDraw, { passive: false });
el.signaturePad.addEventListener('touchend', stopDraw);

loadAgreement();
