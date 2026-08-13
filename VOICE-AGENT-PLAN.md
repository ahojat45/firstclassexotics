# FCE Voice Agent — Build Plan

**Written:** July 30, 2026
**Goal:** (1) an agent that calls new leads seconds after the form is submitted, (2) an agent that answers the phone and handles questions.

---

## The short answer

**Inbound is easy. Outbound is easy to build and legally gated.**

Both run on the same platform and the same agent config. The difference is that when *they* call *you*, there's no consent question. When *you* call *them* with an AI voice, federal law has something to say about it.

So the order matters: **inbound first, outbound second.** Details in the compliance section — read it before building the outbound half.

---

## What you already have (this is the good news)

Your repo already contains the exact hook the outbound call needs:

`netlify/functions/submission-created.js` — fires on every booking form submission, already parses name, phone, email, vehicle, dates, delivery preference, and message, and already writes the lead to Supabase.

Adding an outbound call trigger is roughly **15 lines in a file that already exists and already has the data.** That's the whole integration.

---

## Architecture

```
INBOUND
  Customer dials (949) 294-5958
    → rings your phone
    → no answer after 4 rings (or outside hours)
    → conditional forward to platform number
    → agent answers, qualifies, books a callback, texts you a summary

OUTBOUND
  Booking form submitted on firstclassexotics.com
    → Netlify Forms fires submission-created.js   [ALREADY EXISTS]
    → creates lead in Supabase                     [ALREADY EXISTS]
    → NEW: POST to voice platform, start outbound call
    → agent calls the lead within ~30 seconds
    → qualifies, confirms details, books your callback
    → writes outcome back to Supabase, texts you
```

**Do not port your main number to the platform.** Use conditional forwarding from your existing carrier. If the agent ever misbehaves you turn off forwarding and everything is back to normal in thirty seconds. Porting is a one-way door.

---

## Platform choice

| Platform | Rate | Best for |
|---|---|---|
| **Vapi** | ~$0.05/min base, **$0.10–0.30 all-in** | Most control, best docs, biggest ecosystem |
| **Retell** | ~$0.07/min base, $0.07–0.31 all-in | Simplest to get working, good call transfer |
| **Bland** | $0.14/min (Start), $0.12 (Build, $299/mo) | Bundled pricing, less assembly |

**Recommendation: Vapi or Retell.** Both do inbound and outbound from one agent config, both handle warm transfer to your cell, both have a webhook you can point at a Netlify function.

The per-minute rate has four components — speech-to-text, the LLM, text-to-speech, and telephony. Published base rates exclude most of that, which is why "$0.05/min" lands at $0.15 in practice. Budget **$0.15/min blended.**

### Cost math

A qualifying call runs 2–4 minutes. Call it 3.

| Calls/month | Minutes | Monthly cost |
|---|---|---|
| 50 | 150 | ~$23 |
| 150 | 450 | ~$68 |
| 300 | 900 | ~$135 |

Plus a phone number (~$2/mo) and possibly a platform fee. **Realistically $30–150/month at your volume** — versus HeyCarla's demo-gated tiers where the entry plan bundles 1,000 minutes you probably won't use.

---

## ⚠️ Compliance — read before building outbound

**I'm not a lawyer and this isn't legal advice.** But the rules here are specific enough, and the penalties large enough, that you should know them before writing code. TCPA damages run $500–$1,500 per call, and it's a favorite of plaintiff firms.

### The core issue

In **February 2024 the FCC ruled that AI-generated voices count as "artificial or prerecorded voice"** under the TCPA. That applies whether the AI is generating speech live or playing back a recording. Every existing TCPA consent rule therefore applies to your outbound agent.

In practice, in 47 states, that means **prior express written consent** before an AI voice calls a cell phone. (The Fifth Circuit — Texas, Louisiana, Mississippi — held in *Bradford v. Sovereign Pest Control*, Feb 2026, that the statute only requires express consent, not written. That ruling does not help you in California.)

**Your booking form currently has no consent language.** Fields are: first-name, last-name, phone, email, vehicle, delivery, start-date, end-date, message. Nothing else.

### What to add before turning on outbound

1. **A consent checkbox on the booking form.** Not pre-checked. Wording along the lines of:

   > ☐ I agree that First Class Exotics may contact me by phone, text, or automated/AI-assisted call at the number provided about my rental request. Consent is not a condition of rental. Message and data rates may apply.

2. **Store the consent** — timestamp, IP, and exact wording shown — alongside the lead in Supabase. If anyone ever challenges it, the record is the defense. Add a `contact_consent` column and capture it in `submission-created.js`.

3. **Disclose the AI at the top of every call.** The FCC has a pending rule that will likely make this mandatory federally within 12–24 months. California already has a bot-disclosure law. Do it now regardless — it's also just better manners, and it prevents the "wait, is this a robot?" moment that kills the call.

4. **California is a two-party consent state for recording.** If you record calls — and you'll want to, for tuning — the agent must say so and get agreement.

5. **Honor opt-outs immediately** and scrub against the National DNC list for anything that isn't a direct response to an inbound inquiry.

### Why inbound is the easy half

When the customer dials you, none of the above consent machinery applies — they initiated contact. You still disclose the AI and any recording, but there's no TCPA consent gate. **This is the main reason to build inbound first.**

---

## The agent itself

### Hard rules

- **Never quote a price.** Your entire site says "Contact for Rates" and your pricing is negotiated per booking and per network availability. The agent collects and qualifies; you close. This is also your differentiation — an agent that quotes turns you into every other rental company.
- **Never claim to be Ali.** Your brand is "you deal with Ali directly." An agent pretending to be you actively damages the thing you sell. It should introduce itself as your assistant, by name, and say it's AI.
- **Always offer a human.** "Want me to have Ali call you right back?" should be available at any point, and any hesitation should trigger it.

### Qualification script

Your published requirements: 25+, valid license, full coverage comprehensive & collision **in the renter's name**, major credit card for the deposit. Exemptions possible.

The agent should collect, in roughly this order:

1. Name, callback number, email
2. What car, or what kind of car — and what's the occasion
3. Dates and times
4. Delivery or self pickup, and where
5. **Are you 25 or over?**
6. **Do you carry full coverage insurance in your own name?**
7. Anything else Ali should know

Then: *"Ali will call you back personally to confirm availability and pricing. What's the best time?"*

### The three things that make this better than a generic agent

**1. Catch contradictions between the car and the description.**
Diva Espinoza selected a Porsche 911 GT3 RS and wrote that she needed a *convertible*. The GT3 RS is coupe-only. A booking-optimized agent confirms the coupe and creates a problem on delivery day. Yours should hear the mismatch and ask. Same for "SUV" vs a sports car, "seats 5" vs a two-seater, "wedding" vs something impractical.

**2. Sell the network, not the inventory.**
HeyCarla assumes fixed inventory and queries a PMS. You're a broker — "I don't have it on the lot, but I can source it" is your actual advantage. When someone asks for a car you don't list, the agent should say yes-we-can-look, not no. Your site already promises exactly this.

**3. Flag the qualification failure early.**
If someone's 23, or has no full coverage, you want to know in the first ninety seconds — not after you've spent an hour arranging a Lamborghini. The agent should note it clearly and still route to you, since you do grant exemptions.

---

## Phased rollout

### Phase 0 — Measure first (this week, free)
Pull your call logs from your carrier. How many inbound calls, how many unanswered, what hours. **You may find the number doesn't justify the build** — or you may find it's the biggest hole in the business. Either way you'll know instead of guessing.

### Phase 1 — Inbound, after hours only (weekend, ~$20)
Stand up a Vapi or Retell agent. New number. Forward (949) 294-5958 to it **only outside 8am–6pm**. Lowest possible risk: the alternative right now is voicemail, so the bar is "better than nothing."

Listen to every call for the first two weeks. Tune the prompt.

### Phase 2 — Inbound overflow during hours (week 2–3)
Add no-answer forwarding after 4 rings during business hours. You still pick up first; the agent only catches what you miss.

### Phase 3 — Outbound speed-to-lead (after consent is live)
Add the consent checkbox to the form, deploy, and **wait until you have leads that consented under the new language** — don't call people who submitted before it existed. Then add the trigger to `submission-created.js`.

Speed-to-lead is where the real money is. You've seen it firsthand: 20 leads sat 6–9 days and most went cold. A call in 30 seconds versus 6 days isn't a small improvement.

### Phase 4 — Only then, the product question
If it works for you, you'll have a live system, real call data, and a demo — a far better position to sell from than a pitch deck. Not before.

---

## Honest risks

- **Your brand is personal service.** "You deal with Ali directly" is on your homepage six times. An AI answering could undercut that if it's obvious or clumsy. After-hours-only is the safest way to test whether your customers accept it at all.
- **Exotic rental customers are high-touch.** Someone spending four figures on a weekend in a Lamborghini may want a human. Watch the hangup rate.
- **Voice AI still stumbles** on interruptions, accents, and noisy environments — airports especially, which is half your delivery business.
- **Outbound has real legal exposure.** Inbound essentially doesn't. Respect the difference.

---

## Next step

Get the call log numbers from your carrier. If you're missing more than a handful of calls a week, Phase 1 is worth a Saturday. I can write the full agent prompt, the qualification flow, and the `submission-created.js` trigger code whenever you want to start.
