---
name: speculos-deploy
description: Deploy the current project to a live public URL with Speculos. Builds the frontend locally, hosts it, wires its API calls to the deployed backend, and reports the URLs. Use when the user says "deploy", "ship it", "publish", "put it live", "get me a URL", "deploy to speculos", or "deploy the frontend/backend". Handles plain static sites and Vite / Next / CRA / Angular / Svelte frontends; deploys Node/Python backends when the user has signed in (`speculos-deploy login`) to a Speculos account with backends enabled (free tier is frontend-only).
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
`{ dir, runtime, startCmd }` (node or python) or `null`. If detection picks the wrong
folders, you'll override with `--frontend`/`--backend` in step 4.

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
> Python 3.12** (pin another with `.nvmrc` / `.python-version`), capped at **~0.5 vCPU
> and 512 MB RAM** per app. The app is supervised (auto-restarts on crash, revived
> after a pause). **Storage is not durable** — a local SQLite file survives restarts
> but is **beta-ephemeral**; for data you can't lose, use an external database.
> TypeScript is built automatically (`npm run build`/`tsc`); set a `start` script if
> it's non-standard.

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
  This prints a link like `https://deploy.speculos.ai/link?code=XXXX-XXXX`. **Relay that link
  to the user**, ask them to open it, sign in, and click Approve. The command links this
  machine to their account so they can manage deployments online. Backend deploys then work
  with no password **once backends are enabled on their account** (beta — request at
  https://deploy.speculos.ai).
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
On `ok:false`, read `error`/`logTail`, fix the cause **once**, and re-run. Do not loop. If the
error code is `BACKEND_DISABLED`, the account isn't enabled for backends yet — deploy
frontend-only and point the user to https://deploy.speculos.ai.

## 5. Report + verify

- Give the user `urls.frontend` (and `urls.backend` if deployed). They can manage and tear
  down their deployments anytime at https://deploy.speculos.ai/dashboard.
- Quick check: `curl -sS -o /dev/null -w '%{http_code}\n' <frontendUrl>` → expect `200`.
- Keep `~/.speculos/identity.json` and the project's gitignored `.speculos.json` — they own
  your URLs; re-deploys reuse the same URL. Don't commit or delete them.

## Notes

- Until the user signs in (and their account has backends enabled) the backend is skipped
  (free = frontend-only). Run `speculos-deploy login`, or point users to https://deploy.speculos.ai.
- Permission is granted once at skill install, so the deploy command runs without prompting.
- To remove a deployment: `npx -y speculos-deploy@latest teardown --slug <slug>` (or use the
  dashboard at https://deploy.speculos.ai/dashboard).
