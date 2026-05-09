# Dokploy Deployment

Use this Compose file when deploying the fork from GitHub in Dokploy.

## Dokploy Settings

- Provider: GitHub
- Compose type: Docker Compose, not Stack
- Compose path: `docker-compose/dokploy/docker-compose.yml`
- Domain mappings:
  - `https://lobe.nabiler.com` -> service `lobe`, port `3210`
  - `https://files.nabiler.com` -> service `rustfs`, port `9000`
  - Optional admin UI: `https://files-ui.nabiler.com` -> service `rustfs`, port `9001`

Create DNS `A` records for `lobe.nabiler.com`, `files.nabiler.com`, and optionally
`files-ui.nabiler.com`, all pointing to the Hetzner VPS running Dokploy.

## Environment

Copy the variables from `.env.example` into Dokploy's Environment tab and replace
the placeholder secrets. Dokploy writes environment values to a `.env` file next
to the Compose file, and this Compose file uses `env_file: .env` for runtime
injection.

Set `OPENROUTER_API_KEY` in Dokploy to enable OpenRouter as the server-side model
provider. `OPENROUTER_MODEL_LIST` is optional; leave it unset to use the built-in
model list.

Keep Postgres and Redis private. This Compose file does not publish their ports
to the host; only Dokploy domain routing should expose `lobe` and `rustfs`.

## Updating

Push changes to the configured GitHub branch and trigger a Dokploy deployment.
The `lobe` image is built from this repository's root `Dockerfile`, so future
theme or code changes in the fork are included in deployments.
