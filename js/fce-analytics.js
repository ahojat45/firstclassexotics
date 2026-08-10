/* First Class Exotics — GA4 conversion tracking (G-E655N33GPP)
 *
 * Loaded on every public page. Pure event delegation: no per-page or per-form
 * wiring, so new pages, new fleet cards and new blog posts are tracked the
 * moment they ship.
 *
 * NO PERSONALLY IDENTIFIABLE INFORMATION IS EVER SENT TO GA4.
 * Sending a name, email or phone number to Google Analytics violates their
 * terms of service. Only vehicle, service and bucketed timing are collected.
 *
 * To watch events fire in the browser console:  fceTrackDebug = true
 */
(function () {
  'use strict';

  // Ali's internal tools are not customer surfaces — never track them.
  if (/^\/(fce-os|blog-publisher)/.test(location.pathname)) return;

  function send(name, params) {
    params = params || {};
    if (window.fceTrackDebug) console.log('[fce-track]', name, params);
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    } else {
      // GA snippet missing or blocked — queue it so nothing is silently lost.
      (window.dataLayer = window.dataLayer || []).push(
        Object.assign({ event: name }, params)
      );
    }
  }

  /* ------------------------------------------------------------------ *
   * 1. Tap-to-contact  →  contact_click
   *    Covers all 173 tel:, 27 sms:, 9 wa.me and 10 mailto: links.
   * ------------------------------------------------------------------ */

  var METHODS = [
    { test: /^tel:/i,    method: 'phone' },
    { test: /^sms:/i,    method: 'sms' },
    { test: /wa\.me\//i, method: 'whatsapp' },
    { test: /^mailto:/i, method: 'email' }
  ];

  function methodFor(href) {
    for (var i = 0; i < METHODS.length; i++) {
      if (METHODS[i].test.test(href)) return METHODS[i].method;
    }
    return null;
  }

  // Which of the several phone links on the page actually got tapped.
  function placementOf(el) {
    var n = el;
    while (n && n !== document.body) {
      var pos = '';
      try { pos = getComputedStyle(n).position; } catch (e) {}
      if (pos === 'fixed' || pos === 'sticky') return 'sticky_bar';
      if (n.id) return n.id;
      var tag = n.tagName.toLowerCase();
      if (tag === 'header' || tag === 'nav') return 'header';
      if (tag === 'footer') return 'footer';
      n = n.parentElement;
    }
    return 'body';
  }

  var lastClick = {};
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;

    var method = methodFor(a.getAttribute('href') || '');
    if (!method) return;

    var placement = placementOf(a);
    var key = method + '|' + placement;
    var now = Date.now();
    if (lastClick[key] && now - lastClick[key] < 2000) return; // ignore rage taps
    lastClick[key] = now;

    send('contact_click', {
      method: method,
      link_placement: placement,
      link_text: (a.textContent || a.getAttribute('title') || '').trim().slice(0, 60)
    });
  }, true);

  /* ------------------------------------------------------------------ *
   * 2. Lead forms  →  generate_lead / newsletter_signup
   *
   *    Every form on the site posts by fetch, then hides itself and reveals
   *    a success panel. We fire on that hide — so the number counts leads
   *    that actually reached Netlify, not submit attempts that failed.
   * ------------------------------------------------------------------ */

  var FORMS = [
    { match: '#bookForm',          event: 'generate_lead',     type: 'booking' },
    { match: '#wrapForm',          event: 'generate_lead',     type: 'vinyl_wrap' },
    { match: '#gift-request-form', event: 'generate_lead',     type: 'gift_certificate' },
    { match: '.newsletter-form',   event: 'newsletter_signup', type: 'newsletter' }
  ];

  function isBot(form) {
    var hp = form.querySelector('input[name="website"], input[name="bot-field"]');
    return !!(hp && String(hp.value || '').trim());
  }

  function snapshot(form, type) {
    var params = { lead_type: type, form_id: form.id || form.getAttribute('name') || type };

    var vehicle = form.querySelector('[name="vehicle"]');
    if (vehicle && vehicle.value) params.vehicle = String(vehicle.value).slice(0, 100);

    var service = form.querySelector('[name="service"], [name="package"]');
    if (service && service.value) params.service = String(service.value).slice(0, 100);

    // Bucketed, never the raw date — tells Ali how far ahead people book.
    var start = form.querySelector('[name="start-date"]');
    if (start && start.value) {
      var days = Math.round((new Date(start.value) - new Date()) / 86400000);
      params.days_out = days < 0 ? 'past'
        : days <= 3 ? '0-3'
        : days <= 7 ? '4-7'
        : days <= 30 ? '8-30'
        : '31+';
    }
    return params;
  }

  FORMS.forEach(function (cfg) {
    document.querySelectorAll(cfg.match).forEach(function (form) {
      form.addEventListener('submit', function () {
        if (isBot(form)) return;

        var params = snapshot(form, cfg.type); // capture before the form is torn down
        var fired = false;
        var obs = null;

        function fire() {
          if (fired) return true;
          if (form.style.display !== 'none') return false;
          fired = true;
          if (obs) obs.disconnect();
          send(cfg.event, params);
          return true;
        }

        // The newsletter handler hides the form synchronously, before we get
        // here, so check once up front rather than waiting on a mutation.
        if (fire()) return;

        obs = new MutationObserver(fire);
        obs.observe(form, { attributes: true, attributeFilter: ['style'] });

        // Submit failed or the user gave up — stop watching, count nothing.
        setTimeout(function () { if (obs) obs.disconnect(); }, 15000);
      });
    });
  });
})();
