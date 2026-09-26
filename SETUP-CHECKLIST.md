# CHECKLIST NDRAAAID

- [ ] Buat Supabase project
- [ ] Jalankan `supabase/schema.sql`
- [ ] Pastikan tabel muncul
- [ ] Aktifkan Email Auth
- [ ] Isi Supabase Site URL
- [ ] Siapkan SMTP Gmail/App Password jika diperlukan
- [ ] Buat GitHub repository `ndraaaid`
- [ ] Upload isi project
- [ ] Buat GitHub secret `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Buat GitHub secret `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Aktifkan GitHub Pages → GitHub Actions
- [ ] Tunggu workflow hijau
- [ ] Tambahkan `ndraaaidv1.my.id` di GitHub Pages
- [ ] Atur DNS domain
- [ ] Aktifkan HTTPS
- [ ] Daftar akun pertama
- [ ] Jadikan akun pertama `owner`
- [ ] Tambahkan payment method
- [ ] Tambahkan game
- [ ] Tambahkan produk
- [ ] Tes order
- [ ] Tes upload bukti
- [ ] Tes status order
- [ ] Tes notifikasi
- [ ] Tes live chat
- [ ] Tes WhatsApp
- [ ] Untuk database yang sudah ada, jalankan `supabase/hardening-v5.sql` satu kali

## Live Broadcast
- [ ] Jalankan `supabase/broadcasts.sql` jika database dibuat dari ZIP versi sebelumnya.
- [ ] Login sebagai Owner/Admin.
- [ ] Buka Admin → broadcasts.
- [ ] Isi judul, pesan, tipe, durasi, dan link opsional.
- [ ] Klik `Tayangkan Broadcast`.
- [ ] Cek website buyer: broadcast muncul di bawah navbar dan hilang otomatis setelah `ends_at`.

## Media Manager
- Untuk database lama, jalankan `supabase/media-manager.sql` sekali di Supabase SQL Editor.
- Pastikan bucket `website-assets` muncul di Storage.
- Login sebagai Owner/Admin lalu buka `/admin/` → `media`.
- Upload gambar Game, Produk, Promo, Homepage, atau Lainnya.

## v2 Admin Management
- [ ] Fresh install memakai `supabase/schema.sql`, atau database lama menjalankan `supabase/admin-management-v2.sql` satu kali.
- [ ] Cek tabel `game_categories`, `wallets`, `wallet_transactions`.
- [ ] Deploy Edge Function `admin-delete-user` sebelum menggunakan tombol Hapus Akun.
- [ ] Jangan pernah memasukkan `SUPABASE_SERVICE_ROLE_KEY` ke GitHub Pages/frontend.
- [ ] Uji Owner: tambah kategori.
- [ ] Uji Owner: tambah game ke kategori.
- [ ] Uji Owner: kredit saldo.
- [ ] Uji Owner: debit saldo.
- [ ] Uji Owner: suspend/activate customer.
- [ ] Uji riwayat wallet dan audit log.

## EMAIL AUTH V4 — WAJIB UNTUK PRODUKSI
- [ ] Authentication → Providers → Email aktif
- [ ] Confirm email aktif
- [ ] Custom SMTP sudah dikonfigurasi
- [ ] Email Templates sudah diisi dari folder `supabase/email-templates/`
- [ ] Redirect URL `https://ndraaaidv1.my.id/auth/verified/` sudah diizinkan
- [ ] Tes daftar dengan email nyata
- [ ] Pastikan email verifikasi masuk Inbox/Spam
- [ ] Pastikan user belum dapat login normal sebelum email terverifikasi
- [ ] Tes Kirim Ulang Email Verifikasi
- [ ] Tes Lupa Password + link email
- [ ] Tes OTP login jika fitur OTP login digunakan


## OTP 6 Digit NDRAAAID

NDRAAAID menggunakan OTP email **tepat 6 digit angka** untuk verifikasi/login OTP. Reset password menggunakan **link email recovery**, bukan OTP.
