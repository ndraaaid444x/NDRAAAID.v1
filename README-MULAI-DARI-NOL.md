# NDRAAAID V4 — TUTORIAL LENGKAP DARI NOL

Website: https://ndraaaidv1.my.id/

Dokumen ini dibuat untuk pemula yang **belum mengerti Supabase, GitHub, GitHub Pages, DNS/domain, SMTP, dan deployment**.

> **PENTING:** Anda tidak perlu Vercel. Arsitektur versi ini menggunakan Next.js Static Export + GitHub Pages + Supabase + domain `ndraaaidv1.my.id`.

---

# BAGIAN 1 — HASIL AKHIR YANG AKAN ANDA PUNYA

Setelah selesai, alurnya menjadi:

```text
Pengunjung
   ↓
Website NDRAAAID
   ↓
Daftar dengan email aktif
   ↓
Email verifikasi dikirim
   ↓
Klik link verifikasi
   ↓
Akun aktif
   ↓
Login dengan password ATAU OTP email
   ↓
Beli game / deposit / riwayat transaksi / chat
```

Sistem admin mencakup game, produk, pembayaran manual, order, user, wallet/deposit, media manager, live broadcast, audit, dan pengaturan.

---

# BAGIAN 2 — YANG HARUS DISIAPKAN

Siapkan:

1. Email pribadi yang bisa menerima email.
2. Akun GitHub.
3. Akun Supabase.
4. Akses ke tempat Anda membeli domain `ndraaaidv1.my.id`.
5. Komputer/laptop untuk upload project.
6. ZIP NDRAAAID ini.

Tidak perlu:

- Vercel
- VPS
- server Linux
- database MySQL
- cPanel untuk website

Database menggunakan Supabase.
Hosting website menggunakan GitHub Pages.

---

# BAGIAN 3 — MENGENAL 3 BAGIAN UTAMA

## A. Supabase

Supabase adalah tempat:

- database
- akun user
- login
- OTP email
- storage gambar
- storage bukti pembayaran
- realtime chat/broadcast

## B. GitHub

GitHub adalah tempat menyimpan source code website.

GitHub Actions akan otomatis:

1. mengambil source code
2. install dependency
3. menjalankan typecheck
4. menjalankan production build
5. menerbitkan hasil website ke GitHub Pages

GitHub memang mendukung GitHub Actions sebagai publishing source untuk GitHub Pages. citeturn0search4

## C. Domain

Domain `ndraaaidv1.my.id` adalah alamat yang diketik pelanggan.

Akhirnya:

```text
https://ndraaaidv1.my.id/
```

akan membuka website NDRAAAID.

---

# BAGIAN 4 — MEMBUAT SUPABASE

## 4.1 Buka Supabase

Buka:

https://supabase.com/

Login atau buat akun.

## 4.2 Buat project baru

Klik:

**New project**

Isi:

- Organization: pilih organisasi Anda
- Name: `ndraaaid`
- Database Password: buat password kuat
- Region: pilih region yang tersedia dan sesuai kebutuhan

Simpan database password di tempat aman.

Tunggu sampai project selesai dibuat.

---

# BAGIAN 5 — MEMASANG DATABASE NDRAAAID

## 5.1 Buka SQL Editor

Di Supabase:

**SQL Editor → New query**

## 5.2 Buka file

Di ZIP ini buka:

```text
supabase/schema.sql
```

Copy semua isinya.

## 5.3 Paste ke SQL Editor

Paste seluruh isi ke Supabase SQL Editor.

Klik:

**Run**

Tunggu sampai selesai.

## 5.4 Cek tabel

Buka:

**Table Editor**

Anda akan melihat tabel utama seperti:

- profiles
- games
- game_categories
- game_fields
- game_products
- payment_methods
- orders
- order_items
- payments
- payment_proofs
- order_status_history
- wallets
- wallet_transactions
- member_deposits
- vouchers
- promotions
- broadcasts
- media_assets
- notifications
- chat_rooms
- chat_messages
- admin_audit_logs
- settings
- wishlist

### PENTING

`schema.sql` versi ini sudah merupakan schema gabungan untuk instalasi baru.

**Jangan menjalankan semua file SQL satu per satu pada database baru tanpa alasan.**

File SQL tambahan di folder `supabase/` disediakan untuk migration/upgrade atau kebutuhan tertentu.

Jika Anda sudah mempunyai database NDRAAAID dari versi lama, jangan langsung menghapus database lama. Buat backup terlebih dahulu dan gunakan file migration yang sesuai.

---

# BAGIAN 6 — MENGATUR EMAIL AUTH

Tujuan kita adalah:

> Orang yang mendaftar harus benar-benar memiliki akses ke email tersebut.

Di Supabase buka:

**Authentication → Providers → Email**

Pastikan Email aktif.

Aktifkan:

- Email provider: ON
- Confirm email: ON
- Secure email change: ON

Gunakan minimal password 8 karakter.

---

# BAGIAN 7 — OTP NDRAAAID HARUS 6 DIGIT

Versi ini menggunakan OTP:

```text
6 DIGIT
ANGKA SAJA
```

Contoh:

```text
583214
```

Bukan:

```text
ABC583214
```

dan bukan:

```text
58321499
```

Supabase mendokumentasikan OTP email sebagai kode enam digit dan konfigurasi `otp_length` dapat dibuat 6–10 digit; konfigurasi project NDRAAAID menetapkan 6. citeturn0search1turn0search2

Di ZIP terdapat:

```text
supabase/config.toml
```

dengan pengaturan OTP 6 digit.

Di website juga sudah ada validasi:

```text
[ 5 8 3 2 1 4 ]
```

Input hanya menerima angka dan maksimal 6 digit.

---

# BAGIAN 8 — TEMPLATE EMAIL NDRAAAID

Di ZIP:

```text
supabase/email-templates/
```

Berisi:

- confirmation.html
- recovery.html
- magic_link_or_otp.html
- email_change.html
- invite.html
- reauthentication.html
- password_changed.html
- email_changed.html

Supabase menyediakan template untuk confirmation, OTP/magic link, reset password, email change, invite, reauthentication, dan notifikasi keamanan. Variabel `{{ .Token }}` digunakan untuk OTP 6 digit. citeturn0search0

---

# BAGIAN 9 — MEMASANG TEMPLATE EMAIL

Di Supabase buka:

**Authentication → Email Templates**

Sesuaikan template satu per satu.

## Confirmation / Verifikasi Email

Subject:

```text
Verifikasi Email NDRAAAID
```

HTML:

```text
supabase/email-templates/confirmation.html
```

## Magic Link / OTP

Subject:

```text
Kode OTP NDRAAAID
```

HTML:

```text
supabase/email-templates/magic_link_or_otp.html
```

Pastikan template OTP memakai:

```text
{{ .Token }}
```

bukan link panjang.

## Recovery

Subject:

```text
Reset Password NDRAAAID
```

HTML:

```text
supabase/email-templates/recovery.html
```

Template email Supabase mendukung variabel `{{ .Token }}`, `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`, dan `{{ .RedirectTo }}` sesuai jenis template. citeturn0search0

---

# BAGIAN 10 — SMTP: AGAR EMAIL BENAR-BENAR TERKIRIM KE PELANGGAN

Ini bagian yang sangat penting.

Untuk website publik, jangan mengandalkan SMTP bawaan Supabase sebagai layanan produksi. Supabase menjelaskan bahwa SMTP bawaan memiliki pembatasan penerima, rate limit, dan tidak ditujukan untuk production. Custom SMTP direkomendasikan untuk penggunaan publik. citeturn0search3

Anda dapat menggunakan provider SMTP yang mendukung SMTP, misalnya:

- Resend
- Brevo
- SendGrid
- Postmark
- Amazon SES
- ZeptoMail

Pilih satu provider.

Provider akan memberikan informasi seperti:

```text
SMTP Host
SMTP Port
SMTP Username
SMTP Password
Sender Email
Sender Name
```

Masukkan data tersebut ke pengaturan SMTP Supabase.

### Saran alamat pengirim

Jika domain email sudah disiapkan:

```text
no-reply@ndraaaidv1.my.id
```

atau:

```text
auth@ndraaaidv1.my.id
```

Jangan masukkan password SMTP ke source code GitHub.

Jangan memasukkan service-role key Supabase ke source code.

---

# BAGIAN 11 — HASIL EMAIL PENDAFTARAN

Pelanggan mengisi:

```text
Nama: Budi
Username: budi123
Email: budi@gmail.com
Password: ********
```

Klik:

**Daftar & Kirim OTP**

NDRAAAID meminta Supabase mengirim email.

Contoh isi email:

```text
NDRAAAID

Verifikasi Email Anda

Terima kasih telah mendaftar.

Kode OTP Anda:

583214

Masukkan kode ini di website NDRAAAID.

Kode ini hanya berlaku sesuai masa berlaku OTP Anda.
```

Pelanggan memasukkan:

```text
583214
```

Baru setelah berhasil diverifikasi akun dapat digunakan.

---

# BAGIAN 12 — LOGIN DENGAN PASSWORD

Buka:

```text
https://ndraaaidv1.my.id/login/
```

Masukkan:

- Email
- Password

Klik Login.

---

# BAGIAN 13 — LOGIN DENGAN OTP

Di halaman Login pilih:

**OTP Email**

Masukkan email aktif.

Klik:

**Kirim OTP ke Email**

Buka email.

Ambil kode 6 digit.

Contoh:

```text
741205
```

Masukkan kode.

Klik:

**Verifikasi & Login**

Supabase mendukung passwordless email OTP dan kode tersebut diverifikasi menggunakan email + token. citeturn0search1

---

# BAGIAN 14 — LUPA PASSWORD

Buka:

```text
https://ndraaaidv1.my.id/forgot-password/
```

Masukkan email.

Klik:

**Kirim Link Reset**

Email menerima link reset.

Klik link tersebut.

Setelah kembali ke website, buat password baru.

Contoh:

```text
Password baru: ********
```

Simpan.

---

# BAGIAN 15 — URL SUPABASE

Buka:

**Supabase → Authentication → URL Configuration**

Site URL:

```text
https://ndraaaidv1.my.id/
```

Tambahkan redirect URL yang diperlukan:

```text
https://ndraaaidv1.my.id/
https://ndraaaidv1.my.id/auth/verified/
https://ndraaaidv1.my.id/forgot-password/
```

Jika dashboard Supabase Anda mengizinkan wildcard redirect untuk kebutuhan project, Anda dapat menambahkan pola yang sesuai. Jangan memasukkan domain yang tidak Anda kuasai.

---

# BAGIAN 16 — MEMBUAT REPOSITORY GITHUB

Buka:

https://github.com/

Login.

Klik:

**New repository**

Nama:

```text
ndraaaid
```

Klik Create repository.

Anda boleh menggunakan repository Public atau Private sesuai kebutuhan akun GitHub Anda.

---

# BAGIAN 17 — UPLOAD PROJECT KE GITHUB

Extract ZIP.

Masuk ke folder:

```text
ndraaaid-v4-email-auth/
```

Upload **isi folder tersebut**, bukan ZIP-nya.

Di GitHub harus terlihat kira-kira:

```text
app/
components/
lib/
public/
supabase/
.github/
package.json
next.config.mjs
tsconfig.json
README.md
```

Klik:

**Commit changes**

---

# BAGIAN 18 — MENYIMPAN KUNCI SUPABASE DI GITHUB

Buka Supabase:

**Project Settings → API**

Ambil:

1. Project URL
2. Publishable/Anon public key

Jangan ambil service_role untuk website frontend.

Di GitHub buka:

**Repository → Settings → Secrets and variables → Actions**

Klik:

**New repository secret**

Buat:

```text
NEXT_PUBLIC_SUPABASE_URL
```

Value = Project URL Supabase.

Buat lagi:

```text
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Value = public/anon key Supabase.

Jangan membuat secret bernama service role untuk digunakan frontend.

---

# BAGIAN 19 — GITHUB PAGES

Buka repository GitHub.

Klik:

**Settings → Pages**

Pada:

**Build and deployment → Source**

pilih:

**GitHub Actions**

Workflow di project ini berada di:

```text
.github/workflows/deploy.yml
```

Workflow akan melakukan build lalu deploy ke GitHub Pages. GitHub mendokumentasikan penggunaan Actions untuk build dan deploy Pages. citeturn0search4

---

# BAGIAN 20 — CEK GITHUB ACTIONS

Klik tab:

**Actions**

Cari:

```text
Build and Deploy NDRAAAID to GitHub Pages
```

Status:

```text
🟢 PASS
```

berarti workflow berhasil.

Jika:

```text
🔴 FAIL
```

klik workflow → klik job → lihat langkah yang merah.

Kirim screenshot error tersebut jika membutuhkan bantuan.

Jangan menghapus workflow secara acak.

---

# BAGIAN 21 — MENGHUBUNGKAN DOMAIN NDRAAAIDV1.MY.ID

Di GitHub:

**Settings → Pages → Custom domain**

Masukkan:

```text
ndraaaidv1.my.id
```

Simpan.

Kemudian buka panel DNS di tempat Anda membeli domain.

Untuk root domain, gunakan A record GitHub Pages:

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Jangan memiliki A record root lain yang bertentangan.

Tunggu propagasi DNS.

Kemudian kembali ke GitHub Pages.

Jika sudah benar, aktifkan:

**Enforce HTTPS**

---

# BAGIAN 22 — CEK WEBSITE

Buka:

```text
https://ndraaaidv1.my.id/
```

Tes:

```text
Home
Games
Register
Login
Cek Transaksi
```

---

# BAGIAN 23 — MEMBUAT OWNER ADMIN

Daftar menggunakan email Anda sendiri.

Verifikasi email dengan OTP 6 digit.

Login.

Kemudian di Supabase:

**SQL Editor → New query**

Jalankan:

```sql
update public.profiles
set role = 'owner'
where email = 'EMAIL_ANDA';
```

Contoh:

```sql
update public.profiles
set role = 'owner'
where email = 'fey@example.com';
```

Logout.

Login lagi.

Menu Admin harus muncul.

---

# BAGIAN 24 — MEMBUAT GAME

Masuk Admin.

Buka menu Game.

Contoh:

```text
Mobile Legends
Free Fire
PUBG Mobile
Genshin Impact
Roblox
Valorant
```

Atur:

- nama
- slug
- kategori
- logo
- banner
- field akun
- status aktif
- popular

---

# BAGIAN 25 — MEMBUAT PRODUK

Masuk menu Products/Produk.

Contoh:

```text
Nama: 86 Diamonds
SKU: ML86
Harga: 20000
Game: Mobile Legends
Status: Aktif
```

Anda dapat mengatur gambar produk melalui Media Manager.

---

# BAGIAN 26 — MEDIA MANAGER

Admin → Media.

Anda dapat mengupload:

- logo game
- banner game
- gambar produk
- banner promo
- homepage banner
- gambar umum

Storage menggunakan Supabase Storage.

Folder yang direkomendasikan:

```text
website-assets/
  games/
  products/
  promotions/
  homepage/
  general/
```

---

# BAGIAN 27 — LIVE BROADCAST

Admin → Broadcast.

Contoh:

```text
Judul:
PROMO TOP UP HARI INI

Pesan:
Diskon 10% untuk Mobile Legends.

Tipe:
PROMO

Durasi:
1 jam
```

Anda dapat menentukan durasi broadcast.

Contoh durasi:

- 15 menit
- 30 menit
- 1 jam
- 6 jam
- 24 jam
- 3 hari
- 7 hari
- custom

Setelah waktu habis, broadcast tidak lagi ditampilkan kepada pembeli.

---

# BAGIAN 28 — PEMBAYARAN MANUAL

Admin → Payment Methods.

Tambahkan:

- QRIS
- DANA
- GoPay
- OVO
- ShopeePay
- Bank Transfer

Untuk masing-masing dapat diisi:

- nama
- nomor/account
- nama pemilik
- instruksi
- QR image
- aktif/nonaktif

Versi ini **manual**.

Artinya pelanggan:

```text
Bayar
↓
Screenshot bukti
↓
Upload bukti
↓
Admin cek
↓
Admin menerima pembayaran
```

Upload bukti **tidak otomatis berarti pembayaran berhasil**.

---

# BAGIAN 29 — ALUR ORDER ADMIN

Status:

```text
PENDING_PAYMENT
      ↓
PAYMENT_RECEIVED
      ↓
PROCESSING
      ↓
SUCCESS
```

Jika bermasalah:

```text
FAILED
CANCELLED
EXPIRED
```

Admin hanya mengubah ke SUCCESS setelah top-up game benar-benar selesai.

---

# BAGIAN 30 — DEPOSIT MEMBER / WALLET

Customer dapat melakukan deposit sesuai fitur versi project.

Alurnya:

```text
Customer
↓
Buat deposit
↓
Pilih metode pembayaran
↓
Upload bukti
↓
Pending
↓
Admin review
├── Approve
└── Reject + alasan
```

Jika approved, saldo wallet diperbarui melalui ledger.

---

# BAGIAN 31 — LIVE CHAT

Customer dapat membuka chat.

Admin/Customer Service dapat membalas.

Realtime menggunakan Supabase Realtime.

---

# BAGIAN 32 — WHATSAPP

Atur nomor WhatsApp support pada settings website.

Gunakan format internasional yang benar.

Contoh Indonesia:

```text
6281234567890
```

---

# BAGIAN 33 — TEST WAJIB SEBELUM WEBSITE DIUMUMKAN

Gunakan email kedua untuk testing.

## Test 1 — Register

1. Buka Register.
2. Masukkan email kedua.
3. Klik daftar.
4. Pastikan email masuk.
5. Pastikan OTP tepat 6 digit.
6. Masukkan OTP.
7. Pastikan akun aktif.

## Test 2 — OTP Login

1. Logout.
2. Login → OTP Email.
3. Kirim OTP.
4. Pastikan email masuk.
5. Masukkan 6 digit.
6. Pastikan login berhasil.

## Test 3 — Password

1. Logout.
2. Login dengan password.
3. Pastikan berhasil.

## Test 4 — Lupa Password

1. Buka Lupa Password.
2. Masukkan email.
3. Terima OTP.
4. Masukkan 6 digit.
5. Buat password baru.
6. Login dengan password baru.

## Test 5 — Order

1. Pilih game.
2. Pilih nominal.
3. Isi User ID.
4. Pilih pembayaran.
5. Buat order.
6. Upload bukti.
7. Admin verifikasi.
8. Ubah status.
9. Selesaikan top-up.
10. Ubah menjadi SUCCESS.

---

# BAGIAN 34 — JIKA EMAIL TIDAK MASUK

Periksa urutan berikut:

1. Cek Inbox.
2. Cek Spam.
3. Cek Promotions.
4. Pastikan SMTP sudah dikonfigurasi.
5. Pastikan sender email sudah diverifikasi provider SMTP.
6. Cek log email provider.
7. Cek Supabase Auth logs.
8. Pastikan domain email/SPF/DKIM/DMARC sudah benar jika menggunakan domain sendiri.

Jangan meminta pengguna menunggu tanpa memeriksa SMTP/log.

---

# BAGIAN 35 — JIKA OTP SALAH

Pastikan:

- email yang dimasukkan sama
- kode belum expired
- kode benar-benar 6 digit
- tidak meminta OTP berulang kali terlalu cepat
- gunakan OTP terbaru jika beberapa kode dikirim

Supabase secara default membatasi permintaan OTP agar tidak terlalu sering dan OTP memiliki masa berlaku yang dapat dikonfigurasi. citeturn0search1

---

# BAGIAN 36 — JIKA GITHUB ACTIONS MERAH

Buka:

```text
GitHub
→ Actions
→ workflow merah
→ job merah
→ langkah merah
```

Contoh:

```text
Install dependencies
TypeScript check
Production static build
Verify static output
Deploy to GitHub Pages
```

Kirim screenshot langkah yang merah.

Jangan kirim:

- password Supabase
- SMTP password
- service-role key
- GitHub token

---

# BAGIAN 37 — JIKA DOMAIN TIDAK BISA DIBUKA

Cek:

1. Domain belum expired.
2. A record benar.
3. Tidak ada A record yang bertentangan.
4. GitHub Pages sudah aktif.
5. Custom domain sudah diisi.
6. CNAME project tidak rusak.
7. HTTPS sudah aktif setelah DNS berhasil.

---

# BAGIAN 38 — KEAMANAN

Jangan pernah memasukkan ke GitHub:

```text
service_role key
SMTP password
API key provider rahasia
password database
GitHub personal access token
```

Yang boleh berada di frontend adalah public Supabase URL dan public/anon key sesuai desain Supabase.

---

# BAGIAN 39 — FILE PENTING DALAM ZIP

```text
app/
components/
lib/
public/
supabase/
.github/workflows/deploy.yml

next.config.mjs
package.json
tsconfig.json
.env.example

README.md
README-MULAI-DARI-NOL.md
TUTORIAL-INSTALL.md
SETUP-CHECKLIST.md
EMAIL-AUTH-NDRAAAID-V4.md
OTP-6-DIGIT-NDRAAAID.md
EMAIL-TEMPLATES-MENU.md
MEDIA-MANAGER.md
DEPOSIT-MANAGEMENT-V3.md
ADMIN-MANAGEMENT-V2.md
ARCHITECTURE.md
BUILD-VERIFICATION.md
```

---

# BAGIAN 40 — URUTAN PALING SEDERHANA UNTUK PEMULA

Jika Anda bingung, cukup ikuti urutan ini:

```text
1. Buat Supabase
        ↓
2. Jalankan supabase/schema.sql
        ↓
3. Aktifkan Email Auth
        ↓
4. Confirm Email = ON
        ↓
5. Pasang template email
        ↓
6. Pasang Custom SMTP
        ↓
7. Buat GitHub repository ndraaaid
        ↓
8. Upload isi project
        ↓
9. Tambahkan 2 GitHub Secrets
        ↓
10. GitHub Pages = GitHub Actions
        ↓
11. Hubungkan ndraaaidv1.my.id
        ↓
12. Tes website
        ↓
13. Register dengan email kedua
        ↓
14. Pastikan OTP 6 digit masuk
        ↓
15. Jadikan akun Anda Owner
        ↓
16. Isi Game
        ↓
17. Isi Produk
        ↓
18. Isi Payment
        ↓
19. Atur Media
        ↓
20. Atur Broadcast
        ↓
21. Tes order
```

---

# BAGIAN 41 — JANGAN LOMPAT LANGKAH

Untuk pengguna pemula, jangan langsung mengubah banyak hal sekaligus.

Jika website belum tampil, selesaikan GitHub Pages dulu.

Jika website sudah tampil tetapi login error, selesaikan Supabase URL/key.

Jika login sudah berhasil tetapi email tidak masuk, selesaikan SMTP.

Jika email masuk tetapi OTP gagal, periksa template OTP dan Auth settings.

Jika order error, baru periksa database/RLS.

---

# BAGIAN 42 — CATATAN PRODUKSI

Sebelum menerima pelanggan sungguhan, pastikan:

- domain HTTPS aktif
- SMTP produksi aktif
- sender email terverifikasi
- SPF/DKIM/DMARC sesuai provider
- Confirm Email aktif
- OTP 6 digit aktif
- RLS aktif
- service-role key tidak ada di frontend
- GitHub Actions hijau
- order manual sudah dites
- payment proof sudah dites
- admin role sudah dites
- owner restriction sudah dites
- backup database tersedia

---

# SELESAI

Project ini dibuat agar deployment menggunakan:

```text
GitHub
+ GitHub Pages
+ Supabase
+ ndraaaidv1.my.id
```

Tanpa Vercel.

Untuk pertanyaan/error, kirim screenshot error atau teks errornya. Jangan mengirim password, SMTP password, service-role key, atau token rahasia.


## Database migration dari nol

Untuk database Supabase baru, gunakan migration di `supabase/migrations/` dengan urutan nama file. Migration tersebut membuat schema dasar lalu menambahkan Co-Owner, status REFUNDED, guest tracking, permission, wallet/finance hardening, banner, broadcast, dan Live Chat RPC. Jangan menjalankan migration final sebelum migration sebelumnya.

Brand production: **NDRAAAID.v1** — `https://ndraaaidv1.my.id`
