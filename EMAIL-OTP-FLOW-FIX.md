# NDRAAAID.v1 — OTP Auth Flow Fix

## Target behavior
- Register: email berisi OTP 6 digit. User memasukkan OTP di website.
- Forgot password: email berisi OTP 6 digit. User memasukkan OTP di website, lalu membuat password baru.
- Tidak ada tombol/link reset password yang menjadi langkah utama.

## Important: Supabase Dashboard
The HTML files in this repository do not automatically overwrite the hosted Supabase Auth email templates. After deployment, update the Supabase Dashboard template manually:

Authentication → Email Templates →
- Confirm signup: use `supabase/email-templates/confirmation.html`
- Reset password: use `supabase/email-templates/recovery.html`

Both templates must use `{{ .Token }}`, not `{{ .ConfirmationURL }}`.

## Application behavior
`app/register/page.tsx` verifies the signup OTP with `supabase.auth.verifyOtp({ email, token, type: 'email' })`.

`app/forgot-password/page.tsx` requests recovery email with `resetPasswordForEmail()`, verifies the code with `verifyOtp({ email, token, type: 'recovery' })`, then calls `updateUser({ password })`.
