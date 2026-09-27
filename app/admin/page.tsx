'use client'

import {
  ChangeEvent,
  FormEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

const transitions: Record<string, string[]> = {
  PENDING_PAYMENT: ['PAYMENT_RECEIVED', 'CANCELLED', 'EXPIRED'],
  PAYMENT_RECEIVED: ['PROCESSING', 'FAILED', 'CANCELLED'],
  PROCESSING: ['SUCCESS', 'FAILED'],
}

const tabs = [
  'orders',
  'deposits',
  'deposit-history',
  'wallet-history',
  'categories',
  'games',
  'products',
  'payments',
  'vouchers',
  'promotions',
  'broadcasts',
  'media',
  'users',
  'settings',
  'chat',
]

const mediaCategories = [
  ['games', '🎮 Logo Game'],
  ['products', '💎 Gambar Produk'],
  ['promotions', '📢 Banner Promo'],
  ['homepage', '🏠 Banner Homepage'],
  ['general', '📁 Media Lainnya'],
]

export default function Admin() {
  const [tab, setTab] = useState('orders')

  function changeTab(nextTab: string) {
    setTab(nextTab)
  }

  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const isDraggingMenu = useRef(false)
  const dragStartX = useRef(0)
  const dragStartScrollLeft = useRef(0)
  const dragMoved = useRef(false)

  const [role, setRole] = useState('')
  const [msg, setMsg] = useState('')

  const [editType, setEditType] = useState<'category' | 'game' | 'product' | null>(null)
  const [editId, setEditId] = useState('')
  const [editForm, setEditForm] = useState<any>({})

  const [orders, setOrders] = useState<any[]>([])
  const [games, setGames] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [methods, setMethods] = useState<any[]>([])
  const [vouchers, setVouchers] = useState<any[]>([])
  const [voucherUsages, setVoucherUsages] = useState<any[]>([])
  const [promos, setPromos] = useState<any[]>([])
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
  const [mediaGameId, setMediaGameId] = useState('')
  const [mediaProductGameId, setMediaProductGameId] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [mediaPromoTitle, setMediaPromoTitle] = useState('')
  const [mediaPromoDescription, setMediaPromoDescription] = useState('')
  const [mediaPromoCode, setMediaPromoCode] = useState('')
  const [mediaPromoType, setMediaPromoType] = useState<'text' | 'image' | 'both'>('both')
  const [pendingPromoImageUrl, setPendingPromoImageUrl] = useState('')
  const [homepageSlot, setHomepageSlot] = useState('hero')

  const homepageSlots = [
    ['hero', 'Hero utama'],
    ['promo', 'Banner promo'],
    ['event', 'Banner event'],
    ['secondary', 'Banner lainnya'],
  ]

  const [site, setSite] = useState<any>({
    name: 'NDRAAAID',
    tagline: 'Top Up Game Cepat, Aman & Terpercaya',
    manual_mode: true,
  })

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
  })

  const [gameForm, setGameForm] = useState({
    name: '',
    slug: '',
    description: '',
    logo_url: '',
    banner_url: '',
    category_id: '',
  })

  const [prodForm, setProdForm] = useState({
    game_id: '',
    name: '',
    nominal: '',
    sku: '',
    price: '',
    image_url: '',
  })

  const [methodForm, setMethodForm] = useState({
    name: '',
    kind: 'QRIS',
    account_name: '',
    account_number: '',
    instruction: '',
    qr_url: '',
  })

  const [voucherForm, setVoucherForm] = useState({
    code: '',
    discount_type: 'PERCENT',
    discount_value: '10',
    min_order: '0',
    max_discount: '',
    usage_limit: '10',
  })

  const [promoForm, setPromoForm] = useState({
    name: '',
    description: '',
    banner_url: '',
    code: '',
  })

  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    type: 'PROMO',
    durationMinutes: '60',
    link_url: '',
    link_label: '',
  })

  const router = useRouter()
  const s = supabaseBrowser()

  async function load() {
    const {
      data: { user },
    } = await s.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data: p } = await s
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!p || !['owner', 'admin', 'customer_service'].includes(p.role)) {
      router.push('/')
      return
    }

    setRole(p.role)

    const [
      { data: o },
      { data: g },
      { data: cat },
      { data: pr },
      { data: m },
      { data: v },
      { data: vu },
      { data: pm },
      { data: b },
      { data: ma },
      { data: u },
      { data: w },
      { data: dep },
      { data: wtx },
      { data: cr },
      { data: st },
    ] = await Promise.all([
      s
        .from('orders')
        .select(
          'id,order_code,status,total,subtotal,discount,voucher_code,created_at,games(name),profiles(username,name)'
        )
        .order('created_at', { ascending: false })
        .limit(200),

      s
        .from('games')
        .select('*,game_categories(name)')
        .order('created_at', { ascending: false }),

      s
        .from('game_categories')
        .select('*')
        .order('sort_order')
        .order('name'),

      s
        .from('game_products')
        .select('*,games(name)')
        .order('created_at', { ascending: false }),

      s
        .from('payment_methods')
        .select('*')
        .order('created_at', { ascending: false }),

s
  .from('vouchers')
  .select('*'),

      s
        .from('voucher_usages')
        .select(
          'id,voucher_id,order_id,user_id,voucher_code,discount_amount,used_at,orders(order_code,subtotal,total,status),profiles(username,name,email)'
        )
        .order('used_at', { ascending: false })
        .limit(1000),

      s
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false }),

      s
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),

      s
        .from('media_assets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300),

      s
        .from('profiles')
        .select(
          'id,username,email,name,role,is_suspended,created_at'
        )
        .order('created_at', { ascending: false })
        .limit(200),

      s
        .from('wallets')
        .select('user_id,balance,updated_at'),

      s
        .from('member_deposits')
        .select(`
          *,
          profiles:profiles!member_deposits_user_id_fkey(username,email,name),
          payment_methods:payment_methods!member_deposits_payment_method_id_fkey(name,kind)
        `)
        .order('created_at', { ascending: false })
        .limit(500),

      s
        .from('wallet_transactions')
        .select('*,profiles(username,email)')
        .order('created_at', { ascending: false })
        .limit(500),

      s
        .from('chat_rooms')
        .select('*,profiles(username,email)')
        .order('created_at', { ascending: false }),

      s
        .from('settings')
        .select('*')
        .eq('key', 'site')
        .maybeSingle(),
    ])

    setOrders(o || [])
    setDeposits(dep || [])
    setWalletTx(wtx || [])
    setGames(g || [])
    setCategories(cat || [])
    setProducts(pr || [])
    setMethods(m || [])
    setVouchers(v || [])
    setVoucherUsages(vu || [])
    setPromos(pm || [])
    setBroadcasts(b || [])
    setMediaAssets(ma || [])
    setUsers(u || [])
    setWallets(w || [])
    setRooms(cr || [])

    if (st?.value) {
      setSite(st.value)
    }

    if (g?.[0] && !prodForm.game_id) {
      setProdForm((x) => ({
        ...x,
        game_id: g[0].id,
      }))
    }

    if (cat?.[0] && !gameForm.category_id) {
      setGameForm((x) => ({
        ...x,
        category_id: cat[0].id,
      }))
    }
  }

  function startMenuDrag(e: PointerEvent<HTMLDivElement>) {
    const el = mobileMenuRef.current
    if (!el) return

    isDraggingMenu.current = true
    dragMoved.current = false
    dragStartX.current = e.clientX
    dragStartScrollLeft.current = el.scrollLeft

    el.setPointerCapture(e.pointerId)
  }

  function moveMenuDrag(e: PointerEvent<HTMLDivElement>) {
    const el = mobileMenuRef.current
    if (!el || !isDraggingMenu.current) return

    const dx = e.clientX - dragStartX.current

    if (Math.abs(dx) > 4) {
      dragMoved.current = true
    }

    el.scrollLeft =
      dragStartScrollLeft.current - dx
  }

  function endMenuDrag(e: PointerEvent<HTMLDivElement>) {
    const el = mobileMenuRef.current

    if (
      el &&
      el.hasPointerCapture(e.pointerId)
    ) {
      el.releasePointerCapture(e.pointerId)
    }

    isDraggingMenu.current = false

    if (dragMoved.current) {
      setTimeout(() => {
        dragMoved.current = false
      }, 0)
    }
 }
  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const promo = promos[0]
    if (!promo) return

    setMediaPromoTitle(promo.name || '')
    setMediaPromoDescription(promo.description || '')
    setMediaPromoCode(promo.code || '')
    setMediaPromoType(
      promo.content_type ||
        (promo.banner_url
          ? promo.description || promo.code
            ? 'both'
            : 'image'
          : 'text')
    )
    setPendingPromoImageUrl(promo.banner_url || '')
  }, [promos])

  async function transition(o: any, n: string) {
    if (!confirm(`Ubah ${o.order_code} menjadi ${n}?`)) return

    const { error } = await s.rpc('admin_transition_order', {
      p_order_id: o.id,
      p_new_status: n,
      p_note: `Diproses manual oleh ${role}`,
    })

    setMsg(error?.message || `${o.order_code} → ${n}`)
    load()
  }

  async function viewDepositProof(d: any) {
    if (!d.proof_path) {
      setMsg('Deposit ini belum memiliki bukti.')
      return
    }

    const { data, error } = await s.storage
      .from('payment-proofs')
      .createSignedUrl(d.proof_path, 300)

    if (error || !data?.signedUrl) {
      setMsg(error?.message || 'Bukti tidak dapat dibuka.')
      return
    }

    window.open(
      data.signedUrl,
      '_blank',
      'noopener,noreferrer'
    )
  }

  async function reviewDeposit(
    d: any,
    action: 'APPROVE' | 'REJECT'
  ) {
    if (!['owner', 'admin'].includes(role)) {
      setMsg(
        'Hanya Owner/Admin yang dapat memproses deposit.'
      )
      return
    }

    let reason: string | null = null

    if (action === 'REJECT') {
      reason =
        prompt(
          'Alasan penolakan deposit (wajib):'
        )?.trim() || null

      if (!reason) {
        setMsg('Alasan penolakan wajib diisi.')
        return
      }
    }

    if (
      !confirm(
        `${action === 'APPROVE' ? 'Setujui' : 'Tolak'} deposit ${
          d.deposit_code
        } sebesar Rp ${Number(d.amount).toLocaleString(
          'id-ID'
        )}?`
      )
    ) {
      return
    }

    const { error } = await s.rpc(
      'review_member_deposit',
      {
        p_deposit_id: d.id,
        p_action: action,
        p_rejection_reason: reason,
      }
    )

    setMsg(
      error?.message ||
        `Deposit ${d.deposit_code} berhasil ${
          action === 'APPROVE'
            ? 'disetujui'
            : 'ditolak'
        }.`
    )

    load()
  }

  async function add(
    table: string,
    payload: any,
    reset: () => void
  ) {
    const { error } = await s
      .from(table)
      .insert(payload)

    setMsg(
      error?.message ||
        'Data berhasil ditambahkan.'
    )

    if (!error) reset()

    load()
  }

  async function toggle(table: string, id: string) {
    const rows =
      table === 'games'
        ? games
        : table === 'game_products'
          ? products
          : table === 'payment_methods'
            ? methods
            : table === 'vouchers'
              ? vouchers
              : table === 'broadcasts'
                ? broadcasts
                : table === 'game_categories'
                  ? categories
                  : promos

    const row = rows.find(
      (x: any) => x.id === id
    )

    if (!row) return

    const { error } = await s
      .from(table)
      .update({
        is_active: !row.is_active,
      })
      .eq('id', id)

    setMsg(
      error?.message ||
        'Status diperbarui.'
    )

    load()
  }

  function openEdit(type: 'category' | 'game' | 'product', row: any) {
    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat mengedit katalog.')
      return
    }

    setEditType(type)
    setEditId(row.id)

    if (type === 'category') {
      setEditForm({
        name: row.name || '',
        slug: row.slug || '',
        description: row.description || '',
      })
      return
    }

    if (type === 'game') {
      setEditForm({
        name: row.name || '',
        slug: row.slug || '',
        description: row.description || '',
        category_id: row.category_id || '',
        logo_url: row.logo_url || '',
        banner_url: row.banner_url || '',
      })
      return
    }

    setEditForm({
      game_id: row.game_id || '',
      name: row.name || '',
      nominal: row.nominal ?? '',
      sku: row.sku || '',
      price: row.price ?? '',
      image_url: row.image_url || '',
    })
  }

  function closeEdit() {
    setEditType(null)
    setEditId('')
    setEditForm({})
  }

  async function saveEdit() {
    if (!editType || !editId) return

    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat mengedit katalog.')
      closeEdit()
      return
    }

    let table = ''
    let payload: any = {}

    if (editType === 'category') {
      table = 'game_categories'
      payload = {
        name: String(editForm.name || '').trim(),
        slug: String(editForm.slug || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-'),
        description: String(editForm.description || '').trim() || null,
      }

      if (!payload.name || !payload.slug) {
        setMsg('Nama dan slug kategori wajib diisi.')
        return
      }
    }

    if (editType === 'game') {
      table = 'games'
      payload = {
        name: String(editForm.name || '').trim(),
        slug: String(editForm.slug || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-'),
        description: String(editForm.description || '').trim() || null,
        category_id: editForm.category_id || null,
        logo_url: String(editForm.logo_url || '').trim() || null,
        banner_url: String(editForm.banner_url || '').trim() || null,
      }

      if (!payload.name || !payload.slug) {
        setMsg('Nama dan slug game wajib diisi.')
        return
      }
    }

    if (editType === 'product') {
      table = 'game_products'

      const price = Number(editForm.price)
      if (!Number.isFinite(price) || price < 0) {
        setMsg('Harga produk tidak valid.')
        return
      }

      payload = {
        game_id: editForm.game_id,
        name: String(editForm.name || '').trim(),
        nominal: String(editForm.nominal || '').trim(),
        sku: String(editForm.sku || '').trim(),
        price,
        image_url: String(editForm.image_url || '').trim() || null,
      }

      if (
        !payload.game_id ||
        !payload.name ||
        !payload.nominal ||
        !payload.sku
      ) {
        setMsg('Game, nama, nominal, dan SKU wajib diisi.')
        return
      }
    }

    const { error } = await s
      .from(table)
      .update(payload)
      .eq('id', editId)

    setMsg(
      error?.message ||
        `${
          editType === 'category'
            ? 'Kategori'
            : editType === 'game'
              ? 'Game'
              : 'Produk'
        } berhasil diperbarui.`
    )

    if (!error) closeEdit()
    load()
  }

  async function updateVoucherLimit(v: any) {
    if (!['owner', 'admin'].includes(role)) {
      setMsg(
        'Hanya Owner/Admin yang dapat mengubah limit voucher.'
      )
      return
    }

    const currentLimit =
      v.usage_limit === null ||
      v.usage_limit === undefined
        ? ''
        : String(v.usage_limit)

    const value = prompt(
      `Limit penggunaan voucher ${v.code}.\n\nKosongkan jika tanpa batas.`,
      currentLimit
    )

    if (value === null) return

    const trimmed = value.trim()

    let limit: number | null = null

    if (trimmed !== '') {
      const parsed = Number(trimmed)

      if (
        !Number.isInteger(parsed) ||
        parsed < 0
      ) {
        setMsg(
          'Limit harus berupa angka bulat 0 atau lebih.'
        )
        return
      }

      limit = parsed
    }

    const used = Number(
      v.usage_count || 0
    )

    if (
      limit !== null &&
      limit < used
    ) {
      setMsg(
        `Limit tidak boleh lebih kecil dari jumlah yang sudah digunakan (${used}).`
      )
      return
    }

    const { error } = await s
      .from('vouchers')
      .update({
        usage_limit: limit,
        initial_limit:
          limit === null
            ? null
            : Math.max(
                Number(
                  v.initial_limit ||
                    0
                ),
                limit
              ),
      })
      .eq('id', v.id)

    setMsg(
      error?.message ||
        `Limit voucher ${v.code} berhasil diperbarui.`
    )

    load()
  }
async function deleteVoucher(v: any) {
  if (!['owner', 'admin'].includes(role)) {
    setMsg('Hanya Owner/Admin yang dapat menghapus voucher.')
    return
  }

  const ok = confirm(
    `Hapus voucher ${v.code}?\n\nRiwayat penggunaan voucher ini TETAP akan disimpan.`
  )

  if (!ok) return

  const { error } = await s
    .from('vouchers')
    .delete()
    .eq('id', v.id)

  setMsg(
    error?.message ||
      `Voucher ${v.code} berhasil dihapus. Riwayat penggunaan tetap tersimpan.`
  )

  load()
}
  async function updateVoucherInitialLimit(v: any) {
    if (role !== 'owner') {
      setMsg(
        'Hanya Owner yang dapat mengubah stok awal voucher.'
      )
      return
    }

    const value = prompt(
      `Stok awal voucher ${v.code}:`,
      String(
        v.initial_limit ??
          v.usage_limit ??
          ''
      )
    )

    if (value === null) return

    const parsed = Number(
      value.trim()
    )

    if (
      !Number.isInteger(parsed) ||
      parsed < 0
    ) {
      setMsg(
        'Stok awal harus berupa angka bulat 0 atau lebih.'
      )
      return
    }

    const used = Number(
      v.usage_count || 0
    )

    if (parsed < used) {
      setMsg(
        `Stok awal tidak boleh lebih kecil dari yang sudah digunakan (${used}).`
      )
      return
    }

    const { error } = await s
      .from('vouchers')
      .update({
        initial_limit: parsed,
        usage_limit: parsed,
      })
      .eq('id', v.id)

    setMsg(
      error?.message ||
        `Stok voucher ${v.code} berhasil diperbarui.`
    )

    load()
  }

  async function suspend(u: any) {
    if (role !== 'owner') {
      setMsg(
        'Hanya Owner yang dapat menonaktifkan/mengaktifkan akun.'
      )
      return
    }

    if (
      !confirm(
        `${u.is_suspended ? 'Aktifkan kembali' : 'Nonaktifkan'} akun ${
          u.email ||
          u.username ||
          'user'
        }?`
      )
    ) {
      return
    }

    const { error } = await s.rpc(
      'owner_set_suspended',
      {
        p_user_id: u.id,
        p_suspended: !u.is_suspended,
      }
    )

    setMsg(
      error?.message ||
        'Status user diperbarui.'
    )

    load()
  }

  async function adjustWallet(
    u: any,
    sign: 1 | -1
  ) {
    if (role !== 'owner') {
      setMsg(
        'Hanya Owner yang dapat mengubah saldo.'
      )
      return
    }

    const amountText = prompt(
      `${
        sign > 0
          ? 'Tambah'
          : 'Kurangi'
      } saldo untuk ${
        u.email ||
        u.username ||
        'user'
      } (angka rupiah):`,
      '10000'
    )

    if (!amountText) return

    const amount = Number(
      amountText.replace(
        /[^0-9.-]/g,
        ''
      )
    )

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setMsg(
        'Nominal saldo tidak valid.'
      )
      return
    }

    const reason = prompt(
      'Alasan perubahan saldo (wajib):',
      sign > 0
        ? 'Kredit saldo manual'
        : 'Debit saldo manual'
    )

    if (!reason?.trim()) {
      setMsg(
        'Alasan wajib diisi.'
      )
      return
    }

    if (
      !confirm(
        `${
          sign > 0
            ? 'Tambah'
            : 'Kurangi'
        } Rp ${amount.toLocaleString(
          'id-ID'
        )}?`
      )
    ) {
      return
    }

    const { error } = await s.rpc(
      'owner_adjust_wallet',
      {
        p_user_id: u.id,
        p_amount: sign * amount,
        p_reason: reason.trim(),
      }
    )

    setMsg(
      error?.message ||
        'Saldo berhasil diperbarui.'
    )

    load()
  }

  async function deleteUser(u: any) {
    if (role !== 'owner') {
      setMsg(
        'Hanya Owner yang dapat menghapus akun.'
      )
      return
    }

    if (
      !confirm(
        `Hapus permanen akun ${
          u.email ||
          u.username ||
          'user'
        }? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return
    }

    const {
      data,
      error,
    } = await s.functions.invoke(
      'admin-delete-user',
      {
        body: {
          user_id: u.id,
        },
      }
    )

    setMsg(
      error?.message ||
        data?.message ||
        'Permintaan penghapusan akun selesai.'
    )

    load()
  }

  async function changeRole(u: any) {
    if (role !== 'owner') return

    const next = prompt(
      'Role baru: user/admin/customer_service/owner',
      u.role
    )

    if (
      !next ||
      ![
        'user',
        'admin',
        'customer_service',
        'owner',
      ].includes(next)
    ) {
      return
    }

    const { error } = await s
      .from('profiles')
      .update({
        role: next,
      })
      .eq('id', u.id)

    setMsg(
      error?.message ||
        'Role diperbarui.'
    )

    load()
  }

  async function uploadAsset(
    file: File,
    category: string,
    callback?: (url: string) => void | Promise<void>,
    expectedRatio?: '1:1' | '16:9'
  ) {
    if (
      !['owner', 'admin'].includes(
        role
      )
    ) {
      setMsg(
        'Hanya Owner/Admin yang boleh mengunggah media.'
      )
      return
    }

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ]

    if (!allowed.includes(file.type)) {
      setMsg(
        'Format harus JPG, PNG, WEBP, atau GIF.'
      )
      return
    }

    if (
      file.size >
      6 * 1024 * 1024
    ) {
      setMsg(
        'Ukuran maksimal 6 MB per file.'
      )
      return
    }

    /*
     * Validasi rasio:
     * - Logo Game / Produk: 1:1
     * - Banner Promo / Homepage: 16:9
     * - Media Lainnya: bebas
     *
     * expectedRatio dipakai untuk kasus khusus
     * seperti Banner Game yang diunggah dari form Game.
     */
    const ratioByCategory: Record<
      string,
      '1:1' | '16:9' | undefined
    > = {
      games: '1:1',
      products: '1:1',
      promotions: '16:9',
      homepage: '16:9',
      general: undefined,
    }

    const ratio =
      expectedRatio ||
      ratioByCategory[category]

    if (ratio) {
      const objectUrl =
        URL.createObjectURL(file)

      try {
        const dimensions =
          await new Promise<{
            width: number
            height: number
          }>((resolve, reject) => {
            const img =
              new Image()

            img.onload = () => {
              resolve({
                width:
                  img.naturalWidth,
                height:
                  img.naturalHeight,
              })
            }

            img.onerror = () => {
              reject(
                new Error(
                  'Gambar tidak dapat dibaca.'
                )
              )
            }

            img.src =
              objectUrl
          })

        const targetRatio =
          ratio === '1:1'
            ? 1
            : 16 / 9

        const actualRatio =
          dimensions.width /
          dimensions.height

        /*
         * Toleransi 3% agar ukuran seperti
         * 1599x900 tidak ditolak karena
         * pembulatan kecil.
         */
        const difference =
          Math.abs(
            actualRatio -
              targetRatio
          ) /
          targetRatio

        if (
          difference >
          0.03
        ) {
          setMsg(
            `Rasio gambar harus ${ratio}. Ukuran file Anda ${dimensions.width} × ${dimensions.height}px.`
          )

          URL.revokeObjectURL(
            objectUrl
          )

          return
        }
      } catch {
        setMsg(
          'Gambar tidak dapat dibaca. Silakan gunakan file gambar yang valid.'
        )

        URL.revokeObjectURL(
          objectUrl
        )

        return
      }

      URL.revokeObjectURL(
        objectUrl
      )
    }

    setMediaUploading(true)

    const ext =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() ||
      'webp'

    const safe =
      file.name
        .replace(
          /[^a-zA-Z0-9._-]/g,
          '-'
        )
        .replace(
          /\.[^.]+$/,
          ''
        )
        .slice(0, 70) ||
      'asset'

    const path = `${category}/${Date.now()}-${crypto.randomUUID().slice(
      0,
      8
    )}-${safe}.${ext}`

    const {
      error: uploadError,
    } = await s.storage
      .from('website-assets')
      .upload(
        path,
        file,
        {
          contentType:
            file.type,
          cacheControl:
            '31536000',
          upsert: false,
        }
      )

    if (uploadError) {
      setMsg(
        uploadError.message
      )
      setMediaUploading(false)
      return
    }

    const {
      data: urlData,
    } = s.storage
      .from('website-assets')
      .getPublicUrl(path)

    const {
      data: { user },
    } = await s.auth.getUser()

    const {
      error: dbError,
    } = await s
      .from('media_assets')
      .insert({
        name: file.name,
        path,
        url: urlData.publicUrl,
        category,
        mime_type: file.type,
        size_bytes:
          file.size,
        created_by:
          user?.id,
      })

    setMediaUploading(false)

    if (dbError) {
      await s.storage
        .from('website-assets')
        .remove([path])

      setMsg(
        dbError.message
      )
      return
    }

    if (callback) {
      await callback(
        urlData.publicUrl
      )
    }

    setMsg(
      `Media berhasil diunggah ke kategori ${category}.`
    )

    load()
  }

  async function uploadFromInput(
    e: ChangeEvent<HTMLInputElement>,
    category: string,
    callback?: (url: string) => void,
    expectedRatio?: '1:1' | '16:9'
  ) {
    const file =
      e.target.files?.[0]

    if (!file) return

    await uploadAsset(
      file,
      category,
      callback,
      expectedRatio
    )

    e.target.value = ''
  }

  async function setGameLogoFromMedia(url: string) {
    if (!mediaGameId) {
      setMsg('Pilih game terlebih dahulu.')
      return
    }

    const game = games.find((x) => x.id === mediaGameId)
    if (!game) {
      setMsg('Game tidak ditemukan.')
      return
    }

    const { error } = await s
      .from('games')
      .update({ logo_url: url })
      .eq('id', mediaGameId)

    setMsg(
      error?.message ||
        `Logo ${game.name} berhasil disinkronkan dari Media Manager.`
    )

    if (!error) {
      setMediaGameId('')
      load()
    }
  }

  async function applyProductMedia(url: string) {
    if (!mediaProductGameId) {
      setMsg('Pilih game produk terlebih dahulu.')
      return
    }

    const targetProducts = products.filter(
      (p) =>
        p.game_id === mediaProductGameId &&
        selectedProductIds.includes(p.id)
    )

    if (!targetProducts.length) {
      setMsg('Pilih minimal satu nominal produk.')
      return
    }

    const results = await Promise.all(
      targetProducts.map((product) =>
        s
          .from('game_products')
          .update({ image_url: url })
          .eq('id', product.id)
      )
    )

    const error = results.find((x) => x.error)?.error

    setMsg(
      error?.message ||
        `Satu gambar berhasil diterapkan ke ${targetProducts.length} nominal produk.`
    )

    if (!error) {
      setSelectedProductIds([])
      load()
    }
  }

  async function savePromoContent() {
    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat membuat atau mengubah Banner Promo.')
      return
    }

    try {
      const existing = promos[0] || null
      const imageUrl = pendingPromoImageUrl || existing?.banner_url || ''
      const wantsText = mediaPromoType === 'text' || mediaPromoType === 'both'
      const wantsImage = mediaPromoType === 'image' || mediaPromoType === 'both'

      if (wantsText && !mediaPromoTitle.trim()) {
        setMsg('Isi judul promo untuk konten teks.')
        return
      }

      if (wantsImage && !imageUrl) {
        setMsg('Pilih file gambar Banner Promo terlebih dahulu.')
        return
      }

      const payload: any = {
        is_active: existing ? Boolean(existing.is_active) : true,
        content_type: mediaPromoType,
        name: wantsText
          ? mediaPromoTitle.trim()
          : (existing?.name || 'Banner Promo'),
        description: wantsText
          ? (mediaPromoDescription.trim() || null)
          : null,
        code: wantsText
          ? (mediaPromoCode.trim() || null)
          : null,
        banner_url: wantsImage ? imageUrl : null,
      }

      let savedId = existing?.id || ''

      if (existing) {
        const { error } = await s
          .from('promotions')
          .update(payload)
          .eq('id', existing.id)

        if (error) {
          setMsg(`Gagal menyimpan Banner Promo: ${error.message}`)
          return
        }
      } else {
        const { data, error } = await s
          .from('promotions')
          .insert(payload)
          .select('id')
          .single()

        if (error) {
          setMsg(`Gagal membuat Banner Promo: ${error.message}`)
          return
        }

        savedId = data?.id || ''
      }

      // Hanya satu Banner Promo yang boleh aktif.
      if (payload.is_active && savedId) {
        const { error: deactivateError } = await s
          .from('promotions')
          .update({ is_active: false })
          .eq('is_active', true)
          .neq('id', savedId)

        if (deactivateError) {
          setMsg(`Banner tersimpan, tetapi promo lama gagal dinonaktifkan: ${deactivateError.message}`)
          await load()
          return
        }
      }

      setPendingPromoImageUrl(payload.banner_url || '')
      setMsg(
        existing
          ? 'Banner Promo berhasil diperbarui dan tersimpan.'
          : 'Banner Promo berhasil dibuat dan langsung aktif di Home.'
      )
      await load()
    } catch (error: any) {
      setMsg(`Gagal menyimpan Banner Promo: ${error?.message || 'Terjadi kesalahan yang tidak diketahui.'}`)
    }
  }

  async function preparePromoImage(url: string) {
    setPendingPromoImageUrl(url)
    setMsg('Gambar Banner Promo berhasil diunggah. Klik Simpan Perubahan Banner Promo untuk menerapkannya.')
  }

  async function toggleMainPromo() {
    const promo = promos[0]
    if (!promo) {
      setMsg('Belum ada Banner Promo untuk diaktifkan/nonaktifkan.')
      return
    }

    if (!promo.is_active) {
      const { error: deactivateError } = await s
        .from('promotions')
        .update({ is_active: false })
        .eq('is_active', true)
        .neq('id', promo.id)

      if (deactivateError) {
        setMsg(deactivateError.message)
        return
      }
    }

    const { error } = await s
      .from('promotions')
      .update({ is_active: !promo.is_active })
      .eq('id', promo.id)

    setMsg(
      error?.message ||
        (promo.is_active
          ? 'Banner Promo dinonaktifkan.'
          : 'Banner Promo diaktifkan.')
    )
    if (!error) load()
  }

  async function setHomepageBannerFromMedia(url: string) {
    const nextHomepage = {
      ...(site.homepage_banners || {}),
      [homepageSlot]: url,
    }

    const nextSite = {
      ...site,
      homepage_banners: nextHomepage,
    }

    const { error } = await s
      .from('settings')
      .upsert({
        key: 'site',
        value: nextSite,
        updated_at: new Date().toISOString(),
      })

    setMsg(
      error?.message ||
        `Banner Homepage untuk ${
          homepageSlots.find((x) => x[0] === homepageSlot)?.[1] ||
          homepageSlot
        } berhasil disimpan.`
    )

    if (!error) {
      setSite(nextSite)
      load()
    }
  }

  async function uploadAndSync(
    e: ChangeEvent<HTMLInputElement>,
    category: string,
    sync: (url: string) => Promise<void>,
    expectedRatio?: '1:1' | '16:9'
  ) {
    const file = e.target.files?.[0]
    if (!file) return

    await uploadAsset(
      file,
      category,
      async (url) => {
        await sync(url)
      },
      expectedRatio
    )

    e.target.value = ''
  }

  async function deleteMedia(
    asset: any
  ) {
    if (
      !confirm(
        `Hapus media "${asset.name}"?`
      )
    ) {
      return
    }

    const {
      error: storageError,
    } = await s.storage
      .from('website-assets')
      .remove([
        asset.path,
      ])

    if (storageError) {
      setMsg(
        storageError.message
      )
      return
    }

    const { error } = await s
      .from('media_assets')
      .delete()
      .eq('id', asset.id)

    setMsg(
      error?.message ||
        'Media dihapus.'
    )

    load()
  }

  async function copyUrl(
    url: string
  ) {
    await navigator.clipboard?.writeText(
      url
    )

    setMsg(
      'URL media disalin.'
    )
  }

  async function deleteBroadcast(b: any) {
    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat menghapus broadcast.')
      return
    }

    if (!confirm(`Hapus broadcast "${b.title || 'tanpa judul'}"?`)) {
      return
    }

    const { error } = await s
      .from('broadcasts')
      .delete()
      .eq('id', b.id)

    setMsg(error?.message || 'Broadcast berhasil dihapus.')
    if (!error) load()
  }

  async function addBroadcast(
    e: FormEvent
  ) {
    e.preventDefault()

    if (
      !['owner', 'admin'].includes(
        role
      )
    ) {
      return
    }

    const minutes = Math.max(
      1,
      Number(
        broadcastForm.durationMinutes
      ) || 60
    )

    const starts =
      new Date()

    const ends = new Date(
      starts.getTime() +
        minutes * 60000
    )

    const {
      data: { user },
    } = await s.auth.getUser()

    const payload = {
      title:
        broadcastForm.title.trim(),
      message:
        broadcastForm.message.trim(),
      type:
        broadcastForm.type,
      starts_at:
        starts.toISOString(),
      ends_at:
        ends.toISOString(),
      link_url:
        broadcastForm.link_url.trim() ||
        null,
      link_label:
        broadcastForm.link_label.trim() ||
        null,
      is_active: true,
      created_by:
        user?.id,
    }

    const { error } =
      await s
        .from('broadcasts')
        .insert(payload)

    setMsg(
      error?.message ||
        `Broadcast aktif selama ${minutes} menit.`
    )

    if (!error) {
      setBroadcastForm({
        title: '',
        message: '',
        type: 'PROMO',
        durationMinutes:
          '60',
        link_url: '',
        link_label: '',
      })
    }

    load()
  }

  async function saveSettings(
    e: FormEvent
  ) {
    e.preventDefault()

    const { error } =
      await s
        .from('settings')
        .upsert({
          key: 'site',
          value: site,
          updated_at:
            new Date().toISOString(),
        })

    setMsg(
      error?.message ||
        'Settings tersimpan.'
    )

    load()
  }

  async function openRoom(
    room: any
  ) {
    setActiveRoom(room)

    const { data } =
      await s
        .from('chat_messages')
        .select('*')
        .eq(
          'room_id',
          room.id
        )
        .order(
          'created_at'
        )

    setChatMessages(
      data || []
    )

    const ch = s
      .channel(
        'admin-chat-' +
          room.id
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${room.id}`,
        },
        (p) =>
          setChatMessages(
            (v) =>
              v.some(
                (x) =>
                  x.id ===
                  p.new.id
              )
                ? v
                : [
                    ...v,
                    p.new,
                  ]
          )
      )
      .subscribe()

    return () =>
      s.removeChannel(ch)
  }

  async function sendChat() {
    if (
      !activeRoom ||
      !chatText.trim()
    ) {
      return
    }

    const {
      data: { user },
    } = await s.auth.getUser()

    if (!user) return

    await s
      .from('chat_messages')
      .insert({
        room_id:
          activeRoom.id,
        sender_id:
          user.id,
        message:
          chatText.trim(),
      })

    setChatText('')
  }

  async function addCategory(
    e: FormEvent
  ) {
    e.preventDefault()

    if (
      !['owner', 'admin'].includes(
        role
      )
    ) {
      return
    }

    const payload = {
      name:
        categoryForm.name.trim(),
      slug:
        categoryForm.slug
          .trim()
          .toLowerCase()
          .replace(
            /\s+/g,
            '-'
          ),
      description:
        categoryForm.description.trim() ||
        null,
      is_active: true,
    }

    const { error } =
      await s
        .from('game_categories')
        .insert(payload)

    setMsg(
      error?.message ||
        'Kategori berhasil ditambahkan.'
    )

    if (!error) {
      setCategoryForm({
        name: '',
        slug: '',
        description: '',
      })
    }

    load()
  }

  async function deleteCategory(
    c: any
  ) {
    if (role !== 'owner') {
      setMsg(
        'Hanya Owner yang dapat menghapus kategori.'
      )
      return
    }

    const used =
      games.some(
        (g) =>
          g.category_id ===
          c.id
      )

    if (used) {
      setMsg(
        'Kategori masih dipakai game. Pindahkan game ke kategori lain terlebih dahulu.'
      )
      return
    }

    if (
      !confirm(
        `Hapus kategori ${c.name}?`
      )
    ) {
      return
    }

    const { error } =
      await s
        .from('game_categories')
        .delete()
        .eq('id', c.id)

    setMsg(
      error?.message ||
        'Kategori dihapus.'
    )

    load()
  }

  const filteredMedia =
    mediaAssets.filter(
      (a) =>
        a.name
          .toLowerCase()
          .includes(
            mediaSearch.toLowerCase()
          ) &&
        (mediaCategory ===
          'all' ||
          a.category ===
            mediaCategory)
    )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.08),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,.08),transparent_28%)]">
      <div className="mx-auto flex max-w-[1500px] gap-5 px-3 py-4 md:px-5 lg:py-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-5 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-xl shadow-[0_0_25px_rgba(34,211,238,.12)]">
                  ⚡
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-300">
                    Admin
                  </p>
                  <h2 className="truncate text-lg font-black text-white">
                    NDRAAAID.v1
                  </h2>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-400/10 bg-emerald-400/5 px-3 py-2">
                <span className="text-[11px] text-slate-500">Mode</span>
                <span className="text-[11px] font-bold text-emerald-300">● ONLINE</span>
              </div>
            </div>

            <nav className="max-h-[calc(100vh-190px)] space-y-5 overflow-y-auto p-3">
              {[
                {
                  title: 'OPERASIONAL',
                  items: [
                    ['orders', '🧾', 'Order'],
                    ['deposits', '💳', 'Deposit'],
                    ['deposit-history', '📥', 'Riwayat Deposit'],
                    ['wallet-history', '💰', 'Riwayat Wallet'],
                  ],
                },
                {
                  title: 'KATALOG',
                  items: [
                    ['categories', '🗂️', 'Kategori'],
                    ['games', '🎮', 'Games'],
                    ['products', '💎', 'Produk'],
                    ['promotions', '📢', 'Promo'],
                  ],
                },
                {
                  title: 'SISTEM',
                  items: [
                    ['payments', '🏦', 'Pembayaran'],
                    ['vouchers', '🎟️', 'Voucher'],
                    ['broadcasts', '📡', 'Live Broadcast'],
                    ['media', '🖼️', 'Media Manager'],
                  ],
                },
                {
                  title: 'MANAGEMENT',
                  items: [
                    ['users', '👥', 'Member & Wallet'],
                    ['chat', '💬', 'Live Chat'],
                    ['settings', '⚙️', 'Pengaturan'],
                  ],
                },
              ].map((group) => (
                <div key={group.title}>
                  <p className="px-3 pb-2 text-[9px] font-black tracking-[.25em] text-slate-600">
                    {group.title}
                  </p>
                  <div className="space-y-1">
                    {group.items
                      .filter(
                        (item) =>
                          item[0] !== 'broadcasts' ||
                          ['owner', 'admin'].includes(role)
                      )
                      .map((item) => (
                        <button
                          type="button"
                          key={item[0]}
                          onPointerDown={() => setTab(item[0])}
                          onClick={() => setTab(item[0])}
                          style={{
                            position: 'relative',
                            zIndex: 20,
                            pointerEvents: 'auto',
                            touchAction: 'manipulation',
                          }}
                          className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                            tab === item[0]
                              ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,.08)]'
                              : 'border border-transparent text-slate-400 hover:bg-white/[.04] hover:text-white'
                          }`}
                        >
                          <span className="w-5 text-center">{item[1]}</span>
                          <span className="font-semibold">{item[2]}</span>
                          {tab === item[0] && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.9)]" />
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/75 shadow-2xl shadow-purple-950/10 backdrop-blur-xl">
            <div className="relative p-5 md:p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />
              <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-black tracking-[.22em] text-cyan-300">
                      CONTROL CENTER
                    </span>
                    <span className="text-[10px] text-slate-600">v1</span>
                  </div>
                  <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
                    NDRAAAID<span className="text-cyan-300">.v1</span>
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Kelola toko, transaksi, katalog, media, dan member dalam satu panel.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[.03] px-4 py-2.5">
                    <p className="text-[9px] uppercase tracking-widest text-slate-600">Role</p>
                    <p className="text-sm font-bold text-white">{role || 'ADMIN'}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-2.5">
                    <p className="text-[9px] uppercase tracking-widest text-slate-600">Status</p>
                    <p className="text-sm font-bold text-emerald-300">ONLINE</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 p-3 lg:hidden">
         <div className="grid grid-cols-3 gap-3">
                {[
                  ['orders', '🧾 Order'],
                  ['deposits', '💳 Deposit'],
                  ['deposit-history', '📥 Riwayat'],
                  ['wallet-history', '💰 Wallet'],
                  ['categories', '🗂️ Kategori'],
                  ['games', '🎮 Games'],
                  ['products', '💎 Produk'],
                  ['payments', '🏦 Bayar'],
                  ['vouchers', '🎟️ Voucher'],
                  ['promotions', '📢 Promo'],
                  ['broadcasts', '📡 Broadcast'],
                  ['media', '🖼️ Media'],
                  ['users', '👥 Member'],
                  ['chat', '💬 Chat'],
                  ['settings', '⚙️ Setting'],
                ]
                  .filter(
                    (item) =>
                      item[0] !== 'broadcasts' ||
                      ['owner', 'admin'].includes(role)
                  )
                  .map((item) => (
                    <button
                      type="button"
                      key={item[0]}
                      onPointerDown={() => setTab(item[0])}
                      onClick={() => setTab(item[0])}
                      style={{
                        position: 'relative',
                        zIndex: 20,
                        pointerEvents: 'auto',
                        touchAction: 'manipulation',
                      }}
                      className={`w-full rounded-xl border px-3 py-3 text-sm font-bold transition ${
                        tab === item[0]
                          ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
                          : 'border-white/10 bg-white/[.03] text-slate-400'
                      }`}
                    >
                      {item[1]}
                    </button>
                  ))}
              </div>
            </div>
          </header>

      {msg && (
        <div className="mt-5 rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-3 text-sm text-cyan-200">
          {msg}
        </div>
      )}

      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Total Order', orders.length],
          [
            'Pending',
            orders.filter(
              (x) =>
                x.status ===
                'PENDING_PAYMENT'
            ).length,
          ],
          [
            'Processing',
            orders.filter(
              (x) =>
                x.status ===
                'PROCESSING'
            ).length,
          ],
          [
            'Success',
            orders.filter(
              (x) =>
                x.status ===
                'SUCCESS'
            ).length,
          ],
        ].map(([k, v]) => (
          <div
            key={String(k)}
            className="glass rounded-2xl p-4"
          >
            <p className="text-xs text-slate-500">
              {k}
            </p>

            <b className="mt-1 block text-2xl">
              {v}
            </b>
          </div>
        ))}
      </div>

      {/* =====================================================
          ORDER / RIWAYAT
      ===================================================== */}

      {tab === 'orders' && (
        <div className="mt-7 space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="glass rounded-2xl p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <b>
                    {o.order_code}
                  </b>

                  <p className="text-sm text-slate-400">
                    {o.profiles
                      ?.username ||
                      o.profiles
                        ?.name ||
                      '-'}{' '}
                    ·{' '}
                    {o.games?.name ||
                      '-'}
                  </p>

                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      Subtotal:{' '}
                      <b>
                        Rp{' '}
                        {Number(
                          o.subtotal ||
                            0
                        ).toLocaleString(
                          'id-ID'
                        )}
                      </b>
                    </p>

                    {o.voucher_code && (
                      <p className="text-cyan-300">
                        Voucher:{' '}
                        <b>
                          {o.voucher_code}
                        </b>
                      </p>
                    )}

                    {Number(
                      o.discount || 0
                    ) > 0 && (
                      <p className="text-green-300">
                        Diskon Voucher:{' '}
                        <b>
                          - Rp{' '}
                          {Number(
                            o.discount
                          ).toLocaleString(
                            'id-ID'
                          )}
                        </b>
                      </p>
                    )}

                    <p>
                      Total Bayar:{' '}
                      <b className="text-white">
                        Rp{' '}
                        {Number(
                          o.total
                        ).toLocaleString(
                          'id-ID'
                        )}
                      </b>
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(
                      o.created_at
                    ).toLocaleString(
                      'id-ID'
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    transitions[
                      o.status
                    ] || []
                  ).map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        transition(
                          o,
                          n
                        )
                      }
                      className="btn btn-primary text-xs"
                    >
                      {n.replaceAll(
                        '_',
                        ' '
                      )}
                    </button>
                  ))}

                  <a
                    href={`/order/?id=${encodeURIComponent(
                      o.id
                    )}`}
                    className="btn btn-muted text-xs"
                  >
                    Detail
                  </a>
                </div>
              </div>
            </div>
          ))}

          {!orders.length && (
            <p className="text-slate-400">
              Belum ada order.
            </p>
          )}
        </div>
      )}

      {/* =====================================================
          DEPOSITS
      ===================================================== */}

      {tab === 'deposits' && (
        <section className="mt-7 space-y-3">
          <div className="glass rounded-2xl p-5">
            <h2 className="text-xl font-black">
              Deposit Member — Perlu Diproses
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Setujui atau tolak bukti deposit.
              Persetujuan menambah saldo secara atomik
              dan hanya dapat dilakukan sekali.
            </p>
          </div>

          {deposits
            .filter(
              (d) =>
                d.status ===
                'PENDING'
            )
            .map((d) => (
              <div
                key={d.id}
                className="glass rounded-2xl p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <b>
                      {d.deposit_code}
                    </b>

                    <p className="text-sm text-slate-400">
                      {d.profiles
                        ?.name ||
                        d.profiles
                          ?.username ||
                        d.profiles
                          ?.email ||
                        '-'}{' '}
                      ·{' '}
                      {d
                        .payment_methods
                        ?.name ||
                        '-'}{' '}
                      · Rp{' '}
                      {Number(
                        d.amount
                      ).toLocaleString(
                        'id-ID'
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(
                        d.created_at
                      ).toLocaleString(
                        'id-ID'
                      )}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        viewDepositProof(
                          d
                        )
                      }
                      className="mt-2 inline-block text-sm text-cyan-300"
                    >
                      Lihat bukti pembayaran ↗
                    </button>

                    {d.note && (
                      <p className="mt-2 text-sm text-slate-400">
                        Catatan:{' '}
                        {d.note}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        reviewDeposit(
                          d,
                          'APPROVE'
                        )
                      }
                      className="btn btn-primary text-xs"
                    >
                      ✓ Setujui Deposit
                    </button>

                    <button
                      onClick={() =>
                        reviewDeposit(
                          d,
                          'REJECT'
                        )
                      }
                      className="btn btn-muted text-xs text-red-300"
                    >
                      ✕ Tolak Deposit
                    </button>
                  </div>
                </div>
              </div>
            ))}

          {!deposits.some(
            (d) =>
              d.status ===
              'PENDING'
          ) && (
            <div className="glass rounded-2xl p-8 text-center text-slate-400">
              Tidak ada deposit yang menunggu verifikasi.
            </div>
          )}
        </section>
      )}

      {/* =====================================================
          DEPOSIT HISTORY
      ===================================================== */}

      {tab === 'deposit-history' && (
        <section className="mt-7 space-y-3">
          <div className="glass rounded-2xl p-5">
            <h2 className="text-xl font-black">
              Riwayat Deposit
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Seluruh pengajuan deposit member,
              termasuk APPROVED dan REJECTED.
            </p>
          </div>

          {deposits.map((d) => (
            <div
              key={d.id}
              className="glass rounded-2xl p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <b>
                    {d.deposit_code}
                  </b>

                  <p className="text-sm text-slate-400">
                    {d.profiles
                      ?.name ||
                      d.profiles
                        ?.username ||
                      d.profiles
                        ?.email ||
                      '-'}{' '}
                    ·{' '}
                    {d
                      .payment_methods
                      ?.name ||
                      '-'}{' '}
                    · Rp{' '}
                    {Number(
                      d.amount
                    ).toLocaleString(
                      'id-ID'
                    )}
                  </p>

                  <p className="text-xs text-slate-500">
                    {new Date(
                      d.created_at
                    ).toLocaleString(
                      'id-ID'
                    )}

                    {d.rejection_reason
                      ? ` · Alasan: ${d.rejection_reason}`
                      : ''}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    d.status ===
                    'APPROVED'
                      ? 'bg-cyan-400/10 text-cyan-300'
                      : d.status ===
                          'REJECTED'
                        ? 'bg-red-400/10 text-red-300'
                        : 'bg-amber-400/10 text-amber-300'
                  }`}
                >
                  {d.status}
                </span>
              </div>
            </div>
          ))}

          {!deposits.length && (
            <p className="text-slate-400">
              Belum ada riwayat deposit.
            </p>
          )}
        </section>
      )}

      {/* =====================================================
          WALLET HISTORY
      ===================================================== */}

      {tab === 'wallet-history' && (
        <section className="mt-7 space-y-3">
          <div className="glass rounded-2xl p-5">
            <h2 className="text-xl font-black">
              Riwayat Wallet
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Semua perubahan saldo member yang
              tercatat di ledger.
            </p>
          </div>

          {walletTx.map((tx) => (
            <div
              key={tx.id}
              className="glass rounded-2xl p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <b>
                    {tx.profiles
                      ?.name ||
                      tx.profiles
                        ?.username ||
                      tx.profiles
                        ?.email ||
                      tx.user_id}
                  </b>

                  <p className="text-sm text-slate-400">
                    {tx.type} ·{' '}
                    {tx.reason}
                  </p>

                  <p className="text-xs text-slate-500">
                    {new Date(
                      tx.created_at
                    ).toLocaleString(
                      'id-ID'
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <b
                    className={
                      Number(
                        tx.amount
                      ) >= 0
                        ? 'text-cyan-300'
                        : 'text-red-300'
                    }
                  >
                    {Number(
                      tx.amount
                    ) >= 0
                      ? '+'
                      : '−'}{' '}
                    Rp{' '}
                    {Math.abs(
                      Number(
                        tx.amount
                      )
                    ).toLocaleString(
                      'id-ID'
                    )}
                  </b>

                  <p className="text-xs text-slate-500">
                    Saldo: Rp{' '}
                    {Number(
                      tx.balance_after
                    ).toLocaleString(
                      'id-ID'
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {!walletTx.length && (
            <p className="text-slate-400">
              Belum ada transaksi wallet.
            </p>
          )}
        </section>
      )}

      {/* =====================================================
          CATEGORIES
      ===================================================== */}

      {tab === 'categories' && (
        <section className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
          <form
            onSubmit={addCategory}
            className="glass space-y-3 rounded-2xl p-6"
          >
            <h2 className="text-xl font-black">
              Kategori Game
            </h2>

            <p className="text-sm text-slate-400">
              Buat kategori baru dan gunakan saat
              menambahkan game.
            </p>

            <input
              className="input"
              placeholder="Nama kategori, mis. Mobile Games"
              value={
                categoryForm.name
              }
              onChange={(e) =>
                setCategoryForm({
                  ...categoryForm,
                  name: e.target.value,
                })
              }
              required
            />

            <input
              className="input"
              placeholder="Slug, mis. mobile-games"
              value={
                categoryForm.slug
              }
              onChange={(e) =>
                setCategoryForm({
                  ...categoryForm,
                  slug: e.target.value,
                })
              }
              required
            />

            <textarea
              className="input min-h-24"
              placeholder="Deskripsi opsional"
              value={
                categoryForm.description
              }
              onChange={(e) =>
                setCategoryForm({
                  ...categoryForm,
                  description:
                    e.target.value,
                })
              }
            />

            <button className="btn btn-primary">
              Tambah Kategori
            </button>
          </form>

          <div className="space-y-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="glass flex items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div>
                  <b>{c.name}</b>

                  <p className="text-xs text-slate-500">
                    /{c.slug} ·{' '}
                    {
                      games.filter(
                        (g) =>
                          g.category_id ===
                          c.id
                      ).length
                    }{' '}
                    game
                  </p>
                </div>

                <div className="flex gap-2">
                  {['owner', 'admin'].includes(role) && (
                    <button
                      onClick={() => openEdit('category', c)}
                      className="btn btn-primary text-xs"
                    >
                      Edit
                    </button>
                  )}

                  <button
                    onClick={() =>
                      toggle(
                        'game_categories',
                        c.id
                      )
                    }
                    className="btn btn-muted text-xs"
                  >
                    {c.is_active
                      ? 'Nonaktifkan'
                      : 'Aktifkan'}
                  </button>

                  {role ===
                    'owner' && (
                    <button
                      onClick={() =>
                        deleteCategory(
                          c
                        )
                      }
                      className="btn btn-muted text-xs text-red-300"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================
          GAMES
      ===================================================== */}

      {tab === 'games' && (
        <section className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
          <form
            onSubmit={(e) => {
              e.preventDefault()

              add(
                'games',
                {
                  ...gameForm,
                  is_active: true,
                  popular: false,
                  category_id:
                    gameForm.category_id ||
                    null,
                },
                () =>
                  setGameForm({
                    name: '',
                    slug: '',
                    description:
                      '',
                    logo_url: '',
                    banner_url:
                      '',
                    category_id:
                      categories[0]
                        ?.id ||
                      '',
                  })
              )
            }}
            className="glass space-y-3 rounded-2xl p-6"
          >
            <h2 className="text-xl font-black">
              Tambah Game
            </h2>

            <input
              className="input"
              placeholder="Nama game"
              value={
                gameForm.name
              }
              onChange={(e) =>
                setGameForm({
                  ...gameForm,
                  name: e.target.value,
                })
              }
              required
            />

            <input
              className="input"
              placeholder="Slug, mis. mobile-legends"
              value={
                gameForm.slug
              }
              onChange={(e) =>
                setGameForm({
                  ...gameForm,
                  slug: e.target.value,
                })
              }
              required
            />

            <select
              className="input"
              value={
                gameForm.category_id
              }
              onChange={(e) =>
                setGameForm({
                  ...gameForm,
                  category_id:
                    e.target.value,
                })
              }
            >
              {categories.map(
                (c) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.name}
                  </option>
                )
              )}
            </select>

            <textarea
              className="input min-h-24"
              placeholder="Deskripsi"
              value={
                gameForm.description
              }
              onChange={(e) =>
                setGameForm({
                  ...gameForm,
                  description:
                    e.target.value,
                })
              }
            />

            <label className="block text-sm font-semibold">
              Logo game

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="input mt-2"
                onChange={(e) =>
                  uploadFromInput(
                    e,
                    'games',
                    (url) =>
                      setGameForm(
                        (v) => ({
                          ...v,
                          logo_url:
                            url,
                        })
                      )
                  )
                }
              />
            </label>

            {gameForm.logo_url && (
              <img
                src={
                  gameForm.logo_url
                }
                alt="Logo preview"
                className="h-20 w-20 rounded-xl object-cover"
              />
            )}

            <label className="block text-sm font-semibold">
              Banner game

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="input mt-2"
                onChange={(e) =>
                  uploadFromInput(
                    e,
                    'games',
                    (url) =>
                      setGameForm(
                        (v) => ({
                          ...v,
                          banner_url:
                            url,
                        })
                      ),
                    '16:9'
                  )
                }
              />
            </label>

            {gameForm.banner_url && (
              <img
                src={
                  gameForm.banner_url
                }
                alt="Banner preview"
                className="h-28 w-full rounded-xl object-cover"
              />
            )}

            <p className="text-xs text-slate-500">
              Logo/banner otomatis masuk Media Manager.
              Maksimal 6 MB.
            </p>

            <button className="btn btn-primary">
              Tambah Game
            </button>
          </form>

          <div className="space-y-3">
            {games.map((g) => (
              <div
                key={g.id}
                className="glass flex items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {g.logo_url ? (
                    <img
                      src={g.logo_url}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-slate-900" />
                  )}

                  <div>
                    <b>{g.name}</b>

                    <p className="text-xs text-slate-500">
                      /{g.slug} ·{' '}
                      {g
                        .game_categories
                        ?.name ||
                        'Tanpa kategori'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['owner', 'admin'].includes(role) && (
                    <button
                      onClick={() => openEdit('game', g)}
                      className="btn btn-primary text-xs"
                    >
                      Edit
                    </button>
                  )}

                  <button
                    onClick={() =>
                      toggle(
                        'games',
                        g.id
                      )
                    }
                    className="btn btn-muted text-xs"
                  >
                    {g.is_active
                      ? 'Nonaktifkan'
                      : 'Aktifkan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================
          PRODUCTS
      ===================================================== */}

      {tab === 'products' && (
        <section className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
          <form
            onSubmit={(e) => {
              e.preventDefault()

              add(
                'game_products',
                {
                  ...prodForm,
                  price: Number(
                    prodForm.price
                  ),
                  is_active: true,
                },
                () =>
                  setProdForm(
                    (x) => ({
                      ...x,
                      name: '',
                      nominal:
                        '',
                      sku: '',
                      price:
                        '',
                      image_url:
                        '',
                    })
                  )
              )
            }}
            className="glass space-y-3 rounded-2xl p-6"
          >
            <h2 className="text-xl font-black">
              Tambah Produk
            </h2>

            <select
              className="input"
              value={
                prodForm.game_id
              }
              onChange={(e) =>
                setProdForm({
                  ...prodForm,
                  game_id:
                    e.target.value,
                })
              }
            >
              {games.map(
                (g) => (
                  <option
                    key={g.id}
                    value={g.id}
                  >
                    {g.name}
                  </option>
                )
              )}
            </select>

            {[
              ['name', 'Nama'],
              [
                'nominal',
                'Nominal',
              ],
              ['sku', 'SKU'],
              ['price', 'Harga'],
            ].map(([k, l]) => (
              <input
                key={k}
                className="input"
                placeholder={l}
                value={
                  (prodForm as any)[
                    k
                  ]
                }
                onChange={(e) =>
                  setProdForm({
                    ...prodForm,
                    [k]: e.target.value,
                  })
                }
                required
              />
            ))}

            <label className="block text-sm font-semibold">
              Foto produk

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="input mt-2"
                onChange={(e) =>
                  uploadFromInput(
                    e,
                    'products',
                    (url) =>
                      setProdForm(
                        (v) => ({
                          ...v,
                          image_url:
                            url,
                        })
                      )
                  )
                }
              />
            </label>

            {prodForm.image_url && (
              <img
                src={
                  prodForm.image_url
                }
                alt="Preview produk"
                className="h-24 w-24 rounded-xl object-cover"
              />
            )}

            <button className="btn btn-primary">
              Tambah Produk
            </button>
          </form>

          <div className="space-y-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="glass flex items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-slate-900" />
                  )}

                  <div>
                    <b>{p.name}</b>

                    <p className="text-xs text-slate-500">
                      {p.games?.name}{' '}
                      · {p.sku} · Rp{' '}
                      {Number(
                        p.price
                      ).toLocaleString(
                        'id-ID'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['owner', 'admin'].includes(role) && (
                    <button
                      onClick={() => openEdit('product', p)}
                      className="btn btn-primary text-xs"
                    >
                      Edit
                    </button>
                  )}

                  <button
                    onClick={() =>
                      toggle(
                        'game_products',
                        p.id
                      )
                    }
                    className="btn btn-muted text-xs"
                  >
                    {p.is_active
                      ? 'Nonaktifkan'
                      : 'Aktifkan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================
          PAYMENT METHODS
      ===================================================== */}

      {tab === 'payments' && (
        <section className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
          <form
            onSubmit={(e) => {
              e.preventDefault()

              add(
                'payment_methods',
                {
                  ...methodForm,
                  is_active: true,
                },
                () =>
                  setMethodForm({
                    name: '',
                    kind: 'QRIS',
                    account_name:
                      '',
                    account_number:
                      '',
                    instruction:
                      '',
                    qr_url: '',
                  })
              )
            }}
            className="glass space-y-3 rounded-2xl p-6"
          >
            <h2 className="text-xl font-black">
              Payment Method
            </h2>

            {[
              ['name', 'Nama'],
              ['kind', 'Jenis'],
              [
                'account_name',
                'Nama rekening/e-wallet',
              ],
              [
                'account_number',
                'Nomor rekening/e-wallet',
              ],
              [
                'qr_url',
                'URL QRIS (opsional)',
              ],
              [
                'instruction',
                'Instruksi',
              ],
            ].map(([k, l]) => (
              <input
                key={k}
                className="input"
                placeholder={l}
                value={
                  (methodForm as any)[
                    k
                  ]
                }
                onChange={(e) =>
                  setMethodForm({
                    ...methodForm,
                    [k]: e.target.value,
                  })
                }
                required={
                  k === 'name'
                }
              />
            ))}

            <button className="btn btn-primary">
              Tambah Metode
            </button>
          </form>

          <div className="space-y-3">
            {methods.map((m) => (
              <div
                key={m.id}
                className="glass rounded-2xl p-4"
              >
                <div className="flex justify-between">
                  <div>
                    <b>{m.name}</b>

                    <p className="text-xs text-slate-500">
                      {m.kind} ·{' '}
                      {m.account_number ||
                        'Nomor belum diisi'}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      toggle(
                        'payment_methods',
                        m.id
                      )
                    }
                    className="btn btn-muted text-xs"
                  >
                    {m.is_active
                      ? 'Nonaktifkan'
                      : 'Aktifkan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================
          VOUCHER
      ===================================================== */}

      {tab === 'vouchers' && (
        <section className="mt-7 space-y-7">
          <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
            <form
              onSubmit={(e) => {
                e.preventDefault()

                const limit =
                  voucherForm.usage_limit.trim() ===
                  ''
                    ? null
                    : Number(
                        voucherForm
                          .usage_limit
                      )

                if (
                  limit !== null &&
                  (!Number.isInteger(
                    limit
                  ) ||
                    limit < 0)
                ) {
                  setMsg(
                    'Limit voucher harus berupa angka bulat 0 atau lebih.'
                  )
                  return
                }

                add(
                  'vouchers',
                  {
                    code: voucherForm.code
                      .trim()
                      .toUpperCase(),

                    discount_type:
                      voucherForm.discount_type,

                    discount_value:
                      Number(
                        voucherForm.discount_value
                      ),

                    min_order:
                      Number(
                        voucherForm.min_order
                      ),

                    max_discount:
                      voucherForm.max_discount
                        ? Number(
                            voucherForm.max_discount
                          )
                        : null,

                    initial_limit:
                      limit,

                    usage_limit:
                      limit,

                    usage_count: 0,

                    is_active: true,
                  },
                  () =>
                    setVoucherForm({
                      code: '',
                      discount_type:
                        'PERCENT',
                      discount_value:
                        '10',
                      min_order:
                        '0',
                      max_discount:
                        '',
                      usage_limit:
                        '10',
                    })
                )
              }}
              className="glass space-y-3 rounded-2xl p-6"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                  Voucher
                </p>

                <h2 className="text-xl font-black">
                  Buat Voucher
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Limit dapat diatur bebas. Kosongkan
                  jika tanpa batas.
                </p>
              </div>

              <input
                className="input"
                placeholder="Kode, mis. BUDI10"
                value={
                  voucherForm.code
                }
                onChange={(e) =>
                  setVoucherForm({
                    ...voucherForm,
                    code: e.target.value.toUpperCase(),
                  })
                }
                required
              />

              <select
                className="input"
                value={
                  voucherForm.discount_type
                }
                onChange={(e) =>
                  setVoucherForm({
                    ...voucherForm,
                    discount_type:
                      e.target.value,
                  })
                }
              >
                <option value="PERCENT">
                  Persen
                </option>

                <option value="FIXED">
                  Nominal
                </option>
              </select>

              <input
                type="number"
                min="0"
                className="input"
                placeholder="Nilai diskon"
                value={
                  voucherForm.discount_value
                }
                onChange={(e) =>
                  setVoucherForm({
                    ...voucherForm,
                    discount_value:
                      e.target.value,
                  })
                }
                required
              />

              <input
                type="number"
                min="0"
                className="input"
                placeholder="Minimal order"
                value={
                  voucherForm.min_order
                }
                onChange={(e) =>
                  setVoucherForm({
                    ...voucherForm,
                    min_order:
                      e.target.value,
                  })
                }
              />

              <input
                type="number"
                min="0"
                className="input"
                placeholder="Maksimal diskon (opsional)"
                value={
                  voucherForm.max_discount
                }
                onChange={(e) =>
                  setVoucherForm({
                    ...voucherForm,
                    max_discount:
                      e.target.value,
                  })
                }
              />

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Limit penggunaan
                </label>

                <input
                  type="number"
                  min="0"
                  className="input"
                  placeholder="Contoh: 100"
                  value={
                    voucherForm.usage_limit
                  }
                  onChange={(e) =>
                    setVoucherForm({
                      ...voucherForm,
                      usage_limit:
                        e.target.value,
                    })
                  }
                />

                <p className="mt-1 text-xs text-slate-500">
                  Contoh 100 = voucher dapat digunakan
                  maksimal 100 kali. Kosong = tanpa batas.
                </p>
              </div>

         <button
  type="button"
  className="btn btn-primary w-full"
  onClick={async () => {
    const limit =
      voucherForm.usage_limit.trim() === ''
        ? null
        : Number(voucherForm.usage_limit)

    if (
      limit !== null &&
      (!Number.isInteger(limit) || limit < 0)
    ) {
      setMsg(
        'Limit voucher harus berupa angka bulat 0 atau lebih.'
      )
      return
    }

    if (!voucherForm.code.trim()) {
      setMsg('Kode voucher wajib diisi.')
      return
    }

    if (!voucherForm.discount_value) {
      setMsg('Nilai diskon wajib diisi.')
      return
    }

    await add(
      'vouchers',
      {
        code: voucherForm.code.trim().toUpperCase(),
        discount_type: voucherForm.discount_type,
        discount_value: Number(voucherForm.discount_value),
        min_order: Number(voucherForm.min_order || 0),
        max_discount: voucherForm.max_discount
          ? Number(voucherForm.max_discount)
          : null,
        initial_limit: limit,
        usage_limit: limit,
        usage_count: 0,
        is_active: true,
      },
      () =>
        setVoucherForm({
          code: '',
          discount_type: 'PERCENT',
          discount_value: '10',
          min_order: '0',
          max_discount: '',
          usage_limit: '10',
        })
    )
  }}
>
  Tambah Voucher
</button>
            </form>

            <div className="space-y-3">
              <div className="glass rounded-2xl p-5">
                <h2 className="text-xl font-black">
                  Daftar Voucher
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Owner/Admin dapat mengatur limit.
                  Stok awal hanya dapat diubah Owner.
                </p>
              </div>

              {vouchers.map((v) => {
                const used =
                  Number(
                    v.usage_count || 0
                  )

                const limit =
                  v.usage_limit ===
                    null ||
                  v.usage_limit ===
                    undefined
                    ? null
                    : Number(
                        v.usage_limit
                      )

                const remaining =
                  limit === null
                    ? null
                    : Math.max(
                        limit -
                          used,
                        0
                      )

                return (
                  <div
                    key={v.id}
                    className="glass rounded-2xl p-5"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <b className="text-lg">
                              {v.code}
                            </b>

                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                v.is_active
                                  ? 'bg-cyan-400/10 text-cyan-300'
                                  : 'bg-red-400/10 text-red-300'
                              }`}
                            >
                              {v.is_active
                                ? 'AKTIF'
                                : 'NONAKTIF'}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-slate-400">
                            Diskon:{' '}
                            {v.discount_type ===
                            'PERCENT'
                              ? `${v.discount_value}%`
                              : `Rp ${Number(
                                  v.discount_value
                                ).toLocaleString(
                                  'id-ID'
                                )}`}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            toggle(
                              'vouchers',
                              v.id
                            )
                          }
                          className="btn btn-muted text-xs"
                        >
                          {v.is_active
                            ? 'Nonaktifkan'
                            : 'Aktifkan'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-[10px] text-slate-500">
                            STOK AWAL
                          </p>

                          <b className="mt-1 block">
                            {v.initial_limit ===
                              null ||
                            v.initial_limit ===
                              undefined
                              ? '∞'
                              : Number(
                                  v.initial_limit
                                ).toLocaleString(
                                  'id-ID'
                                )}
                          </b>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-[10px] text-slate-500">
                            TERPAKAI
                          </p>

                          <b className="mt-1 block text-cyan-300">
                            {used.toLocaleString(
                              'id-ID'
                            )}
                          </b>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-[10px] text-slate-500">
                            SISA
                          </p>

                          <b className="mt-1 block text-green-300">
                            {remaining ===
                            null
                              ? '∞'
                              : remaining.toLocaleString(
                                  'id-ID'
                                )}
                          </b>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-[10px] text-slate-500">
                            LIMIT
                          </p>

                          <b className="mt-1 block">
                            {limit ===
                            null
                              ? '∞'
                              : limit.toLocaleString(
                                  'id-ID'
                                )}
                          </b>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {['owner', 'admin'].includes(
                          role
                        ) && (
                          <button
                            onClick={() =>
                              updateVoucherLimit(
                                v
                              )
                            }
                            className="btn btn-primary text-xs"
                          >
                            Atur Limit
                          </button>
                        )}

                        {role ===
                          'owner' && (
                          <button
                            onClick={() =>
                              updateVoucherInitialLimit(
                                v
                              )
                            }
                            className="btn btn-muted text-xs"
                          >
                            Ubah Stok Awal
                          </button>
)}
{['owner', 'admin'].includes(role) && (
  <button

    onClick={() => deleteVoucher(v)}
    className="btn btn-muted text-xs text-red-300"
  >
    Hapus
  </button>
)}
                        
                      </div>
                    </div>
                  </div>
                )
              })}

              {!vouchers.length && (
                <p className="text-slate-400">
                  Belum ada voucher.
                </p>
              )}
            </div>
          </div>

          {/* =================================================
              RIWAYAT PENGGUNAAN VOUCHER
          ================================================= */}

          <div className="glass rounded-2xl p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-purple-300">
                  Voucher History
                </p>

                <h2 className="text-2xl font-black">
                  Riwayat Penggunaan Voucher
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Setiap penggunaan voucher tercatat
                  bersama member, order, diskon, dan total
                  pembayaran.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400">
                {voucherUsages.length.toLocaleString(
                  'id-ID'
                )}{' '}
                penggunaan
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {voucherUsages.map((vu) => {
              const user =
                vu.profiles

              const order =
                vu.orders

              return (
<div
  key={vu.id}
  className="glass rounded-xl p-3"
>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <b className="text-lg">
                          {vu.voucher_code}
                        </b>

                        <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-300">
                          DIGUNAKAN
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-300">
                        Digunakan oleh{' '}
                        <b>
                          {user?.username
                            ? `@${user.username}`
                            : user?.name ||
                              user?.email ||
                              vu.user_id}
                        </b>
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        Order:{' '}
                        <b className="text-slate-200">
                          {order?.order_code ||
                            vu.order_id}
                        </b>
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(
                          vu.used_at
                        ).toLocaleString(
                          'id-ID'
                        )}
                      </p>
                    </div>

        <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[10px] text-slate-500">
                          DISKON
                        </p>

                        <b className="text-green-300">
                          - Rp{' '}
                          {Number(
                            vu.discount_amount ||
                              0
                          ).toLocaleString(
                            'id-ID'
                          )}
                        </b>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[10px] text-slate-500">
                          SUBTOTAL
                        </p>

                        <b>
                          Rp{' '}
                          {Number(
                            order?.subtotal ||
                              0
                          ).toLocaleString(
                            'id-ID'
                          )}
                        </b>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[10px] text-slate-500">
                          TOTAL BAYAR
                        </p>

                        <b className="text-cyan-300">
                          Rp{' '}
                          {Number(
                            order?.total ||
                              0
                          ).toLocaleString(
                            'id-ID'
                          )}
                        </b>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {!voucherUsages.length && (
              <div className="glass rounded-2xl p-8 text-center text-slate-500">
                Belum ada penggunaan voucher.
              </div>
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          PROMOTIONS
      ===================================================== */}

      {tab === 'promotions' && (
        <section className="mt-7">
          <div className="glass rounded-3xl p-6">
            <p className="text-xs font-black uppercase tracking-widest text-red-300">
              📢 Banner Promo Utama
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Kelola 1 Banner Promo
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Satu Banner Promo utama untuk Home. Bisa berupa teks, gambar, atau teks + gambar.
              Edit dan ubah statusnya dari sini tanpa membuat promo utama baru.
            </p>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="glass rounded-2xl p-5">
                <label className="block text-xs font-bold text-slate-300">
                  Tipe konten
                  <select
                    className="input mt-2"
                    value={mediaPromoType}
                    onChange={(e) =>
                      setMediaPromoType(e.target.value as 'text' | 'image' | 'both')
                    }
                  >
                    <option value="text">Teks saja</option>
                    <option value="image">Gambar saja</option>
                    <option value="both">Teks + gambar</option>
                  </select>
                </label>

                {mediaPromoType !== 'image' && (
                  <>
                    <input
                      className="input mt-3"
                      placeholder="Judul promo"
                      value={mediaPromoTitle}
                      onChange={(e) => setMediaPromoTitle(e.target.value)}
                    />
                    <textarea
                      className="input mt-3 min-h-24"
                      placeholder="Deskripsi promo (opsional)"
                      value={mediaPromoDescription}
                      onChange={(e) => setMediaPromoDescription(e.target.value)}
                    />
                    <input
                      className="input mt-3"
                      placeholder="Kode promo (opsional)"
                      value={mediaPromoCode}
                      onChange={(e) => setMediaPromoCode(e.target.value)}
                    />
                  </>
                )}

                {mediaPromoType !== 'text' && (
                  <label className="mt-3 block text-xs font-bold text-slate-300">
                    Gambar Banner Promo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="input mt-2"
                      disabled={mediaUploading}
                      onChange={(e) =>
                        uploadAndSync(e, 'promotions', preparePromoImage, '16:9')
                      }
                    />
                    <span className="mt-1 block text-[10px] text-slate-500">
                      JPG, PNG, WEBP, GIF · maksimal 6 MB · rasio 16:9.
                    </span>
                  </label>
                )}

                {((pendingPromoImageUrl || promos[0]?.banner_url) && mediaPromoType !== 'text') && (
                  <img
                    src={pendingPromoImageUrl || promos[0]?.banner_url}
                    alt="Preview Banner Promo"
                    className="mt-4 h-40 w-full rounded-xl object-cover"
                  />
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${promos[0]?.is_active ? 'bg-green-400/10 text-green-300' : 'bg-slate-400/10 text-slate-400'}`}>
                    {promos[0] ? (promos[0].is_active ? '🟢 Aktif' : '🔴 Nonaktif') : 'Belum dibuat'}
                  </span>
                  {promos[0] && (
                    <button
                      type="button"
                      className="btn btn-muted text-xs"
                      onClick={toggleMainPromo}
                    >
                      {promos[0].is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-primary mt-3 w-full"
                  disabled={mediaUploading}
                  onClick={savePromoContent}
                >
                  {promos[0] ? 'Simpan Perubahan Banner Promo' : 'Buat Banner Promo'}
                </button>
              </div>

              <div className="glass rounded-2xl p-5">
                <p className="text-xs font-black uppercase tracking-widest text-pink-300">
                  👁 PREVIEW
                </p>
                <h3 className="mt-1 text-xl font-black">
                  Tampilan Banner Promo di Home
                </h3>

                <div className="mt-5 overflow-hidden rounded-2xl border border-pink-400/20 bg-slate-950/70">
                  {mediaPromoType !== 'text' && (pendingPromoImageUrl || promos[0]?.banner_url) && (
                    <img
                      src={pendingPromoImageUrl || promos[0]?.banner_url}
                      alt="Preview"
                      className="max-h-64 w-full object-cover"
                    />
                  )}
                  {mediaPromoType !== 'image' && (
                    <div className="p-5">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-pink-300">PROMO</p>
                      <h4 className="mt-2 text-2xl font-black">
                        {mediaPromoTitle || promos[0]?.name || 'Judul Promo'}
                      </h4>
                      {(mediaPromoDescription || promos[0]?.description) && (
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-400">
                          {mediaPromoDescription || promos[0]?.description}
                        </p>
                      )}
                      {(mediaPromoCode || promos[0]?.code) && (
                        <div className="mt-4 inline-flex rounded-xl border border-pink-400/20 bg-pink-400/10 px-4 py-2">
                          <span className="text-xs font-black uppercase tracking-wider text-pink-300">
                            Kode: {mediaPromoCode || promos[0]?.code}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Jika status Nonaktif, Banner Promo tidak akan ditampilkan di Home.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          BROADCAST
      ===================================================== */}

      {tab === 'broadcasts' &&
        ['owner', 'admin'].includes(
          role
        ) && (
          <section className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
            <form
              onSubmit={addBroadcast}
              className="glass space-y-3 rounded-2xl p-6"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                  Live Broadcast
                </p>

                <h2 className="text-xl font-black">
                  Kirim pengumuman ke semua pembeli
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Pesan tampil di bagian atas website
                  selama durasi yang kamu tentukan.
                </p>
              </div>

              <input
                className="input"
                placeholder="Judul, mis. 🔥 Promo 20% Hari Ini"
                value={
                  broadcastForm.title
                }
                onChange={(e) =>
                  setBroadcastForm({
                    ...broadcastForm,
                    title: e.target.value,
                  })
                }
                required
              />

              <textarea
                className="input min-h-28"
                placeholder="Isi broadcast untuk pembeli..."
                value={
                  broadcastForm.message
                }
                onChange={(e) =>
                  setBroadcastForm({
                    ...broadcastForm,
                    message:
                      e.target.value,
                  })
                }
                required
              />

              <select
                className="input"
                value={
                  broadcastForm.type
                }
                onChange={(e) =>
                  setBroadcastForm({
                    ...broadcastForm,
                    type: e.target.value,
                  })
                }
              >
                <option value="PROMO">
                  Promo
                </option>
                <option value="INFO">
                  Info
                </option>
                <option value="SUCCESS">
                  Info sukses
                </option>
                <option value="WARNING">
                  Peringatan
                </option>
              </select>

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                <input
                  type="number"
                  min="1"
                  className="input"
                  placeholder="Durasi (menit)"
                  value={
                    broadcastForm.durationMinutes
                  }
                  onChange={(e) =>
                    setBroadcastForm({
                      ...broadcastForm,
                      durationMinutes:
                        e.target.value,
                    })
                  }
                  required
                />

                <select
                  className="input"
                  value={
                    broadcastForm.durationMinutes
                  }
                  onChange={(e) =>
                    setBroadcastForm({
                      ...broadcastForm,
                      durationMinutes:
                        e.target.value,
                    })
                  }
                >
                  <option value="15">
                    15 menit
                  </option>
                  <option value="30">
                    30 menit
                  </option>
                  <option value="60">
                    1 jam
                  </option>
                  <option value="360">
                    6 jam
                  </option>
                  <option value="1440">
                    24 jam
                  </option>
                  <option value="4320">
                    3 hari
                  </option>
                  <option value="10080">
                    7 hari
                  </option>
                </select>
              </div>

              <input
                className="input"
                placeholder="Link tujuan (opsional), mis. /games"
                value={
                  broadcastForm.link_url
                }
                onChange={(e) =>
                  setBroadcastForm({
                    ...broadcastForm,
                    link_url:
                      e.target.value,
                  })
                }
              />

              <input
                className="input"
                placeholder="Teks tombol link (opsional)"
                value={
                  broadcastForm.link_label
                }
                onChange={(e) =>
                  setBroadcastForm({
                    ...broadcastForm,
                    link_label:
                      e.target.value,
                  })
                }
              />

              <button className="btn btn-primary">
                Tayangkan Broadcast
              </button>
            </form>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">
                  Riwayat Broadcast
                </h2>

                <span className="text-xs text-slate-500">
                  Terbaru di atas
                </span>
              </div>

              {broadcasts.map(
                (b) => (
                  <div
                    key={b.id}
                    className="glass rounded-2xl p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <b>
                            {b.title}
                          </b>

                          <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                            {b.type}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-400">
                          {b.message}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(
                            b.starts_at
                          ).toLocaleString(
                            'id-ID'
                          )}{' '}
                          →{' '}
                          {new Date(
                            b.ends_at
                          ).toLocaleString(
                            'id-ID'
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            toggle(
                              'broadcasts',
                              b.id
                            )
                          }
                          className="btn btn-muted text-xs"
                        >
                          {b.is_active
                            ? 'Matikan'
                            : 'Aktifkan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBroadcast(b)}
                          className="btn btn-muted text-xs text-red-300"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}

              {!broadcasts.length && (
                <p className="text-slate-400">
                  Belum ada broadcast.
                </p>
              )}
            </div>
          </section>
        )}

      {/* =====================================================
          MEDIA
      ===================================================== */}

      {tab === 'media' && (
        <section className="mt-7 space-y-6">
          <div className="glass rounded-3xl p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-bold text-cyan-300">
                  MEDIA MANAGER TERPUSAT
                </p>

                <h2 className="text-2xl font-black">
                  Kelola semua media website dari satu tempat
                </h2>

                <p className="mt-1 max-w-3xl text-sm text-slate-400">
                  Satu file upload dapat langsung disinkronkan ke Game, Produk,
                  Promo, atau Homepage. Produk yang dipilih memakai URL media
                  yang sama sehingga tidak membuat file Storage duplikat.
                </p>
              </div>

              <label className="btn btn-primary cursor-pointer">
                {mediaUploading ? 'Mengunggah...' : '＋ Upload Media Umum'}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={mediaUploading}
                  onChange={(e) => uploadFromInput(e, 'general')}
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr]">
              <select
                className="input"
                value={mediaCategory}
                onChange={(e) => setMediaCategory(e.target.value)}
              >
                <option value="all">Semua kategori</option>

                {mediaCategories.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>

              <input
                className="input"
                placeholder="Cari nama file..."
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="glass rounded-3xl p-5">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-300">
                🎮 Logo Game
              </p>
              <h3 className="mt-1 text-lg font-black">
                Sinkronkan logo ke game
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Rasio 1:1 · upload sekali lalu langsung memperbarui logo game.
              </p>

              <select
                className="input mt-4"
                value={mediaGameId}
                onChange={(e) => setMediaGameId(e.target.value)}
              >
                <option value="">Pilih game</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <label className="btn btn-muted mt-3 block cursor-pointer text-center">
                Upload & Pasang Logo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={mediaUploading || !mediaGameId}
                  onChange={(e) =>
                    uploadAndSync(
                      e,
                      'games',
                      setGameLogoFromMedia,
                      '1:1'
                    )
                  }
                />
              </label>
            </div>

            <div className="glass rounded-3xl p-5">
              <p className="text-xs font-black uppercase tracking-widest text-purple-300">
                💎 Gambar Produk
              </p>
              <h3 className="mt-1 text-lg font-black">
                Satu gambar untuk banyak nominal
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Rasio 1:1 · pilih game lalu satu, beberapa, atau semua nominal.
              </p>

              <select
                className="input mt-4"
                value={mediaProductGameId}
                onChange={(e) => {
                  setMediaProductGameId(e.target.value)
                  setSelectedProductIds([])
                }}
              >
                <option value="">Pilih game</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              {mediaProductGameId && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">
                      Nominal produk
                    </span>
                    <button
                      type="button"
                      className="text-xs font-bold text-cyan-300"
                      onClick={() => {
                        const ids = products
                          .filter((p) => p.game_id === mediaProductGameId)
                          .map((p) => p.id)
                        setSelectedProductIds(
                          selectedProductIds.length === ids.length ? [] : ids
                        )
                      }}
                    >
                      {selectedProductIds.length > 0 ? 'Batal pilih semua' : 'Pilih semua'}
                    </button>
                  </div>

                  <div className="max-h-52 space-y-2 overflow-y-auto">
                    {products
                      .filter((p) => p.game_id === mediaProductGameId)
                      .map((p) => (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-2"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(p.id)}
                            onChange={(e) =>
                              setSelectedProductIds((current) =>
                                e.target.checked
                                  ? [...current, p.id]
                                  : current.filter((id) => id !== p.id)
                              )
                            }
                          />
                          <span className="min-w-0 flex-1 text-sm">
                            {p.name || p.nominal || p.sku || 'Produk'}
                          </span>
                          {p.image_url && (
                            <span className="text-[10px] text-green-300">
                              sudah ada gambar
                            </span>
                          )}
                        </label>
                      ))}

                    {!products.some((p) => p.game_id === mediaProductGameId) && (
                      <p className="py-3 text-center text-xs text-slate-500">
                        Belum ada nominal untuk game ini.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <label className="btn btn-muted mt-3 block cursor-pointer text-center">
                Upload & Terapkan ke {selectedProductIds.length || 0} produk
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={mediaUploading || !mediaProductGameId || !selectedProductIds.length}
                  onChange={(e) =>
                    uploadAndSync(
                      e,
                      'products',
                      applyProductMedia,
                      '1:1'
                    )
                  }
                />
              </label>
            </div>

            <div className="glass rounded-3xl p-5">
              <p className="text-xs font-black uppercase tracking-widest text-red-300">
                📢 Banner Promo
              </p>
              <h3 className="mt-1 text-lg font-black">
                Kelola di menu Promo
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Banner Promo utama sekarang dikelola dari menu <b>Promo</b> agar edit, upload, preview, dan status aktif/nonaktif berada di satu tempat.
              </p>
              <button
                type="button"
                className="btn btn-primary mt-4 w-full"
                onClick={() => setTab('promotions')}
              >
                Buka Pengaturan Banner Promo
              </button>
            </div>

            <div className="glass rounded-3xl p-5">
              <p className="text-xs font-black uppercase tracking-widest text-amber-300">
                🏠 Banner Homepage
              </p>
              <h3 className="mt-1 text-lg font-black">
                Kelola slot banner Homepage
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Rasio 16:9 · tersimpan di Website Settings pada slot yang dipilih.
              </p>

              <select
                className="input mt-4"
                value={homepageSlot}
                onChange={(e) => setHomepageSlot(e.target.value)}
              >
                {homepageSlots.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>

              <label className="btn btn-muted mt-3 block cursor-pointer text-center">
                Upload & Pasang Banner Homepage
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={mediaUploading}
                  onChange={(e) =>
                    uploadAndSync(
                      e,
                      'homepage',
                      setHomepageBannerFromMedia,
                      '16:9'
                    )
                  }
                />
              </label>
            </div>
          </div>

          <div className="glass rounded-3xl p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  📁 Library Media
                </p>
                <h3 className="text-lg font-black">
                  Semua file yang sudah tersimpan
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                {filteredMedia.length} media ditemukan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {filteredMedia.map((a) => (
              <div
                key={a.id}
                className="glass overflow-hidden rounded-2xl"
              >
                <img
                  src={a.url}
                  alt={a.alt_text || a.name}
                  className="aspect-square w-full object-cover"
                />

                <div className="p-3">
                  <p className="truncate text-sm font-bold">
                    {a.name}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    {a.category} ·{' '}
                    {(Number(a.size_bytes || 0) / 1024 / 1024).toFixed(2)} MB
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => copyUrl(a.url)}
                      className="btn btn-muted px-2 py-2 text-[11px]"
                    >
                      Copy URL
                    </button>

                    <button
                      onClick={() => deleteMedia(a)}
                      className="btn btn-muted px-2 py-2 text-[11px] text-red-300"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {!filteredMedia.length && (
              <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">
                Belum ada media pada filter ini.
              </div>
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          USERS
      ===================================================== */}

      {tab === 'users' && (
        <section className="mt-7 space-y-3">
          <div className="glass rounded-2xl p-5">
            <h2 className="text-xl font-black">
              Customer & Wallet
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Suspend/aktifkan, kelola role, dan Owner
              dapat menambah atau mengurangi saldo dengan
              alasan serta riwayat audit.
            </p>
          </div>

          {users.map((u) => {
            const balance =
              Number(
                wallets.find(
                  (w) =>
                    w.user_id ===
                    u.id
                )?.balance ||
                  0
              )

            return (
              <div
                key={u.id}
                className="glass rounded-2xl p-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <b>
                      {u.name ||
                        u.username ||
                        'User'}
                    </b>

                    <p className="text-xs text-slate-500">
                      {u.email} ·{' '}
                      {u.role} ·{' '}
                      {u.is_suspended
                        ? 'Suspended'
                        : 'Aktif'}
                    </p>

                    <p className="mt-1 text-lg font-black text-cyan-300">
                      Saldo Rp{' '}
                      {balance.toLocaleString(
                        'id-ID'
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {role ===
                      'owner' && (
                      <>
                        <button
                          onClick={() =>
                            adjustWallet(
                              u,
                              1
                            )
                          }
                          className="btn btn-primary text-xs"
                        >
                          + Saldo
                        </button>

                        <button
                          onClick={() =>
                            adjustWallet(
                              u,
                              -1
                            )
                          }
                          className="btn btn-muted text-xs"
                        >
                          − Saldo
                        </button>

                        <button
                          onClick={() =>
                            suspend(u)
                          }
                          className="btn btn-muted text-xs"
                        >
                          {u.is_suspended
                            ? 'Aktifkan'
                            : 'Suspend'}
                        </button>

                        <button
                          onClick={() =>
                            changeRole(
                              u
                            )
                          }
                          className="btn btn-muted text-xs"
                        >
                          Ubah Role
                        </button>

                        {u.id !==
                          (users.find(
                            (x) =>
                              x.role ===
                              'owner'
                          )?.id ||
                            '') && (
                          <button
                            onClick={() =>
                              deleteUser(
                                u
                              )
                            }
                            className="btn btn-muted text-xs text-red-300"
                          >
                            Hapus Akun
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* =====================================================
          SETTINGS
      ===================================================== */}

      {tab === 'settings' && (
        <section className="mt-7 max-w-5xl">
          <div className="glass overflow-hidden rounded-3xl">
            <div className="border-b border-white/10 bg-gradient-to-r from-cyan-400/[.06] via-transparent to-purple-500/[.06] p-6 md:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[9px] font-black tracking-[.2em] text-cyan-300">
                      SYSTEM CONFIG
                    </span>
                    <span className="text-xs text-slate-600">ADMIN ONLY</span>
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Pengaturan Website
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    Atur identitas website dan kontak yang digunakan di seluruh halaman NDRAAAID.v1.
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3">
                  <p className="text-[9px] uppercase tracking-[.2em] text-slate-600">Status</p>
                  <p className="mt-1 text-sm font-black text-emerald-300">● ONLINE</p>
                </div>
              </div>
            </div>

            <form onSubmit={saveSettings} className="p-6 md:p-7">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Nama website</span>
                  <input
                    className="input w-full"
                    value={site.name || ''}
                    onChange={(e) => setSite({ ...site, name: e.target.value })}
                    placeholder="NDRAAAID.v1"
                  />
                  <span className="mt-1.5 block text-[11px] leading-5 text-slate-600">Nama brand yang tampil di website.</span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Tagline</span>
                  <input
                    className="input w-full"
                    value={site.tagline || ''}
                    onChange={(e) => setSite({ ...site, tagline: e.target.value })}
                    placeholder="Top Up Game Cepat, Aman & Terpercaya"
                  />
                  <span className="mt-1.5 block text-[11px] leading-5 text-slate-600">Teks pendek untuk identitas website.</span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">WhatsApp</span>
                  <input
                    className="input w-full"
                    value={site.whatsapp || ''}
                    onChange={(e) => setSite({ ...site, whatsapp: e.target.value })}
                    placeholder="62812..."
                    inputMode="numeric"
                  />
                  <span className="mt-1.5 block text-[11px] leading-5 text-slate-600">Gunakan format internasional, contoh 628123456789.</span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Instagram</span>
                  <input
                    className="input w-full"
                    value={site.instagram || ''}
                    onChange={(e) => setSite({ ...site, instagram: e.target.value })}
                    placeholder="https://instagram.com/..."
                  />
                  <span className="mt-1.5 block text-[11px] leading-5 text-slate-600">Link Instagram yang akan digunakan website.</span>
                </label>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.025] p-4 md:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-white">Maintenance mode</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Jika aktif, website dapat ditampilkan dalam mode pemeliharaan.</p>
                  </div>
                  <select
                    className="input w-full sm:w-40"
                    value={site.maintenance ? 'true' : 'false'}
                    onChange={(e) => setSite({ ...site, maintenance: e.target.value === 'true' })}
                  >
                    <option value="false">Off</option>
                    <option value="true">On</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-600">Perubahan tersimpan ke konfigurasi website.</p>
                <button type="submit" className="btn btn-primary min-w-40">
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* =====================================================
          CHAT
      ===================================================== */}

      {tab === 'chat' && (
        <section className="mt-7 grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
          <div className="space-y-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() =>
                  openRoom(
                    room
                  )
                }
                className={`glass w-full rounded-2xl p-4 text-left ${
                  activeRoom?.id ===
                  room.id
                    ? 'border-cyan-400/30'
                    : ''
                }`}
              >
                <b>
                  {room.profiles
                    ?.username ||
                    room.user_id.slice(
                      0,
                      8
                    )}
                </b>

                <p className="text-xs text-slate-500">
                  {room.status}
                </p>
              </button>
            ))}
          </div>

          <div className="glass flex min-h-[28rem] flex-col rounded-2xl p-4">
            <div className="flex-1 space-y-2 overflow-auto">
              {chatMessages.map(
                (m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl bg-white/5 p-3 text-sm"
                  >
                    {m.message}

                    <div className="mt-1 text-[10px] text-slate-500">
                      {new Date(
                        m.created_at
                      ).toLocaleString(
                        'id-ID'
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                className="input"
                value={
                  chatText
                }
                onChange={(e) =>
                  setChatText(
                    e.target.value
                  )
                }
                onKeyDown={(e) =>
                  e.key ===
                    'Enter' &&
                  sendChat()
                }
                placeholder="Balas user..."
              />

              <button
                onClick={
                  sendChat
                }
                className="btn btn-primary"
              >
                Kirim
              </button>
            </div>
          </div>
        </section>
      )}
        </div>
      </div>

      {editType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-cyan-400/20 bg-slate-950 p-5 shadow-2xl shadow-cyan-950/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-300">
                  EDIT CATALOG
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  {editType === 'category'
                    ? 'Edit Kategori'
                    : editType === 'game'
                      ? 'Edit Game'
                      : 'Edit Produk / Nominal'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Perubahan langsung diterapkan ke data website.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="rounded-xl border border-white/10 px-3 py-2 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {editType === 'category' && (
                <>
                  <input
                    className="input"
                    placeholder="Nama kategori"
                    value={editForm.name || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        name: e.target.value,
                      })
                    }
                  />
                  <input
                    className="input"
                    placeholder="Slug"
                    value={editForm.slug || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        slug: e.target.value,
                      })
                    }
                  />
                  <textarea
                    className="input min-h-24"
                    placeholder="Deskripsi"
                    value={editForm.description || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        description: e.target.value,
                      })
                    }
                  />
                </>
              )}

              {editType === 'game' && (
                <>
                  <input
                    className="input"
                    placeholder="Nama game"
                    value={editForm.name || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        name: e.target.value,
                      })
                    }
                  />
                  <input
                    className="input"
                    placeholder="Slug"
                    value={editForm.slug || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        slug: e.target.value,
                      })
                    }
                  />
                  <select
                    className="input"
                    value={editForm.category_id || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        category_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Tanpa kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="input min-h-24"
                    placeholder="Deskripsi"
                    value={editForm.description || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        description: e.target.value,
                      })
                    }
                  />
                  <input
                    className="input"
                    placeholder="URL logo game"
                    value={editForm.logo_url || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        logo_url: e.target.value,
                      })
                    }
                  />
                  <input
                    className="input"
                    placeholder="URL banner game"
                    value={editForm.banner_url || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        banner_url: e.target.value,
                      })
                    }
                  />
                </>
              )}

              {editType === 'product' && (
                <>
                  <select
                    className="input"
                    value={editForm.game_id || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        game_id: e.target.value,
                      })
                    }
                  >
                    {games.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>

                  <input
                    className="input"
                    placeholder="Nama produk"
                    value={editForm.name || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        name: e.target.value,
                      })
                    }
                  />

                  <input
                    className="input"
                    placeholder="Nominal"
                    value={editForm.nominal || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        nominal: e.target.value,
                      })
                    }
                  />

                  <input
                    className="input"
                    placeholder="SKU"
                    value={editForm.sku || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        sku: e.target.value,
                      })
                    }
                  />

                  <input
                    type="number"
                    min="0"
                    className="input"
                    placeholder="Harga"
                    value={editForm.price ?? ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        price: e.target.value,
                      })
                    }
                  />

                  <input
                    className="input"
                    placeholder="URL gambar produk"
                    value={editForm.image_url || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        image_url: e.target.value,
                      })
                    }
                  />

                  {editForm.image_url && (
                    <img
                      src={editForm.image_url}
                      alt="Preview produk"
                      className="h-24 w-24 rounded-xl object-cover"
                    />
                  )}
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="btn btn-muted"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="btn btn-primary"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
