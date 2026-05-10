# Dokploy Deployment

Use this Compose file when deploying the fork from GitHub in Dokploy.
The app image is built in GitHub Actions and published to GitHub Container
Registry, so Dokploy only pulls and runs the image on the VPS.

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
the placeholder secrets. The Compose file references the variables directly with
`${VAR_NAME}` syntax so the deployment does not depend on an existing `.env` file.

Set `OPENROUTER_API_KEY` in Dokploy to enable OpenRouter as the server-side model
provider. `OPENROUTER_MODEL_LIST` is optional; leave it unset to use the built-in
model list.

`LOBE_IMAGE` defaults to `ghcr.io/nabilrfg12/lobe-chat:latest`. The GitHub
Actions workflow `.github/workflows/dokploy-docker-image.yml` publishes that tag
when changes land on `next`, and can also be run manually from GitHub Actions.
If Dokploy cannot pull the image, make the GHCR package public or add GitHub
Container Registry credentials in Dokploy with `read:packages` access.

Keep Postgres and Redis private. Only `lobe` and `rustfs` declare Dokploy-style
container ports for domain routing.

## Updating

Push changes to the configured GitHub branch and trigger a Dokploy deployment.
The `lobe` service pulls the GitHub Actions-built image, so future theme or code
changes in the fork are included after the image workflow completes.
