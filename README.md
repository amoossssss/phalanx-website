# _Phalanx (website)

## What is _Phalanx?

_Phalanx_ is the frontend for a Pacifica-powered squad GameFi experience: traders connect a Solana wallet, form squads, and compete on a shared territory bitmap while placing trades through an embedded Pacifica flow. Trades can be attributed with a Pacifica **builder code** so the platform participates in builder fees.

## Frontend tech stack

- **Framework:** [Next.js](https://nextjs.org/) 14 (App Router), **React** 18, **TypeScript**
- **Styling:** SCSS
- **State & data:** React context (`AuthContext`, `UserContext`), local component state, `fetch` / Axios for HTTP
- **Routing:** `react-router-dom`
- **Solana:** `@solana/web3.js`, wallet adapters (Phantom, Solflare, React UI)
- **Charts:** TradingView Lightweight Charts
- **Other:** Axios, Notistack, Pacifica TypeScript SDK (`pacifica-ts-sdk`), react-tweet

Tooling: ESLint, Prettier, `env-cmd` for optional env-file variants.

## Environment variables

Create **`website/.env`**, **`.env.local`**, or **`.env.development`** (used by `yarn dev-env`) and set the variables below. Values prefixed with **`NEXT_APP_`** are read in `next.config.js` and injected into the app as the listed runtime names (for example `NEXT_APP_API_URL` → `API_URL`).

| Variable | Purpose |
| -------- | ------- |
| `NEXT_APP_HOST_DOMAIN` | Public host/domain string (exposed as `HOST_DOMAIN`; empty defaults apply in config). |
| `NEXT_APP_API_URL` | Backend base URL **without** `/api` (default `http://localhost:8081`). The client uses this as the API root. |
| `NEXT_APP_TEST_MODE` | Test mode flag (default `false`). |
| `NEXT_APP_SOLANA_RPC_URL` | Solana JSON-RPC endpoint for wallet and on-chain calls. |
| `NEXT_APP_PACIFICA_BUILDER_CODE` | Pacifica builder code for orders (default in config is `phalanx`). |
| `NEXT_APP_PACIFICA_MAX_FEE_RATE` | Maximum fee rate for builder approval (default `0.001`). |

Additional variables used directly in code (not via `next.config.js` `env`):

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_BITMAP_TEST` | Set to `true` to use the bitmap test template on the home view. |


`NODE_ENV` is set automatically by Next.js (`development` / `production`).

Align the backend **port** and **CORS origin** with this app: the default dev server runs on **port 3001** (see below), so the API should allow that origin and the API URL you set should match where the backend listens.

## Install and run

**Prerequisites:** Node.js (LTS recommended) and **Yarn** 1.x (see `package.json` `packageManager`).

```bash
yarn install --frozen-lockfile
```

**Development**

- Default dev server (port **3001**):

  ```bash
  yarn dev
  ```

  Open `http://localhost:3001`.

- Dev with **`env-cmd`** loading **`.env.development`** (port **3000** per script):

  ```bash
  yarn dev-env
  ```

**Production**

```bash
yarn build
yarn start
```

**Other scripts:** `yarn lint`, `yarn format` / `yarn format:check`.
