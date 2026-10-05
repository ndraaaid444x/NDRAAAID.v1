// Mengambil SEMUA baris dari Supabase dengan paginasi (range) sampai habis.
// Server Supabase membatasi satu respons (default 1000 baris), jadi limit di sisi klien
// tidak cukup. Fungsi ini terus mengambil halaman berikutnya sampai halaman terakhir.
// Query WAJIB punya urutan yang stabil (mis. .order('name').order('id')) agar tidak ada baris
// yang terlewat/ganda antar halaman.
export async function fetchAll<T = any>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 500
): Promise<{ data: T[] | null; error: any }> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1)
    if (error) return { data: null, error }
    const page = data || []
    rows.push(...page)
    if (page.length < pageSize) break
  }
  return { data: rows, error: null }
}
