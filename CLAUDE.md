# CLAUDE.md — First Class Exotics

Read this before touching anything. Longer history and the FCE OS dashboard notes live in `HANDOFF.md` — this file is the operating rules.

## Project

Static marketing site + `fce-os/` dashboard. Live at https://www.firstclassexotics.com

- **Hosting:** Netlify, auto-deploys on push to `main`
- **Repo:** `~/Desktop/First Class Exotics` (a trailing space in this folder name was removed 2026-07-27 — if a script breaks on the path, that's why)

## Hard rules — do not change these

- Netlify primary domain stays `www.firstclassexotics.com`; apex 301-redirects to `www`. Intentional.
- **Never touch Wix DNS.** Wix is live only for email MX records.
- Never send email on Ali's behalf. Drafts only, always.
- Don't commit without confirming the working tree is yours — more than one agent works in this repo.

## Fleet images — the convention

Every fleet gallery folder and file follows:

```
images/fleet/<dir>/<dir>-NN.jpg      # NN is zero-padded, starts at 01
```

The directory name and the filename stem must match exactly. Card and gallery references in `index.html` are built on this. Add a car that doesn't match and the gallery silently breaks.

Note the dir names are descriptive, not a fixed word order — both `miami-blue-2019-mclaren-570s` and `ferrari-296-gtb` are valid. Match whatever `index.html` references.

## Verified state as of 2026-07-27 (HEAD `760b654`)

Re-verified this date by direct file inspection, not carried from notes:

- 44 fleet dirs referenced by `index.html`, 245 images total
- **0** broken references — every referenced dir exists on disk
- **0** files violating the naming convention
- **0** PNGs under `images/`
- **0** images over 800 KB
- Page weight 40 MB → 18.7 MB

**The image audit is complete. Do not redo it.** Run the checks below if you need to confirm; don't re-derive the work.

## Known outstanding — 6 orphan directories

These 6 dirs exist on disk but are referenced by nothing. They hold raw pre-standardization originals with Google Drive ID filenames (e.g. `119BhD-HJZiVsDFAfsB_JdpZZ9CXzcTdJ.jpg`), ~13.6 MB total:

```
images/fleet/mclaren-570s-miami-blue
images/fleet/mclaren-artura-coupe-silver
images/fleet/mclaren-artura-spider-black
images/fleet/mercedes-amg-g63-silver
images/fleet/mercedes-brabus-800-gwagon-black
images/fleet/mercedes-maybach-gls-600-white
```

Each is a slug-style duplicate of a descriptive dir that *is* referenced. They don't affect the live site (Netlify serves them but nothing links them). Safe to delete — **but confirm with Ali first**, they may be the only copies of those originals.

## Booking form pipeline

Netlify Forms → `formresponses@netlify.com` → `ali@firstclassexotics.com`

Subject pattern: `Form submission from booking form: <FirstName>`

Fields in order: First Name, Last Name, Phone, Email, Vehicle, Delivery, Start Date, End Date, Message.

**The `Message` free-text field regularly contradicts the `Vehicle` dropdown.** One July lead selected a Porsche 911 GT3 RS while describing a convertible in the message; the GT3 RS is coupe-only. Any automation reading these leads must parse `Message`, not just the structured fields.

## Verification one-liners

```bash
# every referenced fleet dir exists, and what's on disk but unused
grep -o 'images/fleet/[a-z0-9-]*/' index.html | sed 's|images/fleet/||; s|/||' | sort -u > /tmp/refd.txt
ls images/fleet | sort > /tmp/ondisk.txt
comm -23 /tmp/refd.txt /tmp/ondisk.txt   # referenced but MISSING — must be empty
comm -13 /tmp/refd.txt /tmp/ondisk.txt   # on disk, unreferenced — the 6 orphans

# convention + weight checks
find images -type f -iname '*.png' | wc -l   # must be 0
find images -type f -size +800k | wc -l      # must be 0
```

## Scheduled tasks are NOT in this repo — do not search for them here

There is an open problem with three scheduled jobs, but **none of them are defined in this repository.** They are not Netlify scheduled functions, not in `netlify.toml`, not in `netlify/functions/`, not in `scripts/`, not in `package.json`. Grepping this repo for their names returns only this file.

They are Claude/Cowork scheduled tasks, defined here:

```
/Users/firstclassexotics/Claude/Scheduled/fc-exotics-inbox-monitor/SKILL.md
/Users/firstclassexotics/Claude/Scheduled/fce-lead-calendar-sync/SKILL.md
/Users/firstclassexotics/Claude/Scheduled/bioaminex-inbox-monitor/SKILL.md
```

Debug them there, in a session with access to that folder — not from this repo.

**Status as of 2026-07-27 18:30 PDT:** all three are enabled and firing on schedule. `fc-exotics-inbox-monitor` and `bioaminex-inbox-monitor` run at 08:00 and 18:00 daily; `fce-lead-calendar-sync` runs every 2 hours. All three last fired ~18:03 PDT today. So the cron side works — the failure is downstream of the trigger. They fired twice daily for 11 days and produced no drafts, which is why 20 booking-form leads went 6–9 days without a reply. Fixing this is higher value than any remaining site work.

## Terminal cwd gotcha

The repo folder used to have a **trailing space** in its name. It was removed 2026-07-27. Agent terminals that cached the old cwd fail to launch with:

```
Starting directory (cwd) "/Users/firstclassexotics/Desktop/First Class Exotics " does not exist
```

Fix: restart the terminal, or `cd '/Users/firstclassexotics/Desktop/First Class Exotics'` with the corrected path. Nothing is wrong with the repo.

The same stale path is baked into the **local** Netlify cache — `.netlify/netlify.toml` and `.netlify/functions/manifest.json` both hardcode `/Users/firstclassexotics/Desktop/First Class Exotics ` (trailing space). This is generated build cache, not source: it breaks `netlify dev` locally but does **not** affect production, since Netlify builds on its own servers from the root `netlify.toml`, which uses relative paths. Fix by deleting `.netlify/` and letting the CLI regenerate it. Verified 2026-07-27.
