'use client'

import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

const transitions: Record<string, string[]> = {
  PENDING_PAYMENT: ['PAYMENT_RECEIVED', 'CANCELLED', 'EXPIRED'],
  PAYMENT_RECEIVED: ['PROCESSING', 'FAILED', 'CANCELLED'],
  PROCESSING: ['SUCCESS', 'FAILED'],
  FAILED: ['REFUNDED'],
  CANCELLED: ['REFUNDED'],
}

const tabs = ['orders', 'deposits', 'deposit-history', 'wallet-history', 'categories', 'games', 'products', 'payments', 'vouchers', 'promotions', 'banners', 'broadcasts', 'media', 'users', 'settings', 'chat']
const mediaCategories = [
  ['games', 'Game / Logo'],
  ['products', 'Produk'],
  ['promotions', 'Promo / Banner'],
  ['homepage', 'Homepage'],
  ['general', 'Lainnya'],
]

export default function Admin() {
  const [tab, setTab] = useState('orders')
  const [role, setRole] = useState('')
  const [msg, setMsg] = useState('')
  const [orders, setOrders] = useState<any[]>([])
  const [games, setGames] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [methods, setMethods] = useState<any[]>([])
  const [vouchers, setVouchers] = useState<any[]>([])
  const [promos, setPromos] = useState<any[]>([])
  const [banners, setBanners] = useState<any[]>([])
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [mediaAssets, setMediaAssets] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [wallets, setWallets] = useState<any[]>([])
  const [deposits, setDeposits] = useState<any[]>([])
  const [walletTx, setWalletTx] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [activeRoom, setActiveRoom] = useState<any>()
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatText, setChatText] = useState('')
  const [mediaCategory, setMediaCategory] = useState('general')
  const [mediaSearch, setMediaSearch] = useState('')
  const [mediaUploading, setMediaUploading] = useState(false)
  const [site, setSite] = useState<any>({ name: 'NDRAAAID.v1', tagline: 'Top Up Game Cepat, Aman & Terpercaya', manual_mode: true })

  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '' })
  const [gameForm, setGameForm] = useState({ name: '', slug: '', description: '', logo_url: '', banner_url: '', category_id: '' })
  const [prodForm, setProdForm] = useState({ game_id: '', name: '', nominal: '', sku: '', price: '', image_url: '' })
  const [methodForm, setMethodForm] = useState({ name: '', kind: 'QRIS', account_name: '', account_number: '', instruction: '', qr_url: '' })
  const [voucherForm, setVoucherForm] = useState({ code: '', discount_type: 'PERCENT', discount_value: '10', min_order: '0', max_discount: '' })
  const [promoForm, setPromoForm] = useState({ name: '', description: '', banner_url: '', code: '' })
  const [bannerForm, setBannerForm] = useState({ title: '', image_url: '', link_url: '', sort_order: '0' })
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', type: 'PROMO', durationMinutes: '60', link_url: '', link_label: '' })

  const router = useRouter()
  const s = supabaseBrowser()

  async function load() {
    const { data: { user } } = await s.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: p } = await s.from('profiles').select('role').eq('id', user.id).single()
    if (!p || !['owner', 'co_owner', 'admin', 'customer_service'].includes(p.role)) { router.push('/'); return }
    setRole(p.role)

    const [{ data: o }, { data: g }, { data: cat }, { data: pr }, { data: m }, { data: v }, { data: pm }, { data: b }, { data: bn }, { data: ma }, { data: u }, { data: w }, { data: dep }, { data: wtx }, { data: cr }, { data: st }] = await Promise.all([
      s.from('orders').select('id,order_code,status,total,created_at,games(name),profiles(username)').order('created_at', { ascending: false }).limit(200),
      s.from('games').select('*,game_categories(name)').order('created_at', { ascending: false }),
      s.from('game_categories').select('*').order('sort_order').order('name'),
      s.from('game_products').select('*,games(name)').order('created_at', { ascending: false }),
      s.from('payment_methods').select('*').order('created_at', { ascending: false }),
      s.from('vouchers').select('*').order('created_at', { ascending: false }),
      s.from('promotions').select('*').order('created_at', { ascending: false }),
      s.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(100),
      s.from('banners').select('*').order('sort_order').order('created_at', { ascending: false }),
      s.from('media_assets').select('*').order('created_at', { ascending: false }).limit(300),
      s.from('profiles').select('id,username,email,name,role,is_suspended,created_at').order('created_at', { ascending: false }).limit(200),
      s.from('wallets').select('user_id,balance,updated_at'),
      s.from('member_deposits')
  .select(`
    *,
    profiles:profiles!member_deposits_user_id_fkey(username,email,name),
    payment_methods:payment_methods!member_deposits_payment_method_id_fkey(name,kind)
  `)
  .order('created_at', { ascending: false })
  .limit(500),
      s.from('wallet_transactions').select('*,profiles(username,email)').order('created_at', { ascending: false }).limit(500),
      s.from('chat_rooms').select('*,profiles(username,email)').order('created_at', { ascending: false }),
      s.from('settings').select('*').eq('key', 'site').maybeSingle(),
    ])
    setOrders(o || []); setBanners(bn || []); setDeposits(dep || []); setWalletTx(wtx || []); setGames(g || []); setCategories(cat || []); setProducts(pr || []); setMethods(m || []); setVouchers(v || []); setPromos(pm || []); setBroadcasts(b || []); setMediaAssets(ma || []); setUsers(u || []); setWallets(w || []); setRooms(cr || [])
    if (st?.value) setSite(st.value)
    if (g?.[0] && !prodForm.game_id) setProdForm(x => ({ ...x, game_id: g[0].id }))
    if (cat?.[0] && !gameForm.category_id) setGameForm(x => ({ ...x, category_id: cat[0].id }))
  }

  useEffect(() => { load() }, [])

  async function transition(o: any, n: string) {
    if (!confirm(`Ubah ${o.order_code} menjadi ${n}?`)) return
    const { error } = await s.rpc('admin_transition_order', { p_order_id: o.id, p_new_status: n, p_note: `Diproses manual oleh ${role}` })
    setMsg(error?.message || `${o.order_code} → ${n}`); load()
  }

  async function viewDepositProof(d: any) {
    if (!d.proof_path) { setMsg('Deposit ini belum memiliki bukti.'); return }
    const { data, error } = await s.storage.from('payment-proofs').createSignedUrl(d.proof_path, 300)
    if (error || !data?.signedUrl) { setMsg(error?.message || 'Bukti tidak dapat dibuka.'); return }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function reviewDeposit(d: any, action: 'APPROVE' | 'REJECT') {
    if (!['owner','co_owner','admin'].includes(role)) { setMsg('Tidak memiliki permission untuk memproses deposit.'); return }
    let reason: string | null = null
    if (action === 'REJECT') { reason = prompt('Alasan penolakan deposit (wajib):')?.trim() || null; if (!reason) { setMsg('Alasan penolakan wajib diisi.'); return } }
    if (!confirm(`${action === 'APPROVE' ? 'Setujui' : 'Tolak'} deposit ${d.deposit_code} sebesar Rp ${Number(d.amount).toLocaleString('id-ID')}?`)) return
    const { error } = await s.rpc('review_member_deposit', { p_deposit_id: d.id, p_action: action, p_rejection_reason: reason })
    setMsg(error?.message || `Deposit ${d.deposit_code} berhasil ${action === 'APPROVE' ? 'disetujui' : 'ditolak'}.`)
    load()
  }

  async function add(table: string, payload: any, reset: () => void) {
    const { error } = await s.from(table).insert(payload)
    setMsg(error?.message || 'Data berhasil ditambahkan.')
    if (!error) reset()
    load()
  }

  async function toggle(table: string, id: string) {
    const rows = table === 'games' ? games : table === 'game_products' ? products : table === 'payment_methods' ? methods : table === 'vouchers' ? vouchers : table === 'broadcasts' ? broadcasts : table === 'banners' ? banners : table === 'game_categories' ? categories : promos
    const row = rows.find((x: any) => x.id === id)
    const { error } = await s.from(table).update({ is_active: !row.is_active }).eq('id', id)
    setMsg(error?.message || 'Status diperbarui.'); load()
  }

  async function suspend(u: any) {
    if (role !== 'owner') { setMsg('Hanya Owner yang dapat menonaktifkan/mengaktifkan akun.'); return }
    if (!confirm(`${u.is_suspended ? 'Aktifkan kembali' : 'Nonaktifkan'} akun ${u.email || u.username || 'user'}?`)) return
    const { error } = await s.rpc('owner_set_suspended', { p_user_id: u.id, p_suspended: !u.is_suspended })
    setMsg(error?.message || 'Status user diperbarui.'); load()
  }

  async function adjustWallet(u: any, sign: 1 | -1) {
    if (!canAdjustWallet) { setMsg('Tidak memiliki permission finance wallet.'); return }
    const amountText = prompt(`${sign > 0 ? 'Tambah' : 'Kurangi'} saldo untuk ${u.email || u.username || 'user'} (angka rupiah):`, '10000')
    if (!amountText) return
    const amount = Number(amountText.replace(/[^0-9.-]/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) { setMsg('Nominal saldo tidak valid.'); return }
    const reason = prompt('Alasan perubahan saldo (wajib):', sign > 0 ? 'Kredit saldo manual' : 'Debit saldo manual')
    if (!reason?.trim()) { setMsg('Alasan wajib diisi.'); return }
    if (!confirm(`${sign > 0 ? 'Tambah' : 'Kurangi'} Rp ${amount.toLocaleString('id-ID')}?`)) return
    const { error } = await s.rpc('adjust_wallet', { p_user_id: u.id, p_amount: sign * amount, p_reason: reason.trim() })
    setMsg(error?.message || 'Saldo berhasil diperbarui.'); load()
  }

  async function deleteUser(u: any) {
    if (role !== 'owner') { setMsg('Hanya Owner yang dapat menghapus akun.'); return }
    if (!confirm(`Hapus permanen akun ${u.email || u.username || 'user'}? Tindakan ini tidak dapat dibatalkan.`)) return
    const { data, error } = await s.functions.invoke('admin-delete-user', { body: { user_id: u.id } })
    setMsg(error?.message || data?.message || 'Permintaan penghapusan akun selesai.'); load()
  }

  async function changeRole(u: any) {
    if (role !== 'owner') return
    const next = prompt('Role baru: user/admin/customer_service/co_owner/owner', u.role)
    if (!next || !['user', 'admin', 'customer_service', 'co_owner', 'owner'].includes(next)) return
    const { error } = await s.rpc('owner_set_role', { p_user_id: u.id, p_role: next })
    setMsg(error?.message || 'Role diperbarui.'); load()
  }

  async function uploadAsset(file: File, category: string, callback?: (url: string) => void) {
    if (!['owner', 'co_owner', 'admin'].includes(role)) { setMsg('Hanya Owner/Admin yang boleh mengunggah media.'); return }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) { setMsg('Format harus JPG, PNG, WEBP, atau GIF.'); return }
    if (file.size > 6 * 1024 * 1024) { setMsg('Ukuran maksimal 6 MB per file.'); return }
    setMediaUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp'
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/\.[^.]+$/, '').slice(0, 70) || 'asset'
    const path = `${category}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safe}.${ext}`
    const { error: uploadError } = await s.storage.from('website-assets').upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
    if (uploadError) { setMsg(uploadError.message); setMediaUploading(false); return }
    const { data: urlData } = s.storage.from('website-assets').getPublicUrl(path)
    const { data: { user } } = await s.auth.getUser()
    const { error: dbError } = await s.from('media_assets').insert({ name: file.name, path, url: urlData.publicUrl, category, mime_type: file.type, size_bytes: file.size, created_by: user?.id })
    setMediaUploading(false)
    if (dbError) { await s.storage.from('website-assets').remove([path]); setMsg(dbError.message); return }
    if (callback) callback(urlData.publicUrl)
    setMsg(`Media berhasil diunggah ke kategori ${category}.`)
    load()
  }

  async function uploadFromInput(e: ChangeEvent<HTMLInputElement>, category: string, callback?: (url: string) => void) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadAsset(file, category, callback)
    e.target.value = ''
  }

  async function deleteMedia(asset: any) {
    if (!confirm(`Hapus media "${asset.name}"?`)) return
    const { error: storageError } = await s.storage.from('website-assets').remove([asset.path])
    if (storageError) { setMsg(storageError.message); return }
    const { error } = await s.from('media_assets').delete().eq('id', asset.id)
    setMsg(error?.message || 'Media dihapus.'); load()
  }

  async function copyUrl(url: string) {
    await navigator.clipboard?.writeText(url)
    setMsg('URL media disalin.')
  }

  async function addBanner(e: FormEvent) {
    e.preventDefault();
    if (!['owner','admin'].includes(role)) return setMsg('Tidak memiliki permission marketing.');
    const payload = { title: bannerForm.title.trim(), image_url: bannerForm.image_url.trim(), link_url: bannerForm.link_url.trim() || null, sort_order: Number(bannerForm.sort_order) || 0, is_active: true };
    if (!payload.title || !payload.image_url) return setMsg('Judul dan URL gambar wajib diisi.');
    const { error } = await s.from('banners').insert(payload);
    setMsg(error?.message || 'Banner berhasil diterbitkan.'); if (!error) setBannerForm({title:'',image_url:'',link_url:'',sort_order:'0'}); load();
  }

  async function addBroadcast(e: FormEvent) {
    e.preventDefault(); if (!['owner', 'co_owner', 'admin'].includes(role)) return
    const minutes = Math.max(1, Number(broadcastForm.durationMinutes) || 60)
    const { error } = await s.rpc('create_broadcast', { p_title: broadcastForm.title.trim(), p_message: broadcastForm.message.trim(), p_type: broadcastForm.type, p_duration_minutes: minutes, p_link_url: broadcastForm.link_url.trim() || null, p_link_label: broadcastForm.link_label.trim() || null })
    setMsg(error?.message || `Broadcast aktif selama ${minutes} menit.`)
    if (!error) setBroadcastForm({ title: '', message: '', type: 'PROMO', durationMinutes: '60', link_url: '', link_label: '' })
    load()
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault(); const { error } = await s.from('settings').upsert({ key: 'site', value: site, updated_at: new Date().toISOString() })
    setMsg(error?.message || 'Settings tersimpan.'); load()
  }

  async function openRoom(room: any) {
    setActiveRoom(room)
    const { data } = await s.from('chat_messages').select('*').eq('room_id', room.id).order('created_at')
    setChatMessages(data || [])
    const ch = s.channel('admin-chat-' + room.id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` }, p => setChatMessages(v => v.some(x => x.id === p.new.id) ? v : [...v, p.new])).subscribe()
    return () => s.removeChannel(ch)
  }

  async function sendChat() {
    if (!activeRoom || !chatText.trim()) return
    const { data: { user } } = await s.auth.getUser(); if (!user) return
    await s.rpc('send_chat_message', { p_room_id: activeRoom.id, p_message: chatText.trim() }); setChatText('')
  }

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    if (!['owner','admin'].includes(role)) return
    const payload = { name: categoryForm.name.trim(), slug: categoryForm.slug.trim().toLowerCase().replace(/\s+/g, '-'), description: categoryForm.description.trim() || null, is_active: true }
    const { error } = await s.from('game_categories').insert(payload)
    setMsg(error?.message || 'Kategori berhasil ditambahkan.'); if (!error) setCategoryForm({ name: '', slug: '', description: '' }); load()
  }

  async function deleteCategory(c: any) {
    if (role !== 'owner') { setMsg('Hanya Owner yang dapat menghapus kategori.'); return }
    const used = games.some(g => g.category_id === c.id)
    if (used) { setMsg('Kategori masih dipakai game. Pindahkan game ke kategori lain terlebih dahulu.'); return }
    if (!confirm(`Hapus kategori ${c.name}?`)) return
    const { error } = await s.from('game_categories').delete().eq('id', c.id)
    setMsg(error?.message || 'Kategori dihapus.'); load()
  }

  const filteredMedia = mediaAssets.filter(a => a.name.toLowerCase().includes(mediaSearch.toLowerCase()) && (mediaCategory === 'all' || a.category === mediaCategory))
  const tabPermissions: Record<string, string[]> = {
    orders: ['owner','co_owner','admin','customer_service'],
    deposits: ['owner','co_owner','admin'], 'deposit-history': ['owner','co_owner','admin'], 'wallet-history': ['owner','co_owner','admin'],
    categories: ['owner','co_owner','admin'], games: ['owner','co_owner','admin'], products: ['owner','co_owner','admin'], payments: ['owner','co_owner','admin'],
    vouchers: ['owner','co_owner','admin'], promotions: ['owner','co_owner','admin'], banners: ['owner','co_owner','admin'], media: ['owner','co_owner','admin'],
    broadcasts: ['owner','co_owner','admin'], users: ['owner','co_owner','admin','customer_service'], settings: ['owner'], chat: ['owner','co_owner','admin','customer_service']
  }
  const visibleTabs = tabs.filter(x => tabPermissions[x]?.includes(role))
  const canProcessOrders = ['owner','co_owner','admin'].includes(role)
  const canRefundOrders = ['owner','co_owner'].includes(role)
  const canAdjustWallet = ['owner','co_owner'].includes(role)

  return <main className="mx-auto max-w-7xl px-4 py-10">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm font-bold text-purple-300">ADMIN PANEL</p><h1 className="text-4xl font-black">NDRAAAID.v1 Control Center</h1><p className="mt-2 text-slate-400">Transaction Mode: <b className="text-cyan-300">MANUAL</b> · {role}</p></div>
      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">{visibleTabs.map(x => { const labels: any = {orders:'Transaksi / Riwayat Order',deposits:'Keuangan / Deposit Member', 'deposit-history':'Keuangan / Riwayat Deposit','wallet-history':'Keuangan / Riwayat Wallet',categories:'Kategori',games:'Games',products:'Produk',payments:'Pembayaran',vouchers:'Voucher',promotions:'Promo',broadcasts:'Live Broadcast',media:'Media Manager',users:'Member & Wallet',settings:'Pengaturan',chat:'Live Chat'}; return <button key={x} onClick={() => setTab(x)} className={`btn shrink-0 text-xs ${tab === x ? 'btn-primary' : 'btn-muted'}`}>{labels[x]}</button> })}</div>
    </div>

    {msg && <div className="mt-5 rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-3 text-sm text-cyan-200">{msg}</div>}
    <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">{[['Total Order', orders.length], ['Pending', orders.filter(x => x.status === 'PENDING_PAYMENT').length], ['Processing', orders.filter(x => x.status === 'PROCESSING').length], ['Success', orders.filter(x => x.status === 'SUCCESS').length]].map(([k, v]) => <div key={String(k)} className="glass rounded-2xl p-4"><p className="text-xs text-slate-500">{k}</p><b className="mt-1 block text-2xl">{v}</b></div>)}</div>

    {tab === 'orders' && <div className="mt-7 space-y-3">{orders.map(o => <div key={o.id} className="glass rounded-2xl p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><b>{o.order_code}</b><p className="text-sm text-slate-400">{o.profiles?.username || '-'} · {o.games?.name || '-'} · Rp {Number(o.total).toLocaleString('id-ID')}</p><p className="mt-1 text-xs text-slate-500">{new Date(o.created_at).toLocaleString('id-ID')}</p></div><div className="flex flex-wrap gap-2">{canProcessOrders && (transitions[o.status] || []).filter(n => n !== 'REFUNDED' || canRefundOrders).map(n => <button key={n} onClick={() => transition(o, n)} className="btn btn-primary text-xs">{n.replaceAll('_', ' ')}</button>)}<a href={`/order/?id=${encodeURIComponent(o.id)}`} className="btn btn-muted text-xs">Detail</a></div></div></div>)}{!orders.length && <p className="text-slate-400">Belum ada order.</p>}</div>}

    {tab === 'deposits' && <section className="mt-7 space-y-3"><div className="glass rounded-2xl p-5"><h2 className="text-xl font-black">Deposit Member — Perlu Diproses</h2><p className="mt-1 text-sm text-slate-400">Setujui atau tolak bukti deposit. Persetujuan menambah saldo secara atomik dan hanya dapat dilakukan sekali.</p></div>{deposits.filter(d=>d.status==='PENDING').map(d=><div key={d.id} className="glass rounded-2xl p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><b>{d.deposit_code}</b><p className="text-sm text-slate-400">{d.profiles?.name || d.profiles?.username || d.profiles?.email || '-'} · {d.payment_methods?.name || '-'} · Rp {Number(d.amount).toLocaleString('id-ID')}</p><p className="mt-1 text-xs text-slate-500">{new Date(d.created_at).toLocaleString('id-ID')}</p><button type="button" onClick={()=>viewDepositProof(d)} className="mt-2 inline-block text-sm text-cyan-300">Lihat bukti pembayaran ↗</button>{d.note && <p className="mt-2 text-sm text-slate-400">Catatan: {d.note}</p>}</div><div className="flex flex-wrap gap-2"><button onClick={()=>reviewDeposit(d,'APPROVE')} className="btn btn-primary text-xs">✓ Setujui Deposit</button><button onClick={()=>reviewDeposit(d,'REJECT')} className="btn btn-muted text-xs text-red-300">✕ Tolak Deposit</button></div></div></div>)}{!deposits.some(d=>d.status==='PENDING') && <div className="glass rounded-2xl p-8 text-center text-slate-400">Tidak ada deposit yang menunggu verifikasi.</div>}</section>}

    {tab === 'deposit-history' && <section className="mt-7 space-y-3"><div className="glass rounded-2xl p-5"><h2 className="text-xl font-black">Riwayat Deposit</h2><p className="mt-1 text-sm text-slate-400">Seluruh pengajuan deposit member, termasuk APPROVED dan REJECTED.</p></div>{deposits.map(d=><div key={d.id} className="glass rounded-2xl p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><b>{d.deposit_code}</b><p className="text-sm text-slate-400">{d.profiles?.name || d.profiles?.username || d.profiles?.email || '-'} · {d.payment_methods?.name || '-'} · Rp {Number(d.amount).toLocaleString('id-ID')}</p><p className="text-xs text-slate-500">{new Date(d.created_at).toLocaleString('id-ID')}{d.rejection_reason ? ` · Alasan: ${d.rejection_reason}` : ''}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${d.status==='APPROVED'?'bg-cyan-400/10 text-cyan-300':d.status==='REJECTED'?'bg-red-400/10 text-red-300':'bg-amber-400/10 text-amber-300'}`}>{d.status}</span></div></div>)}{!deposits.length&&<p className="text-slate-400">Belum ada riwayat deposit.</p>}</section>}

    {tab === 'wallet-history' && <section className="mt-7 space-y-3"><div className="glass rounded-2xl p-5"><h2 className="text-xl font-black">Riwayat Wallet</h2><p className="mt-1 text-sm text-slate-400">Semua perubahan saldo member yang tercatat di ledger.</p></div>{walletTx.map(tx=><div key={tx.id} className="glass rounded-2xl p-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><b>{tx.profiles?.name || tx.profiles?.username || tx.profiles?.email || tx.user_id}</b><p className="text-sm text-slate-400">{tx.type} · {tx.reason}</p><p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleString('id-ID')}</p></div><div className="text-right"><b className={Number(tx.amount)>=0?'text-cyan-300':'text-red-300'}>{Number(tx.amount)>=0?'+':'−'} Rp {Math.abs(Number(tx.amount)).toLocaleString('id-ID')}</b><p className="text-xs text-slate-500">Saldo: Rp {Number(tx.balance_after).toLocaleString('id-ID')}</p></div></div></div>)}{!walletTx.length&&<p className="text-slate-400">Belum ada transaksi wallet.</p>}</section>}

    {tab === 'categories' && <section className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]"><form onSubmit={addCategory} className="glass rounded-2xl p-6 space-y-3"><h2 className="text-xl font-black">Kategori Game</h2><p className="text-sm text-slate-400">Buat kategori baru dan gunakan saat menambahkan game.</p><input className="input" placeholder="Nama kategori, mis. Mobile Games" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} required/><input className="input" placeholder="Slug, mis. mobile-games" value={categoryForm.slug} onChange={e => setCategoryForm({ ...categoryForm, slug: e.target.value })} required/><textarea className="input min-h-24" placeholder="Deskripsi opsional" value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}/><button className="btn btn-primary">Tambah Kategori</button></form><div className="space-y-3">{categories.map(c => <div key={c.id} className="glass flex items-center justify-between gap-3 rounded-2xl p-4"><div><b>{c.name}</b><p className="text-xs text-slate-500">/{c.slug} · {games.filter(g => g.category_id === c.id).length} game</p></div><div className="flex gap-2"><button onClick={() => toggle('game_categories', c.id)} className="btn btn-muted text-xs">{c.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>{role === 'owner' && <button onClick={() => deleteCategory(c)} className="btn btn-muted text-xs text-red-300">Hapus</button>}</div></div>)}</div></section>}

    {tab === 'games' && <section className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]"><form onSubmit={e => { e.preventDefault(); add('games', { ...gameForm, is_active: true, popular: false, category_id: gameForm.category_id || null }, () => setGameForm({ name: '', slug: '', description: '', logo_url: '', banner_url: '', category_id: categories[0]?.id || '' })) }} className="glass rounded-2xl p-6 space-y-3"><h2 className="text-xl font-black">Tambah Game</h2><input className="input" placeholder="Nama game" value={gameForm.name} onChange={e => setGameForm({ ...gameForm, name: e.target.value })} required/><input className="input" placeholder="Slug, mis. mobile-legends" value={gameForm.slug} onChange={e => setGameForm({ ...gameForm, slug: e.target.value })} required/><select className="input" value={gameForm.category_id} onChange={e => setGameForm({ ...gameForm, category_id: e.target.value })}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><textarea className="input min-h-24" placeholder="Deskripsi" value={gameForm.description} onChange={e => setGameForm({ ...gameForm, description: e.target.value })}/><label className="block text-sm font-semibold">Logo game<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="input mt-2" onChange={e => uploadFromInput(e, 'games', url => setGameForm(v => ({ ...v, logo_url: url })))} /></label>{gameForm.logo_url && <img src={gameForm.logo_url} alt="Logo preview" className="h-20 w-20 rounded-xl object-cover"/>}<label className="block text-sm font-semibold">Banner game<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="input mt-2" onChange={e => uploadFromInput(e, 'games', url => setGameForm(v => ({ ...v, banner_url: url })))} /></label>{gameForm.banner_url && <img src={gameForm.banner_url} alt="Banner preview" className="h-28 w-full rounded-xl object-cover"/>}<p className="text-xs text-slate-500">Logo/banner otomatis masuk Media Manager. Maksimal 6 MB.</p><button className="btn btn-primary">Tambah Game</button></form><div className="space-y-3">{games.map(g => <div key={g.id} className="glass flex items-center justify-between gap-3 rounded-2xl p-4"><div className="flex min-w-0 items-center gap-3">{g.logo_url ? <img src={g.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover"/> : <div className="h-12 w-12 rounded-xl bg-slate-900"/>}<div><b>{g.name}</b><p className="text-xs text-slate-500">/{g.slug} · {g.game_categories?.name || 'Tanpa kategori'}</p></div></div><button onClick={() => toggle('games', g.id)} className="btn btn-muted text-xs">{g.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></div>)}</div></section>}

    {tab === 'products' && <section className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]"><form onSubmit={e => { e.preventDefault(); add('game_products', { ...prodForm, price: Number(prodForm.price), is_active: true }, () => setProdForm(x => ({ ...x, name: '', nominal: '', sku: '', price: '', image_url: '' }))) }} className="glass rounded-2xl p-6 space-y-3"><h2 className="text-xl font-black">Tambah Produk</h2><select className="input" value={prodForm.game_id} onChange={e => setProdForm({ ...prodForm, game_id: e.target.value })}>{games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>{[['name', 'Nama'], ['nominal', 'Nominal'], ['sku', 'SKU'], ['price', 'Harga']].map(([k, l]) => <input key={k} className="input" placeholder={l} value={(prodForm as any)[k]} onChange={e => setProdForm({ ...prodForm, [k]: e.target.value })} required/>)}<label className="block text-sm font-semibold">Foto produk<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="input mt-2" onChange={e => uploadFromInput(e, 'products', url => setProdForm(v => ({ ...v, image_url: url })))} /></label>{prodForm.image_url && <img src={prodForm.image_url} alt="Preview produk" className="h-24 w-24 rounded-xl object-cover"/>}<button className="btn btn-primary">Tambah Produk</button></form><div className="space-y-3">{products.map(p => <div key={p.id} className="glass flex items-center justify-between gap-3 rounded-2xl p-4"><div className="flex min-w-0 items-center gap-3">{p.image_url ? <img src={p.image_url} alt="" className="h-12 w-12 rounded-xl object-cover"/> : <div className="h-12 w-12 rounded-xl bg-slate-900"/>}<div><b>{p.name}</b><p className="text-xs text-slate-500">{p.games?.name} · {p.sku} · Rp {Number(p.price).toLocaleString('id-ID')}</p></div></div><button onClick={() => toggle('game_products', p.id)} className="btn btn-muted text-xs">{p.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></div>)}</div></section>}

    {tab === 'payments' && <section className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]"><form onSubmit={e => { e.preventDefault(); add('payment_methods', { ...methodForm, is_active: true }, () => setMethodForm({ name: '', kind: 'QRIS', account_name: '', account_number: '', instruction: '', qr_url: '' })) }} className="glass rounded-2xl p-6 space-y-3"><h2 className="text-xl font-black">Payment Method</h2>{[['name', 'Nama'], ['kind', 'Jenis'], ['account_name', 'Nama rekening/e-wallet'], ['account_number', 'Nomor rekening/e-wallet'], ['qr_url', 'URL QRIS (opsional)'], ['instruction', 'Instruksi']].map(([k, l]) => <input key={k} className="input" placeholder={l} value={(methodForm as any)[k]} onChange={e => setMethodForm({ ...methodForm, [k]: e.target.value })} required={k === 'name'}/>)}<button className="btn btn-primary">Tambah Metode</button></form><div className="space-y-3">{methods.map(m => <div key={m.id} className="glass rounded-2xl p-4"><div className="flex justify-between"><div><b>{m.name}</b><p className="text-xs text-slate-500">{m.kind} · {m.account_number || 'Nomor belum diisi'}</p></div><button onClick={() => toggle('payment_methods', m.id)} className="btn btn-muted text-xs">{m.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></div></div>)}</div></section>}

    {tab === 'vouchers' && <section className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]"><form onSubmit={e => { e.preventDefault(); add('vouchers', { ...voucherForm, discount_value: Number(voucherForm.discount_value), min_order: Number(voucherForm.min_order), max_discount: voucherForm.max_discount ? Number(voucherForm.max_discount) : null, is_active: true }, () => setVoucherForm({ code: '', discount_type: 'PERCENT', discount_value: '10', min_order: '0', max_discount: '' })) }} className="glass rounded-2xl p-6 space-y-3"><h2 className="text-xl font-black">Voucher</h2><input className="input" placeholder="Kode" value={voucherForm.code} onChange={e => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })} required/><select className="input" value={voucherForm.discount_type} onChange={e => setVoucherForm({ ...voucherForm, discount_type: e.target.value })}><option value="PERCENT">Persen</option><option value="FIXED">Nominal</option></select>{[['discount_value', 'Nilai diskon'], ['min_order', 'Minimal order'], ['max_discount', 'Maksimal diskon']].map(([k, l]) => <input key={k} className="input" placeholder={l} value={(voucherForm as any)[k]} onChange={e => setVoucherForm({ ...voucherForm, [k]: e.target.value })}/>)}<button className="btn btn-primary">Tambah Voucher</button></form><div className="space-y-3">{vouchers.map(v => <div key={v.id} className="glass flex items-center justify-between rounded-2xl p-4"><div><b>{v.code}</b><p className="text-xs text-slate-500">{v.discount_type} {v.discount_value}</p></div><button onClick={() => toggle('vouchers', v.id)} className="btn btn-muted text-xs">{v.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></div>)}</div></section>}

    {tab === 'promotions' && <section className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]"><form onSubmit={e => { e.preventDefault(); add('promotions', { ...promoForm, is_active: true }, () => setPromoForm({ name: '', description: '', banner_url: '', code: '' })) }} className="glass rounded-2xl p-6 space-y-3"><h2 className="text-xl font-black">Promo & Banner</h2><input className="input" placeholder="Nama promo" value={promoForm.name} onChange={e => setPromoForm({ ...promoForm, name: e.target.value })} required/><textarea className="input min-h-24" placeholder="Deskripsi" value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })}/><label className="block text-sm font-semibold">Upload banner<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="input mt-2" onChange={e => uploadFromInput(e, 'promotions', url => setPromoForm(v => ({ ...v, banner_url: url })))} /></label>{promoForm.banner_url && <img src={promoForm.banner_url} alt="Banner preview" className="h-32 w-full rounded-xl object-cover"/>}<input className="input" placeholder="Kode promo (opsional)" value={promoForm.code} onChange={e => setPromoForm({ ...promoForm, code: e.target.value })}/><button className="btn btn-primary">Tambah Promo</button></form><div className="space-y-3">{promos.map(p => <div key={p.id} className="glass overflow-hidden rounded-2xl">{p.banner_url && <img src={p.banner_url} alt="" className="h-32 w-full object-cover"/>}<div className="flex items-center justify-between gap-3 p-4"><div><b>{p.name}</b><p className="text-xs text-slate-500">{p.code || 'Tanpa kode'}</p></div><button onClick={() => toggle('promotions', p.id)} className="btn btn-muted text-xs">{p.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></div></div>)}</div></section>}

    {tab === 'banners' && ['owner', 'co_owner', 'admin'].includes(role) && <section className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]"><form onSubmit={addBanner} className="glass space-y-3 rounded-2xl p-6"><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">BANNER HOMEPAGE</p><h2 className="text-xl font-black">Publish Banner</h2><input className="input" placeholder="Judul banner" value={bannerForm.title} onChange={e=>setBannerForm({...bannerForm,title:e.target.value})} required/><input className="input" placeholder="URL gambar" value={bannerForm.image_url} onChange={e=>setBannerForm({...bannerForm,image_url:e.target.value})} required/><input className="input" placeholder="Link tujuan (opsional)" value={bannerForm.link_url} onChange={e=>setBannerForm({...bannerForm,link_url:e.target.value})}/><input className="input" type="number" placeholder="Urutan" value={bannerForm.sort_order} onChange={e=>setBannerForm({...bannerForm,sort_order:e.target.value})}/><button className="btn btn-primary">Publish Banner</button></form><div className="space-y-3">{banners.map(b=><div key={b.id} className="glass overflow-hidden rounded-2xl"><img src={b.image_url} alt={b.title} className="h-40 w-full object-cover"/><div className="flex items-center justify-between gap-3 p-4"><div><b>{b.title}</b><p className="text-xs text-slate-500">Urutan {b.sort_order} · {b.is_active?'Aktif':'Nonaktif'}</p></div><button onClick={()=>toggle('banners',b.id)} className="btn btn-muted text-xs">{b.is_active?'Nonaktifkan':'Aktifkan'}</button></div></div>)}{!banners.length&&<p className="text-slate-400">Belum ada banner.</p>}</div></section>}

    {tab === 'broadcasts' && ['owner', 'co_owner', 'admin'].includes(role) && <section className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]"><form onSubmit={addBroadcast} className="glass rounded-2xl p-6 space-y-3"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Live Broadcast</p><h2 className="text-xl font-black">Kirim pengumuman ke semua pembeli</h2><p className="mt-1 text-sm text-slate-500">Pesan tampil di bagian atas website selama durasi yang kamu tentukan.</p></div><input className="input" placeholder="Judul, mis. 🔥 Promo 20% Hari Ini" value={broadcastForm.title} onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })} required/><textarea className="input min-h-28" placeholder="Isi broadcast untuk pembeli..." value={broadcastForm.message} onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })} required/><select className="input" value={broadcastForm.type} onChange={e => setBroadcastForm({ ...broadcastForm, type: e.target.value })}><option value="PROMO">Promo</option><option value="INFO">Info</option><option value="SUCCESS">Info sukses</option><option value="WARNING">Peringatan</option></select><div className="grid gap-3 sm:grid-cols-[1fr_1fr]"><input type="number" min="1" className="input" placeholder="Durasi (menit)" value={broadcastForm.durationMinutes} onChange={e => setBroadcastForm({ ...broadcastForm, durationMinutes: e.target.value })} required/><select className="input" value={broadcastForm.durationMinutes} onChange={e => setBroadcastForm({ ...broadcastForm, durationMinutes: e.target.value })}><option value="15">15 menit</option><option value="30">30 menit</option><option value="60">1 jam</option><option value="360">6 jam</option><option value="1440">24 jam</option><option value="4320">3 hari</option><option value="10080">7 hari</option></select></div><input className="input" placeholder="Link tujuan (opsional), mis. /games" value={broadcastForm.link_url} onChange={e => setBroadcastForm({ ...broadcastForm, link_url: e.target.value })}/><input className="input" placeholder="Teks tombol link (opsional)" value={broadcastForm.link_label} onChange={e => setBroadcastForm({ ...broadcastForm, link_label: e.target.value })}/><button className="btn btn-primary">Tayangkan Broadcast</button></form><div className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Riwayat Broadcast</h2><span className="text-xs text-slate-500">Terbaru di atas</span></div>{broadcasts.map(b => <div key={b.id} className="glass rounded-2xl p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><b>{b.title}</b><span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">{b.type}</span></div><p className="mt-1 text-sm text-slate-400">{b.message}</p><p className="mt-2 text-xs text-slate-500">{new Date(b.starts_at).toLocaleString('id-ID')} → {new Date(b.ends_at).toLocaleString('id-ID')}</p></div><button onClick={() => toggle('broadcasts', b.id)} className="btn btn-muted text-xs">{b.is_active ? 'Matikan' : 'Aktifkan'}</button></div></div>)}{!broadcasts.length && <p className="text-slate-400">Belum ada broadcast.</p>}</div></section>}

    {tab === 'media' && <section className="mt-7 space-y-6"><div className="glass rounded-3xl p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-bold text-cyan-300">MEDIA MANAGER</p><h2 className="text-2xl font-black">Upload Foto & Banner</h2><p className="mt-1 max-w-2xl text-sm text-slate-400">Semua gambar website disimpan di Supabase Storage dan bisa dipakai ulang. JPG, PNG, WEBP, GIF · maksimal 6 MB.</p></div><label className="btn btn-primary cursor-pointer">{mediaUploading ? 'Mengunggah...' : '＋ Upload Media'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={mediaUploading} onChange={e => uploadFromInput(e, mediaCategory)}/></label></div><div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr]"><select className="input" value={mediaCategory} onChange={e => setMediaCategory(e.target.value)}><option value="all">Semua kategori</option>{mediaCategories.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><input className="input" placeholder="Cari nama file..." value={mediaSearch} onChange={e => setMediaSearch(e.target.value)}/></div></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{filteredMedia.map(a => <div key={a.id} className="glass overflow-hidden rounded-2xl"><img src={a.url} alt={a.alt_text || a.name} className="aspect-square w-full object-cover"/><div className="p-3"><p className="truncate text-sm font-bold">{a.name}</p><p className="mt-1 text-[11px] text-slate-500">{a.category} · {(Number(a.size_bytes || 0) / 1024 / 1024).toFixed(2)} MB</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => copyUrl(a.url)} className="btn btn-muted px-2 py-2 text-[11px]">Copy URL</button><button onClick={() => deleteMedia(a)} className="btn btn-muted px-2 py-2 text-[11px] text-red-300">Hapus</button></div></div></div>)}{!filteredMedia.length && <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">Belum ada media pada filter ini.</div>}</div></section>}

    {tab === 'users' && <section className="mt-7 space-y-3"><div className="glass rounded-2xl p-5"><h2 className="text-xl font-black">Customer & Wallet</h2><p className="mt-1 text-sm text-slate-400">Suspend/aktifkan, kelola role, dan Owner dapat menambah atau mengurangi saldo dengan alasan serta riwayat audit.</p></div>{users.map(u => { const balance = Number(wallets.find(w => w.user_id === u.id)?.balance || 0); return <div key={u.id} className="glass rounded-2xl p-4"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><b>{u.name || u.username || 'User'}</b><p className="text-xs text-slate-500">{u.email} · {u.role} · {u.is_suspended ? 'Suspended' : 'Aktif'}</p><p className="mt-1 text-lg font-black text-cyan-300">Saldo Rp {balance.toLocaleString('id-ID')}</p></div><div className="flex flex-wrap gap-2">{canAdjustWallet && <><button onClick={() => adjustWallet(u, 1)} className="btn btn-primary text-xs">+ Saldo</button><button onClick={() => adjustWallet(u, -1)} className="btn btn-muted text-xs">− Saldo</button></>}{role === 'owner' && <><button onClick={() => suspend(u)} className="btn btn-muted text-xs">{u.is_suspended ? 'Aktifkan' : 'Suspend'}</button><button onClick={() => changeRole(u)} className="btn btn-muted text-xs">Ubah Role</button>{u.id !== (users.find(x => x.role === 'owner')?.id || '') && <button onClick={() => deleteUser(u)} className="btn btn-muted text-xs text-red-300">Hapus Akun</button>}</>}</div></div></div>})}</section>}

    {tab === 'settings' && <form onSubmit={saveSettings} className="glass mt-7 max-w-2xl space-y-4 rounded-2xl p-6"><h2 className="text-xl font-black">Website Settings</h2><label className="field">Nama website<input value={site.name || ''} onChange={e => setSite({ ...site, name: e.target.value })}/></label><label className="field">Tagline<input value={site.tagline || ''} onChange={e => setSite({ ...site, tagline: e.target.value })}/></label><label className="field">WhatsApp<input value={site.whatsapp || ''} onChange={e => setSite({ ...site, whatsapp: e.target.value })} placeholder="62812..."/></label><label className="field">Instagram<input value={site.instagram || ''} onChange={e => setSite({ ...site, instagram: e.target.value })}/></label><label className="field">Maintenance mode<select value={site.maintenance ? 'true' : 'false'} onChange={e => setSite({ ...site, maintenance: e.target.value === 'true' })}><option value="false">Off</option><option value="true">On</option></select></label><button className="btn btn-primary">Simpan Settings</button></form>}

    {tab === 'chat' && <section className="mt-7 grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><div className="space-y-2">{rooms.map(room => <button key={room.id} onClick={() => openRoom(room)} className={`glass w-full rounded-2xl p-4 text-left ${activeRoom?.id === room.id ? 'border-cyan-400/30' : ''}`}><b>{room.profiles?.username || room.user_id.slice(0, 8)}</b><p className="text-xs text-slate-500">{room.status}</p></button>)}</div><div className="glass flex min-h-[28rem] flex-col rounded-2xl p-4"><div className="flex-1 space-y-2 overflow-auto">{chatMessages.map(m => <div key={m.id} className="rounded-2xl bg-white/5 p-3 text-sm">{m.message}<div className="mt-1 text-[10px] text-slate-500">{new Date(m.created_at).toLocaleString('id-ID')}</div></div>)}</div><div className="mt-3 flex gap-2"><input className="input" value={chatText} onChange={e => setChatText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Balas user..."/><button onClick={sendChat} className="btn btn-primary">Kirim</button></div></div></section>}
  </main>
}
