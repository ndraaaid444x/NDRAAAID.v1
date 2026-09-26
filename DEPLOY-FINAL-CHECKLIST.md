# NDRAAAID.v1 — Checklist Deploy Final

## 1. Supabase
Run migrations in this exact order from `supabase/migrations/`:
1. `20260926000000_initial_schema.sql`
2. `20260926010000_add_co_owner.sql`
3. `20260926020000_add_refunded_status.sql`
4. `20260926030000_final_v1.sql`

Do not run older standalone hardening SQL after the final migration unless you intentionally know the schema impact. The `migrations/` directory is the source of truth for the final build.

## 2. Storage
Confirm these buckets exist:
- `payment-proofs` — private
- `payment-assets` — private
- `website-assets` — public

## 3. Environment
Frontend:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

Server only:
- `SUPABASE_SERVICE_ROLE_KEY`

Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code, `NEXT_PUBLIC_*`, or GitHub.

## 4. Auth / Resend
Configure Supabase Auth email templates using the files under `supabase/email-templates/`.
- Signup verification: OTP code
- Forgot password: `{{ .ConfirmationURL }}` recovery link
- Change password: authenticated account flow

Configure the verified production URL/domain in Supabase Auth redirect settings.

## 5. Install and validate
```bash
npm install
npm run typecheck
npm run build
```

## 6. Manual smoke test
- Register → receive OTP → verify email
- Login
- Logout
- Forgot password → receive link → reset password
- Account → Change Password
- Guest checkout → tracking page → upload payment proof
- Logged-in checkout → order detail → upload payment proof
- Deposit → admin approve/reject → wallet ledger
- Admin order processing → refund transition where permitted
- Live Chat customer → admin → customer
- Broadcast admin → homepage realtime
- Banner admin → homepage
- Customer A cannot see Customer B's order/deposit/wallet data
- Customer Service cannot access restricted finance/settings actions
- Co-Owner cannot access settings
