# Pipeline Review — FlytBase BDR Agent frontend

A self-serve web app for running and reviewing an outbound BDR pipeline. A user logs in, clicks **Run Campaign**, and a few minutes later reviews the accounts, research dossiers, contacts, and ready-to-send emails the pipeline produced — with inline email editing, copy-to-clipboard, and one-click "open in Gmail."

The actual agent (account sourcing → research → contact discovery → email writing) runs as an n8n workflow that writes its results into Supabase; this app reads from Supabase and triggers runs via an n8n webhook. See [STACK.md](./STACK.md) for the full system and why each tool is used.

**Inspecting the agent logic:** the complete n8n workflow (all nodes, keys redacted) is included here as [`flytbase-bdr-agent.n8n.json`](./flytbase-bdr-agent.n8n.json) — import it into any n8n instance to see the full staged pipeline (account ID → research → contacts + email waterfall → writer/critic/rewrite → Supabase + Google Sheets).

## Tech stack

TanStack Start (SSR) · React · Vite · TypeScript · Tailwind CSS · shadcn/ui · Supabase JS client. Package manager: bun.

## Prerequisites

- Node 18+ (or bun)
- A Supabase project (schema already provisioned — see the `supabase/` folder and STACK.md)

## Environment variables

The Supabase client reads these at build time (Vite). Copy `.env.example` to `.env` and fill in your values:

| Variable | What |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase **anon** / publishable key (safe to expose — it's a public client key gated by row-level security) |

The n8n webhook URL the Run button calls is currently hardcoded in `src/routes/_authenticated/index.tsx`. If you point this app at a different n8n instance, update it there.

> Note: `.env` should not be committed. Only the anon key was ever in it (public by design), but treat the file as local-only going forward — see `.gitignore`.

## Local development

```bash
bun install      # or: npm install
bun run dev      # or: npm run dev
```

## Build

```bash
bun run build    # or: npm run build
```

## Deploy (Cloudflare Pages)

This app is TanStack Start (server-rendered). The build config (`@lovable.dev/vite-tanstack-config`) targets **Cloudflare** by default, so Cloudflare Pages is the smoothest host.

1. In Cloudflare Pages, connect this GitHub repo.
2. Build command: `bun run build` (or `npm run build`).
3. Set the two environment variables above in the Pages project settings (Production **and** Preview).
4. Deploy. Cloudflare picks up the nitro Cloudflare build output automatically.

(Deploying elsewhere — e.g. Vercel — is possible but requires pointing the nitro build target at that platform; Cloudflare is the path of least resistance given the current config.)

## The backend contract (for reference)

- The Run button POSTs to the n8n webhook with `{ "target_vertical": "<optional string>" }`. Leave it blank to use the default brief.
- The webhook responds with the created run row; the run's id is on the **`id`** field (not `run_id`). The app then polls the `runs` table on that id until `status` is `done` or `failed`.
- All displayed data (accounts, research, contacts, emails) is read from Supabase. The frontend never writes anything except inline edits to the `emails` table.
