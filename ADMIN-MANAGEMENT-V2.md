# NDRAAAID v2 — Admin Management Upgrade

Versi ini menambahkan:
- Game Categories: tambah, aktif/nonaktif, hapus jika tidak dipakai game.
- Game dapat ditempatkan ke kategori.
- Wallet customer dengan saldo tersimpan di database.
- Owner dapat kredit/debit saldo dengan alasan wajib.
- Setiap perubahan saldo masuk ke `wallet_transactions` dan `admin_audit_logs`.
- Owner dapat suspend/activate customer melalui RPC yang aman.
- Owner dapat menghapus akun melalui Supabase Edge Function `admin-delete-user`.
- Owner tidak dapat menghapus dirinya sendiri atau owner lain.

## SQL
Fresh install: `supabase/schema.sql` sudah mencakup perubahan v2.
Existing database: jalankan `supabase/admin-management-v2.sql` satu kali.

## Deploy Edge Function untuk tombol Hapus Akun
Penghapusan user Auth membutuhkan service-role key dan harus berjalan server-side. Jangan pernah memasukkan service-role key ke browser.

Dengan Supabase CLI:

```bash
supabase login
supabase link --project-ref PROJECT_REF_ANDA
supabase functions deploy admin-delete-user
```

Function menggunakan secret bawaan Supabase:
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY`.

Setelah deploy, tombol **Hapus Akun** di Admin → Users dapat digunakan oleh Owner.
