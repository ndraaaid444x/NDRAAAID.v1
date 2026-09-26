# Template Email NDRAAAID

Template HTML untuk Supabase Auth. File-file di folder ini dipaste ke **Supabase Dashboard → Authentication → Email Templates**.

Variabel Supabase yang digunakan:
- `{{ .ConfirmationURL }}` untuk link konfirmasi/reset.
- `{{ .Token }}` untuk OTP.
- `{{ .SiteURL }}` untuk domain website.
- `{{ .Email }}` untuk email pengguna.
- `{{ .NewEmail }}` untuk email baru.
- `{{ .Data }}` untuk metadata pengguna.

Untuk produksi, gunakan **Custom SMTP** agar email benar-benar dapat dikirim ke pelanggan umum.
