# NDRAAAID.v1 — FINAL DEPLOYMENT ARCHITECTURE

## Final architecture
- Frontend: Next.js static export on GitHub Pages
- Database/Auth/Realtime/Storage: Supabase
- Server-only actions: Supabase Edge Functions
- Email: Resend through Supabase Edge Functions
- Production domain: https://ndraaaidv1.my.id
- Transaction mode: manual (QRIS/DANA-ready; no provider API required)

## Important
The final frontend must remain static. Do not add Next.js `app/api` routes or middleware because GitHub Pages does not run a Next.js server runtime.

## Supabase Edge Functions
Deploy these functions:
- `guest-payment-proof`
- `password-changed`
- `admin-delete-user`

Set secrets in Supabase:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

The platform-provided Supabase secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are used by the functions where required.

## Auth URL configuration
Set Site URL to:
`https://ndraaaidv1.my.id`

Allowed redirect URLs should include:
- `https://ndraaaidv1.my.id/`
- `https://ndraaaidv1.my.id/auth/verified/`
- `https://ndraaaidv1.my.id/forgot-password/`

## Email templates
Use the files in `supabase/email-templates/`.
- Confirm signup: 6-digit OTP (`{{ .Token }}`)
- Magic link / OTP: 6-digit OTP (`{{ .Token }}`)
- Recovery: link via `{{ .ConfirmationURL }}`
- Password changed: notification template

## Database
Run migrations in filename order, ending with:
`20260926050000_final_security_and_static.sql`

Do not run old standalone SQL files on top of a fresh database unless the README explicitly instructs it. The canonical source is `supabase/migrations/` in timestamp order.

## GitHub Pages
The repository must have GitHub Pages configured to use the GitHub Actions deployment workflow. Keep `public/CNAME` containing:
`ndraaaidv1.my.id`

## Final smoke test
1. Register → receive 6-digit OTP → verify.
2. Login with password.
3. Login with email OTP.
4. Forgot password → receive link → set new password.
5. Logged-in change password → receive notification email when Resend is configured.
6. Guest order → receive order code + tracking token.
7. Guest tracking → upload payment proof through Edge Function.
8. Admin sees proof and processes order.
9. Customer sees order history/deposit history/wallet history.
10. Deposit approval credits wallet exactly once.
11. Owner/Co-Owner permissions work; Customer Service cannot access finance/settings.
12. Live Chat sends and receives realtime messages.
13. Live Broadcast publishes and updates realtime.
14. Customer A cannot read Customer B's private data.
15. GitHub Actions build is green and the domain serves the generated `out/` site.

## Edge Function deployment command
From the project root, after linking the Supabase project:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set RESEND_API_KEY=YOUR_RESEND_API_KEY RESEND_FROM_EMAIL=no-reply@ndraaaidv1.my.id
supabase functions deploy guest-payment-proof
supabase functions deploy password-changed
supabase functions deploy admin-delete-user
```
Do not put `SUPABASE_SERVICE_ROLE_KEY` in GitHub Actions or any `NEXT_PUBLIC_*` variable.
