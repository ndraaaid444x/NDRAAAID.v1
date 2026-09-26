# MENU EMAIL NDRAAAID

Supabase Dashboard → Authentication → Email Templates

| Flow | Subject | File |
|---|---|---|
| Confirm signup | Verifikasi Email NDRAAAID | confirmation.html |
| Magic Link / OTP | Kode OTP NDRAAAID | magic_link_or_otp.html |
| Reset Password | Reset Password NDRAAAID | recovery.html |
| Change Email | Konfirmasi Email Baru NDRAAAID | email_change.html |
| Invite | Undangan Bergabung dengan NDRAAAID | invite.html |
| Reauthentication | Kode Verifikasi Keamanan NDRAAAID | reauthentication.html |
| Password Changed | Password NDRAAAID Berhasil Diubah | password_changed.html |
| Email Changed | Email Akun NDRAAAID Berubah | email_changed.html |

Untuk pengiriman ke pelanggan umum, aktifkan Custom SMTP.


## OTP 6 Digit NDRAAAID

NDRAAAID menggunakan OTP email **tepat 6 digit angka**. Template email OTP memakai `{{ .Token }}` dan tidak menampilkan link login/reset pada email OTP. Input OTP di website dibatasi hanya 6 angka. Supabase Auth mendukung panjang OTP email 6-10 digit dan default-nya adalah 6 digit. Untuk production, gunakan Custom SMTP agar pengiriman email tidak bergantung pada batasan provider email bawaan.
