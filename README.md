# Le plat du jour.ch => BACKOFFICE

## API routing

The backoffice uses a **relative** API URL (`/api/v1`). nginx proxies requests to the `pdj_api` container on the shared `proxy-network`:

| Path | Proxied to |
|------|------------|
| `/api/*` | `http://pdj_api:3000/api/*` |
| `/uploads/*` | `http://pdj_api:3000/uploads/*` |

Same Docker image works for staging and production — no environment-specific API hostname baked in.

**Local dev** (`ng serve`): `proxy.conf.json` forwards `/api` and `/uploads` to `http://localhost:3039`.

**Local Docker**: backoffice must share `proxy-network` with the API stack (`pdj_api` container running).

## Plans d'implémentation

| Document | Description |
|----------|-------------|
| [restaurant-backoffice-parity-plan.md](./plan-implementation/restaurant-backoffice-parity-plan.md) | Parité features **RESTAURANT** mobile → backoffice (checkboxes) |
| [pub-system-plan.md](./plan-implementation/pub-system-plan.md) | Système de publicité |
| [feature-plan.md](./.md/feature-plan.md) | Vision initiale rôles Admin / Restaurant |