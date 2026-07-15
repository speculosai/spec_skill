# Speculos Deploy — Claude Code plugin

Deploy the app you're working on to a **live public URL**, straight from Claude Code.
One command, no servers to configure, no account.

```
https://user-deployed.speculos.ai/<you>/<your-app>
```

## Install — one command

Paste this once into your terminal:

```bash
claude plugin marketplace add speculosai/spec_skill && claude plugin install speculos-deploy@speculos
```

Restart Claude Code (or run `/reload-plugins`). Then in any project just say
**"deploy this"** (or run `/speculos-deploy:deploy`).

> Prefer the in-app UI? The same thing as two slash commands:
> `/plugin marketplace add speculosai/spec_skill` then
> `/plugin install speculos-deploy@speculos`.

> **Prerequisite:** Node.js must be installed (the deploy runs via `npx` — nothing is
> installed globally, and you don't need to clone anything).

> **Auto-updates:** the plugin isn't pinned to a version, so every push to this repo is
> picked up by Claude Code's background auto-update at startup — your install always runs
> the latest. No manual update needed (you *can* force it with
> `/plugin update speculos-deploy@speculos`).

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

**Frontend hosting is free.** Backend hosting (an isolated sandbox per app) is included
with every Speculos account — one backend app free; sign in once with
`speculos-deploy login` (a quick browser approval; sign up at https://deploy.speculos.ai).
Without signing in, a detected backend is skipped and the frontend still ships. Need more
backend apps or team features? Talk to our team at https://speculos.ai/demo.

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
