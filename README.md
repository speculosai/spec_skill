# Speculos Deploy — Claude Code plugin

Deploy the app you're working on to a **live public URL**, straight from Claude Code.
One command, no servers to configure, no account.

```
https://user-deployed.speculos.ai/<you>/<your-app>/
```

## Install (in Claude Code)

Run these two slash commands in Claude Code:

```
/plugin marketplace add speculosai/spec_skill
/plugin install speculos-deploy@speculos
```

That's it. Now in any project just say **"deploy this"** (or run `/speculos-deploy:deploy`).

> **Prerequisite:** Node.js must be installed (the deploy runs via `npx` — nothing is
> installed globally, and you don't need to clone anything).

## What it does

When you ask it to deploy, the plugin:

1. **Detects** your project — a static site, or a Vite / Next / CRA / Angular / Svelte
   frontend, plus a Node/Python backend if present.
2. **Prepares it to ship** — routes your frontend's API calls through the deployed
   backend URL, fixes sub-path asset paths, and (for backends) checks `0.0.0.0:$PORT`
   + CORS.
3. **Builds locally and deploys** — only the built static output is uploaded; your code
   never runs on our servers.
4. **Reports the live URL** and verifies it.

**Frontend hosting is free.** Backend hosting (an isolated sandbox per app) is unlocked
with a Speculos override password — paid plans land next cycle. Without it, a detected
backend is skipped and the frontend still ships.

## No permission prompts

The plugin includes a `PreToolUse` hook that auto-approves **only** clean
`npx speculos-deploy …` commands — anything with shell chaining, command substitution,
or redirection falls back to a normal permission prompt. So deploys don't nag you, and
nothing risky is ever auto-approved. Uninstalling the plugin removes the hook cleanly.

## Manage

```
/plugin update speculos-deploy@speculos      # get the latest
/plugin disable speculos-deploy@speculos
/plugin uninstall speculos-deploy@speculos
```

## Prefer not to use the plugin?

You can install just the skill + command allow-rule via npm instead:

```bash
npx -y speculos-deploy@latest install-skill
```

Or do a one-off deploy with no install at all:

```bash
npx -y speculos-deploy@latest deploy
```

## Identity & ownership

Your first deploy mints a machine-global `~/.speculos/identity.json` that owns every URL
you deploy from this machine; each project records its slug in a gitignored
`.speculos.json`. Keep both — re-deploys reuse the same URL.

---

Docs: <https://deploy.speculos.ai> · Plugin source: `plugin/speculos-deploy/`
