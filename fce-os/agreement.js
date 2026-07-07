const token = new URLSearchParams(window.location.search).get('t') || '';

const el = {
  state: document.getElementById('agreementState'),
  summary: document.getElementById('agreementSummary'),
  form: document.getElementById('agreementSignForm'),
  typedName: document.getElementById('typedName'),
  signaturePad: document.getElementById('signaturePad'),
  clearSignatureBtn: document.getElementById('clearSignatureBtn'),
  error: document.getElementById('agreementError'),
  success: document.getElementById('agreementSuccess'),
};

const ctx = el.signaturePad.getContext('2d');
let drawing = false;
let signed = false;

ctx.lineWidth = 2;
ctx.lineCap = 'round';
ctx.strokeStyle = '#f5f0e8';

function resetMessages() {
  el.error.textContent = '';
  el.success.textContent = '';
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
    <p>${agreement.agreementTerms || ''}</p>
  `;
  el.summary.classList.remove('hidden');
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

  const signatureData = el.signaturePad.toDataURL('image/png');
  const signatureBase64 = signatureData.split(',')[1] || '';

  try {
    await api('/.netlify/functions/fce-os-agreements-sign-public', {
      method: 'POST',
      body: JSON.stringify({ token, typedName, signatureBase64 }),
    });
    el.success.textContent = 'Agreement signed successfully.';
    el.form.classList.add('hidden');
    el.state.textContent = 'Agreement complete.';
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
