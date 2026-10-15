# Supabase migrations

Schema changes live in `supabase/migrations/`. Do not paste SQL into the Dashboard SQL Editor for routine changes.

## One-time local setup

1. Install the CLI (or use `npx supabase`):
   ```bash
   npm install -g supabase
   ```
2. Log in and link this repo to the remote project:
   ```bash
   npx supabase login
   npx supabase link --project-ref tjugulvmptraqhyhydds
   ```
3. The baseline migration matches schema already on the remote. Mark it applied so `db push` does not re-run it:
   ```bash
   npx supabase migration repair 20261015155302 --status applied
   npx supabase migration list
   ```
   Remote should show `20261015155302` as applied.

## Making a schema change

1. Create a migration:
   ```bash
   npx supabase migration new describe_your_change
   ```
2. Edit the new file under `supabase/migrations/` (additive SQL only: `alter table`, new tables, new policy names).
3. Apply to the remote:
   ```bash
   npx supabase db push
   ```
4. Commit the migration file and push to git.

## GitHub Actions (auto-apply on `main`)

Workflow: [`.github/workflows/supabase-migrate.yml`](../.github/workflows/supabase-migrate.yml)

Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Project Settings → Database → Database password |
| `SUPABASE_PROJECT_ID` | `tjugulvmptraqhyhydds` |

After secrets are set, pushes to `main` that change `supabase/migrations/**` run `supabase db push`. You can also run the workflow manually (Actions → Deploy Supabase Migrations → Run workflow).
