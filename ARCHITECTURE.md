# NDRAAAID Architecture

## Hosting
- GitHub stores source.
- GitHub Actions installs dependencies and runs `next build`.
- Next.js uses `output: export` and produces `/out`.
- GitHub Pages serves the static site.
- `public/CNAME` contains `ndraaaidv1.my.id`.

## Backend services
Supabase provides the backend services:
- Auth
- PostgreSQL
- Row Level Security
- Storage
- Realtime

The browser uses the Supabase publishable/anon key. No service-role key belongs in the website.

## Transaction architecture
`create_manual_order()` validates game, product, active payment method and voucher in PostgreSQL. The browser does not decide the final amount.

`admin_transition_order()` validates allowed status transitions and records status history, notification, and audit log.

Current mode is manual:
- PaymentProvider: manual process
- TopupProvider: manual process

Future gateway/provider integrations should be placed behind Supabase Edge Functions or another trusted backend boundary. Do not put private API keys into the static frontend.

## Static-route design
GitHub Pages cannot execute a Next.js server. Dynamic pages therefore use query URLs:
- `/game/?slug=mobile-legends`
- `/order/?id=<order-uuid>`

This keeps the site compatible with static export.
