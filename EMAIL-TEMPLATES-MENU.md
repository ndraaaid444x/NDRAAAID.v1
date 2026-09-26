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

OTP email tetap 6 digit untuk verifikasi/login. Template `recovery.html` menggunakan `{{ .ConfirmationURL }}` untuk reset password berbasis link.
