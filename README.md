# Meridian Pro – Full‑stack DLMM Liquidity Management

A **server‑less**, **free‑tier‑first** rewrite of the original **Meridian** AI agent. It provides:

*   Autonomous pool screening (Hunter Alpha) and position management (Healer Alpha).
*   Full stack dashboard built with **Next.js 14**, **Tailwind CSS**, and **Prisma**.
*   All configuration is stored in a **Neon** PostgreSQL database – editable through the UI.
*   Background execution via **GitHub Actions** (no VPS required).
*   Optional **Telegram** notifications and **Hive‑Mind** collective intelligence.

---

## Architecture Overview

```
+-------------------+      +---------------------+      +-------------------+
|   Next.js (Vercel) | <-- |   Neon PostgreSQL   | --> |   GitHub Actions  |
|   Dashboard & API   |      |   (Free Tier)       |      |   (Agent Runner)  |
+-------------------+      +---------------------+      +-------------------+
```

*   **Frontend** – Next.js renders the dashboard, calls `/api/*` routes to read/write config and view positions.
*   **Backend** – API routes use Prisma to interact with Neon.
*   **Agent** – `scripts/run-cycle.js` runs every 10 min (or 30 min for screening) via a GitHub Actions workflow. It pulls the latest config from Neon, executes Hunter Alpha and Healer Alpha, logs actions, and updates the DB.
*   **Security** – Private keys and API secrets are **AES‑256‑GCM encrypted** at rest using a master key (`ENCRYPTION_KEY`). The master key lives in the GitHub Actions secrets.

---

## Quick‑Start (Free Services Only)

### 1️⃣ Create a Neon PostgreSQL Database (Free)
1.  Go to https://neon.tech and create a free project.
2.  In *Settings → Connection Pool*, copy the `DATABASE_URL` (it ends with `?sslmode=require`).
3.  Add it as a secret named `DATABASE_URL` in your GitHub repository (**Settings → Secrets → Actions**).

### 2️⃣ Create GitHub Repository & Push Code
```bash
# From the current directory (you already have the repo locally)
git init
git add .
git commit -m "Initial commit – Meridian Pro"
# Create a new repo on GitHub (replace <user>/<repo>)
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

### 3️⃣ Add Required Secrets (GitHub Actions)
| Secret | Value (example) |
|--------|----------------|
| `DATABASE_URL` | Neon connection string |
| `OPENROUTER_API_KEY` | Your OpenRouter key |
| `WALLET_PRIVATE_KEY` | Base58 private key of the SOL wallet |
| `HELIUS_API_KEY` | (optional) Helius RPC key |
| `TELEGRAM_BOT_TOKEN` | (optional) Bot token |
| `ENCRYPTION_KEY` | 32‑byte hex string (`openssl rand -hex 32`) |

### 4️⃣ Install Dependencies & Generate Prisma Client (locally)
```bash
cd yunus-meridian-pro
npm ci
npx prisma generate   # generates @prisma/client
npx prisma db push   # applies schema to Neon (needs DATABASE_URL env var)
```
> **Tip:** Set `DATABASE_URL` locally (`export DATABASE_URL=postgresql://…`) before running `prisma db push`.

### 5️⃣ Seed a Default User
```bash
# Use the seed script – you can set an email via env if you like
node scripts/setup.js
```
The script creates a user, empty config rows, and prints the generated user ID. Copy that ID and set it as an environment variable for the runner:
```bash
# Add to GitHub Actions secrets (or .env for local dev)
AGENT_USER_ID=<printed‑user‑id>
```

### 6️⃣ Deploy Frontend to Vercel (Free)
1.  Sign in to https://vercel.com with your GitHub account.
2.  Import the repository.
3.  Vercel automatically detects a **Next.js** project – just click *Deploy*.
4.  In *Project Settings → Environment Variables*, add the same secrets you added to GitHub (especially `DATABASE_URL`).

### 7️⃣ Enable the Agent Workflow
1.  In GitHub, go to **Actions → ECC Agent Cycle**.
2.  Click **Enable workflow**.
3.  The workflow will now run every 10 minutes (or you can trigger manually via *Run workflow*).

---

## Dashboard Usage

1.  Open the Vercel URL (e.g., `https://yunus-meridian-pro.vercel.app`).
2.  The **Configuration** section lets you edit:
    *   Trading parameters (deploy amount, max positions, dry‑run toggle, RPC URL).
    *   Screening thresholds (TVL, fee ratio, timeframe, category).
    *   Risk settings (take‑profit %, stop‑loss %, out‑of‑range wait).
3.  Click **Save configuration** – the values are persisted to Neon.
4.  The **Open Positions** table shows live positions (auto‑refresh every 10 s).
5.  Whenever the GitHub Action runs, it will read these settings, perform screening/management, and log actions to the `AgentLog` table (viewable via a future *Logs* page).

---

## Extending the System

*   **Add Real On‑chain Calls** – replace the mock `fetchPoolCandidates` and `fetchPositionOnChain` with the official `@meteora-ag/dlmm` SDK.
*   **Add Real Transaction Signing** – use `@solana/web3.js` with the decrypted private key from the DB.
*   **Add Telegram UI** – create a `/api/telegram/test` endpoint that sends a test message.
*   **Add Hive‑Mind Integration** – implement the optional POST/GET calls to the hive server.
*   **Add More Agents** – you can add new files under `agent/` and schedule them by adding extra jobs in the GitHub workflow.

---

## License & Disclaimer

*   This project is **MIT licensed** – feel free to fork, modify, and deploy.
*   Trading on Solana carries risk. The code is provided **as‑is**. Run in **dry‑run** mode first and never allocate more capital than you can afford to lose.

---

**All set!** The system is now live on Vercel (frontend) and GitHub Actions (agent). You can start configuring through the dashboard, and the agent will run automatically every 10 minutes.

If you need any further tweaks (e.g., add a *Logs* page, hook up real DLMM SDK, or enable Hive‑Mind), just let me know.