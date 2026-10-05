# NDRAAAID.v1 — BUILD-03

## Hardening completed

- Guest order tracking requires Order ID + tracking token.
- Legacy order-code-only tracking RPC disabled.
- Guest payment proof storage remains private.
- Staff with `orders.view` or `finance.view` can read guest proof objects.
- Guest proof upload is guarded by a SECURITY DEFINER RPC that requires a matching tracking token and `PENDING_PAYMENT` status.
- Anonymous clients cannot insert directly into `payment_proofs`.
- Refund transition now synchronizes payment status to `REFUNDED`.
- Added indexes for payment proof review and order status queues.

## Validation limitation

The workspace could not complete a network dependency installation, so this build is not declared browser-E2E or production-build PASS until dependencies and a live Supabase project are available.
