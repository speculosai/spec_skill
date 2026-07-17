# Speculos Deploy — renamed to Speculos Toolkit

**This plugin has been renamed.** `speculos-deploy` is now **Speculos Toolkit**
(`speculos-toolkit`) — the same product (deploy to a live URL *plus* data connectors),
just a broader name. This package remains only as a deprecated pointer.

## Migrate

```bash
claude plugin install speculos-toolkit@speculos
claude plugin uninstall speculos-deploy@speculos
```

Or from the `/plugin` UI: install `speculos-toolkit@speculos`, then uninstall
`speculos-deploy@speculos`.

**Your sign-in and app URLs carry over automatically** — the credential paths
(`~/.speculos/identity.json` and each project's `.speculos.json`) are unchanged, so your
account and every existing app URL keep working. Nothing to re-link, no re-deploy needed.

Prefer npm? Install the new skill directly:

```bash
npx -y speculos-toolkit@latest install-skill
```

---

Docs: <https://deploy.speculos.ai> · New plugin source: `plugin/speculos-toolkit/`
