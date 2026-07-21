const {
  STAGE_ORDER,
  json,
  requireAuth,
  supabaseFetch,
  leadDaysInStage,
  daysTo,
} = require('./fce-os-utils');

const AGREEMENTS_SELECT_EXTENDED =
  'id,customer_id,lead_id,status,token_expires_at,sent_at,viewed_at,signed_at,deposit_amount_cents,deposit_status,created_at,daily_rate_cents,total_price_cents,miles_included_per_day,mileage_overage_rate_cents,pickup_time,return_time,additional_driver_names,fuel_terms,manual_resend_required,signed_pdf_storage_bucket,signed_pdf_storage_path,signed_pdf_error,signed_email_error,signed_email_sent_at';

const AGREEMENTS_SELECT_BASE =
  'id,customer_id,lead_id,status,token_expires_at,sent_at,viewed_at,signed_at,deposit_amount_cents,deposit_status,created_at';

async function fetchDashboardAgreements() {
  try {
    return await supabaseFetch(`/rest/v1/agreements?select=${encodeURIComponent(AGREEMENTS_SELECT_EXTENDED)}&order=created_at.desc&limit=500`);
  } catch (error) {
    const message = String(error?.message || '');
    if (!message.includes('column agreements.') || !message.includes(' does not exist')) {
      throw error;
    }

    const rows = await supabaseFetch(`/rest/v1/agreements?select=${encodeURIComponent(AGREEMENTS_SELECT_BASE)}&order=created_at.desc&limit=500`);

    return rows.map((row) => ({
      ...row,
      daily_rate_cents: null,
      total_price_cents: null,
      miles_included_per_day: null,
      mileage_overage_rate_cents: null,
      pickup_time: null,
      return_time: null,
      additional_driver_names: null,
      fuel_terms: null,
      manual_resend_required: false,
      signed_pdf_storage_bucket: null,
      signed_pdf_storage_path: null,
      signed_pdf_error: null,
      signed_email_error: null,
      signed_email_sent_at: null,
    }));
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const auth = requireAuth(event);
  if (!auth.ok) return auth.response;

  try {
    const leads = await supabaseFetch('/rest/v1/leads?select=id,stage,stage_changed_at,created_at,customer:customers(id,full_name,email,phone,notes,requested_vehicle,requested_start_date,requested_end_date,delivery_preference,status,source:lead_sources(code,label),referred_by)&order=stage_changed_at.asc');

    const customers = await supabaseFetch('/rest/v1/customers?select=id,full_name,email,phone,address,notes,status,requested_vehicle,requested_start_date,requested_end_date,delivery_preference,source:lead_sources(code,label),referred_by,dl_document_id,dl_expiration_date,insurance_document_id,insurance_expiration_date,created_at&order=created_at.desc');

    const history = await supabaseFetch('/rest/v1/lead_stage_history?select=id,lead_id,from_stage,to_stage,changed_at,changed_by,note&order=changed_at.desc&limit=500');

    const agreements = await fetchDashboardAgreements();

    const stages = {};
    STAGE_ORDER.forEach((stage) => {
      stages[stage] = [];
    });

    leads.forEach((lead) => {
      const sourceCode = lead.customer?.source?.code || 'Website';
      const item = {
        id: lead.id,
        customerId: lead.customer?.id,
        stage: lead.stage,
        stageChangedAt: lead.stage_changed_at,
        daysInStage: leadDaysInStage(lead.stage_changed_at),
        fullName: lead.customer?.full_name,
        phone: lead.customer?.phone,
        email: lead.customer?.email,
        notes: lead.customer?.notes,
        source: sourceCode,
        referredBy: lead.customer?.referred_by || null,
        requestedVehicle: lead.customer?.requested_vehicle || null,
        requestedStartDate: lead.customer?.requested_start_date || null,
        requestedEndDate: lead.customer?.requested_end_date || null,
        deliveryPreference: lead.customer?.delivery_preference || null,
      };

      if (!stages[item.stage]) stages[item.stage] = [];
      stages[item.stage].push(item);
    });

    const expiringFlags = customers
      .map((customer) => {
        const dlDays = daysTo(customer.dl_expiration_date);
        const insuranceDays = daysTo(customer.insurance_expiration_date);

        const alerts = [];
        if (dlDays !== null && dlDays <= 30) {
          alerts.push({ type: 'dl', days: dlDays, date: customer.dl_expiration_date });
        }
        if (insuranceDays !== null && insuranceDays <= 30) {
          alerts.push({ type: 'insurance', days: insuranceDays, date: customer.insurance_expiration_date });
        }

        return {
          customerId: customer.id,
          fullName: customer.full_name,
          alerts,
        };
      })
      .filter((row) => row.alerts.length > 0)
      .sort((a, b) => {
        const aMin = Math.min(...a.alerts.map((x) => x.days));
        const bMin = Math.min(...b.alerts.map((x) => x.days));
        return aMin - bMin;
      });

    return json(200, {
      stages,
      customers,
      stageHistory: history,
      expiringFlags,
      agreements,
    });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to load dashboard data' });
  }
};