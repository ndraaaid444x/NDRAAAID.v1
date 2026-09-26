# NDRAAAID Media Manager

Versi ini menambahkan **Media Manager** supaya Owner/Admin bisa mengelola foto website tanpa coding.

## Fitur
- Upload JPG, PNG, WEBP, GIF.
- Maksimal 6 MB per file.
- Kategori: Game/Logo, Produk, Promo/Banner, Homepage, Lainnya.
- Preview gambar.
- Copy URL gambar.
- Hapus gambar.
- Upload langsung dari menu Game, Produk, dan Promo.
- Gambar disimpan di Supabase Storage bucket `website-assets`.
- Metadata file disimpan di tabel `media_assets`.
- Bucket asset website bersifat public untuk kebutuhan gambar website; upload/update/delete tetap dibatasi RLS untuk Owner/Admin.

## Jika database baru
Jalankan `supabase/schema.sql` seperti biasa. Schema utama sudah mencakup Media Manager.

## Jika database lama sudah pernah menjalankan schema sebelumnya
Di Supabase Dashboard → SQL Editor, jalankan:

`supabase/media-manager.sql`

File migration tersebut menambahkan:
- `game_products.image_url`
- tabel `media_assets`
- bucket `website-assets`
- policy RLS untuk media

## Cara menggunakan
1. Login sebagai Owner/Admin.
2. Buka `/admin/`.
3. Pilih menu **media**.
4. Pilih kategori.
5. Klik **Upload Media**.
6. Pilih foto dari HP/komputer.
7. Foto akan muncul di library dan dapat di-copy URL-nya.

Untuk upload langsung saat membuat data:
- **Games** → upload Logo dan Banner.
- **Products** → upload Foto Produk.
- **Promotions** → upload Banner Promo.

## Catatan
Batas 6 MB dipilih agar upload browser standar tetap ringan. Supabase merekomendasikan standard upload untuk file kecil dan menyarankan resumable/TUS untuk file yang lebih besar dari sekitar 6 MB.
