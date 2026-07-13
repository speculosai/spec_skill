---
name: speculos-deploy
description: Deploy the current project to a live public URL with Speculos, and build against the user's linked data sources (connectors). Builds the frontend locally, hosts it, wires its API calls to the deployed backend, and reports the URLs. Use when the user says "deploy", "ship it", "publish", "put it live", "get me a URL", "deploy to speculos", "deploy the frontend/backend", or wants an app built on their connected data (BigQuery, Postgres, Snowflake, Salesforce, ...). Handles plain static sites and Vite / Next / CRA / Angular / Svelte frontends; deploys Node/Python/Bun backends when the user has signed in (`speculos-deploy login`) to a Speculos account with backends enabled (free tier is frontend-only).
---

# Speculos Deploy

Deploy the project in the current working directory to live URLs. **Frontend hosting is
free** (`https://user-deployed.speculos.ai/<userId>/<slugUuid>`). **Backend hosting requires
a Speculos account with backends enabled** — the user signs in once with
`speculos-deploy login` (a quick browser approval). Without it, only the frontend ships
(a static preview).

Do all of the steps below yourself — detect, edit the code to be deploy-ready, run the
deploy, verify. Don't just tell the user to do it. Don't run `vercel`/`daytona` directly.

## 1. Detect what this project is

```bash
npx -y speculos-deploy@latest detect --json
```

Read the JSON: `detected.frontend` = `{ dir, kind, framework }` where `kind` is `static`
(serve as-is) or `build` (Vite/Next/CRA/Angular/Svelte); `detected.backend` =
`{ dir, runtime, startCmd }` (node, python, or bun — a `bun.lockb`/`bunfig.toml` selects
Bun, which runs TS/JS natively) or `null`. If detection picks the wrong folders, override
with `--frontend`/`--backend` in step 4 (or force a build dir to serve as-is with `--static`).

### If the project has a backend, ASK the user how to deploy (before you build)

Frontends are **free**; **backends require a Speculos account with backends enabled**
(sign up / sign in at https://deploy.speculos.ai). So when `detect` finds a backend, DON'T silently
skip it — ask the user with your question UI (e.g. AskUserQuestion). Tailor the “what won't
work” line to THIS app (a counter button, a form, login, saved data…). For example:

> Speculos hosts frontends for free, but backend hosting needs a Speculos account (beta).
> Without it, I can only ship the static page — and the button won't actually count anything.
>
> How do you want to deploy this app?
>
> 1. **Frontend and backend** — link your Speculos account. I'll run
>    `speculos-deploy login`, which prints a link; open it, approve. If your account has
>    backends enabled (beta — request at https://deploy.speculos.ai), the backend deploys
>    too; otherwise I'll ship the frontend.
> 2. **Frontend only (free)** — ships only the static page; no backend. Mostly a visual preview.

- They pick **1** → run `speculos-deploy login` (step 4, “Link this device”), then deploy.
- They pick **2**, or aren't signed in → deploy **frontend-only**.
- No backend in the project → just deploy the frontend; don't ask.

## 2. Make the frontend deploy-ready (do these edits)

The site is served under a **sub-path** and talks to a **different-origin** backend, so fix
two things in the frontend source. Keep edits minimal and idempotent.

### 2a. Route EVERY API call through the injected backend URL  ← most important

Speculos injects the deployed backend's Daytona URL at deploy time. Your job is to make the
frontend READ that injected value instead of any hard-coded address, so every request hits
the deployed backend. Search the frontend for hard-coded API bases and rewrite them:

- search for: `http://localhost:<port>`, `http://127.0.0.1:<port>`, `:8080`, `:3001`,
  `fetch("http://...")`, `axios.create({ baseURL: ... })`, a `const API_URL = "..."`,
  `.env` values like `VITE_API_URL=http://localhost...`, etc. **Rewrite all of them** — leave
  none hard-coded.
- replace the base with the framework's injected variable, keeping a localhost fallback for
  local dev:

  | Frontend kind | Use this as the API base |
  |---|---|
  | Vite | `import.meta.env.VITE_API_URL` |
  | Next | `process.env.NEXT_PUBLIC_API_URL` |
  | CRA  | `process.env.REACT_APP_API_URL` |
  | plain static (HTML/JS) | `window.SPECULOS_API_URL` |

  Examples:
  ```js
  // Vite/Next/CRA — define one base and use it everywhere
  const API = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
  fetch(`${API}/api/things`);
  ```
  ```html
  <!-- plain static site -->
  <script>
    const API = (window.SPECULOS_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
    fetch(API + "/api/things");
  </script>
  ```

Net effect: after deploy, the build/runtime has the real Daytona backend URL baked in, so
**all** API calls go to the deployed backend. (The URL changes per deploy — never hard-code
the literal Daytona URL; always read the injected variable so re-deploys keep working.)

### 2b. Assets resolve under the sub-path automatically

For build frameworks the CLI sets the correct base automatically — including **Next.js**
(it injects `basePath`/`assetPrefix`, so `_next/*` assets, fonts referenced in CSS, and
client-side `<Link>` navigation all resolve under the sub-path; and root-absolute
`/public` asset references — `<img src="/x">`, `next/image`, `fetch("/data.json")` — are
rewritten to the sub-path in the build output, so they work after client-side re-renders
too). A Next app must be **static-export-able** (no SSR / API routes / server actions). For plain static sites,
prefer **relative** asset paths (`./styles.css`); root-absolute refs in HTML are
auto-rewritten by the host. Don't ship secrets in the frontend — the bundle is public.

## 3. Make the backend deploy-ready (only for a full-stack deploy)

Only if deploying a backend (signed in, backends enabled). In the backend code:

- Listen on `process.env.PORT` and bind `0.0.0.0` (NOT `127.0.0.1`/`localhost`).
  Speculos runs your app on `$PORT` for you — Node `process.env.PORT`, and for
  Python it sets the framework's host/port (uvicorn/gunicorn/Flask/Django are
  launched bound to `0.0.0.0:$PORT` automatically). Don't hard-code a port.
- **CORS is handled for you** — Speculos injects permissive CORS at the edge, so the
  cross-origin frontend can call your backend **even if you set none**. You don't need
  to add CORS code (if you do, it's normalized at the edge). Use **Bearer-token** auth
  rather than cross-site cookies.
- Optional but nice: a `GET /health` returning 200 for a faster readiness check.

> **Runtime, resources & lifecycle (tell the user):** backends run on **Node 22 /
> Python 3.12 / Bun** (auto-detected; pin Node/Python with `.nvmrc` / `.python-version`),
> capped at **~0.5 vCPU and 512 MB RAM** per app. The app is supervised (auto-restarts on
> crash, revived after a pause). **Data persists across redeploys** — a local SQLite file
> (and files under `data/` / `uploads/` / `storage/`) is preserved when you re-`deploy` the
> same app, because the backend reuses its sandbox (which also keeps the backend URL stable).
> It's a single sandbox with no backups, so use an external database for anything critical.
> TypeScript is built automatically (`tsc`/`npm run build`, or run natively under Bun); set a
> `start` script if it's non-standard.

## 3.5 Connectors: build against the user's real data

Speculos accounts (and orgs) can link **data sources** — BigQuery, Snowflake, Salesforce,
Postgres, … — in the dashboard. When the app needs real data, discover what's linked and
build against it instead of inventing schemas.

### Check what's linked (do this BEFORE writing data-layer code)

```bash
npx -y speculos-deploy@latest connectors list --json
```

The last stdout line is `{ ok, brokerUrl, connectors: [{ alias, name, kind, accountIdentifier, tools: [...] }] }`.

- `ok:false` + `code:"NO_TOKEN"` → the device isn't logged in; run `login` (step 4) first.
- `ok:true` with empty `connectors` → nothing linked (or nothing granted to this user).
  If the app clearly wants external data, tell the user to link a source (or ask their org
  admin for access) at **https://deploy.speculos.ai/dashboard**, then **re-run the list** —
  access is resolved server-side on every call, so a source linked or granted seconds ago
  shows up immediately with no re-login and no session restart. Never block a deploy on this.
- A `403 NO_ACCESS` on execute means an org admin hasn't granted that source to this user —
  same recovery: ask, then simply retry.

### Live discovery (read-only!)

Learn the real schema and a few sample rows before coding. Execute read/list/get/describe
tools only — never create/update/delete/send tools during discovery. **Always pass
arguments via `--args-file`** (inline JSON containing `$`, `(`, `)` can trip the
auto-approval guard):

```bash
cat > /tmp/args.json << 'EOF'
{ "sql": "SELECT * FROM analytics.orders ORDER BY created_at DESC LIMIT 20" }
EOF
npx -y speculos-deploy@latest connectors exec --connector postgres \
  --tool POSTGRES_QUERY --args-file /tmp/args.json
```

Pick tools from the `tools` array in `connectors list` (e.g. `POSTGRES_SCHEMA`,
`GOOGLEBIGQUERY_LIST_DATASETS`, `SALESFORCE_QUERY`). Fetch SMALL samples (`LIMIT 20`,
narrow ranges) — enough to see real column names and value shapes, never whole datasets.
Every `exec` call needs a `--connector <alias>` (the broker requires it — a call
without one is rejected, never silently run against the wrong source).

### Prefer the connector over a direct API key (migrate existing apps)

If the project already calls a service **directly** — an Airtable/Stripe/BigQuery
SDK, a hard-coded API key, a `pg`/`psycopg` connection string in the code — and the
user has a linked connector for that same service, **rewrite those calls to go
through the broker** and drop the embedded credential. The connector is safer (the
secret stays on the platform, rotates, and is access-controlled) and it's what keeps
working once deployed. For example, an app the user named "airtable-dashboard" that
imports `airtable` with a PAT: replace the SDK calls with `connector("airtable",
"AIRTABLE_LIST_RECORDS", {...})` via the helper below, and delete the PAT. Only do
this for services the user actually has a connector for (check `connectors list`);
leave other integrations untouched.

### The runtime pipe: ONE code path, local and deployed

Deployed backends automatically receive `SPECULOS_CONNECTORS_URL` and
`SPECULOS_CONNECTORS_TOKEN` (an app-scoped broker token; no `--env` needed). For local
runs, fall back to the developer's CLI token. Write this helper into the backend once and
route every connector call through it — the SAME code then works locally right now and
deployed later, with zero changes at deploy time:

```js
// speculos.js — connector broker client (backend only; never import in the frontend)
const fs = require("fs"), os = require("os"), path = require("path");
const BROKER = process.env.SPECULOS_CONNECTORS_URL || "https://deploy-orch-38hd4.speculos.ai/api/connectors";
function token() {
  if (process.env.SPECULOS_CONNECTORS_TOKEN) return process.env.SPECULOS_CONNECTORS_TOKEN; // deployed
  try { // local dev: reuse the CLI login on this machine
    return JSON.parse(fs.readFileSync(path.join(os.homedir(), ".speculos", "identity.json"), "utf8")).accountToken;
  } catch { throw new Error("no Speculos credentials — run `npx -y speculos-deploy@latest login`"); }
}
async function connector(alias, tool, args) {
  const r = await fetch(`${BROKER}/execute`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token()}` },
    body: JSON.stringify({ connector: alias, tool, arguments: args || {} }),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok || !out.ok) throw new Error(out.error || `connector ${r.status}`);
  return out.data;
}
module.exports = { connector };
```

```python
# speculos.py — same pipe for Python backends
import json, os, urllib.request
BROKER = os.environ.get("SPECULOS_CONNECTORS_URL", "https://deploy-orch-38hd4.speculos.ai/api/connectors")
def _token():
    if os.environ.get("SPECULOS_CONNECTORS_TOKEN"): return os.environ["SPECULOS_CONNECTORS_TOKEN"]
    try:
        with open(os.path.expanduser("~/.speculos/identity.json")) as f: return json.load(f)["accountToken"]
    except Exception: raise RuntimeError("no Speculos credentials — run `npx -y speculos-deploy@latest login`")
def connector(alias, tool, args=None):
    req = urllib.request.Request(f"{BROKER}/execute", method="POST",
        data=json.dumps({"connector": alias, "tool": tool, "arguments": args or {}}).encode(),
        headers={"content-type": "application/json", "authorization": f"Bearer {_token()}"})
    with urllib.request.urlopen(req) as r: out = json.load(r)
    if not out.get("ok"): raise RuntimeError(out.get("error") or "connector call failed")
    return out["data"]
```

Rules to follow (and state to the user):
- **Only backend code calls the broker.** The token is a secret; the frontend must go
  through the backend (frontend → backend → broker), never call the broker directly.
- Handle `ok:false` gracefully in the app — provider/tool errors are data, not crashes.
- Grants are checked per call and tokens rotate on redeploy — an admin revoking access
  applies live to a running app; nothing needs redeploying.
- Broker responses (`POSTGRES_QUERY`, etc.) cap at 1000 rows / 10s per statement, and
  Postgres sources are strictly read-only.

### App visibility (tell the user)

An app deployed by an **org member starts `private`** — only its owner can open it (the
page redirects through deploy.speculos.ai to check). The owner or an org admin can switch
it to **org-wide** (any org member) or **public** from the dashboard, live. For a private/org
app, the frontend must forward its gate cookie to backend calls — add this to the fetch
wrapper from step 2a:

```js
const gate = document.cookie.split("; ").find(c => c.startsWith("spec_gate="))?.slice(10);
fetch(`${API}/api/things`, { headers: gate ? { "x-speculos-gate": gate } : {} });
```

(Public apps can skip this — the header is simply ignored.)

## 4. Deploy

Builds run locally (this machine already has the toolchain); only static output is uploaded.

- **Frontend only (free):**
  ```bash
  npx -y speculos-deploy@latest deploy
  ```
- **Link this device (once):**
  ```bash
  npx -y speculos-deploy@latest login
  ```
  `login` **blocks while it waits for approval** (up to 10 min), and prints the approval link
  both to stderr and as its FIRST stdout JSON line (`{"action":"login","url":"…","code":"…"}`).
  **Run it in the background** (e.g. Claude Code Bash with `run_in_background: true`, or a long
  `timeout`) so it isn't killed by a default command timeout before the user approves. Read the
  link from that first line and **relay it to the user** — ask them to open it, sign in, and
  click Approve. It links this machine to their account (already linked? it no-ops — pass
  `--relink` to switch accounts). Backend deploys then work with no password **once backends
  are enabled** (beta — request at https://deploy.speculos.ai). Unlink with
  `speculos-deploy logout`.
- **Frontend + backend (signed in):** just run the normal deploy — the saved sign-in
  authorizes the backend:
  ```bash
  npx -y speculos-deploy@latest deploy
  ```
  The backend deploys to an isolated sandbox first; its Daytona URL is injected into the
  frontend (step 2a), the frontend is built, and both go live.
  (Admins/CI can instead pass `--override <password>` to bypass account auth.)
- If `detect` got the folders wrong, add `--frontend ./web` and/or `--backend ./api`.
- Useful flags: `--slug <name>`, `--env KEY=VAL` (repeatable, backend env), `--build`
  (force the frontend through its build step), `--env-file <file>`.

The **last line of stdout is one JSON object**:
```json
{ "ok": true, "userId": "...", "urls": { "frontend": "https://user-deployed.speculos.ai/...", "backend": "https://...daytonaproxy01.net" } }
```
On `ok:false`, read `error`/`logTail`, fix the cause **once**, and re-run. Do not loop.

> **`BACKEND_DISABLED`** means the device is linked but the account isn't enabled for backend
> hosting yet (a separate beta gate). **`TOO_MANY`** means the account is at its backend limit.
> In both cases the deploy still **ships the frontend** and returns `ok:true` with a
> `backendNote` — so the user already has a live URL. Tell them to **request access / free up a
> slot at https://deploy.speculos.ai/dashboard** (the "Join the beta" button, or tear down a
> backend). Always write the URL as **https://deploy.speculos.ai** — never `speculos.ai`. Don't
> retry the backend; once enabled/under the limit, re-running `deploy` ships it. Redeploying an
> app that already has a backend never counts against the limit (it reuses its sandbox).

## 5. Report + verify

- Give the user `urls.frontend` (and `urls.backend` if deployed). They can manage and tear
  down their deployments anytime at https://deploy.speculos.ai/dashboard. The public URL is
  `user-deployed.speculos.ai/<username>/<app-slug>/`, and BOTH segments are renameable there:
  "Edit URL" changes an app's slug (the second segment), and the account's "Your URL name"
  changes the first segment (default a random id) for every app on that device. Beta accounts
  can also connect their own domain — a **two-step** flow: (1) add the domain, which shows a
  **CNAME** target (`cname-user.speculos.ai`) plus a **TXT** ownership record to publish, then
  (2) click Verify once both are set (we confirm the domain points here AND the TXT proves the
  account controls it before activating). A connected domain serves the SAME app and honors the
  username/app-slug you chose. After any rename, the URL from an older deploy output is stale
  (re-deploys automatically target the new URL) — **warn the user that a complex app (one with
  client-side routing, hashed asset URLs baked at build time, etc.) may need a fresh `deploy`
  to fully pick up a slug/username rename**, since the rename rewrites the already-deployed
  files rather than rebuilding them.
- Quick check: `curl -sS -o /dev/null -w '%{http_code}\n' <frontendUrl>` → expect `200`.
- Keep `~/.speculos/identity.json` and the project's gitignored `.speculos.json` — they own
  your URLs; re-deploys reuse the same URL. Don't commit or delete them.

## Notes

- Until the user signs in (and their account has backends enabled) the backend is skipped
  (free = frontend-only). Run `speculos-deploy login`, or point users to https://deploy.speculos.ai.
- Permission is granted once at skill install, so the deploy command runs without prompting.
- To remove a deployment: `npx -y speculos-deploy@latest teardown --slug <slug>` (or use the
  dashboard at https://deploy.speculos.ai/dashboard).
- **Already have this skill from before connectors existed?** Re-run
  `npx -y speculos-deploy@latest install-skill` to refresh it (safe to run repeatedly — it
  overwrites the skill file and re-grants the command). The CLI itself is always current
  because every command runs `npx -y speculos-deploy@latest`.
- **Sign in without the browser flow:** a user who already has an account (or whose platform
  issues them a token) can paste it: `npx -y speculos-deploy@latest login --token spec_tok_…`.
  Add `--relink` to move a device that was linked to the wrong account (e.g. a personal one
  instead of the org) onto the token's account. Backends and connectors then resolve under
  that account/org.
- **Redeploys persist data.** Re-running `deploy` on the same app reuses its sandbox, so a
  local SQLite file and anything under `data/`/`uploads/`/`storage/` survive — the connector
  broker credentials are re-injected each deploy and don't affect on-disk data.
