# TUTORIAL NDRAAAID — UNTUK PEMULA TOTAL

Dokumen ini menganggap Anda belum pernah memakai Supabase, GitHub, atau GitHub Pages.
Ikuti urutan. Jangan melompat ke bagian lain sebelum langkah sebelumnya selesai.

## A. Yang perlu disiapkan
1. Email Gmail.
2. Akun GitHub: https://github.com
3. Akun Supabase: https://supabase.com
4. Akses pengaturan DNS domain `ndraaaidv1.my.id` dari registrar tempat Anda membeli domain.
5. ZIP project NDRAAAID ini.

**Anda tidak perlu Vercel.**

## B. Membuat project Supabase
1. Buka Supabase.
2. Klik **New project**.
3. Nama project: `ndraaaid`.
4. Buat password database yang kuat dan simpan di tempat aman.
5. Pilih region terdekat yang tersedia.
6. Tunggu sampai project selesai dibuat.

## C. Membuat database NDRAAAID
1. Di Supabase, buka menu **SQL Editor**.
2. Klik **New query**.
3. Buka file `supabase/schema.sql` dari ZIP.
4. Copy seluruh isinya.
5. Paste ke SQL Editor.
6. Klik **Run**.
7. Jika berhasil, tabel NDRAAAID sudah dibuat.

Untuk pemeriksaan, buka **Table Editor**. Anda seharusnya melihat tabel seperti `profiles`, `games`, `game_products`, `orders`, `payments`, `payment_proofs`, dan lainnya.

## D. Mengaktifkan email login/verifikasi
1. Supabase → **Authentication** → **Providers** → Email.
2. Pastikan Email provider aktif.
3. Supabase → **Authentication** → **URL Configuration**.
4. Isi Site URL:
   `https://ndraaaidv1.my.id/`
5. Tambahkan redirect URL:
   `https://ndraaaidv1.my.id/**`

### SMTP Gmail (untuk email sungguhan)
Untuk produksi, gunakan custom SMTP.
1. Aktifkan 2-Step Verification pada akun Google Anda.
2. Buat Google App Password.
3. Supabase → Authentication → SMTP Settings.
4. Isi host `smtp.gmail.com`.
5. Port `587`.
6. Username = Gmail Anda.
7. Password = Google App Password, bukan password Gmail biasa.
8. Sender email = Gmail Anda.

## E. Membuat akun GitHub
1. Buka GitHub.
2. Login.
3. Klik **New repository**.
4. Nama repository: `ndraaaid`.
5. Pilih **Public** atau **Private** sesuai kebutuhan Anda.
6. Jangan menambahkan README otomatis karena project sudah memiliki README.
7. Klik **Create repository**.

## F. Upload file project ke GitHub
1. Extract ZIP di komputer.
2. Masuk ke folder project.
3. Di GitHub repository, klik **Add file → Upload files**.
4. Upload isi project, bukan folder pembungkus luarnya.
5. Pastikan terlihat folder:
   - `app`
   - `components`
   - `lib`
   - `supabase`
   - `.github`
   - `public`
6. Klik **Commit changes**.

## G. Memasukkan Supabase URL dan key ke GitHub
1. Supabase → **Project Settings** → **API**.
2. Salin **Project URL**.
3. Salin **Publishable/Anon public key**.
4. GitHub → repository → **Settings** → **Secrets and variables** → **Actions**.
5. Klik **New repository secret**.
6. Buat:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Secret: Project URL Supabase.
7. Buat lagi:
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Secret: public anon/publishable key Supabase.

Jangan masukkan `service_role` key.

## H. Mengaktifkan GitHub Pages
1. GitHub repository → **Settings**.
2. Pilih **Pages**.
3. Pada Build and deployment, pilih **GitHub Actions**.
4. Tidak perlu memilih Vercel.
5. Buka tab **Actions**.
6. Workflow `Deploy NDRAAAID to GitHub Pages` akan berjalan setelah commit.
7. Tunggu sampai status hijau.

## I. Menghubungkan domain ndraaaidv1.my.id
1. GitHub → Settings → Pages.
2. Pada **Custom domain**, masukkan:
   `ndraaaidv1.my.id`
3. Simpan.
4. Login ke tempat Anda membeli domain.
5. Buka DNS Management.
6. Tambahkan A records berikut untuk domain utama:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
7. Jangan membuat record yang bentrok dengan record lama untuk root domain.
8. Tunggu DNS menyebar.
9. Kembali ke GitHub Pages.
10. Tunggu sampai **Enforce HTTPS** dapat diaktifkan.

## J. Membuat Owner
1. Buka `https://ndraaaidv1.my.id/register/`.
2. Daftar menggunakan email Anda.
3. Verifikasi email.
4. Buka Supabase → SQL Editor.
5. Jalankan:

```sql
update public.profiles
set role = 'owner'
where email = 'EMAIL_ANDA';
```

Ganti `EMAIL_ANDA` dengan email yang Anda pakai.

6. Logout dan login lagi.
7. Menu **Admin Panel** akan muncul.

## K. Isi payment method
Masuk Admin Panel → `payments`.
Tambahkan QRIS, DANA, GoPay, bank transfer, atau metode lain milik Anda.

QRIS pada versi ini masih manual. User membayar sendiri lalu upload bukti.

## L. Isi game dan produk
Admin Panel → `games` untuk menambah game.
Admin Panel → `products` untuk menambah nominal/harga.

Contoh:
- Mobile Legends
- 86 Diamonds
- Kode Produk `ML86`
- Harga `20000`

## M. Tes transaksi
Gunakan akun customer berbeda.
1. Register.
2. Pilih game.
3. Isi User ID.
4. Pilih produk.
5. Pilih metode pembayaran.
6. Buat order.
7. Buka order.
8. Upload screenshot pembayaran.
9. Login Admin.
10. Buka order.
11. Verifikasi pembayaran.
12. Ubah `Pending Payment` → `Payment Received`.
13. Lakukan top-up game secara manual.
14. Ubah → `Processing`.
15. Setelah benar-benar selesai, ubah → `Success`.

**Jangan mengubah Success sebelum top-up benar-benar dilakukan.**

## N. Jika GitHub Actions merah
Buka:
GitHub → Actions → workflow yang merah → klik job yang gagal.

Kirim screenshot bagian error ke pembuat project. Jangan menghapus workflow.

## O. Jika website kosong
Periksa:
1. GitHub Actions sudah hijau.
2. Dua GitHub Actions secrets sudah benar.
3. Supabase schema sudah dijalankan.
4. Domain DNS sudah benar.
5. Browser refresh.

## P. Batasan versi ini
Payment gateway dan provider top-up belum tersedia. Karena itu sistem tidak mengklaim otomatis. Provider abstraction tetap dapat ditambahkan kemudian melalui backend/Edge Functions ketika API resmi sudah tersedia.

## Media Manager (foto website)
Versi terbaru memiliki menu `media` di Admin Panel. Kamu bisa upload foto logo game, banner game, foto produk, banner promo, homepage, dan gambar umum langsung dari browser. Tidak perlu upload manual ke folder GitHub.

Jika database sudah pernah dipasang dari ZIP versi sebelumnya, jalankan `supabase/media-manager.sql` di Supabase SQL Editor terlebih dahulu.


## OTP 6 Digit NDRAAAID

NDRAAAID menggunakan OTP email **tepat 6 digit angka**. Template email OTP memakai `{{ .Token }}` dan tidak menampilkan link login/reset pada email OTP. Input OTP di website dibatasi hanya 6 angka. Supabase Auth mendukung panjang OTP email 6-10 digit dan default-nya adalah 6 digit. Untuk production, gunakan Custom SMTP agar pengiriman email tidak bergantung pada batasan provider email bawaan.
