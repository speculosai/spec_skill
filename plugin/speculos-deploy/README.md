# Speculos Deploy — Claude Code plugin

Deploy the project you're working on to a live URL, straight from your coding agent.

## Install

```
/plugin marketplace add speculosai/spec_skill
/plugin install speculos-deploy@speculos
```

Then run `/speculos-deploy:deploy` in any project (or just ask your agent to "deploy this").

## What it does

- **Detects** your project (static site, or Vite/Next/CRA/Angular/Svelte; Node/Python backend).
- **Prepares it to deploy**: routes the frontend's API calls through the injected backend URL,
  fixes sub-path asset paths, and (for backends) checks `0.0.0.0:$PORT` + CORS.
- **Deploys**: frontend hosting is free; backends are enabled with the Speculos override
  password (paid plans soon).
- **No permission prompts**: a `PreToolUse` hook auto-approves *only* clean
  `npx speculos-deploy …` commands (never chained/redirected ones), so deploys don't ask.

The actual deploy runs `npx -y speculos-deploy@latest` — Node.js is the only prerequisite
(npx fetches the tool; no global install needed).

## Components

- `skills/deploy/` — the `/speculos-deploy:deploy` workflow.
- `hooks/` — `PreToolUse` Bash gate (`approve.sh` → `scripts/approve-deploy.cjs`) that
  auto-approves the deploy command.

Uninstall with `/plugin uninstall speculos-deploy@speculos` (removes the hook too — nothing
is left behind in your settings).
