# NDRAAAID v3 — Deposit Member

## Menu Admin
- **Transaksi / Riwayat Order** — seluruh order game dan statusnya.
- **Keuangan / Deposit Member** — hanya deposit PENDING yang perlu diproses; Owner/Admin dapat Setujui atau Tolak.
- **Keuangan / Riwayat Deposit** — seluruh histori deposit.
- **Keuangan / Riwayat Wallet** — ledger semua perubahan saldo.
- **Member & Wallet** — saldo member dan penyesuaian manual hanya untuk Owner.

## Alur deposit
1. Member membuka `/deposit`.
2. Member memilih metode pembayaran, nominal, upload bukti JPG/PNG/WEBP maksimal 5 MB.
3. Sistem membuat deposit `PENDING`.
4. Admin/Owner membuka **Deposit Member**.
5. Admin/Owner melihat bukti melalui signed URL sementara.
6. **Setujui** menambah saldo wallet dan membuat ledger `DEPOSIT` dalam satu transaksi database.
7. **Tolak** wajib memakai alasan dan tidak mengubah saldo.
8. Deposit yang sudah `APPROVED`/`REJECTED` tidak bisa diproses ulang.

## Supabase
Untuk database yang sudah memakai v2, jalankan:
`supabase/deposit-management-v3.sql`

Untuk database baru, `supabase/schema.sql` sudah menyertakan modul ini.

Jangan pernah menaruh service-role/secret key di frontend. RLS dan function permission tetap wajib aktif.
