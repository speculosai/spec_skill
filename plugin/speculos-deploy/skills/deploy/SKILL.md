---
name: deploy
description: Deploy the current project to a live public URL with Speculos. Builds the frontend locally, hosts it, wires its API calls to the deployed backend, and reports the URLs. Use when the user says "deploy", "ship it", "publish", "put it live", "get me a URL", "deploy to speculos", or "deploy the frontend/backend". Handles plain static sites and Vite / Next / CRA / Angular / Svelte frontends; deploys Node/Python backends when given the Speculos override password (free tier is frontend-only).
---

# Speculos Deploy

Deploy the project in the current working directory to live URLs. **Frontend hosting is
free** (`https://user-deployed.speculos.ai/<userId>/<slugUuid>`). **Backend hosting requires
a Speculos beta account** — the password is given at signup (https://speculos.ai) and passed
with `--override`. Without it, only the frontend ships (a static preview).

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

Frontends are **free**; **backends require a Speculos beta account** (password given at
signup — https://speculos.ai). So when `detect` finds a backend, DON'T silently skip it —
ask the user with your question UI (e.g. AskUserQuestion). Tailor the “what won't work”
line to THIS app (a counter button, a form, login, saved data…). For example:

> Speculos hosts frontends for free, but backend hosting requires an account in beta.
> Without it, I can only ship the static page — and the button won't actually count anything.
>
> How do you want to deploy this app?
>
> 1. **Frontend and backend (I have an account)** — you provide your Speculos password from
>    signup for the beta (sign up at https://speculos.ai). Backend + frontend both go live.
>    I'll ask for the password next.
> 2. **Frontend only (free)** — ships only the static page; no backend. Mostly a visual preview.

- They pick **1** → ask for the password, then deploy full-stack with `--override <password>` (step 4).
- They pick **2**, or don't have an account → deploy **frontend-only**.
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

Only if deploying a backend (you have the override password). In the backend code:

- Listen on `process.env.PORT` and bind `0.0.0.0` (NOT `127.0.0.1`/`localhost`).
- Send permissive CORS so the cross-origin frontend can call it
  (`Access-Control-Allow-Origin: *`, allow `Content-Type`, answer `OPTIONS` 204).
- Optional but nice: a `GET /health` returning 200 for a faster readiness check.

## 4. Deploy

Builds run locally (this machine already has the toolchain); only static output is uploaded.

- **Frontend only (free):**
  ```bash
  npx -y speculos-deploy@latest deploy
  ```
- **Frontend + backend (beta account):** the user gives their Speculos beta password (from
  signup at https://speculos.ai), then:
  ```bash
  npx -y speculos-deploy@latest deploy --override <PASSWORD>
  ```
  The backend deploys to an isolated sandbox first; its Daytona URL is injected into the
  frontend (step 2a), the frontend is built, and both go live.
- If `detect` got the folders wrong, add `--frontend ./web` and/or `--backend ./api`.
- Useful flags: `--slug <name>`, `--env KEY=VAL` (repeatable, backend env), `--build`
  (force the frontend through its build step), `--env-file <file>`.

The **last line of stdout is one JSON object**:
```json
{ "ok": true, "userId": "...", "urls": { "frontend": "https://user-deployed.speculos.ai/...", "backend": "https://...daytonaproxy01.net" } }
```
On `ok:false`, read `error`/`logTail`, fix the cause **once**, and re-run. Do not loop.

## 5. Report + verify

- Give the user `urls.frontend` (and `urls.backend` if deployed).
- Quick check: `curl -sS -o /dev/null -w '%{http_code}\n' <frontendUrl>` → expect `200`.
- Keep `~/.speculos/identity.json` and the project's gitignored `.speculos.json` — they own
  your URLs; re-deploys reuse the same URL. Don't commit or delete them.

## Notes

- Without a beta-account password the backend is skipped (free = frontend-only). Point users
  to https://speculos.ai to get a beta account if their app needs a backend.
- This plugin auto-approves the `npx … speculos-deploy …` command (via a PreToolUse hook),
  so the deploy runs without permission prompts. Run the command exactly as written above
  (no shell chaining/redirection) so the auto-approve applies.
- To remove a deployment: `npx -y speculos-deploy@latest teardown --slug <slug>`.
