# NDRAAAID — Audit & Fix V5

Tanggal audit: 2026-09-26

## Perbaikan utama
1. Reset Password diubah dari OTP menjadi **email recovery link**.
   - `app/forgot-password/page.tsx` memakai `resetPasswordForEmail`.
   - Recovery link kembali ke `/forgot-password/`.
   - Halaman menangani event `PASSWORD_RECOVERY` dan memungkinkan password baru.
   - `supabase/email-templates/recovery.html` memakai `{{ .ConfirmationURL }}`.
2. Live Broadcast diperkeras.
   - Publish memakai RPC `create_broadcast`.
   - RPC memvalidasi role, judul, pesan, tipe, dan durasi.
   - Realtime broadcasts dipastikan dalam migration.
3. Live Chat diperbaiki.
   - Guest mendapat pesan login yang jelas, bukan tampilan kosong.
   - Mengikuti `settings.support.live_chat`.
   - Pencarian room tidak lagi gagal karena `maybeSingle()` saat ada lebih dari satu room lama.
   - Ditambahkan unique partial index untuk satu room OPEN per user.
4. Deposit Wallet diperbaiki.
   - Constraint `wallet_transactions.type` sekarang mengizinkan `DEPOSIT`, sesuai fungsi approval deposit yang memang memasukkan tipe tersebut.
5. Promo/Banner diperbaiki.
   - Homepage sekarang benar-benar mengambil dan menampilkan `promotions` aktif beserta `banner_url`, deskripsi, dan kode.
6. Alur order diperbaiki.
   - Redirect login dari form top-up diarahkan ke `/game/?slug=...`, bukan route `/games/<slug>` yang tidak tersedia.
7. Audit route.
   - Tidak ditemukan internal href/router target yang mengarah ke route aplikasi yang tidak ada.
   - Tidak ditemukan placeholder `href="#"`, empty click handler, TODO/FIXME pada source yang diaudit.
8. SVG.
   - Tidak ada file SVG statis di project. Ikon berasal dari `lucide-react` dan dirender sebagai SVG inline.
9. Dokumentasi deployment diperbarui agar flow reset password tidak lagi menyebut OTP.

## Migration wajib untuk database yang sudah berjalan
Jalankan satu kali:
`supabase/hardening-v5.sql`

Migration tersebut juga menutup room OPEN duplikat lama sebelum membuat unique index.

## Verifikasi
- ZIP berhasil diekstrak dan seluruh source diaudit.
- Pemeriksaan TypeScript parser tidak menemukan error syntax `TS1005/TS1109/TS1128/TS1136/TS1160/TS1700/TS1708/TS1381`.
- Full `npm install`/production build tidak dapat dijalankan di lingkungan audit karena dependency npm tidak tersedia setelah install timeout; workflow GitHub Actions tetap menjadi pemeriksaan build produksi.
