/* Regression test for js/fce-analytics.js — GA4 conversion tracking.
 *
 *   npm i -D jsdom && node scripts/test-analytics.mjs
 *
 * Loads the real page HTML into jsdom, runs the real inline page scripts, and
 * asserts that the right GA4 events fire (and that bots and internal tools
 * fire nothing). Re-run this after touching any form handler.
 */
import { JSDOM } from 'jsdom';
import fs from 'fs';

const REPO = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/\/$/, '');
const SCRIPT = fs.readFileSync(REPO + '/js/fce-analytics.js', 'utf8');

let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log('  PASS  ' + m); };
const bad = (m) => { fail++; console.log('  FAIL  ' + m); };

function load(file, url) {
  let html = fs.readFileSync(REPO + '/' + file, 'utf8');
  // strip the real remote GA loader + elfsight; keep everything else intact
  html = html.replace(/<script[^>]*src="https?:\/\/[^"]*"[^>]*><\/script>/g, '');
  html = html.replace(/<script src="\/js\/fce-analytics\.js" defer><\/script>/, '');
  const dom = new JSDOM(html, { url, runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      win.matchMedia = () => ({ matches: false, media: '', onchange: null,
        addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){} });
      win.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} takeRecords(){return[];} };
      win.scrollTo = () => {};
      win.fetch = () => new win.Promise(r => setTimeout(() => r({ ok: true, json: () => win.Promise.resolve({}) }), 10));
      win.alert = () => {};
    } });
  const w = dom.window;
  const events = [];
  w.dataLayer = [];
  w.gtag = (...a) => { if (a[0] === 'event') events.push({ name: a[1], params: a[2] }); };
  w.fetch = () => new w.Promise(r => setTimeout(() => r({ ok: true }), 10));
  w.eval(SCRIPT);
  return { w, d: w.document, events, tick: (ms=60) => new Promise(r => setTimeout(r, ms)) };
}
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));

console.log('\n── index.html : tap-to-contact ──');
{
  const { w, d, events } = load('index.html', 'https://www.firstclassexotics.com/');
  const tels = [...d.querySelectorAll('a[href^="tel:"]')];
  console.log(`  (${tels.length} tel: links on the page)`);
  tels.forEach(a => click(w, a));
  events.length === tels.length || events.length > 0 ? ok(`phone clicks fired ${events.length} contact_click events`) : bad('no contact_click fired');
  const placements = [...new Set(events.map(e => e.params.link_placement))];
  placements.length > 1 ? ok('placements distinguished: ' + placements.join(', ')) : bad('all clicks reported one placement: ' + placements);
  events.every(e => e.name === 'contact_click' && e.params.method === 'phone') ? ok('event name + method correct') : bad('wrong name/method');

  const sms = d.querySelector('a[href^="sms:"]');
  if (sms) { const n = events.length; click(w, sms); events.length > n && events.at(-1).params.method === 'sms' ? ok('sms: link -> method=sms') : bad('sms not tracked'); }
  const wa = d.querySelector('a[href*="wa.me"]');
  if (wa) { const n = events.length; click(w, wa); events.length > n && events.at(-1).params.method === 'whatsapp' ? ok('wa.me link -> method=whatsapp') : bad('whatsapp not tracked'); }

  // de-dupe
  const before = events.length; click(w, tels[0]); click(w, tels[0]); click(w, tels[0]);
  events.length - before <= 1 ? ok('rage-tap de-dupe holds (' + (events.length - before) + ' extra)') : bad('de-dupe failed: ' + (events.length - before));

  // internal links must NOT fire
  const n2 = events.length;
  d.querySelectorAll('a[href^="#"], a[href$=".html"]').forEach(a => click(w, a));
  events.length === n2 ? ok('internal/nav links correctly ignored') : bad('internal links fired ' + (events.length - n2) + ' events');
}

console.log('\n── index.html : booking form ──');
{
  const { w, d, events, tick } = load('index.html', 'https://www.firstclassexotics.com/');
  const f = d.getElementById('bookForm');
  const veh = f.querySelector('[name="vehicle"]');
  if (veh && veh.options.length > 1) veh.value = veh.options[1].value;
  const sd = f.querySelector('[name="start-date"]');
  if (sd) { const dt = new Date(Date.now() + 20*864e5); sd.value = dt.toISOString().slice(0,10); }
  f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  events.length === 0 ? ok('nothing fired at submit time (waiting on success)') : bad('fired too early');
  await tick(120);
  const e = events.find(x => x.name === 'generate_lead');
  e ? ok('generate_lead fired after the POST resolved') : bad('generate_lead never fired');
  if (e) {
    e.params.lead_type === 'booking' ? ok('lead_type=booking') : bad('lead_type=' + e.params.lead_type);
    e.params.vehicle ? ok('vehicle captured: ' + e.params.vehicle) : bad('vehicle missing');
    e.params.days_out === '8-30' ? ok('days_out bucketed correctly: 8-30') : bad('days_out=' + e.params.days_out);
    const pii = JSON.stringify(e.params).match(/@|name|email|phone/i);
    !pii ? ok('NO PII in payload') : bad('possible PII: ' + pii[0]);
  }
}

console.log('\n── index.html : honeypot (bot submission) ──');
{
  const { w, d, events, tick } = load('index.html', 'https://www.firstclassexotics.com/');
  const f = d.getElementById('bookForm');
  const hp = f.querySelector('input[name="website"]');
  hp.value = 'http://spam.example';
  f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await tick(120);
  events.length === 0 ? ok('bot submission produced 0 events') : bad('bot counted as a lead');
}

console.log('\n── vinyl-wrap-irvine.html : wrap quote form ──');
{
  const { w, d, events, tick } = load('vinyl-wrap-irvine.html', 'https://www.firstclassexotics.com/vinyl-wrap-irvine');
  const f = d.getElementById('wrapForm');
  f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await tick(120);
  const e = events.find(x => x.name === 'generate_lead');
  e && e.params.lead_type === 'vinyl_wrap' ? ok('generate_lead / lead_type=vinyl_wrap') : bad('wrap lead not tracked');
}

console.log('\n── gift.html : gift certificate form ──');
{
  const { w, d, events, tick } = load('gift.html', 'https://www.firstclassexotics.com/gift');
  const f = d.getElementById('gift-request-form');
  f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await tick(200);
  const e = events.find(x => x.name === 'generate_lead');
  e && e.params.lead_type === 'gift_certificate' ? ok('generate_lead / lead_type=gift_certificate') : bad('gift lead not tracked');
  const pii = e && JSON.stringify(e.params).match(/@/);
  !pii ? ok('no email leaked into params') : bad('EMAIL LEAKED');
}

console.log('\n── blog.html : newsletter (synchronous handler) ──');
{
  const { w, d, events, tick } = load('blog.html', 'https://www.firstclassexotics.com/blog');
  const f = d.querySelector('.newsletter-form');
  f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await tick(60);
  const e = events.find(x => x.name === 'newsletter_signup');
  e ? ok('newsletter_signup fired despite sync hide') : bad('newsletter_signup missed (sync race)');
}

console.log('\n── blog post : relative-path + subdirectory sanity ──');
{
  const { w, d, events } = load('blog/mclaren-w1.html', 'https://www.firstclassexotics.com/blog/mclaren-w1');
  const a = d.querySelector('a[href^="tel:"]');
  if (a) { click(w, a); events.length ? ok('tracking works from /blog/ subdirectory') : bad('no event from blog subdir'); }
  else console.log('  (no tel: link on this post)');
}

console.log('\n── internal tools must be excluded ──');
{
  const { w, d, events } = load('index.html', 'https://www.firstclassexotics.com/blog-publisher');
  d.querySelectorAll('a[href^="tel:"]').forEach(a => click(w, a));
  events.length === 0 ? ok('/blog-publisher fires nothing') : bad('internal tool tracked');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
