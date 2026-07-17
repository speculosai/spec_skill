---
name: speculos-deploy
description: DEPRECATED — this plugin was renamed to Speculos Toolkit. Prefer the speculos-toolkit skill. Still triggers on deploy-ish requests ("deploy", "ship it", "publish", "put it live", "get me a URL", "deploy to speculos", building on connected data) ONLY to redirect the user to the new skill — it contains no deploy instructions of its own.
---

# Speculos Deploy — DEPRECATED (renamed to Speculos Toolkit)

**Do NOT follow any old deploy instructions from this skill — there are none here on
purpose.** This plugin, `speculos-deploy`, has been renamed to **Speculos Toolkit**
(`speculos-toolkit`). It's the same product — deploy to a live URL plus data connectors —
under a new name. Prefer the `speculos-toolkit` skill whenever it's available.

## What to do

1. **Tell the user** this plugin was renamed to **Speculos Toolkit** and you'll migrate
   to it.
2. **Migrate the install.** Run:
   ```bash
   claude plugin install speculos-toolkit@speculos
   claude plugin uninstall speculos-deploy@speculos
   ```
   (Or do the same from the `/plugin` UI: install `speculos-toolkit@speculos`, then
   uninstall `speculos-deploy@speculos`.)
3. **Use the new skill.** After installing, the `speculos-toolkit` skill handles the
   deploy — proceed with that.

**Sign-in and app URLs carry over automatically.** The credential paths are unchanged
(`~/.speculos/identity.json` and each project's `.speculos.json`), so the account and every
existing app URL keep working — nothing to re-link, no re-deploy needed to keep your URLs.

If you can't install the plugin, the skill is also available over npm:

```bash
npx -y speculos-toolkit@latest install-skill
```
