'use client'

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  Bell,
  CircleDollarSign,
  CreditCard,
  Gamepad2,
  History,
  LayoutDashboard,
  MessageSquare,
  Package,
  Radio,
  Settings,
  RefreshCw,
  Lock,
  Unlock,
  Link2,
  Unlink,
  Zap,
  ShoppingCart,
  Ticket,
  Users,
  Wallet,
  WalletCards,
  Image as ImageIcon,
  Megaphone,
  Tags,
  Pencil,
  Trash2,
  Power,
  CheckCircle2,
  Clock3,
  XCircle,
  Star,
  Eye,
  EyeOff,
  Plus,
  Minus,
  type LucideIcon,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

const transitions: Record<string, string[]> = {
  PENDING_PAYMENT: ['PAYMENT_RECEIVED', 'CANCELLED', 'EXPIRED'],
  PAYMENT_RECEIVED: ['PROCESSING', 'FAILED', 'CANCELLED'],
  PROCESSING: ['SUCCESS', 'FAILED'],
}

const tabs = [
  'dashboard',
  'orders',
  'deposits',
  'deposit-history',
  'wallet-history',
  'categories',
  'games',
  'products',
  'provider-codes',
  'home-popular',
  'home-categories',
  'payments',
  'vouchers',
  'promotions',
  'broadcasts',
  'media',
  'users',
  'reviews',
  'settings',
  'chat',
]

const mediaCategories = [
  ['games', 'Logo Game'],
  ['promotions', 'Banner Promo'],
  ['general', 'Media Lainnya'],
]

const adminIcons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: ShoppingCart,
  deposits: WalletCards,
  'deposit-history': History,
  'wallet-history': Wallet,
  categories: Tags,
  games: Gamepad2,
  products: Package,
  'home-popular': Star,
  'home-categories': LayoutDashboard,
  payments: CreditCard,
  vouchers: Ticket,
  promotions: Megaphone,
  broadcasts: Radio,
  media: ImageIcon,
  users: Users,
  reviews: MessageSquare,
  chat: MessageSquare,
  settings: Settings,
  'provider-codes': Link2,
}

type AdminMenuItem = readonly [string, string]
type AdminMenuGroup = { title: string; items: readonly AdminMenuItem[] }

function AdminFilterShell({
  active,
  onReset,
  children,
}: {
  active: boolean
  onReset: () => void
  children: ReactNode
}) {
  return (
    <div className="mt-3 rounded-xl border border-white/[.07] bg-black/20 p-2.5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
        <button type="button" onClick={onReset} disabled={!active} className="btn btn-muted shrink-0 text-xs disabled:cursor-not-allowed disabled:opacity-40">Reset Filter</button>
      </div>
    </div>
  )
}

const adminMenuGroups: readonly AdminMenuGroup[] = [
  {
    title: 'UTAMA',
    items: [['dashboard', 'Dashboard']],
  },
  {
    title: 'OPERASIONAL',
    items: [
      ['orders', 'Order'],
      ['deposits', 'Deposit'],
      ['deposit-history', 'Riwayat Deposit'],
      ['wallet-history', 'Riwayat Wallet'],
    ],
  },
  {
    title: 'KATALOG',
    items: [
      ['categories', 'Kategori'],
      ['games', 'Games'],
      ['products', 'Produk'],
      ['provider-codes', 'Kode Provider'],
    ],
  },
  {
    title: 'HOME',
    items: [
      ['home-popular', 'Game Populer'],
      ['home-categories', 'Kategori Home'],
    ],
  },
  {
    title: 'SISTEM',
    items: [
      ['payments', 'Pembayaran'],
      ['vouchers', 'Voucher'],
      ['promotions', 'Banner Promo'],
      ['broadcasts', 'Live Broadcast'],
      ['media', 'Media Manager'],
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      ['users', 'Member & Wallet'],
      ['reviews', 'Ulasan & Running Text'],
      ['chat', 'Live Chat'],
      ['settings', 'Pengaturan'],
    ],
  },
] as const

const GAME_FIELD_OPTIONS = [
  { key: 'user_id', label: 'User ID', placeholder: 'Masukkan User ID' },
  { key: 'server', label: 'Server ID', placeholder: 'Masukkan Server ID' },
  { key: 'zone_id', label: 'Zone ID', placeholder: 'Masukkan Zone ID' },
  { key: 'player_id', label: 'Player ID', placeholder: 'Masukkan Player ID' },
  { key: 'uid', label: 'UID', placeholder: 'Masukkan UID' },
  { key: 'riot_id', label: 'Riot ID', placeholder: 'Nama#Tag' },
  { key: 'nickname', label: 'Nickname', placeholder: 'Masukkan Nickname' },
  { key: 'phone', label: 'Nomor HP', placeholder: '08xxxxxxxxxx' },
  { key: 'email', label: 'Email', placeholder: 'nama@email.com' },
]

export default function Admin() {
  const [tab, setTab] = useState('dashboard')
  const liveRefreshBusy = useRef(false)

  function changeTab(nextTab: string) {
    // Perpindahan menu dilakukan dengan state saja.
    // Jangan reload halaman karena akan mengembalikan scroll/posisi
    // dan terasa seperti menu 'memantul' setiap kali disentuh.
    sessionStorage.setItem('admin_active_tab', nextTab)
    setTab(nextTab)
  }

  const [role, setRole] = useState('')
  const [msg, setMsg] = useState('')

  const [editType, setEditType] = useState<'category' | 'game' | 'product' | 'payment' | null>(null)
  const [editId, setEditId] = useState('')
  const [editForm, setEditForm] = useState<any>({})

  const [orders, setOrders] = useState<any[]>([])
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('')
  const [orderDateFilter, setOrderDateFilter] = useState('')
  const [orderMemberFilter, setOrderMemberFilter] = useState('')
  const [orderGameFilter, setOrderGameFilter] = useState('')

  const [depositSearch, setDepositSearch] = useState('')
  const [depositStatusFilter, setDepositStatusFilter] = useState('')
  const [depositMethodFilter, setDepositMethodFilter] = useState('')
  const [depositDateFilter, setDepositDateFilter] = useState('')

  const [depositHistorySearch, setDepositHistorySearch] = useState('')
  const [depositHistoryStatusFilter, setDepositHistoryStatusFilter] = useState('')
  const [depositHistoryMethodFilter, setDepositHistoryMethodFilter] = useState('')
  const [depositHistoryDateFilter, setDepositHistoryDateFilter] = useState('')

  const [walletSearch, setWalletSearch] = useState('')
  const [walletTypeFilter, setWalletTypeFilter] = useState('')
  const [walletDateFilter, setWalletDateFilter] = useState('')

  const [categorySearch, setCategorySearch] = useState('')
  const [categoryStatusFilter, setCategoryStatusFilter] = useState('')

  const [gameSearch, setGameSearch] = useState('')
  const [gameCategoryFilter, setGameCategoryFilter] = useState('')
  const [gameStatusFilter, setGameStatusFilter] = useState('')
  const [gamePopularFilter, setGamePopularFilter] = useState('')

  const [productSearch, setProductSearch] = useState('')
  const [productGameFilter, setProductGameFilter] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('')
  const [productStatusFilter, setProductStatusFilter] = useState('')
  const [productPopularFilter, setProductPopularFilter] = useState('')
  const [productPriceSort, setProductPriceSort] = useState('')

  const [homePopularSearch, setHomePopularSearch] = useState('')
  const [homePopularCategoryFilter, setHomePopularCategoryFilter] = useState('')
  const [homePopularStatusFilter, setHomePopularStatusFilter] = useState('')
  const [homeCategorySearch, setHomeCategorySearch] = useState('')
  const [homeCategoryStatusFilter, setHomeCategoryStatusFilter] = useState('')

  const [paymentSearch, setPaymentSearch] = useState('')
  const [paymentKindFilter, setPaymentKindFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')

  const [voucherSearch, setVoucherSearch] = useState('')
  const [voucherStatusFilter, setVoucherStatusFilter] = useState('')
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('')

  const [voucherUsageSearch, setVoucherUsageSearch] = useState('')
  const [voucherUsageDateFilter, setVoucherUsageDateFilter] = useState('')

  const [broadcastSearch, setBroadcastSearch] = useState('')
  const [broadcastStatusFilter, setBroadcastStatusFilter] = useState('')
  const [broadcastTypeFilter, setBroadcastTypeFilter] = useState('')
  const [broadcastDateFilter, setBroadcastDateFilter] = useState('')

  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('')

  const [reviewSearch, setReviewSearch] = useState('')
  const [reviewRatingFilter, setReviewRatingFilter] = useState('')
  const [reviewModerationFilter, setReviewModerationFilter] = useState('')
  const [providerCatalog, setProviderCatalog] = useState<any[]>([])
  const [providerSearch, setProviderSearch] = useState('')
  const [providerCategoryFilter, setProviderCategoryFilter] = useState('')
  const [providerBrandFilter, setProviderBrandFilter] = useState('')
  const [providerMappingFilter, setProviderMappingFilter] = useState('')
  const [providerAvailabilityFilter, setProviderAvailabilityFilter] = useState('')
  const [providerPage, setProviderPage] = useState(1)
  const [providerPageSize, setProviderPageSize] = useState(25)
  const [providerSyncing, setProviderSyncing] = useState(false)
  const [providerBusySku, setProviderBusySku] = useState('')
  const [mappingTarget, setMappingTarget] = useState<any>(null)
  const [mappingProductId, setMappingProductId] = useState('')
  const [mappingProductSearch, setMappingProductSearch] = useState('')
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
  const [homeRunningText, setHomeRunningText] = useState<any>({
    text_content: '',
    is_active: false,
    speed_ms: 18000,
  })
  const [customerReviews, setCustomerReviews] = useState<any[]>([])
  const [activeRoom, setActiveRoom] = useState<any>()
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatText, setChatText] = useState('')

  const [mediaCategory, setMediaCategory] = useState('general')
  const [mediaSearch, setMediaSearch] = useState('')
  const [mediaUploading, setMediaUploading] = useState(false)
  const [mediaGameId, setMediaGameId] = useState('')
  const [mediaPromoCustomText, setMediaPromoCustomText] = useState('')
  const [mediaPromoTitle, setMediaPromoTitle] = useState('')
  const [mediaPromoDescription, setMediaPromoDescription] = useState('')
  const [mediaPromoCode, setMediaPromoCode] = useState('')
  const [mediaPromoType, setMediaPromoType] = useState<'text' | 'image' | 'both'>('both')
  const [pendingPromoImageUrl, setPendingPromoImageUrl] = useState('')

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

  const [selectedGameFields, setSelectedGameFields] = useState<string[]>(['user_id'])
  const [customGameField, setCustomGameField] = useState({ key: '', label: '', placeholder: '' })

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

  const dateMatches = (value: any, filter: string) =>
    !filter || String(value || '').slice(0, 10) === filter

  const limitAdminItems = <T,>(items: T[], active: boolean) =>
    active ? items : items.slice(0, 3)

  const depositFilterActive = Boolean(depositSearch || depositStatusFilter || depositMethodFilter || depositDateFilter)
  const filteredPendingDeposits = deposits.filter((d) => {
    const q = depositSearch.trim().toLowerCase()
    const member = d.profiles?.name || d.profiles?.username || d.profiles?.email || ''
    const method = d.payment_methods?.name || d.payment_methods?.kind || ''
    return d.status === 'PENDING' &&
      (!q || [d.deposit_code, member, method, d.status].some((v) => String(v || '').toLowerCase().includes(q))) &&
      (!depositStatusFilter || d.status === depositStatusFilter) &&
      (!depositMethodFilter || d.payment_methods?.kind === depositMethodFilter || d.payment_methods?.name === depositMethodFilter) &&
      dateMatches(d.created_at, depositDateFilter)
  })

  const depositHistoryFilterActive = Boolean(depositHistorySearch || depositHistoryStatusFilter || depositHistoryMethodFilter || depositHistoryDateFilter)
  const filteredDepositHistory = deposits.filter((d) => {
    const q = depositHistorySearch.trim().toLowerCase()
    const member = d.profiles?.name || d.profiles?.username || d.profiles?.email || ''
    const method = d.payment_methods?.name || d.payment_methods?.kind || ''
    return (!q || [d.deposit_code, member, method, d.status].some((v) => String(v || '').toLowerCase().includes(q))) &&
      (!depositHistoryStatusFilter || d.status === depositHistoryStatusFilter) &&
      (!depositHistoryMethodFilter || d.payment_methods?.kind === depositHistoryMethodFilter || d.payment_methods?.name === depositHistoryMethodFilter) &&
      dateMatches(d.created_at, depositHistoryDateFilter)
  })

  const walletFilterActive = Boolean(walletSearch || walletTypeFilter || walletDateFilter)
  const filteredWalletTx = walletTx.filter((tx) => {
    const q = walletSearch.trim().toLowerCase()
    const member = tx.profiles?.name || tx.profiles?.username || tx.profiles?.email || tx.user_id || ''
    return (!q || [member, tx.type, tx.reason].some((v) => String(v || '').toLowerCase().includes(q))) &&
      (!walletTypeFilter || tx.type === walletTypeFilter) &&
      dateMatches(tx.created_at, walletDateFilter)
  })

  const categoryFilterActive = Boolean(categorySearch || categoryStatusFilter)
  const filteredCategories = categories.filter((c) => {
    const q = categorySearch.trim().toLowerCase()
    return (!q || [c.name, c.slug, c.description].some((v) => String(v || '').toLowerCase().includes(q))) &&
      (!categoryStatusFilter || (categoryStatusFilter === 'active' ? c.is_active !== false : c.is_active === false))
  })

  const gameFilterActive = Boolean(gameSearch || gameCategoryFilter || gameStatusFilter || gamePopularFilter)
  const filteredGames = games.filter((g) => {
    const q = gameSearch.trim().toLowerCase()
    return (!q || [g.name, g.slug, g.description].some((v) => String(v || '').toLowerCase().includes(q))) &&
      (!gameCategoryFilter || g.category_id === gameCategoryFilter) &&
      (!gameStatusFilter || (gameStatusFilter === 'active' ? g.is_active !== false : g.is_active === false)) &&
      (!gamePopularFilter || (gamePopularFilter === 'popular' ? Boolean(g.popular) : !Boolean(g.popular)))
  })

  const productFilterActive = Boolean(productSearch || productGameFilter || productCategoryFilter || productStatusFilter || productPopularFilter || productPriceSort)
  const filteredProducts = products.filter((p) => {
    const q = productSearch.trim().toLowerCase()
    const gameName = p.games?.name || ''
    return (!q || [p.name, p.nominal, p.sku, gameName].some((v) => String(v || '').toLowerCase().includes(q))) &&
      (!productGameFilter || p.game_id === productGameFilter) &&
      (!productCategoryFilter || p.games?.category_id === productCategoryFilter) &&
      (!productStatusFilter || (productStatusFilter === 'active' ? p.is_active !== false : p.is_active === false)) &&
      (!productPopularFilter || (productPopularFilter === 'popular' ? Boolean(p.games?.popular) : !Boolean(p.games?.popular)))
  }).sort((a, b) => {
    if (productPriceSort === 'asc') return Number(a.price || 0) - Number(b.price || 0)
    if (productPriceSort === 'desc') return Number(b.price || 0) - Number(a.price || 0)
    return 0
  })

  const paymentFilterActive = Boolean(paymentSearch || paymentKindFilter || paymentStatusFilter)
  const filteredHomePopularGames = games.filter((g) => {
    const q = homePopularSearch.trim().toLowerCase()
    const matchesSearch = !q || [g.name, g.slug, g.game_categories?.name].some((v) => String(v || '').toLowerCase().includes(q))
    const matchesCategory = !homePopularCategoryFilter || g.category_id === homePopularCategoryFilter
    const matchesStatus = !homePopularStatusFilter || (homePopularStatusFilter === 'active' ? g.is_active !== false : g.is_active === false)
    return matchesSearch && matchesCategory && matchesStatus
  })

  const filteredHomeCategories = categories.filter((c) => {
    const q = homeCategorySearch.trim().toLowerCase()
    const matchesSearch = !q || [c.name, c.slug].some((v) => String(v || '').toLowerCase().includes(q))
    const matchesStatus = !homeCategoryStatusFilter || (homeCategoryStatusFilter === 'visible' ? c.show_on_home !== false : c.show_on_home === false)
    return matchesSearch && matchesStatus
  })

  const filteredMethods = methods.filter((m) => {
    const q = paymentSearch.trim().toLowerCase()
    return (!q || [m.name, m.kind, m.account_name, m.account_number].some((v) => String(v || '').toLowerCase().includes(q))) &&
      (!paymentKindFilter || m.kind === paymentKindFilter) &&
      (!paymentStatusFilter || (paymentStatusFilter === 'active' ? m.is_active !== false : m.is_active === false))
  })

  const voucherFilterActive = Boolean(voucherSearch || voucherStatusFilter || voucherTypeFilter)
  const filteredVouchers = vouchers.filter((v) => {
    const q = voucherSearch.trim().toLowerCase()
    return (!q || [v.code, v.discount_type].some((x) => String(x || '').toLowerCase().includes(q))) &&
      (!voucherStatusFilter || (voucherStatusFilter === 'active' ? v.is_active !== false : v.is_active === false)) &&
      (!voucherTypeFilter || v.discount_type === voucherTypeFilter)
  })

  const voucherUsageFilterActive = Boolean(voucherUsageSearch || voucherUsageDateFilter)
  const filteredVoucherUsages = voucherUsages.filter((vu) => {
    const q = voucherUsageSearch.trim().toLowerCase()
    const user = vu.profiles?.username || vu.profiles?.name || vu.profiles?.email || vu.user_id || ''
    const order = vu.orders?.order_code || vu.order_id || ''
    return (!q || [vu.voucher_code, user, order].some((v) => String(v || '').toLowerCase().includes(q))) &&
      dateMatches(vu.used_at, voucherUsageDateFilter)
  })

  const broadcastFilterActive = Boolean(broadcastSearch || broadcastStatusFilter || broadcastTypeFilter || broadcastDateFilter)
  const filteredBroadcasts = broadcasts.filter((b) => {
    const q = broadcastSearch.trim().toLowerCase()
    return (!q || [b.title, b.message, b.type].some((v) => String(v || '').toLowerCase().includes(q))) &&
      (!broadcastStatusFilter || (broadcastStatusFilter === 'active' ? b.is_active !== false : b.is_active === false)) &&
      (!broadcastTypeFilter || b.type === broadcastTypeFilter) &&
      dateMatches(b.created_at, broadcastDateFilter)
  })

  const userFilterActive = Boolean(userSearch || userRoleFilter || userStatusFilter)
  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase()
    return (!q || [u.name, u.username, u.email].some((v) => String(v || '').toLowerCase().includes(q))) &&
      (!userRoleFilter || u.role === userRoleFilter) &&
      (!userStatusFilter || (userStatusFilter === 'active' ? !u.is_suspended : Boolean(u.is_suspended)))
  })

  const reviewFilterActive = Boolean(reviewSearch || reviewRatingFilter || reviewModerationFilter)
  const providerCategories = Array.from(new Set(providerCatalog.map((x) => x.provider_category).filter(Boolean))).sort()
  const providerBrands = Array.from(new Set(providerCatalog.map((x) => x.provider_brand).filter(Boolean))).sort()
  const providerIsAvailable = (x: any) => x.buyer_product_status !== false && x.seller_product_status !== false
  const providerFiltered = providerCatalog.filter((x) => {
    const q = providerSearch.trim().toLowerCase()
    const mapped = Boolean(x.mapped_product_id)
    const unavailable = mapped && !providerIsAvailable(x)
    return (!q || [x.provider_name, x.provider_sku, x.provider_brand, x.provider_category].some((v) => String(v || '').toLowerCase().includes(q))) &&
      (!providerCategoryFilter || x.provider_category === providerCategoryFilter) &&
      (!providerBrandFilter || x.provider_brand === providerBrandFilter) &&
      (!providerMappingFilter ||
        (providerMappingFilter === 'mapped' && mapped && !unavailable) ||
        (providerMappingFilter === 'unmapped' && !mapped) ||
        (providerMappingFilter === 'unavailable' && unavailable)) &&
      (!providerAvailabilityFilter ||
        (providerAvailabilityFilter === 'active' && providerIsAvailable(x)) ||
        (providerAvailabilityFilter === 'inactive' && !providerIsAvailable(x)))
  })
  const providerPageCount = Math.max(1, Math.ceil(providerFiltered.length / providerPageSize))
  const providerPageRows = providerFiltered.slice((providerPage - 1) * providerPageSize, providerPage * providerPageSize)
  const providerMappingProducts = products.filter((p) => {
    const q = mappingProductSearch.trim().toLowerCase()
    return !q || [p.name, p.nominal, p.sku, p.games?.name].some((v) => String(v || '').toLowerCase().includes(q))
  })
  const filteredCustomerReviews = customerReviews.filter((review) => {
    const q = reviewSearch.trim().toLowerCase()
    return (!q || [review.reviewer_display, review.review_text, review.order_id].some((v) => String(v || '').toLowerCase().includes(q))) &&
      (!reviewRatingFilter || Number(review.rating) === Number(reviewRatingFilter)) &&
      (!reviewModerationFilter || (reviewModerationFilter === 'approved' ? Boolean(review.is_approved) : !Boolean(review.is_approved)))
  })

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
      { data: rt },
      { data: rv },
      { data: pc },
    ] = await Promise.all([
      s
        .from('orders')
        .select(
          'id,order_code,status,total,subtotal,discount,voucher_code,created_at,games(id,name),profiles(id,username,name,email)'
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
        .select('*,games(id,name,category_id,popular)')
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
        .select(
          'id,name,custom_text,description,code,banner_url,content_type,is_active,starts_at,ends_at'
        )
        .order('is_active', { ascending: false }),

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

      s
        .from('home_running_text')
        .select('id,text_content,is_active,speed_ms')
        .eq('id', true)
        .maybeSingle(),

      s
        .from('customer_reviews')
        .select('id,order_id,user_id,reviewer_display,rating,review_text,is_approved,created_at,updated_at')
        .order('created_at', { ascending: false })
        .limit(200),

      s
        .from('provider_catalog')
        .select('*,game_products:mapped_product_id(id,name,nominal,sku,price,games:game_id(name))')
        .eq('provider', 'digiflazz')
        .order('provider_category')
        .order('provider_brand')
        .order('provider_price'),
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
    setHomeRunningText(rt || { text_content: '', is_active: false, speed_ms: 18000 })
    setCustomerReviews(rv || [])
    setProviderCatalog(pc || [])
    setProviderPage(1)

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

  async function reloadProviderCatalog() {
    const { data, error } = await s
      .from('provider_catalog')
      .select('*,game_products:mapped_product_id(id,name,nominal,sku,price,games:game_id(name))')
      .eq('provider', 'digiflazz')
      .order('provider_category')
      .order('provider_brand')
      .order('provider_price')
    if (error) throw error
    setProviderCatalog(data || [])
    setProviderPage(1)
  }

  async function providerAction(action: string, payload: Record<string, any> = {}) {
    setMsg('')
    const { data, error } = await s.functions.invoke('digiflazz-mapping', {
      body: { action, ...payload },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data
  }

  async function syncDigiflazz() {
  setMsg('Sinkronisasi Digiflazz...')

  try {
    // Tandai waktu mulai supaya jumlah produk yang benar-benar
    // diperbarui oleh proses sync bisa dihitung langsung dari DB.
    const syncStartedAt = new Date().toISOString()

    const { data, error } = await s.functions.invoke('digiflazz-sync', {
      body: { action: 'sync' },
    })

    if (error) {
      let detail = error.message || 'Gagal sinkronisasi'

      try {
        const ctx = (error as any)?.context

        if (ctx?.json) {
          const body = await ctx.json()

          if (body?.error) {
            detail = body.error
          }
        }
      } catch {}

      throw new Error(detail)
    }

    if (data?.error) {
      throw new Error(data.error)
    }

    // Reload katalog agar tabel langsung mengambil data terbaru.
    await reloadProviderCatalog()

    // Hitung total katalog Digiflazz.
    const { count: totalCount, error: totalError } = await s
      .from('provider_catalog')
      .select('id', { count: 'exact', head: true })
      .eq('provider', 'digiflazz')

    // Hitung produk yang benar-benar tersentuh oleh sync ini.
    const { count: recentCount, error: recentError } = await s
      .from('provider_catalog')
      .select('id', { count: 'exact', head: true })
      .eq('provider', 'digiflazz')
      .gte('last_synced_at', syncStartedAt)

    const synced =
      !recentError && recentCount != null
        ? recentCount
        : Number(
            data?.synced ??
            data?.count ??
            data?.received ??
            0
          )

    const total =
      !totalError && totalCount != null
        ? totalCount
        : Number(
            data?.count ??
            data?.received ??
            0
          )

    setMsg(
      `Sinkron Digiflazz selesai: ${synced} produk diperbarui. Total katalog: ${total}.`
    )
  } catch (e: any) {
    setMsg(
      `Sinkron Digiflazz gagal: ${
        e?.message || 'Gagal sinkronisasi'
      }`
    )
  }
}

  async function autoMapDigiflazz() {
  setProviderBusySku('__AUTO__')

  try {
    const { data: catalog, error: ce } = await s
      .from('provider_catalog')
      .select(
        'id,provider_sku,provider_name,provider_brand,provider_type,mapped_product_id,mapping_locked'
      )
      .eq('provider', 'digiflazz')

    if (ce) throw ce

    const { data: products, error: pe } = await s
      .from('game_products')
      .select('id,name,nominal,sku,game_id,games:game_id(name)')

    if (pe) throw pe

    const allCatalog = catalog || []
    const allProducts = products || []

    const used = new Set<string>(
      allCatalog
        .filter((x: any) => x.mapped_product_id)
        .map((x: any) => String(x.mapped_product_id))
    )

    let mapped = 0

    const normalize = (value: any) =>
      String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')

    const digits = (value: any) =>
      String(value || '').replace(/\D/g, '')

    for (const c of allCatalog) {
      if (c.mapping_locked || c.mapped_product_id) continue

      const providerSku = normalize(c.provider_sku)
      const providerName = normalize(c.provider_name)
      const providerBrand = normalize(c.provider_brand)

      let match: any = null

      // 1. Exact SKU
      const skuMatches = allProducts.filter(
        (p: any) =>
          !used.has(String(p.id)) &&
          providerSku !== '' &&
          normalize(p.sku) === providerSku
      )

      if (skuMatches.length === 1) {
        match = skuMatches[0]
      }

      // 2. SKU contains / contained
      if (!match && providerSku) {
        const fuzzySku = allProducts.filter((p: any) => {
          if (used.has(String(p.id))) return false

          const ps = normalize(p.sku)
          if (!ps) return false

          return ps === providerSku ||
            ps.includes(providerSku) ||
            providerSku.includes(ps)
        })

        if (fuzzySku.length === 1) {
          match = fuzzySku[0]
        }
      }

      // 3. Brand/game + nominal
      if (!match) {
        const providerNumbers = digits(c.provider_name)

        if (providerNumbers) {
          const brandMatches = allProducts.filter((p: any) => {
            if (used.has(String(p.id))) return false

            const gameName = normalize(p.games?.name)
            const productName = normalize(p.name)
            const productNumbers = digits(p.nominal)

            if (!productNumbers || productNumbers !== providerNumbers) {
              return false
            }

            const brandMatch =
              (providerBrand &&
                (gameName.includes(providerBrand) ||
                  providerBrand.includes(gameName) ||
                  productName.includes(providerBrand) ||
                  providerBrand.includes(productName))) ||
              (providerName &&
                (gameName.includes(providerName) ||
                  providerName.includes(gameName) ||
                  productName.includes(providerName) ||
                  providerName.includes(productName)))

            return Boolean(brandMatch)
          })

          if (brandMatches.length === 1) {
            match = brandMatches[0]
          }
        }
      }

      // 4. Nominal dari nama produk provider + kecocokan nama
      if (!match) {
        const providerNumbers = digits(c.provider_name)

        if (providerNumbers) {
          const nameMatches = allProducts.filter((p: any) => {
            if (used.has(String(p.id))) return false

            const gameName = normalize(p.games?.name)
            const productName = normalize(p.name)
            const productNumbers = digits(p.nominal)

            if (
              !productNumbers ||
              productNumbers !== providerNumbers
            ) {
              return false
            }

            if (!providerName && !providerBrand) return false

            return (
              (providerName &&
                (providerName.includes(gameName) ||
                  gameName.includes(providerName) ||
                  providerName.includes(productName) ||
                  productName.includes(providerName))) ||
              (providerBrand &&
                (providerBrand.includes(gameName) ||
                  gameName.includes(providerBrand) ||
                  providerBrand.includes(productName) ||
                  productName.includes(providerBrand)))
            )
          })

          if (nameMatches.length === 1) {
            match = nameMatches[0]
          }
        }
      }

      if (!match) continue

      const { error: ue } = await s
        .from('provider_catalog')
        .update({
          mapped_product_id: match.id,
          mapped_at: new Date().toISOString(),
        })
        .eq('id', c.id)
        .is('mapped_product_id', null)

      if (ue) throw ue

      const { error: upe } = await s
        .from('provider_products')
        .upsert(
          {
            provider: 'digiflazz',
            product_id: match.id,
            provider_sku: c.provider_sku,
            provider_name: c.provider_name,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'provider,provider_sku',
          }
        )

      if (upe) throw upe

      used.add(String(match.id))
      mapped++
    }

    await reloadProviderCatalog()

    setMsg(`Auto mapping selesai: ${mapped} produk terhubung.`)
  } catch (e: any) {
    setMsg(
      `Auto mapping gagal: ${
        e?.message || 'Gagal melakukan auto mapping'
      }`
    )
  } finally {
    setProviderBusySku(null)
  }
}

  async function saveProviderMapping() {
    if (!mappingTarget || !mappingProductId) return
    setProviderBusySku(mappingTarget.provider_sku)
    try {
      await providerAction('map', { provider_sku: mappingTarget.provider_sku, product_id: mappingProductId })
      await reloadProviderCatalog()
      setMappingTarget(null)
      setMappingProductId('')
      setMappingProductSearch('')
      setMsg('Mapping provider berhasil disimpan.')
    } catch (e: any) {
      setMsg(`Mapping gagal: ${e?.message || String(e)}`)
    } finally {
      setProviderBusySku('')
    }
  }

  async function unmapProvider(row: any) {
    if (!window.confirm(`Lepas mapping ${row.provider_sku}?`)) return
    setProviderBusySku(row.provider_sku)
    try {
      await providerAction('unmap', { provider_sku: row.provider_sku })
      await reloadProviderCatalog()
      setMsg('Mapping dilepas.')
    } catch (e: any) {
      setMsg(`Unmap gagal: ${e?.message || String(e)}`)
    } finally {
      setProviderBusySku('')
    }
  }

  async function toggleProviderLock(row: any) {
    setProviderBusySku(row.provider_sku)
    try {
      await providerAction(row.mapping_locked ? 'unlock' : 'lock', { provider_sku: row.provider_sku })
      await reloadProviderCatalog()
      setMsg(row.mapping_locked ? 'Mapping dibuka.' : 'Mapping dikunci.')
    } catch (e: any) {
      setMsg(`Lock/unlock gagal: ${e?.message || String(e)}`)
    } finally {
      setProviderBusySku('')
    }
  }

  async function refreshLiveData() {
    if (liveRefreshBusy.current) return
    liveRefreshBusy.current = true

    try {
      // Silent background refresh: hanya data operasional yang cepat berubah.
      // Tidak mengubah tab, tidak reload halaman, dan tidak menyentuh form yang
      // sedang diedit oleh admin.
      const [
        { data: latestOrders },
        { data: latestDeposits },
        { data: latestWalletTx },
      ] = await Promise.all([
        s
          .from('orders')
          .select(
            'id,order_code,status,total,subtotal,discount,voucher_code,created_at,games(id,name),profiles(id,username,name,email)'
          )
          .order('created_at', { ascending: false })
          .limit(200),
        s
          .from('member_deposits')
          .select(`
            *,
            profiles:profiles!member_deposits_user_id_fkey(username,email,name),
            payment_methods:payment_methods!member_deposits_payment_method_id_fkey(name,kind)
          `)
          .order('created_at', { ascending: false })
          .limit(200),
        s
          .from('wallet_transactions')
          .select('*,profiles(username,email)')
          .order('created_at', { ascending: false })
          .limit(200),
      ])

      if (latestOrders) setOrders(latestOrders)
      if (latestDeposits) setDeposits(latestDeposits)
      if (latestWalletTx) setWalletTx(latestWalletTx)
    } finally {
      liveRefreshBusy.current = false
    }
  }

  useEffect(() => {
    const savedTab = sessionStorage.getItem('admin_active_tab')
    if (savedTab && tabs.includes(savedTab)) {
      setTab(savedTab)
      sessionStorage.removeItem('admin_active_tab')
    }

    load()

    // Auto-sync setiap 8 detik tanpa reload halaman.
    // Admin tetap berada di menu, posisi scroll, filter, dan form tidak terganggu.
    const interval = window.setInterval(() => {
      refreshLiveData()
    }, 8000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const promo = promos[0]
    if (!promo) return

    setMediaPromoCustomText(promo.custom_text || '')
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

  async function saveHomeRunningText() {
    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat mengatur Running Text.')
      return
    }

    const payload = {
      id: true,
      text_content: String(homeRunningText.text_content || '').trim(),
      is_active: Boolean(homeRunningText.is_active),
      speed_ms: Math.max(8000, Math.min(60000, Number(homeRunningText.speed_ms || 18000))),
    }

    const { error } = await s
      .from('home_running_text')
      .upsert(payload, { onConflict: 'id' })

    setMsg(error?.message || 'Running Text berhasil disimpan.')
    if (!error) load()
  }

  async function moderateCustomerReview(review: any, approved: boolean) {
    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat memoderasi ulasan.')
      return
    }

    const { error } = await s
      .from('customer_reviews')
      .update({ is_approved: approved, updated_at: new Date().toISOString() })
      .eq('id', review.id)

    setMsg(error?.message || (approved ? 'Ulasan ditampilkan di Home.' : 'Ulasan disembunyikan dari Home.'))
    if (!error) load()
  }

  async function deleteCustomerReview(review: any) {
    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat menghapus ulasan.')
      return
    }

    if (!confirm(`Hapus ulasan dari ${review.reviewer_display || 'pelanggan'}?`)) return

    const { error } = await s
      .from('customer_reviews')
      .delete()
      .eq('id', review.id)

    setMsg(error?.message || 'Ulasan berhasil dihapus.')
    if (!error) load()
  }

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

  async function addGameWithFields(e: FormEvent) {
    e.preventDefault()
    if (!['owner', 'admin'].includes(role)) return

    const gamePayload = {
      ...gameForm,
      name: String(gameForm.name || '').trim(),
      slug: String(gameForm.slug || '').trim().toLowerCase().replace(/\s+/g, '-'),
      description: String(gameForm.description || '').trim() || null,
      category_id: gameForm.category_id || null,
      logo_url: String(gameForm.logo_url || '').trim() || null,
      banner_url: String(gameForm.banner_url || '').trim() || null,
      is_active: true,
      popular: false,
    }

    if (!gamePayload.name || !gamePayload.slug) {
      setMsg('Nama dan slug game wajib diisi.')
      return
    }

    const { data: createdGame, error: gameError } = await s
      .from('games')
      .insert(gamePayload)
      .select('id')
      .single()

    if (gameError || !createdGame) {
      setMsg(gameError?.message || 'Game gagal ditambahkan.')
      return
    }

    const fields = selectedGameFields.map((key, index) => {
      const option = GAME_FIELD_OPTIONS.find((item) => item.key === key)!
      return {
        game_id: createdGame.id,
        key: option.key,
        label: option.label,
        placeholder: option.placeholder,
        required: true,
        sort_order: index + 1,
      }
    })

    const customKey = customGameField.key.trim().toLowerCase().replace(/\s+/g, '_')
    const customLabel = customGameField.label.trim()
    if (customKey && customLabel) {
      fields.push({
        game_id: createdGame.id,
        key: customKey,
        label: customLabel,
        placeholder: customGameField.placeholder.trim() || null,
        required: true,
        sort_order: fields.length + 1,
      } as any)
    }

    if (fields.length) {
      const { error: fieldsError } = await s.from('game_fields').insert(fields)
      if (fieldsError) {
        setMsg(`Game berhasil dibuat, tetapi field gagal disimpan: ${fieldsError.message}`)
      } else {
        setMsg('Game dan field data akun berhasil ditambahkan.')
      }
    } else {
      setMsg('Game berhasil ditambahkan tanpa field data akun.')
    }

    setGameForm({ name: '', slug: '', description: '', logo_url: '', banner_url: '', category_id: categories[0]?.id || '' })
    setSelectedGameFields(['user_id'])
    setCustomGameField({ key: '', label: '', placeholder: '' })
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


  async function deleteGame(game: any) {
    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat menghapus game.')
      return
    }

    const label = game?.name || 'Game'
    if (!confirm(`Hapus game "${label}"?\n\nGame, field akun, dan produk/nominal yang masih terhubung dapat ikut terhapus. Riwayat transaksi yang memiliki referensi game dapat membuat penghapusan ditolak database.`)) return

    // Hapus konfigurasi field dan produk milik game terlebih dahulu.
    // Jika database masih memiliki riwayat transaksi yang mereferensikan data tersebut,
    // operasi akan dihentikan dan data tidak dihapus sebagian.
    const { error: fieldsError } = await s.from('game_fields').delete().eq('game_id', game.id)
    if (fieldsError) {
      setMsg(`Game tidak dapat dihapus. ${fieldsError.message}`)
      return
    }

    const { error: productsError } = await s.from('game_products').delete().eq('game_id', game.id)
    if (productsError) {
      setMsg(`Game tidak dapat dihapus karena produk masih terhubung transaksi. ${productsError.message}`)
      return
    }

    const { error: gameError } = await s.from('games').delete().eq('id', game.id)
    if (gameError) {
      setMsg(`Game tidak dapat dihapus. ${gameError.message}`)
      return
    }

    setMsg(`Game ${label} berhasil dihapus.`)
    load()
  }

  async function togglePopular(game: any) {
    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat mengatur Game Populer.')
      return
    }

    const next = !Boolean(game.popular)
    const currentPopularCount = games.filter((g) => Boolean(g.popular)).length
    if (next && currentPopularCount >= 9) {
      setMsg('Maksimal 9 game untuk Game Populer. Keluarkan salah satu game terlebih dahulu.')
      return
    }

    const { error } = await s.from('games').update({ popular: next }).eq('id', game.id)
    if (error) {
      setMsg(`Gagal mengubah Game Populer: ${error.message}`)
      return
    }

    setGames((current) => current.map((g) => g.id === game.id ? { ...g, popular: next } : g))
    setMsg(next ? `${game.name} ditambahkan ke Game Populer.` : `${game.name} dikeluarkan dari Game Populer.`)
  }

  async function toggleHomeCategory(category: any) {
    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat mengatur kategori Home.')
      return
    }

    const next = category.show_on_home === false
    const { error } = await s.from('game_categories').update({ show_on_home: next }).eq('id', category.id)
    if (error) {
      setMsg(`Gagal mengubah kategori Home: ${error.message}`)
      return
    }

    setCategories((current) => current.map((c) => c.id === category.id ? { ...c, show_on_home: next } : c))
    setMsg(next ? `${category.name} ditambahkan ke Home.` : `${category.name} dihapus dari Home.`)
  }

  async function resetHomeCategories() {
    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat mereset kategori Home.')
      return
    }

    if (!confirm('Reset kategori Home? Semua kategori tambahan akan disembunyikan. Game Populer dan game-nya tetap aman/tidak berubah. Kategori utama Mobile Games, PC Games, Voucher Digital, dan Console tetap tampil.')) return

    const { error: hideError } = await s
      .from('game_categories')
      .update({ show_on_home: false })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (hideError) {
      setMsg(`Gagal mereset kategori Home: ${hideError.message}`)
      return
    }

    const mainSlugs = ['mobile-games', 'pc-games', 'voucher-digital', 'console']
    const { data: mainCategories, error: mainError } = await s
      .from('game_categories')
      .select('id,slug')
      .in('slug', mainSlugs)

    if (mainError) {
      setMsg(`Kategori sudah direset, tetapi kategori utama gagal dipulihkan: ${mainError.message}`)
      load()
      return
    }

    const mainIds = (mainCategories || []).map((c: any) => c.id).filter(Boolean)
    if (mainIds.length) {
      const { error } = await s
        .from('game_categories')
        .update({ show_on_home: true })
        .in('id', mainIds)

      if (error) {
        setMsg(`Kategori sudah direset, tetapi kategori utama gagal dipulihkan: ${error.message}`)
        load()
        return
      }
    }

    setMsg('Kategori Home berhasil direset. Game Populer tidak berubah.')
    load()
  }


  async function deleteProduct(product: any) {
    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat menghapus produk.')
      return
    }

    const label = product.name || product.nominal || product.sku || 'produk ini'
    if (!confirm(`Hapus ${label}?\n\nProduk yang sudah terhubung dengan riwayat transaksi mungkin tidak dapat dihapus.`)) return

    const { error } = await s
      .from('game_products')
      .delete()
      .eq('id', product.id)

    if (error) {
      setMsg(`Produk tidak dapat dihapus. ${error.message}`)
      return
    }

    // Hapus langsung dari state agar daftar Products segera berubah
    // tanpa menunggu reload halaman.
    setProducts((current) => current.filter((item) => item.id !== product.id))
    setMsg(`Produk ${label} berhasil dihapus.`)
    await load()
  }

  async function deletePaymentMethod(method: any) {
    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat menghapus metode pembayaran.')
      return
    }

    const label = method.name || method.kind || 'metode pembayaran ini'
    if (!confirm(`Hapus metode pembayaran ${label}?\n\nJika metode sudah dipakai transaksi/deposit, database dapat menolak penghapusan.`)) return

    const { error } = await s
      .from('payment_methods')
      .delete()
      .eq('id', method.id)

    if (error) {
      setMsg(`Metode pembayaran tidak dapat dihapus. ${error.message}`)
      return
    }

    setMsg(`Metode pembayaran ${label} berhasil dihapus.`)
    load()
  }

  function openEdit(type: 'category' | 'game' | 'product' | 'payment', row: any) {
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

    if (type === 'payment') {
      setEditForm({
        name: row.name || '',
        kind: row.kind || 'QRIS',
        account_name: row.account_name || '',
        account_number: row.account_number || '',
        instruction: row.instruction || '',
        qr_url: row.qr_url || '',
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

    if (editType === 'payment') {
      table = 'payment_methods'
      payload = {
        name: String(editForm.name || '').trim(),
        kind: String(editForm.kind || 'QRIS').trim(),
        account_name: String(editForm.account_name || '').trim() || null,
        account_number: String(editForm.account_number || '').trim() || null,
        instruction: String(editForm.instruction || '').trim() || null,
        qr_url: String(editForm.qr_url || '').trim() || null,
      }

      if (!payload.name || !payload.kind) {
        setMsg('Nama dan jenis metode pembayaran wajib diisi.')
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
        setMsg('Game, nama, nominal, dan Kode Produk wajib diisi.')
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
              : editType === 'payment'
                ? 'Metode pembayaran'
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

  async function editUsername(u: any) {
    if (!['owner', 'admin'].includes(role)) {
      setMsg('Hanya Owner/Admin yang dapat mengubah username.')
      return
    }

    const current = String(u.username || '')
    const next = prompt(
      `Username baru untuk ${u.email || u.name || 'member'}:`,
      current
    )

    if (next === null) return

    const username = next.trim()

    if (username.length < 3 || username.length > 30) {
      setMsg('Username harus 3-30 karakter.')
      return
    }

    if (!/^[A-Za-z0-9._-]+$/.test(username)) {
      setMsg('Username hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung.')
      return
    }

    if (username === current) {
      setMsg('Username tidak berubah.')
      return
    }

    const { error } = await (s as any).rpc(
      'admin_update_username',
      {
        p_user_id: u.id,
        p_username: username,
      }
    )

    if (error) {
      const message = error.message || ''

      if (message.includes('USERNAME_ALREADY_EXISTS')) {
        setMsg('Username tersebut sudah digunakan member lain.')
      } else if (message.includes('USERNAME_INVALID_LENGTH')) {
        setMsg('Username harus 3-30 karakter.')
      } else if (message.includes('USERNAME_INVALID_FORMAT')) {
        setMsg(
          'Username hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung.'
        )
      } else if (message.includes('FORBIDDEN')) {
        setMsg('Kamu tidak memiliki izin untuk mengubah username.')
      } else if (message.includes('USER_NOT_FOUND')) {
        setMsg('Member tidak ditemukan.')
      } else {
        setMsg(message || 'Gagal mengubah username.')
      }
      return
    }

    setMsg(`Username berhasil diubah menjadi @${username}.`)
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
    expectedRatio?: '1:1' | '16:9',
    allowMotion = false
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

    const imageTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ]
    const motionTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-m4v',
    ]
    const allowed = allowMotion
      ? [...imageTypes, ...motionTypes]
      : imageTypes

    if (!allowed.includes(file.type)) {
      setMsg(
        allowMotion
          ? 'Format harus JPG, PNG, WEBP, GIF, MP4, WEBM, atau MOV.'
          : 'Format harus JPG, PNG, WEBP, atau GIF.'
      )
      return
    }

    const maxSize = file.type.startsWith('video/')
      ? 20 * 1024 * 1024
      : 6 * 1024 * 1024

    if (file.size > maxSize) {
      setMsg(
        file.type.startsWith('video/')
          ? 'Ukuran maksimal video 20 MB per file.'
          : 'Ukuran maksimal 6 MB per file.'
      )
      return
    }

    /*
     * Validasi rasio:
     * - Logo Game / Produk: 1:1
     * - Banner Promo: 16:9
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
            if (file.type.startsWith('video/')) {
              const video = document.createElement('video')
              video.preload = 'metadata'
              video.onloadedmetadata = () => {
                resolve({ width: video.videoWidth, height: video.videoHeight })
              }
              video.onerror = () => reject(new Error('Video tidak dapat dibaca.'))
              video.src = objectUrl
              return
            }

            const img = new Image()
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
            img.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'))
            img.src = objectUrl
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
          'Media tidak dapat dibaca. Silakan gunakan file yang valid.'
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

    // Banner Promo memakai state preview sementara. Jangan reload data
    // setelah upload, karena load() akan menimpa URL banner yang baru
    // diunggah sebelum tombol Simpan Perubahan Banner Promo ditekan.
    if (category !== 'promotions') {
      load()
    }
  }

  async function uploadFromInput(
    e: ChangeEvent<HTMLInputElement>,
    category: string,
    callback?: (url: string) => void,
    expectedRatio?: '1:1' | '16:9',
    allowMotion = false
  ) {
    const file =
      e.target.files?.[0]

    if (!file) return

    await uploadAsset(
      file,
      category,
      callback,
      expectedRatio,
      allowMotion
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
        custom_text: mediaPromoCustomText.trim() || null,
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

  async function uploadAndSync(
    e: ChangeEvent<HTMLInputElement>,
    category: string,
    sync: (url: string) => Promise<void>,
    expectedRatio?: '1:1' | '16:9',
    allowMotion = false
  ) {
    const file = e.target.files?.[0]
    if (!file) return

    await uploadAsset(
      file,
      category,
      async (url) => {
        await sync(url)
      },
      expectedRatio,
      allowMotion
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
      show_on_home: true,
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

  const successfulOrders = orders.filter((o) => o.status === 'SUCCESS')
  const pendingOrders = orders.filter((o) => o.status === 'PENDING_PAYMENT')
  const processingOrders = orders.filter((o) => o.status === 'PROCESSING')
  const cancelledOrders = orders.filter((o) => ['CANCELLED', 'EXPIRED', 'FAILED'].includes(o.status))
  const totalIncome = successfulOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
  const totalCustomers = users.filter((u) => u.role === 'customer').length
  const activeProducts = products.filter((p) => p.is_active !== false).length
  const statusTotal = Math.max(orders.length, 1)
  const statusSegments = [
    { label: 'Selesai', value: successfulOrders.length, icon: CheckCircle2, cls: 'text-emerald-300', bg: 'bg-emerald-400' },
    { label: 'Proses', value: processingOrders.length, icon: Clock3, cls: 'text-amber-300', bg: 'bg-amber-400' },
    { label: 'Menunggu', value: pendingOrders.length, icon: Clock3, cls: 'text-cyan-300', bg: 'bg-cyan-400' },
    { label: 'Gagal / Batal', value: cancelledOrders.length, icon: XCircle, cls: 'text-rose-300', bg: 'bg-rose-400' },
  ]
  const donutStops = (() => {
    let current = 0
    return statusSegments.map((segment) => {
      const start = current
      current += (segment.value / statusTotal) * 360
      return `${segment.bg === 'bg-emerald-400' ? '#34d399' : segment.bg === 'bg-amber-400' ? '#fbbf24' : segment.bg === 'bg-cyan-400' ? '#22d3ee' : '#fb7185'} ${start}deg ${current}deg`
    })
  })()

  const menuButton = (item: readonly [string, string], mobile = false) => {
    const Icon = adminIcons[item[0]] || Activity
    return (
      <button
        type="button"
        key={item[0]}
        onClick={() => changeTab(item[0])}
        className={`group flex items-center transition ${
          mobile
            ? `min-w-max touch-manipulation rounded-xl border px-3 py-2 text-[11px] font-semibold ${tab === item[0] ? 'border-rose-400/30 bg-rose-400/10 text-rose-200' : 'border-white/10 bg-white/[.025] text-slate-400'}`
            : `w-full gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${tab === item[0] ? 'border border-rose-400/20 bg-rose-400/10 text-rose-200' : 'border border-transparent text-slate-400 hover:bg-white/[.04] hover:text-white'}`
        }`}
      >
        <Icon className={mobile ? 'h-4 w-4 shrink-0' : 'h-[17px] w-[17px] shrink-0'} strokeWidth={1.8} />
        <span>{item[1]}</span>
        {!mobile && tab === item[0] && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,.9)]" />}
      </button>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,23,68,.07),transparent_30%),radial-gradient(circle_at_top_right,rgba(168,85,247,.06),transparent_25%)]">
      <div className="mx-auto flex max-w-[1500px] gap-4 px-3 py-3 md:px-5 lg:py-5">
        <aside className="hidden w-[224px] shrink-0 lg:block">
          <div className="sticky top-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-xl backdrop-blur-xl">
            <div className="border-b border-white/10 px-4 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/10">
                  <Gamepad2 className="h-5 w-5 text-rose-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[.22em] text-slate-500">Admin Panel</p>
                  <h2 className="truncate text-sm font-black text-white">NDRAAAID<span className="text-rose-400">.v1</span></h2>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-400/10 bg-emerald-400/[.04] px-2.5 py-1.5">
                <span className="text-[10px] text-slate-500">Status</span>
                <span className="text-[10px] font-bold text-emerald-300">● ONLINE</span>
              </div>
            </div>
            <nav className="max-h-[calc(100vh-170px)] space-y-4 overflow-y-auto p-2.5">
              {adminMenuGroups.map((group) => (
                <div key={group.title}>
                  <p className="px-2 pb-1.5 text-[8px] font-black tracking-[.22em] text-slate-600">{group.title}</p>
                  <div className="space-y-0.5">
                    {group.items
                      .filter((item) => (item[0] !== 'broadcasts' || ['owner', 'admin'].includes(role)) && (item[0] !== 'reviews' || ['owner', 'admin'].includes(role)) && (item[0] !== 'provider-codes' || ['owner', 'admin'].includes(role)))
                      .map((item) => menuButton(item))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="border-t border-white/10 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5"><Users className="h-4 w-4 text-slate-400" /></div>
                <div className="min-w-0"><p className="text-[10px] font-bold text-white">Admin</p><p className="text-[9px] text-slate-500">{role || 'Admin'}</p></div>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-rose-400">CONTROL CENTER</p>
                <h1 className="truncate text-lg font-black text-white md:text-xl">Admin <span className="text-rose-400">NDRAAAID.v1</span></h1>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.025] px-2.5 py-1.5 sm:flex"><Bell className="h-3.5 w-3.5 text-slate-500" /><span className="text-[10px] text-slate-500">Panel</span></div>
                <div className="rounded-lg border border-emerald-400/10 bg-emerald-400/[.04] px-2.5 py-1.5"><span className="text-[10px] font-bold text-emerald-300">ONLINE</span></div>
              </div>
            </div>
            <div className="border-t border-white/10 p-2.5 lg:hidden">
              <div
                className="flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 touch-pan-x [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
              >
                {adminMenuGroups.flatMap((group) => group.items).filter((item) => (item[0] !== 'broadcasts' || ['owner', 'admin'].includes(role)) && (item[0] !== 'reviews' || ['owner', 'admin'].includes(role)) && (item[0] !== 'provider-codes' || ['owner', 'admin'].includes(role))).map((item) => menuButton(item, true))}
              </div>
            </div>
          </header>

      {msg && (
        <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-cyan-400/15 bg-cyan-400/[.06] px-2.5 py-1.5 text-[10px] font-semibold text-cyan-200">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
          <span className="truncate">{msg}</span>
        </div>
      )}

      {/* =====================================================
          ORDER / RIWAYAT
      ===================================================== */}

      {tab === 'dashboard' && (
        <section className="mt-5 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-4 md:px-5">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-rose-400">OVERVIEW</p>
                <h2 className="mt-1 text-xl font-black text-white md:text-2xl">Selamat datang, Admin</h2>
                <p className="mt-1 text-xs text-slate-500">Ringkasan toko dibuat compact agar informasi penting tetap cepat terlihat.</p>
              </div>
              <div className="text-[10px] text-slate-600">Data dari panel saat ini</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {[
              { label: 'Total Produk', value: products.length, icon: Package, note: `${activeProducts} aktif` },
              { label: 'Income Masuk', value: `Rp ${totalIncome.toLocaleString('id-ID')}`, icon: CircleDollarSign, note: `${successfulOrders.length} order sukses` },
              { label: 'Total Pelanggan', value: totalCustomers, icon: Users, note: 'akun customer' },
              { label: 'Total Order', value: orders.length, icon: ShoppingCart, note: `${pendingOrders.length} menunggu` },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 shadow-lg">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold text-slate-500">{stat.label}</p>
                    <Icon className="h-4 w-4 text-rose-300/80" strokeWidth={1.8} />
                  </div>
                  <p className="mt-1.5 truncate text-base font-black text-white md:text-lg">{stat.value}</p>
                  <p className="mt-0.5 text-[9px] text-slate-600">{stat.note}</p>
                </div>
              )
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,.8fr)]">
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-3.5 md:p-4">
              <div className="mb-3 flex items-center justify-between">
                <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-600">TRANSAKSI</p><h3 className="mt-0.5 text-sm font-black text-white">Order Terbaru</h3></div>
                <button type="button" onClick={() => changeTab('orders')} className="text-[10px] font-bold text-rose-300">Lihat semua →</button>
              </div>
              <div className="space-y-1.5">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center gap-2 rounded-xl border border-white/[.06] bg-white/[.02] px-2.5 py-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-400/10"><ShoppingCart className="h-3.5 w-3.5 text-rose-300" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-white">{o.order_code}</p><p className="truncate text-[9px] text-slate-600">{o.profiles?.username || o.profiles?.name || '-'} · {o.games?.name || '-'}</p></div>
                    <div className="text-right"><p className="text-[10px] font-bold text-white">Rp {Number(o.total || 0).toLocaleString('id-ID')}</p><span className="text-[8px] text-slate-500">{o.status}</span></div>
                  </div>
                ))}
                {!orders.length && <p className="py-8 text-center text-xs text-slate-600">Belum ada order.</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-3.5 md:p-4">
              <div className="mb-3"><p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-600">ANALISIS</p><h3 className="mt-0.5 text-sm font-black text-white">Status Order</h3></div>
              <div className="flex items-center gap-4">
                <div className="relative h-28 w-28 shrink-0 rounded-full p-[9px]" style={{ background: `conic-gradient(${donutStops.join(', ')})` }}>
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-950"><span className="text-xl font-black text-white">{orders.length}</span><span className="text-[8px] text-slate-600">TOTAL ORDER</span></div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {statusSegments.map((segment) => { const Icon = segment.icon; return <div key={segment.label} className="flex items-center justify-between gap-2 text-[9px]"><span className="flex min-w-0 items-center gap-1.5 text-slate-400"><Icon className={`h-3.5 w-3.5 ${segment.cls}`} />{segment.label}</span><b className="text-white">{segment.value}</b></div> })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-3.5 md:p-4">
              <div className="mb-3 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-600">KATALOG</p><h3 className="mt-0.5 text-sm font-black text-white">Game Populer</h3></div><button type="button" onClick={() => changeTab('games')} className="text-[10px] font-bold text-rose-300">Kelola →</button></div>
              <div className="grid grid-cols-3 gap-2">
                {games.filter((g) => g.popular).slice(0, 6).map((g) => <div key={g.id} className="overflow-hidden rounded-xl border border-white/[.07] bg-white/[.02]"><div className="aspect-[1.5] bg-slate-900">{g.logo_url ? <img src={g.logo_url} alt={g.name} className="h-full w-full object-cover" /> : null}</div><p className="truncate px-2 py-1.5 text-[9px] font-bold text-white">{g.name}</p></div>)}
                {!games.some((g) => g.popular) && <p className="col-span-3 py-6 text-center text-[10px] text-slate-600">Belum ada game Popular.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-3.5 md:p-4">
              <div className="mb-3"><p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-600">AKTIVITAS</p><h3 className="mt-0.5 text-sm font-black text-white">Ringkasan Cepat</h3></div>
              <div className="grid grid-cols-2 gap-2">
                {([['Produk aktif', activeProducts, Package], ['Game aktif', games.filter((g) => g.is_active !== false).length, Gamepad2], ['Deposit masuk', deposits.length, WalletCards], ['Wallet transaksi', walletTx.length, Wallet]] as readonly [string, number, LucideIcon][]).map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-white/[.06] bg-white/[.02] p-2.5"><Icon className="h-4 w-4 text-rose-300" /><p className="mt-2 text-sm font-black text-white">{value}</p><p className="text-[9px] text-slate-600">{label}</p></div>)}
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === 'orders' && (
        <div className="mt-5 space-y-3">
          <section className="glass rounded-xl p-3.5 md:p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-rose-400">OPERASIONAL</p>
                <h2 className="mt-0.5 text-lg font-black text-white">Order</h2>
                <p className="mt-0.5 text-[10px] text-slate-500">Tanpa filter hanya 3 order terbaru yang ditampilkan.</p>
              </div>
              <p className="text-[10px] text-slate-600">{(() => {
                const q = orderSearch.trim().toLowerCase()
                const filtered = orders.filter((o) => {
                  const member = o.profiles?.username || o.profiles?.name || o.profiles?.email || ''
                  const game = o.games?.name || ''
                  const matchesSearch = !q || [o.order_code, member, game, o.status].some((v) => String(v || '').toLowerCase().includes(q))
                  const matchesStatus = !orderStatusFilter || o.status === orderStatusFilter
                  const matchesMember = !orderMemberFilter || o.profiles?.id === orderMemberFilter
                  const matchesGame = !orderGameFilter || o.games?.id === orderGameFilter
                  const matchesDate = !orderDateFilter || String(o.created_at || '').slice(0, 10) === orderDateFilter
                  return matchesSearch && matchesStatus && matchesMember && matchesGame && matchesDate
                })
                return (orderSearch || orderStatusFilter || orderMemberFilter || orderGameFilter || orderDateFilter) ? `${filtered.length} hasil` : `${orders.length} total`
              })()}</p>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
              <label className="relative block">
                <span className="sr-only">Cari order</span>
                <input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Cari ID order, member, atau game..."
                  className="input w-full text-xs"
                />
              </label>
              <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} className="input text-xs">
                <option value="">Semua Status</option>
                <option value="PENDING_PAYMENT">Menunggu Pembayaran</option>
                <option value="PAYMENT_RECEIVED">Pembayaran Diterima</option>
                <option value="PROCESSING">Diproses</option>
                <option value="SUCCESS">Selesai</option>
                <option value="FAILED">Gagal</option>
                <option value="CANCELLED">Dibatalkan</option>
                <option value="EXPIRED">Kadaluarsa</option>
              </select>
              <select value={orderMemberFilter} onChange={(e) => setOrderMemberFilter(e.target.value)} className="input text-xs">
                <option value="">Semua Member</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.username || u.name || u.email}</option>)}
              </select>
              <select value={orderGameFilter} onChange={(e) => setOrderGameFilter(e.target.value)} className="input text-xs">
                <option value="">Semua Game</option>
                {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <input
                type="date"
                value={orderDateFilter}
                onChange={(e) => setOrderDateFilter(e.target.value)}
                className="input text-xs"
                aria-label="Filter tanggal order"
              />
              <button
                type="button"
                onClick={() => { setOrderSearch(''); setOrderStatusFilter(''); setOrderMemberFilter(''); setOrderGameFilter(''); setOrderDateFilter('') }}
                disabled={!orderSearch && !orderStatusFilter && !orderMemberFilter && !orderGameFilter && !orderDateFilter}
                className="btn btn-muted text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reset
              </button>
            </div>
          </section>

          {orders
            .filter((o) => {
              const q = orderSearch.trim().toLowerCase()
              const member = o.profiles?.username || o.profiles?.name || o.profiles?.email || ''
              const game = o.games?.name || ''
              const matchesSearch = !q || [o.order_code, member, game, o.status].some((v) => String(v || '').toLowerCase().includes(q))
              const matchesStatus = !orderStatusFilter || o.status === orderStatusFilter
              const matchesDate = !orderDateFilter || String(o.created_at || '').slice(0, 10) === orderDateFilter
              return matchesSearch && matchesStatus && matchesDate
            })
            .slice((orderSearch || orderStatusFilter || orderMemberFilter || orderGameFilter || orderDateFilter) ? undefined : 0, (orderSearch || orderStatusFilter || orderMemberFilter || orderGameFilter || orderDateFilter) ? undefined : 3)
            .map((o) => (
            <div
              key={o.id}
              className="glass rounded-xl p-3.5 md:p-4"
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

          {orders.length > 0 &&
            (orderSearch || orderStatusFilter || orderMemberFilter || orderGameFilter || orderDateFilter) &&
            !orders.some((o) => {
              const q = orderSearch.trim().toLowerCase()
              const member = o.profiles?.username || o.profiles?.name || o.profiles?.email || ''
              const game = o.games?.name || ''
              const matchesSearch = !q || [o.order_code, member, game, o.status].some((v) => String(v || '').toLowerCase().includes(q))
              const matchesStatus = !orderStatusFilter || o.status === orderStatusFilter
              const matchesDate = !orderDateFilter || String(o.created_at || '').slice(0, 10) === orderDateFilter
              return matchesSearch && matchesStatus && matchesDate
            }) && (
              <p className="py-8 text-center text-xs text-slate-500">Tidak ada order yang sesuai dengan filter.</p>
            )}
        </div>
      )}

      {/* =====================================================
          DEPOSITS
      ===================================================== */}

      {tab === 'deposits' && (
        <section className="mt-7 space-y-3">
          <div className="glass rounded-xl p-3.5 md:p-4">
            <h2 className="text-xl font-black">
              Deposit Member — Perlu Diproses
            </h2>

            <p className="mt-1 text-sm text-slate-400">Setujui atau tolak bukti deposit. Persetujuan menambah saldo secara atomik dan hanya dapat dilakukan sekali.</p>
            <AdminFilterShell active={depositFilterActive} onReset={() => { setDepositSearch(''); setDepositStatusFilter(''); setDepositMethodFilter(''); setDepositDateFilter('') }}>
              <input className="input text-xs" placeholder="Cari ID deposit/member..." value={depositSearch} onChange={(e) => setDepositSearch(e.target.value)} />
              <select className="input text-xs" value={depositStatusFilter} onChange={(e) => setDepositStatusFilter(e.target.value)}><option value="">Semua Status</option><option value="PENDING">PENDING</option></select>
              <select className="input text-xs" value={depositMethodFilter} onChange={(e) => setDepositMethodFilter(e.target.value)}><option value="">Semua Metode</option>{methods.map((m) => <option key={m.id} value={m.kind || m.name}>{m.name}</option>)}</select>
              <input type="date" className="input text-xs" value={depositDateFilter} onChange={(e) => setDepositDateFilter(e.target.value)} />
            </AdminFilterShell>
          </div>

          {limitAdminItems(filteredPendingDeposits, depositFilterActive).map((d) => (
              <div
                key={d.id}
                className="glass rounded-xl p-3.5 md:p-4"
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
          <div className="glass rounded-xl p-3.5 md:p-4">
            <h2 className="text-xl font-black">
              Riwayat Deposit
            </h2>

            <p className="mt-1 text-sm text-slate-400">Seluruh pengajuan deposit member, termasuk APPROVED dan REJECTED.</p>
            <AdminFilterShell active={depositHistoryFilterActive} onReset={() => { setDepositHistorySearch(''); setDepositHistoryStatusFilter(''); setDepositHistoryMethodFilter(''); setDepositHistoryDateFilter('') }}>
              <input className="input text-xs" placeholder="Cari ID deposit/member..." value={depositHistorySearch} onChange={(e) => setDepositHistorySearch(e.target.value)} />
              <select className="input text-xs" value={depositHistoryStatusFilter} onChange={(e) => setDepositHistoryStatusFilter(e.target.value)}><option value="">Semua Status</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select>
              <select className="input text-xs" value={depositHistoryMethodFilter} onChange={(e) => setDepositHistoryMethodFilter(e.target.value)}><option value="">Semua Metode</option>{methods.map((m) => <option key={m.id} value={m.kind || m.name}>{m.name}</option>)}</select>
              <input type="date" className="input text-xs" value={depositHistoryDateFilter} onChange={(e) => setDepositHistoryDateFilter(e.target.value)} />
            </AdminFilterShell>
          </div>

          {limitAdminItems(filteredDepositHistory, depositHistoryFilterActive).map((d) => (
            <div
              key={d.id}
              className="glass rounded-xl p-3 md:p-3.5"
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
          <div className="glass rounded-xl p-3.5 md:p-4">
            <h2 className="text-xl font-black">
              Riwayat Wallet
            </h2>

            <p className="mt-1 text-sm text-slate-400">Semua perubahan saldo member yang tercatat di ledger.</p>
            <AdminFilterShell active={walletFilterActive} onReset={() => { setWalletSearch(''); setWalletTypeFilter(''); setWalletDateFilter('') }}>
              <input className="input text-xs" placeholder="Cari member/reason..." value={walletSearch} onChange={(e) => setWalletSearch(e.target.value)} />
              <select className="input text-xs" value={walletTypeFilter} onChange={(e) => setWalletTypeFilter(e.target.value)}><option value="">Semua Tipe</option>{Array.from(new Set(walletTx.map((x) => x.type).filter(Boolean))).map((x) => <option key={x} value={x}>{x}</option>)}</select>
              <input type="date" className="input text-xs" value={walletDateFilter} onChange={(e) => setWalletDateFilter(e.target.value)} />
            </AdminFilterShell>
          </div>

          {limitAdminItems(filteredWalletTx, walletFilterActive).map((tx) => (
            <div
              key={tx.id}
              className="glass rounded-xl p-3 md:p-3.5"
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
            <AdminFilterShell active={categoryFilterActive} onReset={() => { setCategorySearch(''); setCategoryStatusFilter('') }}>
              <input className="input text-xs" placeholder="Cari kategori..." value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} />
              <select className="input text-xs" value={categoryStatusFilter} onChange={(e) => setCategoryStatusFilter(e.target.value)}><option value="">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select>
            </AdminFilterShell>
            {limitAdminItems(filteredCategories, categoryFilterActive).map((c) => (
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
                    <button type="button" onClick={() => openEdit('category', c)} className="btn btn-muted !h-8 !w-8 !p-0" title="Edit kategori" aria-label="Edit kategori"><Pencil className="h-3.5 w-3.5" /></button>
                  )}

                  <button type="button" onClick={() => toggle('game_categories', c.id)} className="btn btn-muted !h-8 !w-8 !p-0" title={c.is_active ? 'Nonaktifkan' : 'Aktifkan'} aria-label={c.is_active ? 'Nonaktifkan' : 'Aktifkan'}><Power className={`h-3.5 w-3.5 ${c.is_active ? 'text-emerald-300' : 'text-slate-500'}`} /></button>

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
            onSubmit={addGameWithFields}
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

            <div className="rounded-2xl border border-white/[.07] bg-slate-950/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black">Field Data Akun</p>
                  <p className="mt-1 text-[11px] text-slate-500">Pilih field yang akan tampil di halaman pembelian game ini.</p>
                </div>
                <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[9px] font-bold text-cyan-300">PER GAME</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {GAME_FIELD_OPTIONS.map((field) => {
                  const checked = selectedGameFields.includes(field.key)
                  return (
                    <label key={field.key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/[.06] bg-white/[.02] p-2.5 text-xs">
                      <input type="checkbox" checked={checked} onChange={() => setSelectedGameFields((current) => checked ? current.filter((key) => key !== field.key) : [...current, field.key])} />
                      <span>{field.label}</span>
                    </label>
                  )
                })}
              </div>
              <div className="mt-4 grid gap-2">
                <p className="text-xs font-bold text-slate-300">Field custom (opsional)</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input className="input text-xs" placeholder="Key, mis. account_id" value={customGameField.key} onChange={(e) => setCustomGameField((v) => ({ ...v, key: e.target.value }))} />
                  <input className="input text-xs" placeholder="Label, mis. Account ID" value={customGameField.label} onChange={(e) => setCustomGameField((v) => ({ ...v, label: e.target.value }))} />
                  <input className="input text-xs" placeholder="Placeholder" value={customGameField.placeholder} onChange={(e) => setCustomGameField((v) => ({ ...v, placeholder: e.target.value }))} />
                </div>
                <p className="text-[10px] text-slate-500">Field custom otomatis menjadi wajib diisi. Kosongkan jika tidak digunakan.</p>
              </div>
            </div>

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
            <AdminFilterShell active={gameFilterActive} onReset={() => { setGameSearch(''); setGameCategoryFilter(''); setGameStatusFilter(''); setGamePopularFilter('') }}>
              <input className="input text-xs" placeholder="Cari game..." value={gameSearch} onChange={(e) => setGameSearch(e.target.value)} />
              <select className="input text-xs" value={gameCategoryFilter} onChange={(e) => setGameCategoryFilter(e.target.value)}><option value="">Semua Kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <select className="input text-xs" value={gameStatusFilter} onChange={(e) => setGameStatusFilter(e.target.value)}><option value="">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select>
              <select className="input text-xs" value={gamePopularFilter} onChange={(e) => setGamePopularFilter(e.target.value)}><option value="">Popular: Semua</option><option value="popular">Popular</option><option value="normal">Bukan Popular</option></select>
            </AdminFilterShell>
            {limitAdminItems(filteredGames, gameFilterActive).map((g) => (
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
                    <button type="button" onClick={() => openEdit('game', g)} className="btn btn-muted !h-8 !w-8 !p-0" title="Edit game" aria-label="Edit game"><Pencil className="h-3.5 w-3.5" /></button>
                  )}

                  <button type="button" onClick={() => toggle('games', g.id)} className="btn btn-muted !h-8 !w-8 !p-0" title={g.is_active ? 'Nonaktifkan' : 'Aktifkan'} aria-label={g.is_active ? 'Nonaktifkan' : 'Aktifkan'}><Power className={`h-3.5 w-3.5 ${g.is_active ? 'text-emerald-300' : 'text-slate-500'}`} /></button>
                  {['owner', 'admin'].includes(role) && (
                    <button type="button" onClick={() => deleteGame(g)} className="btn btn-muted !h-8 !w-8 !p-0 text-red-300 hover:border-red-400/30 hover:bg-red-500/10" title="Hapus game" aria-label="Hapus game"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
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
              ['sku', 'Kode Produk'],
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
              Foto Produk (opsional)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="input mt-2"
                disabled={mediaUploading}
                onChange={(e) =>
                  uploadFromInput(
                    e,
                    'products',
                    (url) =>
                      setProdForm((v) => ({
                        ...v,
                        image_url: url,
                      })),
                    '1:1'
                  )
                }
              />
              {prodForm.image_url && (
                <img
                  src={prodForm.image_url}
                  alt="Preview foto produk"
                  className="mt-2 h-24 w-24 rounded-xl object-cover"
                />
              )}
              <span className="mt-1 block text-xs font-normal text-slate-500">
                JPG/PNG/WEBP/GIF · maksimal 6 MB · rasio 1:1.
              </span>
            </label>

            <button className="btn btn-primary">
              Tambah Produk
            </button>
          </form>

          <div className="space-y-3">
            <AdminFilterShell active={productFilterActive} onReset={() => { setProductSearch(''); setProductGameFilter(''); setProductCategoryFilter(''); setProductStatusFilter(''); setProductPopularFilter(''); setProductPriceSort('') }}>
              <input className="input text-xs" placeholder="Cari produk/Kode Produk..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
              <select className="input text-xs" value={productGameFilter} onChange={(e) => setProductGameFilter(e.target.value)}><option value="">Semua Game</option>{games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
              <select className="input text-xs" value={productCategoryFilter} onChange={(e) => setProductCategoryFilter(e.target.value)}><option value="">Semua Kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <select className="input text-xs" value={productStatusFilter} onChange={(e) => setProductStatusFilter(e.target.value)}><option value="">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select>
              <select className="input text-xs" value={productPopularFilter} onChange={(e) => setProductPopularFilter(e.target.value)}><option value="">Game Popular: Semua</option><option value="popular">Game Popular</option><option value="normal">Bukan Popular</option></select>
              <select className="input text-xs" value={productPriceSort} onChange={(e) => setProductPriceSort(e.target.value)}><option value="">Harga: Default</option><option value="asc">Harga terendah</option><option value="desc">Harga tertinggi</option></select>
            </AdminFilterShell>
            {limitAdminItems(filteredProducts, productFilterActive).map((p) => (
              <div
                key={p.id}
                className="glass rounded-xl border border-white/[.06] px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-sm font-bold text-white">{p.name || p.nominal}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${p.is_active ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-400/10 text-slate-400'}`}>
                        {p.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                      <span>{p.games?.name || 'Game'}</span>
                      <span>•</span>
                      <span>{p.nominal || '-'}</span>
                      <span>•</span>
                      <span>{p.sku || '-'}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-300">Rp {Number(p.price || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {['owner', 'admin'].includes(role) && (
                      <>
                        <button type="button" onClick={() => openEdit('product', p)} className="btn btn-muted !px-2 !py-1.5" title="Edit produk" aria-label="Edit produk">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => deleteProduct(p)} className="btn btn-muted !px-2 !py-1.5 text-red-300 hover:border-red-400/30 hover:bg-red-500/10" title="Hapus produk/nominal" aria-label="Hapus produk/nominal">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => toggle('game_products', p.id)} className="btn btn-muted !px-2 !py-1.5" title={p.is_active ? 'Nonaktifkan' : 'Aktifkan'} aria-label={p.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                      <Power className={`h-3.5 w-3.5 ${p.is_active ? 'text-emerald-300' : 'text-slate-500'}`} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}


      {tab === 'provider-codes' && (
        <section className="mt-7 space-y-4">
          <div className="glass rounded-xl p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-black">Kode Provider</h2>
                <p className="text-xs text-slate-400">Hubungkan produk website dengan SKU Digiflazz. Transaksi otomatis tetap tidak diaktifkan.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={syncDigiflazz} disabled={providerSyncing} className="btn btn-primary inline-flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${providerSyncing ? 'animate-spin' : ''}`} />
                  {providerSyncing ? 'Sinkronisasi...' : 'Sinkron Digiflazz'}
                </button>
                <button type="button" onClick={autoMapDigiflazz} disabled={providerBusySku === '__AUTO__'} className="btn btn-muted inline-flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Auto Mapping
                </button>
              </div>
            </div>

            <AdminFilterShell
              active={Boolean(providerSearch || providerCategoryFilter || providerBrandFilter || providerMappingFilter || providerAvailabilityFilter)}
              onReset={() => {
                setProviderSearch('')
                setProviderCategoryFilter('')
                setProviderBrandFilter('')
                setProviderMappingFilter('')
                setProviderAvailabilityFilter('')
                setProviderPage(1)
              }}
            >
              <input className="input" placeholder="Cari produk / SKU / brand..." value={providerSearch} onChange={(e) => { setProviderSearch(e.target.value); setProviderPage(1) }} />
              <select className="input" value={providerCategoryFilter} onChange={(e) => { setProviderCategoryFilter(e.target.value); setProviderPage(1) }}>
                <option value="">Semua kategori provider</option>
                {providerCategories.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <select className="input" value={providerBrandFilter} onChange={(e) => { setProviderBrandFilter(e.target.value); setProviderPage(1) }}>
                <option value="">Semua brand</option>
                {providerBrands.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <select className="input" value={providerMappingFilter} onChange={(e) => { setProviderMappingFilter(e.target.value); setProviderPage(1) }}>
                <option value="">Semua status mapping</option>
                <option value="mapped">Terhubung</option>
                <option value="unmapped">Belum dipetakan</option>
                <option value="unavailable">Tidak tersedia</option>
              </select>
              <select className="input" value={providerAvailabilityFilter} onChange={(e) => { setProviderAvailabilityFilter(e.target.value); setProviderPage(1) }}>
                <option value="">Provider aktif/nonaktif</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </AdminFilterShell>
          </div>

          {mappingTarget && (
            <div className="glass rounded-xl border border-emerald-400/20 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Mapping manual</p>
                  <p className="mt-1 truncate font-semibold">{mappingTarget.provider_name} · {mappingTarget.provider_sku}</p>
                </div>
                <input className="input md:w-72" placeholder="Cari produk website..." value={mappingProductSearch} onChange={(e) => setMappingProductSearch(e.target.value)} />
                <select className="input md:w-[28rem]" value={mappingProductId} onChange={(e) => setMappingProductId(e.target.value)}>
                  <option value="">Pilih produk website</option>
                  {providerMappingProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} · {p.nominal || '-'} · {p.sku}</option>
                  ))}
                </select>
                <button type="button" onClick={saveProviderMapping} disabled={!mappingProductId || providerBusySku === mappingTarget.provider_sku} className="btn btn-primary">Simpan</button>
                <button type="button" onClick={() => setMappingTarget(null)} className="btn btn-muted">Batal</button>
              </div>
            </div>
          )}

          <div className="glass overflow-hidden rounded-xl">
            <div className="flex flex-col gap-2 border-b border-white/[.06] p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <span className="text-slate-400">{providerFiltered.length} produk provider</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Tampilkan</span>
                <select className="input !h-8 !w-20 !py-1 text-xs" value={providerPageSize} onChange={(e) => { setProviderPageSize(Number(e.target.value)); setProviderPage(1) }}>
                  {[10,25,50,100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <button type="button" className="btn btn-muted !h-8 !px-2" disabled={providerPage <= 1} onClick={() => setProviderPage((p) => p - 1)}>‹</button>
                <span className="min-w-16 text-center">{providerPage} / {providerPageCount}</span>
                <button type="button" className="btn btn-muted !h-8 !px-2" disabled={providerPage >= providerPageCount} onClick={() => setProviderPage((p) => p + 1)}>›</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-xs">
                <thead className="bg-white/[.03] text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Produk Provider</th>
                    <th className="px-3 py-3">Kode Provider</th>
                    <th className="px-3 py-3">Produk Website</th>
                    <th className="px-3 py-3">Kode Website</th>
                    <th className="px-3 py-3">Harga</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.05]">
                  {providerPageRows.map((row) => {
                    const mapped = Boolean(row.mapped_product_id)
                    const available = providerIsAvailable(row)
                    const status = !mapped ? 'Belum dipetakan' : !available ? 'Tidak tersedia' : 'Terhubung'
                    const website = row.game_products
                    const busy = providerBusySku === row.provider_sku
                    return (
                      <tr key={row.id} className="hover:bg-white/[.02]">
                        <td className="px-3 py-3">
                          <div className="font-semibold">{row.provider_name || '-'}</div>
                          <div className="text-[10px] text-slate-500">{row.provider_brand || '-'} · {row.provider_category || '-'}</div>
                        </td>
                        <td className="px-3 py-3 font-mono text-emerald-300">{row.provider_sku}</td>
                        <td className="px-3 py-3">
                          <div>{website?.name || <span className="text-slate-600">—</span>}</div>
                          {website?.games?.name && <div className="text-[10px] text-slate-500">{website.games.name}</div>}
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-300">{website?.sku || '—'}</td>
                        <td className="px-3 py-3">Rp {Number(row.provider_price || 0).toLocaleString('id-ID')}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${status === 'Terhubung' ? 'bg-emerald-500/10 text-emerald-300' : status === 'Tidak tersedia' ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-500/10 text-slate-300'}`}>{status}</span>
                          {!available && <div className="mt-1 text-[9px] text-slate-500">Provider nonaktif</div>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button type="button" disabled={busy || row.mapping_locked} onClick={() => { setMappingTarget(row); setMappingProductId(row.mapped_product_id || ''); setMappingProductSearch('') }} className="btn btn-muted !px-2 !py-1.5" title={row.mapping_locked ? 'Mapping terkunci' : 'Mapping manual'}>
                              <Link2 className="h-3.5 w-3.5" />
                            </button>
                            {mapped && <button type="button" disabled={busy || row.mapping_locked} onClick={() => unmapProvider(row)} className="btn btn-muted !px-2 !py-1.5 text-red-300" title="Unmap"><Unlink className="h-3.5 w-3.5" /></button>}
                            <button type="button" disabled={busy} onClick={() => toggleProviderLock(row)} className="btn btn-muted !px-2 !py-1.5" title={row.mapping_locked ? 'Unlock mapping' : 'Lock mapping'}>
                              {row.mapping_locked ? <Unlock className="h-3.5 w-3.5 text-amber-300" /> : <Lock className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!providerPageRows.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Belum ada katalog provider. Jalankan Sinkron Digiflazz.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          HOME - GAME POPULER
      ===================================================== */}

      {tab === 'home-popular' ? (
        <section className="mt-7 space-y-3">
          <div className="glass rounded-xl p-3.5 md:p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-rose-400">HOME</p>
                <h2 className="mt-0.5 text-lg font-black text-white">Game Populer</h2>
                <p className="mt-1 text-[11px] text-slate-500">Pilih maksimal 9 game. Game tetap berada di kategori normalnya.</p>
              </div>
              <div className="rounded-lg border border-rose-400/15 bg-rose-400/[.05] px-2.5 py-1.5 text-[10px] font-black text-rose-200">{games.filter((g) => g.popular).length} / 9 dipilih</div>
            </div>
            <AdminFilterShell active={Boolean(homePopularSearch || homePopularCategoryFilter || homePopularStatusFilter)} onReset={() => { setHomePopularSearch(''); setHomePopularCategoryFilter(''); setHomePopularStatusFilter('') }}>
              <input className="input text-xs" placeholder="Cari game..." value={homePopularSearch} onChange={(e) => setHomePopularSearch(e.target.value)} />
              <select className="input text-xs" value={homePopularCategoryFilter} onChange={(e) => setHomePopularCategoryFilter(e.target.value)}><option value="">Semua Kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <select className="input text-xs" value={homePopularStatusFilter} onChange={(e) => setHomePopularStatusFilter(e.target.value)}><option value="">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select>
              <div className="flex items-center rounded-lg border border-white/[.06] bg-white/[.02] px-3 text-[10px] text-slate-500">Klik ★ untuk menambah/mengeluarkan.</div>
            </AdminFilterShell>
          </div>

          {limitAdminItems(filteredHomePopularGames, Boolean(homePopularSearch || homePopularCategoryFilter || homePopularStatusFilter)).map((g) => (
            <div key={g.id} className="glass flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                {g.logo_url ? <img src={g.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-900" />}
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-bold text-white">{g.name}</span>{g.popular && <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black text-amber-300">POPULER</span>}</div>
                  <p className="truncate text-[10px] text-slate-500">{g.game_categories?.name || 'Tanpa kategori'} · {g.is_active === false ? 'Nonaktif' : 'Aktif'}</p>
                </div>
              </div>
              <button type="button" onClick={() => togglePopular(g)} className="btn btn-muted !h-8 !w-8 !shrink-0 !p-0" title={g.popular ? 'Keluarkan dari Game Populer' : 'Tambahkan ke Game Populer'} aria-label={g.popular ? 'Keluarkan dari Game Populer' : 'Tambahkan ke Game Populer'}>
                <Star className={`h-4 w-4 ${g.popular ? 'fill-amber-300 text-amber-300' : 'text-slate-500'}`} />
              </button>
            </div>
          ))}
        </section>
      ) : tab === 'home-categories' ? (
        <section className="mt-7 space-y-3">
          <div className="glass rounded-xl p-3.5 md:p-4">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-rose-400">HOME</p>
            <h2 className="mt-0.5 text-lg font-black text-white">Kategori Home</h2>
            <p className="mt-1 text-[11px] text-slate-500">Tentukan kategori katalog mana yang tampil sebagai tab di Home. Menghapus dari Home tidak menghapus game.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <AdminFilterShell active={Boolean(homeCategorySearch || homeCategoryStatusFilter)} onReset={() => { setHomeCategorySearch(''); setHomeCategoryStatusFilter('') }}>
                <input className="input text-xs" placeholder="Cari kategori..." value={homeCategorySearch} onChange={(e) => setHomeCategorySearch(e.target.value)} />
                <select className="input text-xs" value={homeCategoryStatusFilter} onChange={(e) => setHomeCategoryStatusFilter(e.target.value)}><option value="">Semua</option><option value="visible">Tampil di Home</option><option value="hidden">Tidak tampil</option></select>
              </AdminFilterShell>
              <button type="button" onClick={resetHomeCategories} className="btn btn-muted shrink-0 text-[10px] font-black">Reset Kategori Home</button>
            </div>
          </div>
          {limitAdminItems(filteredHomeCategories, Boolean(homeCategorySearch || homeCategoryStatusFilter)).map((c) => (
            <div key={c.id} className="glass flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-white">{c.name}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black ${c.show_on_home !== false ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-400/10 text-slate-500'}`}>{c.show_on_home !== false ? 'HOME' : 'HIDDEN'}</span>
                </div>
                <p className="text-[10px] text-slate-500">{games.filter((g) => g.category_id === c.id).length} game · /{c.slug}</p>
              </div>
              <button type="button" onClick={() => toggleHomeCategory(c)} className="btn btn-muted !h-8 !w-8 !shrink-0 !p-0" title={c.show_on_home !== false ? 'Hapus dari Home' : 'Tambahkan ke Home'} aria-label={c.show_on_home !== false ? 'Hapus dari Home' : 'Tambahkan ke Home'}>
                {c.show_on_home !== false ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-emerald-300" />}
              </button>
            </div>
          ))}
        </section>
      ) : null}

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
            ].map(([k, l]) =>
              k === 'kind' ? (
                <select
                  key={k}
                  className="input"
                  value={(methodForm as any)[k]}
                  onChange={(e) =>
                    setMethodForm({
                      ...methodForm,
                      [k]: e.target.value,
                    })
                  }
                >
                  <option value="QRIS">QRIS</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="E_WALLET">E-Wallet</option>
                  <option value="VIRTUAL_ACCOUNT">Virtual Account</option>
                  <option value="WALLET">Saldo Akun</option>
                </select>
              ) : k === 'qr_url' ? (
                <label key={k} className="block text-sm font-semibold">
                  Foto QRIS (opsional)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="input mt-2"
                    disabled={mediaUploading}
                    onChange={(e) =>
                      uploadFromInput(
                        e,
                        'general',
                        (url) =>
                          setMethodForm((v) => ({
                            ...v,
                            qr_url: url,
                          })),
                        '1:1'
                      )
                    }
                  />
                  {methodForm.qr_url && (
                    <img
                      src={methodForm.qr_url}
                      alt="Preview QRIS"
                      className="mt-2 h-32 w-32 rounded-xl object-cover"
                    />
                  )}
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    JPG/PNG/WEBP/GIF · maksimal 6 MB · rasio 1:1.
                  </span>
                </label>
              ) : (
                <input
                  key={k}
                  className="input"
                  placeholder={l}
                  value={(methodForm as any)[k]}
                  onChange={(e) =>
                    setMethodForm({
                      ...methodForm,
                      [k]: e.target.value,
                    })
                  }
                  required={k === 'name'}
                />
              )
            )}

            <button className="btn btn-primary">
              Tambah Metode
            </button>
          </form>

          <div className="space-y-3">
            <AdminFilterShell active={paymentFilterActive} onReset={() => { setPaymentSearch(''); setPaymentKindFilter(''); setPaymentStatusFilter('') }}>
              <input className="input text-xs" placeholder="Cari metode..." value={paymentSearch} onChange={(e) => setPaymentSearch(e.target.value)} />
              <select className="input text-xs" value={paymentKindFilter} onChange={(e) => setPaymentKindFilter(e.target.value)}><option value="">Semua Jenis</option>{Array.from(new Set(methods.map((m) => m.kind).filter(Boolean))).map((x) => <option key={x} value={x}>{x}</option>)}</select>
              <select className="input text-xs" value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}><option value="">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select>
            </AdminFilterShell>
            {limitAdminItems(filteredMethods, paymentFilterActive).map((m) => (
              <div
                key={m.id}
                className="glass rounded-xl p-3 md:p-3.5"
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

                  <div className="flex shrink-0 items-center gap-1">
                    {['owner', 'admin'].includes(role) && (
                      <>
                        <button type="button" onClick={() => openEdit('payment', m)} className="btn btn-muted !h-8 !w-8 !p-0" title="Edit metode pembayaran" aria-label="Edit metode pembayaran">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => deletePaymentMethod(m)} className="btn btn-muted !h-8 !w-8 !p-0 text-red-300 hover:border-red-400/30 hover:bg-red-500/10" title="Hapus metode pembayaran" aria-label="Hapus metode pembayaran">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => toggle('payment_methods', m.id)} className="btn btn-muted !h-8 !w-8 !p-0" title={m.is_active ? 'Nonaktifkan' : 'Aktifkan'} aria-label={m.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                      <Power className={`h-3.5 w-3.5 ${m.is_active ? 'text-emerald-300' : 'text-slate-500'}`} />
                    </button>
                  </div>
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
              <div className="glass rounded-xl p-3.5 md:p-4">
                <h2 className="text-xl font-black">Daftar Voucher</h2>
                <p className="mt-1 text-sm text-slate-400">Owner/Admin dapat mengatur limit. Stok awal hanya dapat diubah Owner.</p>
                <AdminFilterShell active={voucherFilterActive} onReset={() => { setVoucherSearch(''); setVoucherStatusFilter(''); setVoucherTypeFilter('') }}>
                  <input className="input text-xs" placeholder="Cari kode voucher..." value={voucherSearch} onChange={(e) => setVoucherSearch(e.target.value)} />
                  <select className="input text-xs" value={voucherStatusFilter} onChange={(e) => setVoucherStatusFilter(e.target.value)}><option value="">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select>
                  <select className="input text-xs" value={voucherTypeFilter} onChange={(e) => setVoucherTypeFilter(e.target.value)}><option value="">Semua Tipe</option><option value="PERCENT">Persen</option><option value="FIXED">Nominal</option></select>
                </AdminFilterShell>
              </div>

              {limitAdminItems(filteredVouchers, voucherFilterActive).map((v) => {
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
                    className="glass rounded-xl p-3.5 md:p-4"
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

          <div className="glass rounded-xl p-3.5 md:p-4">
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
            <AdminFilterShell active={voucherUsageFilterActive} onReset={() => { setVoucherUsageSearch(''); setVoucherUsageDateFilter('') }}>
              <input className="input text-xs" placeholder="Cari kode/member/order..." value={voucherUsageSearch} onChange={(e) => setVoucherUsageSearch(e.target.value)} />
              <input type="date" className="input text-xs" value={voucherUsageDateFilter} onChange={(e) => setVoucherUsageDateFilter(e.target.value)} />
            </AdminFilterShell>
            {limitAdminItems(filteredVoucherUsages, voucherUsageFilterActive).map((vu) => {
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
              Banner Promo Utama
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Kelola 1 Banner Promo
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Satu Banner Promo utama untuk Home. Bisa berupa teks, gambar, atau teks + gambar.
              Edit dan ubah statusnya dari sini tanpa membuat promo utama baru.
            </p>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="glass rounded-xl p-3.5 md:p-4">
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
                      placeholder="Custom Text di atas judul (opsional)"
                      value={mediaPromoCustomText}
                      onChange={(e) => setMediaPromoCustomText(e.target.value)}
                    />
                    <input
                      className="input mt-3"
                      placeholder="Judul / teks utama promo"
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
                      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/x-m4v"
                      className="input mt-2"
                      disabled={mediaUploading}
                      onChange={(e) =>
                        uploadAndSync(e, 'promotions', preparePromoImage, '16:9', true)
                      }
                    />
                    <span className="mt-1 block text-[10px] text-slate-500">
                      JPG, PNG, WEBP, GIF · atau Live Photo yang diekspor sebagai video MOV/MP4 · gambar maks. 6 MB, video maks. 20 MB · rasio 16:9.
                    </span>
                  </label>
                )}

                {((pendingPromoImageUrl || promos[0]?.banner_url) && mediaPromoType !== 'text') && (
                  /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(pendingPromoImageUrl || promos[0]?.banner_url || '') ? (
                    <video
                      src={pendingPromoImageUrl || promos[0]?.banner_url}
                      className="mt-4 h-40 w-full rounded-xl object-cover"
                      autoPlay muted loop playsInline controls
                    />
                  ) : (
                    <img
                      src={pendingPromoImageUrl || promos[0]?.banner_url}
                      alt="Preview Banner Promo"
                      className="mt-4 h-40 w-full rounded-xl object-cover"
                    />
                  ))}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${promos[0]?.is_active ? 'bg-green-400/10 text-green-300' : 'bg-slate-400/10 text-slate-400'}`}>
                    {promos[0] ? (promos[0].is_active ? 'Aktif' : 'Nonaktif') : 'Belum dibuat'}
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

              <div className="glass rounded-xl p-3.5 md:p-4">
                <p className="text-xs font-black uppercase tracking-widest text-pink-300">
                  PREVIEW
                </p>
                <h3 className="mt-1 text-xl font-black">
                  Tampilan Banner Promo di Home
                </h3>

                <div className="mt-5 overflow-hidden rounded-2xl border border-pink-400/20 bg-slate-950/70">
                  {mediaPromoType !== 'text' && (pendingPromoImageUrl || promos[0]?.banner_url) && (
                    /(\.mp4|\.webm|\.mov|\.m4v)(?:$|[?#])/i.test(pendingPromoImageUrl || promos[0]?.banner_url || '') ? (
                      <video
                        src={pendingPromoImageUrl || promos[0]?.banner_url}
                        className="max-h-64 w-full object-cover"
                        autoPlay muted loop playsInline controls
                      />
                    ) : (
                      <img
                        src={pendingPromoImageUrl || promos[0]?.banner_url}
                        alt="Preview"
                        className="max-h-64 w-full object-cover"
                      />
                    )
                  )}
                  {mediaPromoType !== 'image' && (
                    <div className="p-5">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-pink-300">{mediaPromoCustomText}</p>
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
                placeholder="Judul, mis. Promo 20% Hari Ini"
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
                <h2 className="text-xl font-black">Riwayat Broadcast</h2>
                <span className="text-xs text-slate-500">Terbaru di atas</span>
              </div>
              <AdminFilterShell active={broadcastFilterActive} onReset={() => { setBroadcastSearch(''); setBroadcastStatusFilter(''); setBroadcastTypeFilter(''); setBroadcastDateFilter('') }}>
                <input className="input text-xs" placeholder="Cari judul/pesan..." value={broadcastSearch} onChange={(e) => setBroadcastSearch(e.target.value)} />
                <select className="input text-xs" value={broadcastStatusFilter} onChange={(e) => setBroadcastStatusFilter(e.target.value)}><option value="">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select>
                <select className="input text-xs" value={broadcastTypeFilter} onChange={(e) => setBroadcastTypeFilter(e.target.value)}><option value="">Semua Tipe</option>{Array.from(new Set(broadcasts.map((b) => b.type).filter(Boolean))).map((x) => <option key={x} value={x}>{x}</option>)}</select>
                <input type="date" className="input text-xs" value={broadcastDateFilter} onChange={(e) => setBroadcastDateFilter(e.target.value)} />
              </AdminFilterShell>

              {limitAdminItems(filteredBroadcasts, broadcastFilterActive).map(
                (b) => (
                  <div
                    key={b.id}
                    className="glass rounded-xl p-3 md:p-3.5"
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
                        <button type="button" onClick={() => toggle('broadcasts', b.id)} className="btn btn-muted !h-8 !w-8 !p-0" title={b.is_active ? 'Nonaktifkan' : 'Aktifkan'} aria-label={b.is_active ? 'Nonaktifkan' : 'Aktifkan'}><Power className={`h-3.5 w-3.5 ${b.is_active ? 'text-emerald-300' : 'text-slate-500'}`} /></button>
                        <button type="button" onClick={() => deleteBroadcast(b)} className="btn btn-muted !h-8 !w-8 !p-0 text-red-300" title="Hapus broadcast" aria-label="Hapus broadcast"><Trash2 className="h-3.5 w-3.5" /></button>
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
                Logo Game
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
              <p className="text-xs font-black uppercase tracking-widest text-red-300">
                Banner Promo
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
                onClick={() => changeTab('promotions')}
              >
                Buka Pengaturan Banner Promo
              </button>
            </div>

          </div>

          <div className="glass rounded-3xl p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Library Media
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
            {limitAdminItems(filteredMedia, Boolean(mediaSearch || mediaCategory !== 'all')).map((a) => (
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
          <div className="glass rounded-xl p-3.5 md:p-4">
            <h2 className="text-xl font-black">Customer & Wallet</h2>
            <p className="mt-1 text-sm text-slate-400">Suspend/aktifkan, kelola role, dan Owner dapat menambah atau mengurangi saldo dengan alasan serta riwayat audit.</p>
            <AdminFilterShell active={userFilterActive} onReset={() => { setUserSearch(''); setUserRoleFilter(''); setUserStatusFilter('') }}>
              <input className="input text-xs" placeholder="Cari nama/username/email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
              <select className="input text-xs" value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}><option value="">Semua Role</option><option value="owner">Owner</option><option value="admin">Admin</option><option value="customer_service">Customer Service</option><option value="user">Member</option></select>
              <select className="input text-xs" value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value)}><option value="">Semua Status</option><option value="active">Aktif</option><option value="suspended">Suspended</option></select>
            </AdminFilterShell>
          </div>

          {limitAdminItems(filteredUsers, userFilterActive).map((u) => {
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
                className="glass rounded-xl p-3 md:p-3.5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <b>
                      {u.name ||
                        u.username ||
                        'User'}
                    </b>

                    {u.username && (
                      <p className="text-xs text-cyan-300">
                        @{u.username}
                      </p>
                    )}

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
                    {['owner', 'admin'].includes(role) && (
                      <button
                        onClick={() => editUsername(u)}
                        className="btn btn-primary text-xs"
                      >
                        Ubah Username
                      </button>
                    )}

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
          ULASAN & RUNNING TEXT
      ===================================================== */}

      {tab === 'reviews' && (
        <section className="mt-7 space-y-6">
          <div className="glass overflow-hidden rounded-3xl">
            <div className="border-b border-white/10 bg-gradient-to-r from-cyan-400/[.06] via-transparent to-fuchsia-500/[.06] p-6">
              <p className="text-[9px] font-black uppercase tracking-[.25em] text-cyan-300">Homepage</p>
              <h2 className="mt-2 text-2xl font-black text-white">Running Text</h2>
              <p className="mt-1 text-sm text-slate-500">Teks berjalan bertema gaming yang tampil di bawah Banner Promo.</p>
            </div>
            <div className="grid gap-5 p-6 md:grid-cols-[1fr_220px]">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Teks Running Text</span>
                <textarea
                  className="input min-h-28 w-full resize-y"
                  value={homeRunningText.text_content || ''}
                  onChange={(e) => setHomeRunningText({ ...homeRunningText, text_content: e.target.value })}
                  placeholder="⚡ TOP UP CEPAT • HARGA TERBAIK • EVENT SPESIAL • NDRAAAID.v1"
                />
              </label>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Status</span>
                  <select
                    className="input w-full"
                    value={homeRunningText.is_active ? 'true' : 'false'}
                    onChange={(e) => setHomeRunningText({ ...homeRunningText, is_active: e.target.value === 'true' })}
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Kecepatan</span>
                  <select
                    className="input w-full"
                    value={String(homeRunningText.speed_ms || 18000)}
                    onChange={(e) => setHomeRunningText({ ...homeRunningText, speed_ms: Number(e.target.value) })}
                  >
                    <option value="12000">Cepat</option>
                    <option value="18000">Normal</option>
                    <option value="26000">Pelan</option>
                  </select>
                </label>
              </div>
              <div className="md:col-span-2 border-t border-white/10 pt-5">
                <button type="button" onClick={saveHomeRunningText} className="btn btn-primary">
                  Simpan Running Text
                </button>
              </div>
            </div>
          </div>

          <div className="glass overflow-hidden rounded-3xl">
            <div className="border-b border-white/10 p-6">
              <p className="text-[9px] font-black uppercase tracking-[.25em] text-fuchsia-300">Moderasi</p>
              <h2 className="mt-2 text-2xl font-black text-white">Ulasan Pelanggan</h2>
              <p className="mt-1 text-sm text-slate-500">Hanya ulasan dari order berstatus SUCCESS yang bisa masuk. Ulasan tampil di Home setelah disetujui.</p>
            </div>
            <div className="divide-y divide-white/10">
              <div className="p-5">
                <AdminFilterShell active={reviewFilterActive} onReset={() => { setReviewSearch(''); setReviewRatingFilter(''); setReviewModerationFilter('') }}>
                  <input className="input text-xs" placeholder="Cari pelanggan/review/order..." value={reviewSearch} onChange={(e) => setReviewSearch(e.target.value)} />
                  <select className="input text-xs" value={reviewRatingFilter} onChange={(e) => setReviewRatingFilter(e.target.value)}><option value="">Semua Rating</option><option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option><option value="2">2 ★</option><option value="1">1 ★</option></select>
                  <select className="input text-xs" value={reviewModerationFilter} onChange={(e) => setReviewModerationFilter(e.target.value)}><option value="">Semua Moderasi</option><option value="approved">Ditampilkan</option><option value="pending">Menunggu</option></select>
                </AdminFilterShell>
              </div>
              {limitAdminItems(filteredCustomerReviews, reviewFilterActive).map((review) => (
                <div key={review.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-white">{review.reviewer_display}</span>
                      <span className="text-amber-300">{'★'.repeat(Number(review.rating || 0))}</span>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${review.is_approved ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>
                        {review.is_approved ? 'Ditampilkan' : 'Menunggu'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">“{review.review_text}”</p>
                    <p className="mt-1 text-[10px] text-slate-600">Order: {review.order_id}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button type="button" onClick={() => moderateCustomerReview(review, !review.is_approved)} className="btn btn-muted !h-8 !w-8 !p-0" title={review.is_approved ? 'Sembunyikan' : 'Tampilkan'} aria-label={review.is_approved ? 'Sembunyikan' : 'Tampilkan'}>{review.is_approved ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-emerald-300" />}</button>
                    <button type="button" onClick={() => deleteCustomerReview(review)} className="btn btn-muted !h-8 !w-8 !p-0 text-red-300" title="Hapus ulasan" aria-label="Hapus ulasan"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
              {!customerReviews.length && (
                <div className="p-10 text-center text-sm text-slate-500">Belum ada ulasan pelanggan.</div>
              )}
            </div>
          </div>
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
                      : editType === 'payment'
                        ? 'Edit Metode Pembayaran'
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
                <XCircle className="h-5 w-5" />
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
                            setEditForm((v: any) => ({
                              ...v,
                              logo_url: url,
                            })),
                          '1:1'
                        )
                      }
                    />
                  </label>

                  {editForm.logo_url && (
                    <div className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
                      <p className="mb-2 text-xs font-semibold text-slate-400">
                        Preview logo game
                      </p>
                      <img
                        src={editForm.logo_url}
                        alt="Preview logo game"
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    </div>
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
                            setEditForm((v: any) => ({
                              ...v,
                              banner_url: url,
                            })),
                          '16:9'
                        )
                      }
                    />
                  </label>

                  {editForm.banner_url && (
                    <div className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
                      <p className="mb-2 text-xs font-semibold text-slate-400">
                        Preview banner game
                      </p>
                      <img
                        src={editForm.banner_url}
                        alt="Preview banner game"
                        className="h-28 w-full rounded-xl object-cover"
                      />
                    </div>
                  )}

                  <p className="text-xs text-slate-500">
                    Pilih file foto untuk mengganti logo atau banner. URL akan dibuat otomatis oleh Supabase Storage.
                  </p>
                </>
              )}

              {editType === 'payment' && (
                <>
                  <input
                    className="input"
                    placeholder="Nama metode"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <select
                    className="input"
                    value={editForm.kind || 'QRIS'}
                    onChange={(e) => setEditForm({ ...editForm, kind: e.target.value })}
                  >
                    <option value="QRIS">QRIS</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="E_WALLET">E-Wallet</option>
                    <option value="VIRTUAL_ACCOUNT">Virtual Account</option>
                    <option value="WALLET">Saldo Akun</option>
                  </select>
                  <input
                    className="input"
                    placeholder="Nama rekening/e-wallet"
                    value={editForm.account_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Nomor rekening/e-wallet"
                    value={editForm.account_number || ''}
                    onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                  />
                  <label className="block text-sm font-semibold">
                    Foto QRIS (opsional)
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="input mt-2"
                      disabled={mediaUploading}
                      onChange={(e) => uploadFromInput(e, 'general', (url) => setEditForm((v: any) => ({ ...v, qr_url: url })), '1:1')}
                    />
                  </label>
                  {editForm.qr_url && <img src={editForm.qr_url} alt="Preview QRIS" className="h-32 w-32 rounded-xl object-cover" />}
                  <textarea
                    className="input min-h-24"
                    placeholder="Instruksi pembayaran"
                    value={editForm.instruction || ''}
                    onChange={(e) => setEditForm({ ...editForm, instruction: e.target.value })}
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
                    placeholder="Kode Produk"
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
                            setEditForm((v: any) => ({
                              ...v,
                              image_url: url,
                            })),
                          '1:1'
                        )
                      }
                    />
                  </label>

                  {editForm.image_url && (
                    <div className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
                      <p className="mb-2 text-xs font-semibold text-slate-400">
                        Preview foto produk
                      </p>
                      <img
                        src={editForm.image_url}
                        alt="Preview produk"
                        className="h-24 w-24 rounded-xl object-cover"
                      />
                    </div>
                  )}

                  <p className="text-xs text-slate-500">
                    Pilih foto untuk mengganti gambar produk. JPG, PNG, WEBP, atau GIF · maksimal 6 MB · rasio 1:1.
                  </p>
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
