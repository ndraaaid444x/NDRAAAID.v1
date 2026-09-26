# EMAIL AUTH NDRAAAID V4

Tujuan: memastikan pendaftar memakai email yang benar-benar aktif dan menyediakan email OTP, reset password, email change, invitation, dan notifikasi keamanan.

## 1. Flow pendaftaran
1. Pengunjung mengisi email aktif + password.
2. Supabase Auth membuat user.
3. Jika **Confirm email** aktif, user belum boleh dianggap selesai sampai email diklik.
4. NDRAAAID menampilkan halaman "Cek email Anda".
5. User klik **Verifikasi Email**.
6. User kembali ke `https://ndraaaidv1.my.id/auth/verified/` lalu login.

## 2. Flow OTP login
Login dapat memakai email + password atau email OTP. OTP dikirim ke inbox sehingga hanya orang yang menguasai inbox yang dapat melanjutkan.

## 3. Flow lupa password
Halaman `/forgot-password/` menggunakan email OTP. Setelah OTP berhasil diverifikasi, user dapat membuat password baru.

## 4. Template yang disediakan
- confirmation.html — verifikasi email pendaftaran
- recovery.html — reset password
- magic_link_or_otp.html — OTP / passwordless
- email_change.html — konfirmasi email baru
- invite.html — undangan
- reauthentication.html — kode verifikasi keamanan
- password_changed.html — notifikasi password berubah
- email_changed.html — notifikasi email berubah

## 5. Supabase Dashboard
Masuk: **Authentication → Email Templates**.

Isi subject dan HTML sesuai file di folder `supabase/email-templates/`.

Rekomendasi subject:
- Confirmation: `Verifikasi Email NDRAAAID`
- Recovery: `Reset Password NDRAAAID`
- Magic Link/OTP: `Kode OTP NDRAAAID`
- Email Change: `Konfirmasi Email Baru NDRAAAID`
- Invite: `Undangan Bergabung dengan NDRAAAID`
- Reauthentication: `Kode Verifikasi Keamanan NDRAAAID`
- Password Changed: `Password NDRAAAID Berhasil Diubah`
- Email Changed: `Email Akun NDRAAAID Berubah`

## 6. Authentication settings
Di **Authentication → Providers → Email**:
- Email provider: ON
- Confirm email: ON
- Secure email change: ON
- Minimum password length: minimal 8
- Email OTP: ON jika ingin OTP login
- Atur OTP expiry dan request interval sesuai kebutuhan

## 7. SMTP produksi
Untuk website publik, konfigurasi **Custom SMTP**. SMTP bawaan Supabase ditujukan untuk testing dan mempunyai pembatasan pengiriman.

Contoh provider: Resend, Brevo, SendGrid, Postmark, AWS SES, ZeptoMail.

Gunakan alamat pengirim seperti `no-reply@ndraaaidv1.my.id` jika domain email sudah dikonfigurasi pada provider.

## 8. Redirect URLs
Tambahkan:
- `https://ndraaaidv1.my.id/`
- `https://ndraaaidv1.my.id/auth/verified/`
- `https://ndraaaidv1.my.id/forgot-password/`

Untuk testing lokal, tambahkan URL localhost yang benar-benar digunakan.

## 9. Catatan penting
- Jangan menaruh SMTP password atau service-role key di GitHub/frontend.
- Jangan mematikan Confirm email jika targetnya adalah email aktif.
- Jangan menganggap upload bukti pembayaran sebagai pembayaran otomatis.


## OTP 6 Digit NDRAAAID

NDRAAAID menggunakan OTP email **tepat 6 digit angka**. Template email OTP memakai `{{ .Token }}` dan tidak menampilkan link login/reset pada email OTP. Input OTP di website dibatasi hanya 6 angka. Supabase Auth mendukung panjang OTP email 6-10 digit dan default-nya adalah 6 digit. Untuk production, gunakan Custom SMTP agar pengiriman email tidak bergantung pada batasan provider email bawaan.
