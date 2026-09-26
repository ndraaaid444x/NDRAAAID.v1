

## OTP 6 Digit NDRAAAID

NDRAAAID menggunakan OTP email **tepat 6 digit angka**. Template email OTP memakai `{{ .Token }}` dan tidak menampilkan link login/reset pada email OTP. Input OTP di website dibatasi hanya 6 angka. Supabase Auth mendukung panjang OTP email 6-10 digit dan default-nya adalah 6 digit. Untuk production, gunakan Custom SMTP agar pengiriman email tidak bergantung pada batasan provider email bawaan.
