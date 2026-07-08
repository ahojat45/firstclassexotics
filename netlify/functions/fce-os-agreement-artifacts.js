const crypto = require('crypto');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const {
  supabaseFetch,
  getSupabaseConfig,
  nowIso,
} = require('./fce-os-utils');

const TERMS_SECTIONS = [
  {
    number: 1,
    title: 'Vehicle Responsibility',
    text: 'I accept full responsibility for the vehicle during the rental period and will operate it lawfully and safely.',
    requiresInitials: true,
  },
  {
    number: 2,
    title: 'Condition and Return',
    text: 'I agree to return the vehicle in substantially the same condition as delivered, excluding normal wear and tear.',
    requiresInitials: true,
  },
  {
    number: 3,
    title: 'Charges and Overage',
    text: 'I understand I am responsible for mileage overages, fuel-related charges, tolls, tickets, and damage-related costs.',
    requiresInitials: true,
  },
  {
    number: 4,
    title: 'Acknowledgement',
    text: 'I confirm the information I provided is accurate and I agree to these rental terms.',
    requiresInitials: true,
  },
];

function formatCurrency(cents) {
  const value = Number(cents || 0) / 100;
  if (!Number.isFinite(value)) return 'N/A';
  return `$${value.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function wrapText(text, maxChars = 95) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines = [];
  let line = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const next = `${line} ${words[i]}`;
    if (next.length <= maxChars) {
      line = next;
      continue;
    }
    lines.push(line);
    line = words[i];
  }

  lines.push(line);
  return lines;
}

async function createSignedAgreementPdf({
  agreement,
  signedAt,
  typedName,
  signerIp,
  signaturePngBuffer,
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]);
  const margin = 40;
  const lineHeight = 14;
  let y = 760;

  function ensureSpace(lines = 1) {
    const required = lines * lineHeight + 8;
    if (y - required > margin) return;
    page = pdf.addPage([612, 792]);
    y = 760;
  }

  function drawLine(text, { size = 10, isBold = false, color = rgb(0.12, 0.12, 0.12) } = {}) {
    ensureSpace(1);
    page.drawText(String(text || ''), {
      x: margin,
      y,
      size,
      font: isBold ? bold : regular,
      color,
    });
    y -= lineHeight;
  }

  function drawWrapped(text, options = {}) {
    const lines = wrapText(text, options.maxChars || 95);
    ensureSpace(lines.length + 1);
    lines.forEach((line) => drawLine(line, options));
  }

  drawLine('First Class Exotics - Signed Rental Agreement', { size: 15, isBold: true });
  drawLine(`Agreement ID: ${agreement.id}`, { isBold: true });
  drawLine(`Signed At: ${formatDateTime(signedAt)}`);
  drawLine(`Signer IP: ${signerIp || 'N/A'}`);
  y -= 6;

  drawLine('Rental Terms', { size: 12, isBold: true });
  const rentalRows = [
    ['Renter', agreement.renter_full_name || 'N/A'],
    ['Email', agreement.renter_email || 'N/A'],
    ['Phone', agreement.renter_phone || 'N/A'],
    ['Vehicle', agreement.rental_vehicle || 'N/A'],
    ['Start Date', formatDate(agreement.rental_start_date)],
    ['End Date', formatDate(agreement.rental_end_date)],
    ['Pickup Time', formatDateTime(agreement.pickup_time)],
    ['Return Time', formatDateTime(agreement.return_time)],
    ['Daily Rate', formatCurrency(agreement.daily_rate_cents)],
    ['Total Price', formatCurrency(agreement.total_price_cents)],
    ['Deposit', formatCurrency(agreement.deposit_amount_cents)],
    ['Miles Included / Day', agreement.miles_included_per_day || 'N/A'],
    ['Overage Rate / Mile', formatCurrency(agreement.mileage_overage_rate_cents)],
    ['Fuel Terms', agreement.fuel_terms || 'N/A'],
    ['Additional Drivers', agreement.additional_driver_names || 'N/A'],
    ['Delivery Preference', agreement.delivery_preference || 'N/A'],
  ];

  rentalRows.forEach(([label, value]) => {
    drawWrapped(`${label}: ${value}`, { maxChars: 90 });
  });

  y -= 6;
  drawLine('Agreement Terms', { size: 12, isBold: true });
  TERMS_SECTIONS.forEach((section) => {
    drawWrapped(`${section.number}. ${section.title}`, { isBold: true, maxChars: 85 });
    drawWrapped(section.text, { maxChars: 90 });
    y -= 2;
  });

  const rawTerms = String(agreement.agreement_terms || '').trim();
  if (rawTerms) {
    y -= 4;
    drawLine('Additional Terms Text', { isBold: true });
    drawWrapped(rawTerms, { maxChars: 95 });
  }

  y -= 8;
  drawLine(`Typed Name: ${typedName}`, { isBold: true });

  if (signaturePngBuffer?.length) {
    try {
      const embeddedSignature = await pdf.embedPng(signaturePngBuffer);
      ensureSpace(10);
      const targetWidth = 240;
      const ratio = targetWidth / embeddedSignature.width;
      const targetHeight = Math.max(60, embeddedSignature.height * ratio);
      page.drawText('Signature:', { x: margin, y, size: 10, font: bold });
      y -= 12;
      page.drawImage(embeddedSignature, {
        x: margin,
        y: y - targetHeight,
        width: targetWidth,
        height: targetHeight,
      });
      y -= targetHeight + 8;
    } catch {
      drawLine('Signature image could not be embedded in PDF.', { color: rgb(0.7, 0.12, 0.12) });
    }
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

async function uploadObjectToStorage({ path, mimeType, buffer, upsert = true }) {
  const { url, serviceKey, bucket } = getSupabaseConfig();

  const uploadResponse = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': mimeType,
      'x-upsert': upsert ? 'true' : 'false',
    },
    body: buffer,
  });

  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text();
    throw new Error(`Storage upload failed: ${detail}`);
  }

  return { bucket, path };
}

async function downloadObjectFromStorage({ bucket, path }) {
  const { url, serviceKey } = getSupabaseConfig();
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: 'GET',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Storage download failed: ${detail}`);
  }

  const arr = await response.arrayBuffer();
  return Buffer.from(arr);
}

async function createSignedStorageUrl({ bucket, path, expiresIn = 86400 }) {
  const { url } = getSupabaseConfig();
  const signed = await supabaseFetch(`/storage/v1/object/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn }),
  });
  return `${url}/storage/v1${signed.signedURL}`;
}

async function sendSignedAgreementEmail({ agreement, downloadUrl, pdfBuffer }) {
  const toEmail = String(agreement.renter_email || '').trim();
  if (!toEmail) {
    throw new Error('Missing renter email for signed copy delivery');
  }

  const apiKey = String(process.env.BREVO_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing BREVO_API_KEY');
  }

  const senderEmail = String(process.env.BREVO_SENDER_EMAIL || 'noreply@firstclassexotics.com').trim();
  const senderName = String(process.env.BREVO_SENDER_NAME || 'First Class Exotics').trim();

  const filename = `signed-agreement-${agreement.id}.pdf`;
  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail, name: agreement.renter_full_name || 'Customer' }],
    subject: `Your signed rental agreement (#${agreement.id.slice(0, 8)})`,
    htmlContent: `<p>Hi ${agreement.renter_full_name || 'there'},</p><p>Your rental agreement has been signed successfully.</p><p>You can download your signed copy here:</p><p><a href="${downloadUrl}">Download Signed Agreement</a></p><p>Agreement ID: ${agreement.id}</p>`,
    textContent: `Your signed rental agreement is ready. Download: ${downloadUrl}\nAgreement ID: ${agreement.id}`,
    attachment: [
      {
        name: filename,
        content: pdfBuffer.toString('base64'),
      },
    ],
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Brevo send failed (${response.status}): ${detail}`);
  }
}

async function processSignedArtifacts({
  agreement,
  typedName,
  signedAt,
  signerIp,
  signaturePngBuffer,
}) {
  const errors = [];
  let signedPdfStorage = null;
  let signedPdfError = null;
  let signedEmailError = null;
  let downloadUrl = null;
  let emailSentAt = null;
  let pdfBuffer = null;

  try {
    pdfBuffer = await createSignedAgreementPdf({
      agreement,
      signedAt,
      typedName,
      signerIp,
      signaturePngBuffer,
    });

    const pdfPath = `agreements/${agreement.id}/signed/${Date.now()}-${crypto.randomUUID()}.pdf`;
    signedPdfStorage = await uploadObjectToStorage({
      path: pdfPath,
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
      upsert: true,
    });

    downloadUrl = await createSignedStorageUrl({
      bucket: signedPdfStorage.bucket,
      path: signedPdfStorage.path,
      expiresIn: 24 * 60 * 60,
    });

  } catch (error) {
    signedPdfError = error.message || 'Signed PDF generation failed';
    errors.push(signedPdfError);
  }

  if (!signedPdfError && signedPdfStorage && pdfBuffer) {
    try {
      await sendSignedAgreementEmail({
        agreement,
        downloadUrl,
        pdfBuffer,
      });
      emailSentAt = nowIso();
    } catch (error) {
      signedEmailError = error.message || 'Signed copy email failed';
      errors.push(signedEmailError);
    }
  }

  const patchPayload = {
    signed_pdf_storage_bucket: signedPdfStorage?.bucket || null,
    signed_pdf_storage_path: signedPdfStorage?.path || null,
    signed_pdf_generated_at: signedPdfStorage ? nowIso() : null,
    signed_pdf_error: signedPdfError,
    signed_email_sent_at: emailSentAt,
    signed_email_error: signedEmailError,
    manual_resend_required: Boolean(signedPdfError || signedEmailError),
  };

  const [updated] = await supabaseFetch(`/rest/v1/agreements?id=eq.${encodeURIComponent(agreement.id)}&select=id,manual_resend_required,signed_pdf_storage_bucket,signed_pdf_storage_path,signed_email_sent_at,signed_pdf_error,signed_email_error`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patchPayload),
  });

  return {
    agreement: updated,
    manualResendRequired: Boolean(updated?.manual_resend_required),
    downloadUrl,
    errors,
  };
}

module.exports = {
  TERMS_SECTIONS,
  createSignedAgreementPdf,
  uploadObjectToStorage,
  downloadObjectFromStorage,
  createSignedStorageUrl,
  processSignedArtifacts,
};
