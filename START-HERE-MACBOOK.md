# Working from the MacBook — start here

Paste **this whole file** as your first message in a new Claude session on the MacBook.
Then paste `HANDOFF-2026-08-10.md` as your second message.

---

## Read this first, Claude

Ali is working from his MacBook instead of his iMac. He is not a developer. Give exact
copy-paste commands and say explicitly where to paste them (Terminal.app, never Ace,
never the VS Code terminal — both are sandboxed and cannot push).

**Do not assume the repo exists on this machine or that the paths in the handoff are
correct here.** Verify before doing anything. The username may differ, and the folder may
be somewhere other than the Desktop.

### Step 1 — find out what's actually on this machine

Ask Ali to run this in **Terminal.app** and paste back the output:

```
ls -d ~/Desktop/"First Class Exotics" 2>/dev/null && echo "FOUND on Desktop" || echo "NOT on Desktop"
echo "--- home folder is:"; echo ~
echo "--- searching:"; find ~ -maxdepth 4 -type d -name "First Class Exotics" 2>/dev/null
echo "--- git installed:"; git --version 2>/dev/null || echo "NO GIT"
```

### Step 2a — if the repo is NOT there, clone it

```
cd ~/Desktop && git clone https://github.com/ahojat45/firstclassexotics.git "First Class Exotics" && cd "First Class Exotics" && git log --oneline -3
```

He may be prompted to sign in to GitHub. **Do not ask him for a password or token, and do
not enter credentials for him** — have him do it himself in the browser window macOS opens.

### Step 2b — if the repo IS there, make sure it's current

```
cd ~/Desktop/"First Class Exotics" && git pull origin main && git log --oneline -3
```

The newest commit as of 10 Aug 2026 is `e8f5cdf`. If he's behind that, the pull fixes it.

### Step 3 — mount the folder so Claude can edit files directly

Use the `request_cowork_directory` tool with the path confirmed in Step 1. **This is the
whole reason the workflow is fast now** — without it, every change has to be described to
Ace instead of made directly.

### Step 4 — install the test dependency (once per machine)

```
cd ~/Desktop/"First Class Exotics" && npm install
```

Needed for `npm run test:analytics`, the GA4 regression test.

---

## Differences on this machine — call these out to Ali

| | Note |
|---|---|
| **Scheduled tasks** | They live on the **iMac** at `/Users/firstclassexotics/Claude/Scheduled/` and only run there, while that app is open. `fce-lead-calendar-sync`, the inbox monitors, and `ga4-mark-key-events` will **not** run from the MacBook. If the iMac is off, they run on its next launch. |
| **Pushing** | Same as always — Terminal.app only. Credentials are per-machine, so the first push from here may prompt him to sign in to GitHub. |
| **Uncommitted work** | Anything he or an agent changed on the iMac but never pushed is **not** on this machine. If something looks missing, check the iMac before concluding it was lost. |
| **`.git/index.lock`** | If he sees `fatal: Unable to create ... index.lock: File exists`, no git process is really running — a sandboxed agent left a stale lock. Fix: `rm -f .git/index.lock`. |

---

## Then

Ask Ali to paste `HANDOFF-2026-08-10.md` (it's in the repo root) for the full project
context, and ask him what he wants to work on.

If he doesn't have a specific goal, the open items in priority order are: WebP conversion
(11.6 MB → ~8 MB), Search Console indexing, then meta title/description lengths. After
those three the site is genuinely best-in-class technically — **say so plainly.** He has
pushed back on the feeling that the fix list never ends. It does end.
