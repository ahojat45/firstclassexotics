# ACE TASK — Add 2026 Porsche 911 GTS (Satin Grey) to the fleet

## Standing rules — read first

Do not run `git push`. Do not run any `netlify` CLI command. Your sandbox cannot do either
(`CONNECT tunnel failed, response 403`, and `mktemp: Operation not permitted` from the git
credential helper). Retrying never succeeds.

Make the edits, `git add`, `git commit` locally, then STOP and report exactly:

```
COMMITTED — not pushed
Commit SHA:
Files changed:
Summary of change:
```

---

## What you're adding

A new car: **2026 Porsche 911 GTS, Satin Grey.** It needs a fleet gallery folder, a fleet
card on the homepage, and an entry in the booking form dropdown.

**Directory slug (use exactly this):** `porsche-911-gts-satin-grey`

---

## Step 1 — download the 5 photos

Download these to a temp folder. They are Google Drive files, shared anyone-with-link, so
plain `curl` works. **Download in this exact order — the numbering matters.**

| Target filename | Shot | Download URL |
|---|---|---|
| `-01` | exterior, front three-quarter — **this is the card hero** | `https://drive.google.com/uc?export=download&id=1JU2wzacxb4vTF8DhkZ5kLCQb55QsSEuv` |
| `-02` | exterior, front | `https://drive.google.com/uc?export=download&id=1xMPQo4dNbZ9M1iQahf8mhcaquqnCmGLG` |
| `-03` | exterior, rear three-quarter | `https://drive.google.com/uc?export=download&id=1H0bUJxR5Z5ijAaaVvIhBgNGWvYQoeMKU` |
| `-04` | interior, seats | `https://drive.google.com/uc?export=download&id=1R0-J1DzccnCAhFr888BfbDdY4VbJXQG2` |
| `-05` | interior, dashboard | `https://drive.google.com/uc?export=download&id=1NNbkoL9eQVpf-DaVg_z2HL-TUbGJZYfS` |

**Open each file and confirm the shot matches the description before you rename it.** The
`-01` must be an exterior front three-quarter of the whole car — that is the site
convention and it is what appears on the fleet page. Interiors go last. If what you see
doesn't match this table, stop and report it rather than guessing.

---

## Step 2 — convert them (do NOT skip this)

**The source files are PNGs, 2–2.5 MB each. They must not go into the repo as PNGs.**
Two hard rules in `CLAUDE.md`: zero PNGs under `images/`, and zero files over 800 KB.
The site was just optimised from 20 MB to 11.6 MB — dropping 12 MB of PNGs in would undo it.

Convert each to progressive JPEG, max dimension 1600px, quality 82, metadata stripped:

```
mkdir -p images/fleet/porsche-911-gts-satin-grey

# for each downloaded file, in order:
sips -Z 1600 SOURCE.PNG --out /tmp/tmp.png
magick /tmp/tmp.png -quality 82 -interlace Plane -strip \
  images/fleet/porsche-911-gts-satin-grey/porsche-911-gts-satin-grey-01.jpg
```

If `magick` isn't available use `convert`, or Python/Pillow:
`im.save(path, 'JPEG', quality=82, optimize=True, progressive=True)`

Then verify — **all three must pass:**

```
ls -la images/fleet/porsche-911-gts-satin-grey/
find images/fleet/porsche-911-gts-satin-grey -iname '*.png' | wc -l   # must be 0
find images/fleet/porsche-911-gts-satin-grey -size +800k | wc -l      # must be 0
```

Expected result: 5 files named `porsche-911-gts-satin-grey-01.jpg` through `-05.jpg`,
each roughly 200–400 KB. The directory name and every filename stem must match exactly —
the gallery breaks silently if they don't.

---

## Step 3 — add the fleet card to `index.html`

Insert a new `<div class="fleet-card">` block **immediately before** the existing
`porsche-911-carrera-4s-gts-white` card, so it sits at the top of the Porsche group.
That card's `<img>` is currently at **line 1329** — search for
`porsche-911-carrera-4s-gts-white-01.jpg` to locate it.

Copy the structure of the surrounding Porsche cards exactly. Use this:

```html
    <div class="fleet-card">
      <img width="800" height="533" loading="lazy" src="images/fleet/porsche-911-gts-satin-grey/porsche-911-gts-satin-grey-01.jpg" alt="2026 Porsche 911 GTS satin grey rental Orange County exotic car rental First Class Exotics" style="object-position:center 65%" data-gallery="images/fleet/porsche-911-gts-satin-grey/porsche-911-gts-satin-grey-01.jpg,images/fleet/porsche-911-gts-satin-grey/porsche-911-gts-satin-grey-02.jpg,images/fleet/porsche-911-gts-satin-grey/porsche-911-gts-satin-grey-03.jpg,images/fleet/porsche-911-gts-satin-grey/porsche-911-gts-satin-grey-04.jpg,images/fleet/porsche-911-gts-satin-grey/porsche-911-gts-satin-grey-05.jpg" onerror="this.style.background='#1C1C1C'">
      <div class="fleet-card-overlay"></div>
      <div class="fleet-card-body">
        <div class="fleet-brand">Porsche</div>
        <div class="fleet-name">911 GTS</div>
        <div class="fleet-specs">
          <div class="fleet-spec"><strong>532 HP</strong></div>
          <div class="fleet-spec"><strong>2.9s</strong> 0&ndash;60</div>
          <div class="fleet-spec">T-Hybrid Flat-Six</div>
        </div>
        <div class="fleet-color" style="font-size:.62rem;color:var(--gray-2);margin-bottom:.6rem;letter-spacing:.08em">Satin Grey</div>
        <div class="fleet-price">Contact for Rates</div>
        <a href="#booking" data-car="2026 Porsche 911 GTS &mdash; Satin Grey" class="fleet-cta">Reserve Now</a>
      </div>
    </div>
```

**Flag for Ali, don't guess:** the HP, 0–60 and drivetrain line above are my best figures
for the 2026 992.2 Carrera GTS T-Hybrid. **Ask Ali to confirm them before this is pushed.**
Do not invent replacements if they look wrong — report and wait.

---

## Step 4 — add it to the booking form dropdown

In the `<select name="vehicle">` block, find `<optgroup label="Porsche">`. Add this as the
**first** option inside that group:

```html
              <option value="2026 Porsche 911 GTS &mdash; Satin Grey">2026 Porsche 911 GTS &mdash; Satin Grey</option>
```

**The `value` and the visible label must be identical strings** — that is a site
convention, and the `data-car` on the card CTA must match this string exactly or the
"Reserve Now" preselect silently fails.

---

## Step 5 — verify before committing

Run all of these and paste the output in your report:

```bash
# 1. naming convention holds
ls images/fleet/porsche-911-gts-satin-grey/

# 2. no PNGs, nothing oversized, anywhere
find images -type f -iname '*.png' | wc -l    # must be 0
find images -type f -size +800k | wc -l       # must be 0

# 3. every fleet dir referenced by index.html exists on disk
grep -o 'images/fleet/[a-z0-9-]*/' index.html | sed 's|images/fleet/||; s|/||' | sort -u > /tmp/refd.txt
ls images/fleet | sort > /tmp/ondisk.txt
comm -23 /tmp/refd.txt /tmp/ondisk.txt        # must be empty

# 4. the dropdown value and the card data-car match exactly
grep -c '2026 Porsche 911 GTS' index.html     # expect 3 (alt text, data-car, option value+label)

# 5. GA4 tracking still passes
npm run test:analytics                        # must be 20/20
```

Then `git add` and `git commit`. **Do not push.** Report in the format at the top.

---

## Do not do these

- Do not touch any other fleet directory or card.
- Do not change the "46+" fleet count, "12+ years" or "since 2014" copy anywhere. Adding a
  car may mean that number should change — **that is Ali's decision, not yours.**
- Do not modify `netlify.toml`, `js/fce-analytics.js`, or any file under `fce-os/`.
- Do not delete the source PNGs from Google Drive.
- Do not reorder or renumber any existing car.
