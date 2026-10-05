# NDRAAAID v1 — Supabase + GitHub Pages

Platform top-up game Indonesia dengan mode transaksi **MANUAL**.

## Stack
- Next.js static export
- Supabase Auth
- Supabase PostgreSQL + RLS
- Supabase Storage
- Supabase Realtime
- GitHub + GitHub Actions + GitHub Pages
- Domain: `ndraaaidv1.my.id`

## Tidak diperlukan
- Vercel
- VPS
- Docker
- NestJS
- Prisma

## Fitur
Customer: register/login, verifikasi email, reset password, katalog game, dynamic fields, wishlist, checkout, voucher, manual payment, upload bukti, riwayat, tracking publik, notifikasi, live chat, WhatsApp.

Admin/Owner: dashboard, transaksi, verifikasi manual, status history, audit log, game, produk, payment method, voucher, promo, user, role Owner, settings, chat.

## Penting
Payment gateway dan provider top-up **belum terhubung**. Tidak ada pembayaran/top-up otomatis. Admin memverifikasi pembayaran dan melakukan top-up manual.

## Instalasi
Ikuti `TUTORIAL-UNTUK-PEMULA.md` dari awal sampai akhir.


## Live Broadcast
Admin Owner/Admin dapat menayangkan pengumuman promo/info di bagian atas website melalui tab `broadcasts`. Durasi dapat diatur dalam menit atau preset 15 menit, 30 menit, 1 jam, 6 jam, 24 jam, 3 hari, dan 7 hari. Untuk database yang sudah dibuat sebelum fitur ini ditambahkan, jalankan `supabase/broadcasts.sql` sekali di Supabase SQL Editor.

## Production build verification

GitHub Actions performs `npm install`, `npm run typecheck`, `npm run build`, and verifies `out/index.html` before deploying to GitHub Pages. See `BUILD-VERIFICATION.md`.

## Email Authentication V4
NDRAAAID V4 menambahkan alur verifikasi email aktif, resend verification, halaman email verified, template email branded, OTP login, dan reset password berbasis OTP. Lihat `EMAIL-AUTH-NDRAAAID-V4.md` dan folder `supabase/email-templates/`.
