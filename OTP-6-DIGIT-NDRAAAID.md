# OTP 6 Digit NDRAAAID

Semua OTP email NDRAAAID ditetapkan tepat **6 digit angka**.

## Berlaku untuk
- Verifikasi pendaftaran
- Login OTP
- Lupa/reset password
- Reauthentication

## Tampilan email
Email OTP hanya menampilkan kode angka `{{ .Token }}`. Tidak ada link yang menggantikan kode pada template OTP.

## Supabase
Supabase Auth mendukung OTP email 6-10 digit dan default konfigurasi OTP email adalah 6 digit. `supabase/config.toml` project ini juga menetapkan `otp_length = 6` untuk konfigurasi lokal. Hosted Supabase tetap perlu dikonfigurasi/ditinjau pada Authentication sesuai project Anda.
