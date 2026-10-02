// Aquaflow Luxury DTC E-Commerce Application & Admin Controller
(function () {
  'use strict';

  const data = window.AQUAFLOW_DATA;

  const categoryLabels = {
    baslik: 'Duş Başlığı',
    hortum: 'Duş Hortumu',
    mafsal: 'Mafsal',
    'musluk-ucu': 'Musluk Uçları',
    filtre: 'Filtreler',
    set: 'Duş Başlığı Setleri',
    'buz-kalibi': 'Buz Kalıpları',
    'fume-vakum-mafsal': 'Füme Vakumlu Mafsal'
  };

  // Uygulama Durumu (State)
  const state = {
    session: data.getSession(),
    isAuthModalOpen: false,
    authMode: 'login', // 'login', 'register', 'quick'
    authStep: 'form', // register modunda: 'form' | 'verify'
    pendingReg: null, // e-posta doğrulaması bekleyen kayıt bilgileri
    verifyDevNotice: false,
    verifyDevCode: '',
    resendAt: 0,
    postLoginView: null, // Giriş sonrası dönülecek sayfa (ör. 'customer_account')
    dismissedBanner: false,

    // Şifre Sıfırlama Durumu
    isPasswordResetModalOpen: false,
    resetStep: 1, // 1: E-posta gir, 2: Kod ve Yeni Şifre gir
    resetEmail: '',
    simulatedCodeNotice: null,
    resetDevCode: '',

    // Admin Fotoğraf Yükleme E-Posta Doğrulama Durumu
    photoUploadEmailVerification: {
      email: '',
      codeSent: false,
      isVerified: false,
      simulatedCode: null
    },

    // İl ve İlçe Arama / Seçim Durumu (Madde 3)
    checkoutCity: '',
    checkoutDistrict: '',
    cityDropdownOpen: false,
    districtDropdownOpen: false,
    citySearchInput: '',
    districtSearchInput: '',

    // Misafir Sipariş Takibi
    isOrderTrackingModalOpen: false,
    trackedOrderResult: null,

    // Yönetim Paneli Büyük Görsel Önizleme Modalı (Madde 6)
    previewModalImage: null,
    previewModalTitle: '',

    viewMode: 'store', // 'store', 'product', 'customer_account', 'admin'
    activeProductId: null,
    activeProductImageIndex: 0,
    activeProductMediaTab: 'photos', // 'photos' or 'video'
    activeProductQty: 1,
    activeProductVariant: null,

    adminTab: 'orders', // 'orders', 'products', 'analytics', 'users'
    selectedCategory: 'all',

    cart: [],
    isCartOpen: false,
    isCheckoutModalOpen: false,
    selectedPaymentMethod: 'kapida', // 'kapida' or 'kart'
    orderCompleted: null,
    searchQuery: '',
    mobileMenuOpen: false,

    // Sayfalama (Madde 3)
    currentPage: 1,
    PRODUCTS_PER_PAGE: 20,

    isContactModalOpen: false,
    isAboutModalOpen: false,
    isLegalModalOpen: false,
    legalModalType: 'mesafeli', // 'mesafeli', 'cerez', 'kvkk'

    // Admin State
    isAddProductModalOpen: false,
    editingProductId: null,
    selectedOrderReceipt: null,
    isAddUserModalOpen: false,

    productForm: {
      title: '',
      category: 'baslik',
      barcode: '', // Barkod (Madde 8)
      price: 590,
      costPrice: 240,
      stock: 20,
      badge: 'Yeni Ürün',
      subtitle: '',
      description: '',
      featuresText: '',
      variantsText: '',
      images: [],
      video: '',
      videoName: ''
    }
  };

  const emptyProductForm = {
    title: '',
    category: 'baslik',
    barcode: '',
    price: 590,
    costPrice: 240,
    stock: 20,
    badge: 'Yeni Ürün',
    subtitle: '',
    description: '',
    featuresText: '',
    variantsText: '',
    images: [],
    video: '',
    videoName: ''
  };

  // Modal yeniden çizilmeden önce, kullanıcının o ana kadar formda yazdığı
  // (henüz state'e kaydedilmemiş) değerleri kaybetmemek için DOM'dan okuyup
  // state.productForm içine yazar. Fotoğraf/video ekleme-silme gibi
  // renderApp() tetikleyen her işlemden ÖNCE çağrılmalıdır.
  function captureProductFormFromDom() {
    const get = id => document.getElementById(id);
    const title = get('add-prod-title');
    const category = get('add-prod-category');
    const stock = get('add-prod-stock');
    const price = get('add-prod-price');
    const cost = get('add-prod-cost');
    const barcode = get('add-prod-barcode');
    const badge = get('add-prod-badge');
    const subtitle = get('add-prod-subtitle');
    const description = get('add-prod-description');
    const variants = get('add-prod-variants');
    if (title) state.productForm.title = title.value;
    if (category) state.productForm.category = category.value;
    if (stock) state.productForm.stock = stock.value;
    if (price) state.productForm.price = price.value;
    if (cost) state.productForm.costPrice = cost.value;
    if (barcode) state.productForm.barcode = barcode.value;
    if (badge) state.productForm.badge = badge.value;
    if (subtitle) state.productForm.subtitle = subtitle.value;
    if (description) state.productForm.description = description.value;
    if (variants) state.productForm.variantsText = variants.value;
  }

  function resetProductForm() {
    state.editingProductId = null;
    state.productForm = { ...emptyProductForm, images: [] };
  }

  function isAdmin() {
    return !!(state.session && state.session.role === 'admin');
  }

  function formatPrice(amount) {
    const num = Number(amount) || 0;
    return `${Math.round(num).toLocaleString('tr-TR')} ₺`;
  }

  function getProductImages(prod) {
    if (!prod) return [];
    if (Array.isArray(prod.images) && prod.images.length) return prod.images.filter(Boolean);
    return prod.image ? [prod.image] : [];
  }

  function getProductVideo(prod) {
    return (prod && (prod.video || prod.videoUrl)) || '';
  }

  function parseVideoEmbed(src) {
    if (!src) return null;
    const yt = String(src).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    if (yt) return { type: 'youtube', src: 'https://www.youtube.com/embed/' + yt[1] };
    return { type: 'file', src };
  }

  function getCartTotals() {
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const freeShippingThreshold = 500;
    const isFreeShipping = subtotal >= freeShippingThreshold;
    const shipping = subtotal > 0 && !isFreeShipping ? 39 : 0;
    const total = subtotal + shipping;
    const amountNeeded = Math.max(0, freeShippingThreshold - subtotal);
    const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotal,
      shipping,
      total,
      isFreeShipping,
      amountNeeded,
      progressPercent,
      totalItems
    };
  }

  function showToast(message, icon = '✓') {
    let toast = document.getElementById('aquaflow-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'aquaflow-toast';
      toast.className = 'fixed bottom-6 right-6 z-50 transform transition-all duration-300 translate-y-20 opacity-0 pointer-events-none flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 text-xs sm:text-sm font-semibold max-w-sm';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">${icon}</span> <span>${message}</span>`;
    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    }, 3200);
  }

  // ==========================================
  // ÜST BİLDİRİM BANDI (MİSAFİR HATIRLATMA)
  // ==========================================
  function renderBrowsingNotice() {
    if (state.session || state.dismissedBanner) return '';
    return `
      <div class="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white px-4 py-2.5 text-xs border-b border-sky-900/50 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2 max-w-4xl mx-auto flex-1 justify-center text-center">
          <span class="text-sky-400 text-sm">✨</span>
          <span class="text-slate-200">Hoş geldiniz! Sipariş takibi ve avantajlar için hızlıca giriş yapabilirsiniz.</span>
          <button onclick="window.AQUAFLOW_APP.openAuthModal()" class="ml-2 underline font-bold text-sky-400 hover:text-sky-300">
            Giriş Yap / Üye Ol →
          </button>
        </div>
        <button onclick="window.AQUAFLOW_APP.dismissBanner()" class="text-slate-400 hover:text-white p-1 text-sm font-bold" title="Kapat">✕</button>
      </div>
    `;
  }

  // ==========================================
  // VITRA TARZI MODERN HEADER (GÖRSEL 2 REFERANSI)
  // ==========================================
  function renderNavbar() {
    const totals = getCartTotals();
    const categories = data.categories;
    const query = state.searchQuery.trim().toLowerCase();
    const allProducts = data.getProducts();
    const searchMatches = query.length >= 2
      ? allProducts.filter(p => p.isVisible !== false && (p.title.toLowerCase().includes(query) || (p.subtitle && p.subtitle.toLowerCase().includes(query)) || (p.categoryLabel && p.categoryLabel.toLowerCase().includes(query))))
      : [];

    return `
      ${renderBrowsingNotice()}
      <header class="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm transition-all duration-200">
        <!-- 1. Üst Ana Header Çubuğu -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4 sm:gap-8">
          
          <!-- Sol: VitrA Tarzı Şık Minimal Logo -->
          <div class="flex items-center gap-3 shrink-0">
            <button onclick="window.AQUAFLOW_APP.toggleMobileMenu()" class="lg:hidden p-2 text-slate-700 hover:text-slate-950 -ml-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>

            <a href="#" onclick="window.AQUAFLOW_APP.switchView('store')" class="flex items-baseline gap-1 group select-none">
              <span class="text-2xl sm:text-3xl font-light tracking-[0.2em] text-slate-950 uppercase font-sans">
                AQUA<strong class="font-extrabold text-sky-600">FLOW</strong>
              </span>
            </a>
          </div>

          <!-- Orta: VitrA Tarzı Geniş Yuvarlatılmış Arama Çubuğu -->
          <div class="relative flex-1 max-w-2xl hidden md:block">
            <div class="relative flex items-center">
              <span class="absolute left-4 text-slate-400 text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </span>
              <input
                id="header-search-input"
                type="text"
                placeholder="Duş başlığı, duş hortumu, mafsal, filtre, buz kalıbı ara..."
                value="${state.searchQuery}"
                oninput="window.AQUAFLOW_APP.onSearchInput(this.value)"
                class="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm pl-11 pr-10 py-2.5 sm:py-3 rounded-full border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all shadow-inner"
              />
              ${state.searchQuery ? `
                <button onclick="window.AQUAFLOW_APP.clearSearch()" class="absolute right-3.5 text-slate-400 hover:text-slate-700 text-xs font-bold">✕</button>
              ` : ''}
            </div>

            <!-- Canlı Arama Açılır Sonuç Listesi -->
            ${query.length >= 2 ? `
              <div class="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 max-h-96 overflow-y-auto">
                ${searchMatches.length === 0 ? `
                  <div class="p-6 text-center text-xs text-slate-500">
                    "${state.searchQuery}" aramasıyla eşleşen ürün bulunamadı.
                  </div>
                ` : `
                  <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
                    Bulunan Ürünler (${searchMatches.length})
                  </div>
                  <div class="space-y-1">
                    ${searchMatches.map(item => `
                      <div onclick="window.AQUAFLOW_APP.openProductPage('${item.id}')" class="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3 transition-colors">
                        <div class="flex items-center gap-3">
                          <img src="${getProductImages(item)[0] || item.image}" alt="${item.title}" class="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white shrink-0" />
                          <div>
                            <span class="text-[10px] font-bold text-sky-700 uppercase bg-sky-50 px-1.5 py-0.5 rounded">${item.categoryLabel || categoryLabels[item.category] || item.category}</span>
                            <h5 class="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5">${item.title}</h5>
                            <span class="text-xs font-black text-slate-950">${formatPrice(item.price)}</span>
                          </div>
                        </div>
                        <span class="text-xs font-bold text-sky-600 shrink-0">İncele →</span>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            ` : ''}
          </div>

          <!-- Sağ: Linkler, Sipariş Takibi, Kullanıcı & VitrA Tarzı Kırmızı Rozetli Sepet -->
          <div class="flex items-center gap-3 sm:gap-5 shrink-0 text-xs font-semibold text-slate-700">
            <!-- Misafir Sipariş Takibi Butonu -->
            <button onclick="window.AQUAFLOW_APP.openOrderTrackingModal()" class="hidden sm:flex items-center gap-1.5 text-slate-700 hover:text-sky-700 font-bold p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
              <span>📦</span>
              <span>Sipariş Takibi</span>
            </button>

            <!-- Hakkımızda -->
            <button onclick="window.AQUAFLOW_APP.openAboutModal()" class="hidden lg:inline-block hover:text-slate-950 transition-colors">
              Hakkımızda
            </button>

            <!-- İletişim -->
            <button onclick="window.AQUAFLOW_APP.openContactModal()" class="hidden lg:inline-block hover:text-slate-950 transition-colors">
              İletişim
            </button>

            <!-- Admin Butonu (Yalnızca Admin ise görünür) -->
            ${isAdmin() ? `
              <button onclick="window.AQUAFLOW_APP.switchView('admin')" class="flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                <span>🛡️</span>
                <span class="hidden sm:inline">Yönetici Paneli</span>
              </button>
            ` : ''}

            <!-- Kullanıcı Giriş / Profil Menüsü -->
            <div class="relative group">
              ${state.session ? `
                <div class="flex items-center gap-2 cursor-pointer p-1.5 rounded-xl hover:bg-slate-100">
                  <div class="w-8 h-8 rounded-full ${isAdmin() ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'} border border-slate-300 flex items-center justify-center font-bold">
                    ${isAdmin() ? '👑' : '👤'}
                  </div>
                  <span class="hidden sm:inline font-bold text-slate-900 max-w-[100px] truncate">${state.session.name}</span>
                </div>
                <div class="absolute right-0 mt-1 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 hidden group-hover:block z-50">
                  <div class="px-3 py-2 border-b border-slate-100 text-slate-500 text-[11px] truncate">
                    ${state.session.email}
                  </div>
                  ${isAdmin() ? `
                    <button onclick="window.AQUAFLOW_APP.switchView('admin')" class="w-full text-left px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50 rounded-xl flex items-center gap-2">
                      <span>🛡️</span>
                      <span>Yönetici Paneli</span>
                    </button>
                  ` : ''}
                  <button onclick="window.AQUAFLOW_APP.switchView('customer_account')" class="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-2">
                    <span>📦</span>
                    <span>Siparişlerim</span>
                  </button>
                  <button onclick="window.AQUAFLOW_APP.logout()" class="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2">
                    <span>🚪</span>
                    <span>Çıkış Yap</span>
                  </button>
                </div>
              ` : `
                <button onclick="window.AQUAFLOW_APP.openAuthModal()" class="flex items-center gap-1.5 p-2 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors" title="Giriş Yap">
                  <svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  <span class="hidden sm:inline font-bold">Giriş Yap</span>
                </button>
              `}
            </div>

            <!-- VitrA Tarzı Kırmızı Rozetli Sepet İkonu -->
            <button onclick="window.AQUAFLOW_APP.toggleCart(true)" class="relative p-2.5 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center text-slate-800" title="Sepetim">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
              <span class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-rose-700 text-white text-[10px] font-black flex items-center justify-center shadow-md">
                ${totals.totalItems}
              </span>
            </button>
          </div>
        </div>

        <!-- Mobil Arama Çubuğu -->
        <div class="px-4 pb-3 md:hidden">
          <div class="relative flex items-center">
            <span class="absolute left-3 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Ürün veya kategori ara..."
              value="${state.searchQuery}"
              oninput="window.AQUAFLOW_APP.onSearchInput(this.value)"
              class="w-full bg-slate-50 text-slate-900 placeholder:text-slate-400 text-xs pl-9 pr-8 py-2 rounded-full border border-slate-200 focus:outline-none"
            />
            ${state.searchQuery ? `
              <button onclick="window.AQUAFLOW_APP.clearSearch()" class="absolute right-3 text-slate-400 text-xs font-bold">✕</button>
            ` : ''}
          </div>
        </div>

        <!-- 2. VitrA Tarzı Yatay Alt Kategori Gezinme Menüsü (Sub-Navigation) -->
        <div class="border-t border-slate-100 bg-white/95 overflow-x-auto no-scrollbar">
          <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 sm:gap-8 text-xs sm:text-sm font-bold text-slate-700 py-3 whitespace-nowrap">
            ${categories.map(cat => `
              <a
                href="#katalog"
                onclick="window.AQUAFLOW_APP.filterCategory('${cat.id}')"
                class="transition-colors hover:text-sky-600 ${state.selectedCategory === cat.id ? 'text-sky-600 border-b-2 border-sky-600 pb-1 -mb-1' : ''}"
              >
                ${cat.name}
              </a>
            `).join('')}
          </nav>
        </div>

        <!-- Mobil Menü Çekmecesi -->
        ${state.mobileMenuOpen ? `
          <div class="lg:hidden border-t border-slate-100 bg-white px-5 py-4 space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <span class="text-xs font-bold text-slate-800">👤 ${state.session ? state.session.name : 'Misafir Ziyaretçi'}</span>
              ${state.session ? `
                <button onclick="window.AQUAFLOW_APP.logout()" class="text-xs font-bold text-rose-600">Çıkış Yap</button>
              ` : `
                <button onclick="window.AQUAFLOW_APP.openAuthModal()" class="text-xs font-bold text-sky-600">Giriş Yap</button>
              `}
            </div>
            <div class="flex gap-4 py-1 text-xs font-semibold text-slate-700">
              <button onclick="window.AQUAFLOW_APP.toggleMobileMenu(); window.AQUAFLOW_APP.openOrderTrackingModal()">📦 Sipariş Takibi</button>
              <button onclick="window.AQUAFLOW_APP.toggleMobileMenu(); window.AQUAFLOW_APP.openAboutModal()">Hakkımızda</button>
              <button onclick="window.AQUAFLOW_APP.toggleMobileMenu(); window.AQUAFLOW_APP.openContactModal()">İletişim</button>
            </div>
            <div class="pt-2 border-t border-slate-100 space-y-1">
              <div class="text-[11px] font-bold text-slate-400 uppercase">Kategoriler</div>
              ${categories.map(cat => `
                <a href="#katalog" onclick="window.AQUAFLOW_APP.toggleMobileMenu(); window.AQUAFLOW_APP.filterCategory('${cat.id}')" class="block text-sm font-semibold text-slate-800 py-1.5">
                  ${cat.name}
                </a>
              `).join('')}
            </div>
            ${isAdmin() ? `
              <div class="pt-2 border-t border-slate-100">
                <button onclick="window.AQUAFLOW_APP.toggleMobileMenu(); window.AQUAFLOW_APP.switchView('admin');" class="w-full text-left font-bold text-sky-700 py-1 text-sm flex items-center gap-2">
                  <span>🛡️ Yönetici Paneli</span>
                </button>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </header>
    `;
  }

  // ==========================================
  // HERO ALANI
  // ==========================================
  function renderHeroClean() {
    return `
      <section class="relative bg-slate-950 text-white overflow-hidden py-14 lg:py-20">
        <div class="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none">
          <div class="absolute -top-40 left-1/4 w-96 h-96 bg-sky-500/30 rounded-full blur-3xl"></div>
          <div class="absolute -bottom-20 right-10 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl"></div>
        </div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid lg:grid-cols-12 gap-10 items-center">
          <div class="lg:col-span-7 space-y-5">
            <div class="inline-flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-full px-4 py-1.5">
              <span class="text-xs font-bold text-sky-400">✨ Orijinal Aquaflow Sistemleri</span>
              <span class="text-slate-600">•</span>
              <span class="text-xs text-slate-300 font-medium">1. Sınıf Paslanmaz Malzeme & Sızdırmaz Contalar</span>
            </div>

            <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]">
              Banyonuzda Kusursuz <br/>
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-white">Tazyik ve Arıtma Deneyimi.</span>
            </h1>

            <p class="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Kireç ve kloru süzen mineral filtreleme, su akışını güçlendiren lazer mikro nozullar, kırılmaz çift örgülü çelik hortumlar ve 360° masif pirinç mafsallar.
            </p>

            <div class="flex flex-wrap items-center gap-3.5 pt-2">
              <a href="#katalog" class="bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-sm px-7 py-3.5 rounded-2xl shadow-xl shadow-sky-500/20 transition-all">
                Koleksiyonu İncele →
              </a>
              <button onclick="window.AQUAFLOW_APP.openContactModal()" class="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-sm px-6 py-3.5 rounded-2xl transition-all">
                İletişim & Danışma
              </button>
            </div>

            <div class="flex items-center gap-6 pt-3 text-xs text-slate-400 flex-wrap">
              <span class="flex items-center gap-1.5"><span class="text-emerald-400 font-bold">✓</span> Kapıda Nakit / Kredi Kartı ile Ödeme</span>
              <span class="flex items-center gap-1.5"><span class="text-emerald-400 font-bold">✓</span> 1-3 İş Gününde Hızlı Teslimat</span>
              <span class="flex items-center gap-1.5"><span class="text-emerald-400 font-bold">✓</span> 256-Bit SSL Güvenli Alışveriş</span>
            </div>
          </div>

          <div class="lg:col-span-5 relative">
            <div class="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group">
              <img src="res/hero-banner.jpg" alt="Aquaflow Lüks Arıtmalı Duş Başlığı" class="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-700" />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
              <div class="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-bold text-white">Aquaflow™ Hydro Jet Serisi</h4>
                  <p class="text-[11px] text-slate-300">Ultra Tazyikli ve Filtreli Duş Başlığı</p>
                </div>
                <a href="#katalog" class="bg-sky-500 text-slate-950 text-xs font-bold px-3.5 py-1.5 rounded-xl">Ürünler</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================
  // ÜRÜNLER KATALOĞU (GRID)
  // ==========================================
  function renderProductsCatalog() {
    const allProducts = data.getProducts();
    const visibleProducts = allProducts.filter(p => p.isVisible !== false);

    const filtered = state.selectedCategory === 'all'
      ? visibleProducts
      : visibleProducts.filter(p => p.category === state.selectedCategory);

    // Sayfalama hesaplama (Madde 3)
    const ITEMS_PER_PAGE = state.PRODUCTS_PER_PAGE;
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const currentPage = Math.min(Math.max(1, state.currentPage), totalPages);
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    // Sayfa numaraları (maks 5 sayfa göster)
    function buildPageNumbers() {
      if (totalPages <= 1) return '';
      const pages = [];
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + 4);
      if (end - start < 4) start = Math.max(1, end - 4);
      for (let i = start; i <= end; i++) {
        pages.push(`
          <button
            onclick="window.AQUAFLOW_APP.goToPage(${i})"
            class="w-9 h-9 rounded-xl text-xs font-bold transition-all ${i === currentPage ? 'bg-slate-950 text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'}"
          >${i}</button>
        `);
      }
      return pages.join('');
    }

    const paginationHtml = totalPages > 1 ? `
      <div class="flex items-center justify-center gap-2 mt-10 flex-wrap">
        <button
          onclick="window.AQUAFLOW_APP.goToPage(${currentPage - 1})"
          ${currentPage === 1 ? 'disabled' : ''}
          class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${currentPage === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'}"
        >← Önceki</button>
        ${buildPageNumbers()}
        <button
          onclick="window.AQUAFLOW_APP.goToPage(${currentPage + 1})"
          ${currentPage === totalPages ? 'disabled' : ''}
          class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${currentPage === totalPages ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'}"
        >Sonraki →</button>
      </div>
      <p class="text-center text-xs text-slate-400 mt-3">
        ${filtered.length} üründen ${startIdx + 1}–${Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)} arası gösteriliyor
        (Sayfa ${currentPage} / ${totalPages})
      </p>
    ` : '';

    return `
      <section id="katalog" class="py-14 sm:py-18 bg-slate-50 border-b border-slate-200 scroll-mt-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div class="text-center max-w-2xl mx-auto mb-8 space-y-2">
            <span class="text-xs font-black uppercase tracking-widest text-sky-700 bg-sky-50 border border-sky-100 px-3 py-1 rounded-full">
              Koleksiyon &amp; Fiyatlar
            </span>
            <h2 class="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Aquaflow Ürün Ailesi
            </h2>
            <p class="text-slate-500 text-xs sm:text-sm">
              Duş başlıkları, dayanıklı hortumlar, masif pirinç mafsallar, robot kol musluk uçları, yedek filtreler ve banyo aksesuarları.
            </p>
          </div>

          <!-- Kategori Filtre Butonları -->
          <div class="flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap mb-10">
            ${data.categories.map(cat => `
              <button
                onclick="window.AQUAFLOW_APP.filterCategory('${cat.id}')"
                class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${state.selectedCategory === cat.id ? 'bg-slate-950 text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'}"
              >
                ${cat.name}
              </button>
            `).join('')}
          </div>

          <!-- Ürün Kartları Izgarası (Eşit Yükseklik - Madde 2) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            ${pageItems.length === 0 ? `
              <div class="col-span-full py-16 text-center text-slate-500 space-y-2">
                <p class="text-2xl">📦</p>
                <p class="text-sm font-bold">Bu kategoride şu anda sergilenen ürün bulunamadı.</p>
                <button onclick="window.AQUAFLOW_APP.filterCategory('all')" class="text-xs font-bold text-sky-600 underline">Tüm Ürünleri Göster</button>
              </div>
            ` : pageItems.map(prod => `
              <div class="group bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col relative">
                
                <div class="relative bg-slate-100 overflow-hidden cursor-pointer shrink-0" style="aspect-ratio:1/1;" onclick="window.AQUAFLOW_APP.openProductPage('${prod.id}')">
                  <img src="${getProductImages(prod)[0] || prod.image || ''}" alt="${prod.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  
                  <div class="absolute top-3 left-3 flex flex-col gap-1.5">
                    ${prod.badge ? `
                      <span class="bg-slate-950/85 backdrop-blur text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow">
                        ${prod.badge}
                      </span>
                    ` : ''}
                  </div>

                  <span class="absolute bottom-3 left-3 bg-white/95 backdrop-blur text-slate-800 text-[10px] font-bold px-2.5 py-0.5 rounded-md shadow-sm uppercase">
                    ${prod.categoryLabel || categoryLabels[prod.category] || prod.category}
                  </span>
                  
                  ${getProductImages(prod).length > 1 ? `
                    <span class="absolute bottom-3 right-3 bg-slate-950/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      ${getProductImages(prod).length} Görsel
                    </span>
                  ` : ''}
                </div>

                <!-- Kart içeriği flex-1 ile büyür, butonlar her zaman altta -->
                <div class="p-5 flex-1 flex flex-col">
                  <div class="flex-1 space-y-1.5 mb-3">
                    <h3 onclick="window.AQUAFLOW_APP.openProductPage('${prod.id}')" class="text-sm font-bold text-slate-950 leading-snug group-hover:text-sky-600 transition-colors line-clamp-2 cursor-pointer">
                      ${prod.title}
                    </h3>
                    <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      ${prod.subtitle || ''}
                    </p>
                  </div>

                  <!-- Fiyat ve butonlar her zaman altta hizalı -->
                  <div class="pt-3 border-t border-slate-100 space-y-3 mt-auto">
                    <div class="flex items-baseline justify-between">
                      <div>
                        <span class="text-xl font-black text-slate-950">${formatPrice(prod.price)}</span>
                      </div>
                      <span class="text-[11px] font-semibold text-emerald-600">Stokta (${prod.stock})</span>
                    </div>

                    <div class="flex gap-2">
                      <button onclick="window.AQUAFLOW_APP.openProductPage('${prod.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1">
                        <span>İncele</span>
                        <span>→</span>
                      </button>
                      <button onclick="window.AQUAFLOW_APP.addCatalogProductToCart('${prod.id}')" class="flex-1 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow transition-all active:scale-95 flex items-center justify-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                        <span>Sepete Ekle</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Sayfalama (Madde 3) -->
          ${paginationHtml}

        </div>
      </section>
    `;
  }

  // ==========================================
  // ÜRÜN DETAY SAYFASI
  // ==========================================
  function renderProductDetailPage(productId) {
    const products = data.getProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod) {
      return `
        <div class="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
          <h2 class="text-2xl font-bold text-slate-900">Aradığınız ürün bulunamadı.</h2>
          <button onclick="window.AQUAFLOW_APP.switchView('store')" class="bg-slate-950 text-white text-xs font-bold px-6 py-3 rounded-xl">
            Tüm Ürünlere Dön
          </button>
        </div>
      `;
    }

    const images = getProductImages(prod);
    const video = getProductVideo(prod);
    const embed = video ? parseVideoEmbed(video) : null;
    const variants = Array.isArray(prod.variants) ? prod.variants : [];
    const selectedVariant = state.activeProductVariant || (variants.length ? variants[0] : 'Standart');
    const features = Array.isArray(prod.features) ? prod.features : [];
    const activeMediaTab = video ? state.activeProductMediaTab : 'photos';
    const mainImage = images[state.activeProductImageIndex] || images[0] || prod.image || '';

    return `
      <section class="py-8 lg:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-8 flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
          <button onclick="window.AQUAFLOW_APP.switchView('store')" class="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-950 bg-white border border-slate-200 hover:border-slate-300 px-4 py-2 rounded-xl transition-all shadow-sm">
            <span>←</span>
            <span>Tüm Ürünlere Geri Dön</span>
          </button>
          <div class="text-xs text-slate-500 flex items-center gap-2">
            <a href="#" onclick="window.AQUAFLOW_APP.switchView('store')" class="hover:text-slate-900 font-semibold">Katalog</a>
            <span>/</span>
            <span class="text-sky-600 font-bold uppercase">${prod.categoryLabel || categoryLabels[prod.category] || prod.category}</span>
            <span>/</span>
            <span class="text-slate-900 font-bold truncate max-w-[200px] sm:max-w-xs">${prod.title}</span>
          </div>
        </div>

        <div class="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <div class="lg:col-span-7 space-y-4">
            ${video ? `
              <div class="flex gap-2">
                <button onclick="window.AQUAFLOW_APP.setActiveProductMediaTab('photos')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeMediaTab === 'photos' ? 'bg-slate-950 text-white shadow' : 'bg-white text-slate-700 border border-slate-200'}">
                  🖼️ Fotoğraflar (${images.length})
                </button>
                <button onclick="window.AQUAFLOW_APP.setActiveProductMediaTab('video')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeMediaTab === 'video' ? 'bg-sky-500 text-slate-950 shadow' : 'bg-white text-slate-700 border border-slate-200'}">
                  ▶ Video
                </button>
              </div>
            ` : ''}

            ${activeMediaTab === 'video' && embed ? `
              <div class="relative aspect-[4/3] sm:aspect-video rounded-3xl overflow-hidden bg-slate-950 border border-slate-200 shadow-xl flex items-center justify-center">
                ${embed.type === 'youtube' ? `
                  <iframe class="w-full h-full" src="${embed.src}" title="${prod.title}" allowfullscreen></iframe>
                ` : `
                  <video class="w-full h-full object-contain bg-black" src="${embed.src}" controls autoplay></video>
                `}
              </div>
            ` : `
              <!-- Madde 5: 1023×1600 oranında, object-fit: contain, kırpmasız görsel alanı -->
              <div class="relative bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden flex items-center justify-center group"
                   style="width:100%; max-width:1023px; aspect-ratio:1023/1600; margin:0 auto; background:#f8fafc;">
                <img
                  src="${mainImage}"
                  alt="${prod.title}"
                  class="w-full h-full transition-all duration-300"
                  style="object-fit:contain; max-width:100%; max-height:100%; display:block;"
                  onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 400%22 fill=%22%23e2e8f0%22%3E%3Crect width=%22400%22 height=%22400%22/%3E%3Ctext y=%22200%22 x=%22200%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-size=%2240%22 fill=%22%2394a3b8%22%3E🚿%3C/text%3E%3C/svg%3E';"
                />

                ${prod.badge ? `
                  <span class="absolute top-4 left-4 bg-slate-950/85 backdrop-blur text-white text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow">
                    ${prod.badge}
                  </span>
                ` : ''}


                ${images.length > 1 ? `
                  <span class="absolute top-4 right-4 bg-white/90 backdrop-blur text-slate-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    ${state.activeProductImageIndex + 1} / ${images.length}
                  </span>
                  <button onclick="window.AQUAFLOW_APP.prevActiveProductImage()" class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-slate-800 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Önceki">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                  </button>
                  <button onclick="window.AQUAFLOW_APP.nextActiveProductImage()" class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-slate-800 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Sonraki">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                  </button>
                ` : ''}
              </div>
            `}

            ${images.length > 1 ? `
              <div class="grid grid-cols-5 gap-3">
                ${images.map((imgUrl, idx) => `
                  <button onclick="window.AQUAFLOW_APP.setActiveProductImage(${idx})" class="relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${activeMediaTab === 'photos' && state.activeProductImageIndex === idx ? 'border-sky-500 ring-2 ring-sky-500/20 scale-105' : 'border-slate-200 opacity-75 hover:opacity-100'}">
                    <img src="${imgUrl}" alt="Thumbnail ${idx + 1}" class="w-full h-full object-cover" />
                  </button>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <div class="lg:col-span-5 space-y-6">
            <div class="space-y-2">
              <span class="inline-block text-xs font-black uppercase tracking-widest text-sky-700 bg-sky-50 border border-sky-100 px-3 py-1 rounded-full">
                ${prod.categoryLabel || categoryLabels[prod.category] || prod.category}
              </span>
              <h1 class="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-snug">
                ${prod.title}
              </h1>
              ${prod.subtitle ? `<p class="text-sm font-semibold text-slate-600 leading-relaxed">${prod.subtitle}</p>` : ''}
            </div>

            <div class="flex items-baseline gap-3 pt-2 pb-3 border-b border-slate-200">
              <span class="text-3xl sm:text-4xl font-black text-slate-950">
                ${formatPrice(prod.price)}
              </span>
              <span class="text-xs text-slate-500">KDV Dahil</span>
            </div>

            <div class="flex items-center gap-2 text-xs font-bold text-emerald-600">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Stok Durumu: ${prod.stock} Adet Stokta — Hızlı Gönderim</span>
            </div>

            <div class="text-sm text-slate-700 leading-relaxed bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-2">
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-900">Ürün Açıklaması</h4>
              <p>${prod.description || prod.subtitle || 'Bu ürün orijinal Aquaflow parça ve işçilik kalitesiyle üretilmiştir.'}</p>
            </div>

            ${variants.length ? `
              <div class="space-y-2.5">
                <span class="text-xs font-bold text-slate-700">Model / Renk: <strong class="text-slate-950">${selectedVariant}</strong></span>
                <div class="flex flex-wrap gap-2.5">
                  ${variants.map(vr => `
                    <button onclick="window.AQUAFLOW_APP.setActiveProductVariant('${vr.replace(/'/g, "\\'")}')" class="px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${selectedVariant === vr ? 'border-slate-950 bg-slate-950 text-white shadow-sm' : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white'}">
                      ${vr}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${features.length ? `
              <div class="space-y-2.5">
                <h4 class="text-xs font-black uppercase tracking-wider text-slate-900">Öne Çıkan Özellikler</h4>
                <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  ${features.map(f => `
                    <li class="flex items-center gap-2 bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2 font-medium text-slate-800">
                      <span class="text-emerald-500 font-bold">✓</span>
                      <span>${f}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            <div class="space-y-3 pt-3 border-t border-slate-200">
              <div class="flex items-stretch gap-3">
                <div class="flex items-center border border-slate-300 rounded-2xl bg-white px-2 shadow-sm">
                  <button onclick="window.AQUAFLOW_APP.updateActiveProductQty(-1)" class="w-9 h-11 flex items-center justify-center text-slate-700 font-bold text-base">−</button>
                  <span class="w-9 text-center font-black text-sm text-slate-950">${state.activeProductQty}</span>
                  <button onclick="window.AQUAFLOW_APP.updateActiveProductQty(1)" class="w-9 h-11 flex items-center justify-center text-slate-700 font-bold text-base">+</button>
                </div>
                <button onclick="window.AQUAFLOW_APP.addActiveProductToCart()" class="flex-1 bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95">
                  <svg class="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                  <span>Sepete Ekle • ${formatPrice(prod.price * state.activeProductQty)}</span>
                </button>
              </div>
              <button onclick="window.AQUAFLOW_APP.buyNowActiveProduct()" class="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm py-4 px-6 rounded-2xl shadow-lg transition-all">
                ⚡ Hemen Satın Al (Hızlı Sipariş)
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-600">
              <div class="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5">
                <span class="text-lg">🔒</span>
                <div>
                  <span class="block font-bold text-slate-900">Güvenli Alışveriş</span>
                  <span class="text-[11px] text-slate-500">256-Bit SSL Şifreleme</span>
                </div>
              </div>
              <div class="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5">
                <span class="text-lg">💵</span>
                <div>
                  <span class="block font-bold text-slate-900">Kapıda Ödeme</span>
                  <span class="text-[11px] text-slate-500">Nakit veya Kredi Kartı</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================
  // KULLANICI / MÜŞTERİ PANELİ ("SİPARİŞLERİM")
  // Kullanıcı SADECE kendi siparişlerini görür
  // ==========================================
  function renderCustomerAccountPage() {
    if (!state.session) {
      state.postLoginView = 'customer_account';
      state.isAuthModalOpen = true;
      state.viewMode = 'store';
      renderApp();
      return '';
    }

    const myOrders = data.getCustomerOrders(state.session.email);

    return `
      <section class="py-10 lg:py-14 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <!-- Üst Başlık & Kullanıcı Kartı -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 font-extrabold flex items-center justify-center text-2xl border border-sky-100">
              👤
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl font-extrabold text-slate-950">${state.session.name}</h1>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isAdmin() ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}">
                  ${isAdmin() ? '👑 Yönetici' : 'Müşteri'}
                </span>
              </div>
              <p class="text-xs text-slate-500">${state.session.email}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            ${isAdmin() ? `
              <button onclick="window.AQUAFLOW_APP.switchView('admin')" class="bg-slate-950 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all">
                🛡️ Yönetici Paneli
              </button>
            ` : ''}
            <button onclick="window.AQUAFLOW_APP.switchView('store')" class="bg-slate-100 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-200 transition-all">
              Alışverişe Devam Et →
            </button>
          </div>
        </div>

        <!-- Siparişlerim Başlığı & Listesi -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-black text-slate-950">Sipariş Geçmişim (${myOrders.length})</h2>
              <p class="text-xs text-slate-500">Yalnızca sizin e-posta adresinizle verilen siparişler listelenir</p>
            </div>
          </div>

          ${myOrders.length === 0 ? `
            <div class="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <span class="text-4xl">📦</span>
              <h3 class="text-base font-bold text-slate-900">Henüz Kayıtlı Bir Siparişiniz Bulunmuyor</h3>
              <p class="text-xs text-slate-500 max-w-sm mx-auto">
                Aquaflow banyo ve arıtma ürünlerimizi inceleyerek hemen sipariş verebilirsiniz.
              </p>
              <button onclick="window.AQUAFLOW_APP.switchView('store')" class="bg-slate-950 text-white font-bold text-xs px-6 py-3 rounded-xl mt-2">
                Ürünleri Keşfet
              </button>
            </div>
          ` : `
            <div class="space-y-4">
              ${myOrders.map(order => `
                <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <!-- Sipariş Başlık Satırı -->
                  <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 text-xs">
                    <div>
                      <span class="text-slate-400">Sipariş No:</span>
                      <strong class="font-mono text-slate-900 ml-1">#${order.id}</strong>
                      <span class="text-slate-300 mx-2">•</span>
                      <span class="text-slate-500">${order.date}</span>
                    </div>

                    <div class="flex items-center gap-3">
                      <!-- Durum Rozeti -->
                      <span class="px-3 py-1 rounded-full font-bold text-xs ${order.status === 'İşleme Alındı' ? 'bg-amber-50 text-amber-700 border border-amber-200' : order.status === 'Hazırlanıyor' ? 'bg-sky-50 text-sky-700 border border-sky-200' : order.status === 'Kargoya Verildi' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
                        ${order.status}
                      </span>
                      ${order.trackingNo && order.trackingNo !== 'Bekleniyor' ? `
                        <span class="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          Kargo: ${order.trackingNo}
                        </span>
                      ` : ''}
                    </div>
                  </div>

                  <!-- Sipariş Edilen Ürünler (Fotoğraflı) -->
                  <div class="space-y-3">
                    ${(order.items || []).map(it => `
                      <div class="flex items-center justify-between gap-4 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <div class="flex items-center gap-3 min-w-0">
                          <img
                            src="${it.image || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=200&q=80'}"
                            alt="${it.title}"
                            class="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                          />
                          <div class="min-w-0">
                            <h4 class="text-xs font-bold text-slate-900 truncate">${it.title}</h4>
                            <div class="text-[11px] text-slate-500 mt-0.5">
                              ${it.variant ? `<span>Varyant: ${it.variant} • </span>` : ''}
                              <span>Adet: <strong>${it.quantity}</strong></span>
                            </div>
                          </div>
                        </div>
                        <div class="text-right shrink-0">
                          <span class="text-sm font-black text-slate-950">${formatPrice(it.price * it.quantity)}</span>
                        </div>
                      </div>
                    `).join('')}
                  </div>

                  <!-- Alt Bilgi: Teslimat ve Toplam -->
                  <div class="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 text-xs gap-3">
                    <div class="text-slate-500">
                      📍 <strong>Teslimat:</strong> ${order.city} — <span class="line-clamp-1">${order.address}</span>
                    </div>
                    <div class="flex items-center gap-4">
                      <div>
                        <span class="text-slate-400">Toplam:</span>
                        <strong class="text-base font-black text-slate-950 ml-1">${formatPrice(order.total)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </section>
    `;
  }

  // ==========================================
  // MİSAFİR SİPARİŞ TAKİBİ MODALI (HERKES KULLANABİLİR)
  // ==========================================
  function renderOrderTrackingModal() {
    if (!state.isOrderTrackingModalOpen) return '';

    const res = state.trackedOrderResult;

    return `
      <div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
          
          <div class="p-6 bg-slate-950 text-white flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sky-400 text-lg">📦</span>
              <div>
                <h3 class="font-black text-sm">Sipariş Durumu Sorgulama</h3>
                <p class="text-[10px] text-slate-400">Sipariş No ve iletişim bilginizle anında sorgulayın</p>
              </div>
            </div>
            <button onclick="window.AQUAFLOW_APP.closeOrderTrackingModal()" class="text-slate-400 hover:text-white font-bold p-1">✕</button>
          </div>

          <div class="p-6 space-y-5 text-xs text-slate-800">
            <!-- Sorgulama Formu -->
            <form onsubmit="window.AQUAFLOW_APP.handleTrackOrder(event)" class="space-y-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Sipariş Numarası *</label>
                <input
                  required
                  id="track-order-id"
                  type="text"
                  placeholder="Örn: AQ-849201"
                  class="w-full border border-slate-300 rounded-xl p-3 font-mono font-bold uppercase text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Telefon veya E-posta (İsteğe Bağlı)</label>
                <input
                  id="track-order-contact"
                  type="text"
                  placeholder="Siparişte girdiğiniz telefon veya e-posta"
                  class="w-full border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <button type="submit" class="w-full bg-slate-950 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md">
                Siparişi Sorgula 🔍
              </button>
            </form>

            <!-- Sonuç Alanı -->
            ${res ? (res.error ? `
              <div class="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-center font-semibold">
                ${res.error}
              </div>
            ` : `
              <div class="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <span class="font-mono font-bold text-sm text-slate-900">#${res.id}</span>
                    <span class="text-[10px] text-slate-400 block">${res.date}</span>
                  </div>
                  <span class="px-3 py-1 rounded-full font-bold text-xs bg-sky-100 text-sky-800">
                    ${res.status}
                  </span>
                </div>

                <div class="space-y-2">
                  <span class="font-bold text-slate-700 block">Sipariş Kalemleri:</span>
                  ${(res.items || []).map(it => `
                    <div class="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100">
                      <img src="${it.image || ''}" alt="${it.title}" class="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200" />
                      <div class="min-w-0 flex-1">
                        <div class="font-bold text-slate-900 truncate">${it.quantity}x ${it.title}</div>
                        ${it.variant ? `<div class="text-[10px] text-slate-500">${it.variant}</div>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>

                <div class="pt-2 border-t border-slate-200 text-[11px] space-y-1">
                  <div><strong>Alıcı:</strong> ${res.customerName}</div>
                  <div><strong>Teslimat:</strong> ${res.city}</div>
                  <div><strong>Kargo Takip:</strong> <span class="font-mono font-bold text-slate-900">${res.trackingNo || 'Hazırlanıyor'}</span></div>
                </div>
              </div>
            `) : ''}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // ŞİFRE SIFIRLAMA MODALI (6 HANELİ GÜVENLİK KODU)
  // Hem Admin hem Müşteri için çalışır
  // ==========================================
  function renderPasswordResetModal() {
    if (!state.isPasswordResetModalOpen) return '';

    return `
      <div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
          
          <div class="p-6 bg-slate-950 text-white flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sky-400 text-lg">🔑</span>
              <div>
                <h3 class="font-black text-sm">Şifremi Unuttum</h3>
                <p class="text-[10px] text-slate-400">E-postanıza 6 haneli kod gönderilir</p>
              </div>
            </div>
            <button onclick="window.AQUAFLOW_APP.closePasswordResetModal()" class="text-slate-400 hover:text-white font-bold p-1">✕</button>
          </div>

          <div class="p-6 space-y-4 text-xs">
            ${state.resetStep === 1 ? `
              <!-- ADIM 1: E-posta Adresi İste -->
              <form onsubmit="window.AQUAFLOW_APP.handleSendResetCode(event)" class="space-y-3">
                <p class="text-slate-600 leading-relaxed">
                  Hesabınıza kayıtlı e-posta adresinizi girin. Şifrenizi yenilemeniz için 6 haneli bir güvenlik kodu üreteceğiz.
                </p>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">E-posta Adresiniz</label>
                  <input
                    required
                    id="reset-email-input"
                    type="email"
                    placeholder="ornek@domain.com"
                    value="${state.resetEmail || ''}"
                    class="w-full border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <button type="submit" class="w-full bg-slate-950 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md">
                  Doğrulama Kodu Gönder →
                </button>
              </form>
            ` : `
              <!-- ADIM 2: Kodu ve Yeni Şifreyi Gir -->
              <form onsubmit="window.AQUAFLOW_APP.handleVerifyAndResetPassword(event)" class="space-y-3">
                
                {/* ADIM 2: Kodu ve Yeni Şifreyi Gir */}
                ${state.simulatedCodeNotice ? `
                  <div class="p-4 bg-sky-50 border-2 border-sky-200 rounded-2xl space-y-1.5 text-center">
                    <span class="text-lg">✉️</span>
                    <h5 class="font-extrabold text-sky-950 text-xs">Doğrulama Kodu E-postanıza Gönderildi!</h5>
                    <p class="text-[11px] text-slate-600">Sayın <strong>${state.simulatedCodeNotice.userName || 'Kullanıcı'}</strong>, <strong>${state.resetEmail}</strong> adresine 6 haneli güvenlik kodu gönderildi.</p>
                    ${state.resetDevCode ? `<p class="text-[12px] font-black text-amber-800 tracking-[0.35em] pt-1">${String(state.resetDevCode).replace(/[^\d]/g, '')}</p><p class="text-[10px] text-amber-700">E-posta gitmediği için kod burada gösterildi. smtp-config.json içine Gmail uygulama şifresi yazın.</p>` : '<span class="text-[10px] text-slate-400 block">(Bu kod 15 dakika boyunca geçerlidir. Lütfen e-postanızı kontrol edin.)</span>'}
                  </div>
                ` : ''}

                <div>
                  <label class="block font-bold text-slate-700 mb-1">6 Haneli Doğrulama Kodu *</label>
                  <input
                    required
                    id="reset-code-input"
                    type="text"
                    maxlength="6"
                    placeholder="Örn: 481920"
                    class="w-full border border-slate-300 rounded-xl p-3 font-mono font-bold text-center tracking-widest text-base text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1">Yeni Şifreniz *</label>
                  <input
                    required
                    id="reset-new-password"
                    type="password"
                    placeholder="En az 4 karakter"
                    class="w-full border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1">Yeni Şifre (Tekrar) *</label>
                  <input
                    required
                    id="reset-confirm-password"
                    type="password"
                    placeholder="Şifrenizi tekrar girin"
                    class="w-full border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div class="flex gap-2 pt-1">
                  <button type="button" onclick="state.resetStep = 1; renderApp();" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-xl">
                    Geri
                  </button>
                  <button type="submit" class="flex-1 bg-slate-950 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl transition-all shadow-md">
                    Şifremi Güncelle ve Giriş Yap
                  </button>
                </div>
              </form>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // HIZLI VE GÜVENLİ GİRİŞ / KAYIT MODALI
  // ==========================================
  function renderAuthModal() {
    if (!state.isAuthModalOpen) return '';

    const isLogin = state.authMode === 'login';
    const isRegister = state.authMode === 'register';
    const isVerify = isRegister && state.authStep === 'verify' && !!state.pendingReg;
    const escAttr = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const pend = state.pendingReg || {};

    return `
      <div class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div class="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
          
          <div class="p-6 bg-slate-950 text-white flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-sky-500 text-slate-950 font-black flex items-center justify-center text-sm">🚿</div>
              <div>
                <h3 class="font-black text-sm tracking-wide">AQUAFLOW HESAP</h3>
                <p class="text-[10px] text-slate-400">${isVerify ? 'E-posta Doğrulama' : (isRegister ? 'Yeni Müşteri Kaydı' : 'Güvenli Oturum Açma')}</p>
              </div>
            </div>
            <button onclick="window.AQUAFLOW_APP.closeAuthModal()" class="text-slate-400 hover:text-white p-1 text-sm font-bold">✕</button>
          </div>

          <div class="p-6 space-y-5 text-xs">
            ${isVerify ? `
            <div class="space-y-4">
              <div class="bg-sky-50 border border-sky-100 rounded-xl p-4">
                <p class="text-[12px] text-slate-700 leading-relaxed"><strong>${escAttr(pend.email)}</strong> adresine 6 haneli bir doğrulama kodu gönderdik. Kod 10 dakika geçerlidir. Gelen kutusunda göremezseniz spam klasörünü kontrol edin.</p>
              </div>
              ${state.verifyDevNotice ? `
                <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
                  <p class="font-semibold">E-posta henüz gönderilemedi (Gmail uygulama şifresi yok).</p>
                  ${state.verifyDevCode ? `<p>Doğrulama kodunuz: <span class="font-black tracking-[0.35em] text-lg">${escAttr(state.verifyDevCode)}</span></p>` : '<p>Kodu serve.ps1 siyah penceresinde görün.</p>'}
                  <p class="text-amber-800/80 font-medium">Mailin gitmesi için smtp-config.json içine 16 haneli Gmail uygulama şifresini yazın.</p>
                </div>
              ` : ''}
              <form onsubmit="window.AQUAFLOW_APP.submitEmailCode(event)" class="space-y-3">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Doğrulama Kodu *</label>
                  <input required id="verify-code-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,6)" class="w-full border border-slate-300 rounded-xl p-3 font-black text-lg text-center tracking-[0.5em] text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                </div>
                <button type="submit" class="w-full bg-slate-950 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md">
                  Doğrula ve Kaydı Tamamla
                </button>
              </form>
              <div class="flex items-center justify-between pt-1">
                <button type="button" onclick="window.AQUAFLOW_APP.backToRegisterForm()" class="text-[11px] font-bold text-slate-500 hover:text-slate-800">← E-postayı değiştir</button>
                <button type="button" onclick="window.AQUAFLOW_APP.resendEmailCode()" class="text-[11px] font-bold text-sky-700 hover:underline">Kodu tekrar gönder</button>
              </div>
            </div>
            ` : `
            <!-- Standart Giriş / Kayıt Formu -->
            <form onsubmit="window.AQUAFLOW_APP.submitAuth(event)" class="space-y-3">
              ${isRegister ? `
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Adınız Soyadınız *</label>
                  <input required id="auth-name" type="text" value="${escAttr(pend.name)}" placeholder="Ad Soyad" class="w-full border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                </div>
              ` : ''}

              <div>
                <label class="block font-bold text-slate-700 mb-1">E-posta Adresi *</label>
                <input required id="auth-email" type="email" value="${isRegister ? escAttr(pend.email) : ''}" placeholder="ornek@domain.com" class="w-full border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none" />
              </div>

              ${isRegister ? `
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Telefon Numarası *</label>
                  <input required id="auth-phone" type="tel" value="${escAttr(pend.phone)}" inputmode="numeric" autocomplete="tel" maxlength="11" pattern="[0-9]{11}" placeholder="05xxxxxxxxx" title="11 haneli telefon numarası (örn: 05321234567)" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,11)" class="w-full border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                  <p class="text-[10px] text-slate-400 mt-1">Sipariş ve kargo bilgilendirmesi için 11 haneli numaranız (05 ile başlayan).</p>
                </div>
              ` : ''}

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="font-bold text-slate-700">Şifre *</label>
                  ${!isRegister ? `
                    <button type="button" onclick="window.AQUAFLOW_APP.openPasswordResetModal()" class="text-[11px] font-bold text-sky-700 hover:underline">
                      Şifremi Unuttum?
                    </button>
                  ` : ''}
                </div>
                <input required id="auth-password" type="password" ${isRegister ? 'minlength="6"' : ''} placeholder="${isRegister ? 'En az 6 karakter' : '••••••••'}" class="w-full border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none" />
              </div>

              <button type="submit" class="w-full bg-slate-950 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md">
                ${isRegister ? 'Doğrulama Kodu Gönder' : 'Giriş Yap'}
              </button>

              <button type="button" onclick="window.AQUAFLOW_APP.toggleAuthMode()" class="w-full text-center text-xs font-bold text-sky-700 hover:text-sky-900 pt-1">
                ${isRegister ? 'Zaten hesabınız var mı? Giriş Yapın →' : 'Hesabınız yok mu? Yeni Müşteri Kaydı Açın →'}
              </button>
            </form>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // SEPET ÇEKMECESİ (CART DRAWER)
  // ==========================================
  function renderCartDrawer() {
    if (!state.isCartOpen) return '';

    const totals = getCartTotals();

    return `
      <div class="fixed inset-0 z-50 overflow-hidden">
        <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onclick="window.AQUAFLOW_APP.toggleCart(false)"></div>
        <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div class="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
            
            <div class="p-5 border-b border-slate-200 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-base font-black text-slate-950">Sepetim</span>
                <span class="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">${totals.totalItems} Ürün</span>
              </div>
              <button onclick="window.AQUAFLOW_APP.toggleCart(false)" class="p-2 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors">
                ✕
              </button>
            </div>

            <div class="p-4 bg-sky-50/70 border-b border-sky-100 text-xs">
              <div class="flex items-center justify-between font-bold text-slate-800 mb-1.5">
                ${totals.isFreeShipping ? `
                  <span class="text-emerald-700 flex items-center gap-1.5 font-extrabold">
                    🎉 Tebrikler! Ücretsiz Kargo Kazandınız!
                  </span>
                ` : `
                  <span>Sepete <strong class="text-sky-700">${formatPrice(totals.amountNeeded)}</strong> daha ekleyin, KARGO BEDAVA!</span>
                `}
                <span class="text-slate-500">${totals.progressPercent}%</span>
              </div>
              <div class="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500 ${totals.isFreeShipping ? 'bg-emerald-500' : 'bg-sky-500'}" style="width: ${totals.progressPercent}%"></div>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto p-5 space-y-4">
              ${state.cart.length === 0 ? `
                <div class="text-center py-20 space-y-3">
                  <span class="text-4xl">🚿</span>
                  <h4 class="text-base font-bold text-slate-900">Sepetiniz Boş</h4>
                  <p class="text-xs text-slate-500">Banyonuzu lüks Aquaflow ürünleriyle yenileyin.</p>
                  <a href="#katalog" onclick="window.AQUAFLOW_APP.toggleCart(false)" class="inline-block bg-slate-950 text-white text-xs font-bold px-6 py-3 rounded-xl mt-2">
                    Ürünleri Gör
                  </a>
                </div>
              ` : state.cart.map((item, index) => `
                <div class="flex gap-4 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 relative">
                  <img src="${item.image}" alt="${item.title}" class="w-16 h-16 rounded-xl object-cover bg-white border border-slate-200 shrink-0" />
                  <div class="flex-1 min-w-0 space-y-1">
                    <div class="flex justify-between items-start gap-2">
                      <h4 class="text-xs font-bold text-slate-900 truncate leading-tight">${item.title}</h4>
                      <button onclick="window.AQUAFLOW_APP.removeFromCart(${index})" class="text-slate-400 hover:text-rose-600">
                        ✕
                      </button>
                    </div>
                    ${item.variant ? `<span class="inline-block text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">${item.variant}</span>` : ''}
                    <div class="flex items-center justify-between pt-2">
                      <div class="flex items-center border border-slate-300 rounded-lg bg-white px-1.5 h-7">
                        <button onclick="window.AQUAFLOW_APP.updateCartItemQty(${index}, -1)" class="w-6 text-xs font-bold">−</button>
                        <span class="w-6 text-center text-xs font-bold">${item.quantity}</span>
                        <button onclick="window.AQUAFLOW_APP.updateCartItemQty(${index}, 1)" class="w-6 text-xs font-bold">+</button>
                      </div>
                      <span class="text-sm font-black text-slate-950">${formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>

            ${state.cart.length > 0 ? `
              <div class="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
                <div class="space-y-1.5 text-xs text-slate-600">
                  <div class="flex justify-between">
                    <span>Ara Toplam</span>
                    <span class="font-bold text-slate-900">${formatPrice(totals.subtotal)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Kargo</span>
                    <span class="font-bold ${totals.isFreeShipping ? 'text-emerald-700' : 'text-slate-900'}">
                      ${totals.isFreeShipping ? 'ÜCRETSİZ' : formatPrice(totals.shipping)}
                    </span>
                  </div>
                  <div class="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-200">
                    <span>Toplam</span>
                    <span>${formatPrice(totals.total)}</span>
                  </div>
                </div>

                <button onclick="window.AQUAFLOW_APP.openCheckoutModal()" class="w-full bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-sm py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all">
                  <svg class="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  <span>Siparişi Tamamla (${formatPrice(totals.total)})</span>
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // SİPARİŞ TAMAMLAMA (CHECKOUT MODAL)
  // BİLGİLER ASLA OTOMATİK GELMEZ
  // ==========================================
  function renderCheckoutModal() {
    if (!state.isCheckoutModalOpen) return '';

    const totals = getCartTotals();

    return `
      <!-- Checkout Modal - Mobilde Bottom Sheet -->
      <div
        id="checkout-overlay"
        class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4"
        onclick="if(event.target===this) window.AQUAFLOW_APP.closeCheckoutModal()"
      >
        <div
          id="checkout-sheet"
          class="relative w-full sm:max-w-lg bg-white sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 sm:my-8 rounded-t-3xl max-h-[92vh] flex flex-col"
          style="touch-action: none;"
        >
          <!-- Swipe Handle (mobil) -->
          <div class="flex justify-center pt-3 pb-1 sm:hidden" id="checkout-drag-handle">
            <div class="w-10 h-1 bg-slate-300 rounded-full cursor-grab"></div>
          </div>

          <div class="p-5 bg-slate-950 text-white flex items-center justify-between shrink-0">
            <div class="flex items-center gap-2">
              <span class="text-sky-400 font-extrabold text-base">AQUAFLOW</span>
              <span class="text-xs text-slate-400">• 256-Bit SSL Güvenli Sipariş</span>
            </div>
            <button onclick="window.AQUAFLOW_APP.closeCheckoutModal()" class="text-slate-400 hover:text-white font-bold p-1">✕</button>
          </div>

          <!-- Kaydırılabilir içerik -->
          <div class="overflow-y-auto flex-1 overscroll-contain">

          ${state.orderCompleted ? `
            <div class="p-8 text-center space-y-4">
              <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-sm">
                ✓
              </div>
              <h3 class="text-2xl font-black text-slate-950">Siparişiniz Alındı!</h3>
              <p class="text-xs text-slate-600 leading-relaxed">
                Sipariş numaranız <strong class="text-slate-900 font-mono">#${state.orderCompleted.id}</strong> başarıyla sisteme işlendi. Siparişiniz Yurtiçi Kargo güvencesiyle 1-3 iş gününde adresinize ulaştırılacaktır.
              </p>

              <!-- E-Posta ve SMS Gönderim Bildirimleri (Madde 4) -->
              <div class="space-y-2.5 text-left pt-1">
                <!-- E-Posta Bildirimi -->
                <div class="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-3 text-xs">
                  <span class="text-2xl text-sky-600 shrink-0">✉️</span>
                  <div>
                    <div class="font-extrabold text-sky-950 text-xs">E-Posta Onayı Gönderildi</div>
                    <p class="text-sky-800 text-[11px] leading-relaxed mt-0.5">
                      Sipariş bilgileri, faturanız ve kargo takip numaranız (<strong class="font-mono text-sky-950 font-bold">${state.orderCompleted.trackingNo}</strong>), <strong>${state.orderCompleted.email}</strong> adresinize başarıyla iletilmiştir.
                    </p>
                  </div>
                </div>

                <!-- SMS Bildirimi -->
                <div class="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs">
                  <span class="text-2xl text-emerald-600 shrink-0">📱</span>
                  <div>
                    <div class="font-extrabold text-emerald-950 text-xs">SMS Bilgilendirmesi İletildi</div>
                    <p class="text-emerald-800 text-[11px] leading-relaxed mt-0.5">
                      Doğrulanmış <strong>${state.orderCompleted.phone}</strong> telefonunuza SMS mesajı gönderildi: <br/>
                      <span class="italic text-slate-600">"Sayın ${state.orderCompleted.customerName}, #${state.orderCompleted.id} nolu Aquaflow siparişiniz alındı. Kargo takip no: ${state.orderCompleted.trackingNo}. Teşekkür ederiz."</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2">
                <div class="flex justify-between"><span>Sipariş No:</span><strong class="font-mono text-sky-700">#${state.orderCompleted.id}</strong></div>
                <div class="flex justify-between"><span>Kargo Takip No:</span><strong class="font-mono text-emerald-700 font-bold">${state.orderCompleted.trackingNo}</strong></div>
                <div class="flex justify-between"><span>Müşteri:</span><strong>${state.orderCompleted.customerName}</strong></div>
                <div class="flex justify-between"><span>Doğrulanmış Telefon:</span><strong>${state.orderCompleted.phone}</strong></div>
                <div class="flex justify-between"><span>Kayıtlı E-posta:</span><strong>${state.orderCompleted.email}</strong></div>
                <div class="flex justify-between"><span>Teslimat Şehri:</span><strong>${state.orderCompleted.city}</strong></div>
                <div class="flex justify-between"><span>Toplam Tutar:</span><strong>${formatPrice(state.orderCompleted.total)}</strong></div>
                <div class="flex justify-between"><span>Ödeme Şekli:</span><strong>${state.orderCompleted.paymentMethod}</strong></div>
              </div>

              <div class="flex gap-2 pt-2">
                <button onclick="window.AQUAFLOW_APP.closeCheckoutModal(); window.AQUAFLOW_APP.switchView('customer_account');" class="flex-1 bg-slate-950 text-white font-bold text-xs py-3.5 rounded-xl hover:bg-slate-800 transition-colors">
                  Siparişimi Görüntüle
                </button>
                <button onclick="window.AQUAFLOW_APP.closeCheckoutModal()" class="bg-slate-100 text-slate-800 font-bold text-xs px-4 py-3.5 rounded-xl hover:bg-slate-200 transition-colors">
                  Alışverişe Dön
                </button>
              </div>
            </div>
          ` : `
            <form onsubmit="window.AQUAFLOW_APP.submitOrder(event)" class="p-6 space-y-4 text-xs" autocomplete="off">
              
              <div class="flex items-center justify-between pb-1 border-b border-slate-100">
                <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider">1. Teslimat & İletişim Bilgileri</h4>
                <span class="text-[10px] text-slate-400">Gizlilik & Güvenlik Korumalı</span>
              </div>
              
              <div class="grid grid-cols-2 gap-3">
                <!-- Ad Soyad -->
                <div class="col-span-2 sm:col-span-1">
                  <label class="block font-bold text-slate-700 mb-1">Adınız Soyadınız *</label>
                  <input required id="order-fullname" type="text" placeholder="Ad Soyad giriniz" value="${(state.session && state.session.name) || ''}" autocomplete="off" class="w-full border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                </div>

                <!-- E-Posta Adresi (Madde 9: Giriş Yapan Kullanıcının E-Postası Değiştirilemez) -->
                <div class="col-span-2 sm:col-span-1">
                  <div class="flex items-center justify-between mb-1">
                    <label class="block font-bold text-slate-700">E-posta Adresi *</label>
                    ${state.session ? `
                      <span class="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">🔒 Değiştirilemez</span>
                    ` : ''}
                  </div>
                  <input
                    required
                    id="order-email"
                    type="email"
                    placeholder="ornek@domain.com"
                    value="${(state.session && state.session.email) || ''}"
                    ${state.session ? 'readonly' : ''}
                    class="w-full border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none ${state.session ? 'bg-slate-100/90 text-slate-600 cursor-not-allowed select-none' : ''}"
                    title="${state.session ? 'Kayıtlı hesabınızın e-posta adresidir ve sipariş güvenliği için değiştirilemez.' : ''}"
                  />
                  ${state.session ? `<p class="text-[10px] text-slate-400 mt-0.5">Sipariş bilgileri kayıtlı e-postanıza gönderilecektir.</p>` : ''}
                </div>

                <!-- Telefon Numarası -->
                <div class="col-span-2">
                  <label class="block font-bold text-slate-700 mb-1">Telefon Numarası *</label>
                  <input
                    required
                    id="order-phone"
                    type="tel"
                    maxlength="11"
                    placeholder="05xxxxxxxxx"
                    value="${(state.session && state.session.phone) || ''}"
                    onkeypress="return event.charCode >= 48 && event.charCode <= 57"
                    oninput="this.value = this.value.replace(/\D/g, '').slice(0, 11)"
                    class="w-full border border-slate-300 rounded-xl p-2.5 font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <!-- Madde 1: İl ve İlçe — Serbest metin girişi (dropdown yok) -->
                <div class="col-span-2 sm:col-span-1">
                  <label class="block font-bold text-slate-700 mb-1">Teslimat İli *</label>
                  <input
                    required
                    type="text"
                    id="order-city-text"
                    placeholder="Örn: İstanbul"
                    value="${(state.checkoutCity || '').trim()}"
                    oninput="window.AQUAFLOW_APP.onCityTextInput(this.value)"
                    autocomplete="off"
                    class="w-full border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div class="col-span-2 sm:col-span-1">
                  <label class="block font-bold text-slate-700 mb-1">Teslimat İlçesi *</label>
                  <input
                    required
                    type="text"
                    id="order-district-text"
                    placeholder="Örn: Kadıköy"
                    value="${(state.checkoutDistrict || '').trim()}"
                    oninput="window.AQUAFLOW_APP.onDistrictTextInput(this.value)"
                    autocomplete="off"
                    class="w-full border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <!-- Açık Adres -->
                <div class="col-span-2">
                  <label class="block font-bold text-slate-700 mb-1">Açık Teslimat Adresi *</label>
                  <textarea required id="order-address" rows="2" placeholder="Mahalle, Cadde, Sokak, Kapı No, Daire..." autocomplete="off" class="w-full border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"></textarea>
                </div>
              </div>

              <!-- 2. Ödeme Yöntemi -->
              <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider pt-2">2. Ödeme Seçeneği</h4>
              <div class="space-y-2">
                <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${state.selectedPaymentMethod === 'kapida' ? 'border-sky-500 bg-sky-50/50' : 'border-slate-200 hover:bg-slate-50'}">
                  <input type="radio" name="payment_choice" value="Kapıda Ödeme (Nakit / Kart)" ${state.selectedPaymentMethod === 'kapida' ? 'checked' : ''} onchange="window.AQUAFLOW_APP.setPaymentMethod('kapida')" class="text-sky-600" />
                  <div>
                    <span class="block text-xs font-bold text-slate-900">💵 Kapıda Ödeme (Nakit veya Kredi Kartı)</span>
                    <span class="block text-[10px] text-slate-500">Ürünü kargo kuryesinden teslim alırken ödeyin</span>
                  </div>
                </label>

                <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${state.selectedPaymentMethod === 'kart' ? 'border-sky-500 bg-sky-50/50' : 'border-slate-200 hover:bg-slate-50'}">
                  <input type="radio" name="payment_choice" value="Kredi Kartı (Online 3D Secure)" ${state.selectedPaymentMethod === 'kart' ? 'checked' : ''} onchange="window.AQUAFLOW_APP.setPaymentMethod('kart')" class="text-sky-600" />
                  <div>
                    <span class="block text-xs font-bold text-slate-900">💳 Kredi Kartı / Banka Kartı (Online 3D Secure)</span>
                    <span class="block text-[10px] text-slate-500">256-Bit SSL güvencesiyle anında güvenli ödeme</span>
                  </div>
                </label>
              </div>

              <!-- Kredi Kartı Alanları (Boş Gelir) -->
              ${state.selectedPaymentMethod === 'kart' ? `
                <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                  <span class="text-[11px] font-bold text-slate-700 block">🔒 Kart Bilgileri (Güvenli Giriş)</span>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-600 mb-0.5">Kart Üzerindeki İsim</label>
                    <input id="card-holder" type="text" placeholder="Ad Soyad" autocomplete="off" class="w-full border border-slate-300 rounded-lg p-2 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-600 mb-0.5">Kart Numarası</label>
                    <input id="card-number" type="text" maxlength="19" placeholder="0000 0000 0000 0000" autocomplete="off" class="w-full border border-slate-300 rounded-lg p-2 font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500" />
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-600 mb-0.5">Son Kullanma (AA/YY)</label>
                      <input id="card-expiry" type="text" maxlength="5" placeholder="AA/YY" autocomplete="off" class="w-full border border-slate-300 rounded-lg p-2 font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500" />
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-600 mb-0.5">CVV</label>
                      <input id="card-cvv" type="password" maxlength="4" placeholder="000" autocomplete="off" class="w-full border border-slate-300 rounded-lg p-2 font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500" />
                    </div>
                  </div>
                </div>
              ` : ''}

              <!-- Sözleşme & KVKK Onay Kutucuğu -->
              <div class="pt-2 border-t border-slate-200 space-y-2">
                <label class="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-700">
                  <input required id="consent-terms" type="checkbox" class="mt-0.5 rounded text-sky-600 focus:ring-sky-500" />
                  <span>
                    <a href="javascript:void(0)" onclick="window.AQUAFLOW_APP.openLegalModal('mesafeli')" class="text-sky-700 font-bold underline">Ön Bilgilendirme Koşulları</a>'nı ve 
                    <a href="javascript:void(0)" onclick="window.AQUAFLOW_APP.openLegalModal('mesafeli')" class="text-sky-700 font-bold underline">Mesafeli Satış Sözleşmesi</a>'ni okudum, onaylıyorum.
                  </span>
                </label>

                <label class="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-700">
                  <input required id="consent-kvkk" type="checkbox" class="mt-0.5 rounded text-sky-600 focus:ring-sky-500" />
                  <span>
                    Kişisel verilerimin <a href="javascript:void(0)" onclick="window.AQUAFLOW_APP.openLegalModal('kvkk')" class="text-sky-700 font-bold underline">KVKK Aydınlatma Metni</a> ve 
                    <a href="javascript:void(0)" onclick="window.AQUAFLOW_APP.openLegalModal('cerez')" class="text-sky-700 font-bold underline">Çerez Politikası</a> kapsamında işlenmesini kabul ediyorum.
                  </span>
                </label>
              </div>

              <div class="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-950">
                <span>Ödenecek Toplam Tutar:</span>
                <span class="text-lg text-sky-600">${formatPrice(totals.total)}</span>
              </div>

              <button type="submit" class="w-full bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-sm py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2">
                <span>🔒</span>
                <span>Siparişi Onayla ve Tamamla (${formatPrice(totals.total)})</span>
              </button>
            </form>
          `}
          </div><!-- /overflow-y-auto -->
        </div>
      </div>
    `;

    // Swipe to close (aşağı kaydırınca kapat)
    setTimeout(() => {
      const sheet = document.getElementById('checkout-sheet');
      const handle = document.getElementById('checkout-drag-handle');
      if (!sheet || !handle) return;
      let startY = 0, currentY = 0, isDragging = false;
      const onStart = (e) => {
        startY = (e.touches ? e.touches[0].clientY : e.clientY);
        isDragging = true;
        sheet.style.transition = 'none';
      };
      const onMove = (e) => {
        if (!isDragging) return;
        currentY = (e.touches ? e.touches[0].clientY : e.clientY);
        const diff = Math.max(0, currentY - startY);
        sheet.style.transform = 'translateY(' + diff + 'px)';
      };
      const onEnd = () => {
        isDragging = false;
        const diff = currentY - startY;
        sheet.style.transition = 'transform 0.3s ease';
        if (diff > 120) {
          sheet.style.transform = 'translateY(100%)';
          setTimeout(() => window.AQUAFLOW_APP.closeCheckoutModal(), 300);
        } else {
          sheet.style.transform = 'translateY(0)';
        }
      };
      handle.addEventListener('touchstart', onStart, { passive: true });
      handle.addEventListener('touchmove', onMove, { passive: true });
      handle.addEventListener('touchend', onEnd);
      handle.addEventListener('mousedown', onStart);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
    }, 0);
  }

  // ==========================================
  // ÇEREZ POLİTİKASI (COOKIE CONSENT BANNER)
  // ==========================================
  function renderCookieBanner() {
    if (data.getCookieConsent()) return '';

    return `
      <div id="aquaflow-cookie-banner" class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-slate-950 text-white p-5 rounded-3xl shadow-2xl border border-slate-800 space-y-3">
        <div class="flex items-start gap-3">
          <span class="text-2xl">🍪</span>
          <div class="text-xs text-slate-300 leading-relaxed">
            <strong class="text-white block font-bold mb-1">Çerezler ve Güvenliğiniz</strong>
            Sitemizde en iyi alışveriş deneyimini sunmak, güvenliği sağlamak ve yasal düzenlemelere uymak için çerezler kullanılmaktadır. Devam ederek çerez kullanımını kabul etmiş olursunuz.
          </div>
        </div>
        <div class="flex items-center gap-2 pt-1">
          <button onclick="window.AQUAFLOW_APP.acceptCookies()" class="flex-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl transition-all">
            Tüm Çerezleri Kabul Et
          </button>
          <button onclick="window.AQUAFLOW_APP.openLegalModal('cerez')" class="text-xs font-bold text-slate-300 hover:text-white px-3 py-2">
            Detaylar
          </button>
        </div>
      </div>
    `;
  }

  // ==========================================
  // İLETİŞİM MODALI (GÖRSEL 1 REFERANSI: ONUR ÇETE)
  // ==========================================
  function renderContactModal() {
    if (!state.isContactModalOpen) return '';

    const c = data.companyInfo;

    return `
      <div class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
          
          <div class="p-6 bg-slate-950 text-white flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sky-400 text-lg">📞</span>
              <h3 class="font-black text-base">İletişim Bilgileri</h3>
            </div>
            <button onclick="window.AQUAFLOW_APP.closeContactModal()" class="text-slate-400 hover:text-white font-bold p-1">✕</button>
          </div>

          <div class="p-6 space-y-5 text-xs text-slate-800">
            <div class="bg-sky-50/70 border border-sky-100 rounded-2xl p-4 space-y-3">
              <div>
                <span class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">ŞİRKET İSMİ</span>
                <span class="text-sm font-extrabold text-slate-950">${c.name}</span>
              </div>

              <div>
                <span class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">ŞİRKET ADRESİ</span>
                <span class="text-xs font-semibold text-slate-800 leading-relaxed">${c.address}</span>
              </div>

              <div class="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">ÇALIŞMA SAATLERİ</span>
                  <span class="text-xs font-bold text-slate-900">${c.workingHours}</span>
                </div>
                <div>
                  <span class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">TELEFON</span>
                  <a href="tel:${c.phone}" class="text-xs font-bold text-sky-700 hover:underline">${c.phone}</a>
                </div>
              </div>

              <div>
                <span class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">E-POSTA ADRESİ</span>
                <a href="mailto:${c.email}" class="text-xs font-bold text-sky-700 hover:underline">${c.email}</a>
              </div>
            </div>

            <div class="flex gap-3">
              <a href="https://wa.me/905516889214" target="_blank" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-center flex items-center justify-center gap-2">
                <span>💬 WhatsApp Destek</span>
              </a>
              <button onclick="window.AQUAFLOW_APP.closeContactModal()" class="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-5 rounded-xl">
                Kapat
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // HAKKIMIZDA MODALI
  // ==========================================
  function renderAboutModal() {
    if (!state.isAboutModalOpen) return '';

    return `
      <div class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
          <div class="p-6 bg-slate-950 text-white flex items-center justify-between">
            <h3 class="font-black text-base">Aquaflow Hakkında</h3>
            <button onclick="window.AQUAFLOW_APP.closeAboutModal()" class="text-slate-400 hover:text-white font-bold p-1">✕</button>
          </div>
          <div class="p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
            <p>
              Aquaflow, evlerinizde ve banyolarınızda su konforunu zirveye taşımak amacıyla yola çıkmış yenilikçi bir Türk markasıdır.
            </p>
            <p>
              Gelişmiş lazer mikro nozul teknolojisiyle suyun tazyikini artırırken kireç ve kloru arındıran çok katmanlı mineral filtreleme çözümleri sunuyoruz.
            </p>
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span class="block font-bold text-slate-900">Merkez Ofis ve İletişim:</span>
              <span class="text-slate-600 block">Şirket: Onur Çete</span>
              <span class="text-slate-600 block">Kirazlı mahallesi ahmet kabaklı caddesi no 102/c bağcılar istanbul</span>
              <span class="text-slate-600 block">Tel: 0551 688 9214 • E-posta: aquaflowymv@gmail.com</span>
            </div>
            <button onclick="window.AQUAFLOW_APP.closeAboutModal()" class="w-full bg-slate-950 text-white font-bold py-3 rounded-xl">
              Anladım
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // SÖZLEŞME VE YASAL METİNLER MODALI
  // ==========================================
  function renderLegalModal() {
    if (!state.isLegalModalOpen) return '';

    const titles = {
      mesafeli: 'Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Formu',
      cerez: 'Çerez (Cookie) Politikası',
      kvkk: 'KVKK Aydınlatma Metni ve Veri Güvenliği'
    };

    return `
      <div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[85vh]">
          <div class="p-5 bg-slate-950 text-white flex items-center justify-between shrink-0">
            <h3 class="font-bold text-sm">${titles[state.legalModalType] || 'Yasal Bilgilendirme'}</h3>
            <button onclick="window.AQUAFLOW_APP.closeLegalModal()" class="text-slate-400 hover:text-white font-bold p-1">✕</button>
          </div>
          <div class="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
            ${state.legalModalType === 'mesafeli' ? `
              <h4 class="font-bold text-slate-900">1. TARAFLAR VE KONU</h4>
              <p>İşbu sözleşme, alıcı ile satıcı (Onur Çete - Aquaflow, Kirazlı mah. Ahmet Kabaklı cad. no 102/c Bağcılar İstanbul) arasında 6502 sayılı Tüketicinin Korunması Hakkında Kanun uyarınca sipariş verilen ürünün satışı ve teslimine ilişkin hak ve yükümlülükleri düzenler.</p>
              <h4 class="font-bold text-slate-900">2. TESLİMAT VE ÖDEME</h4>
              <p>Sipariş edilen ürünler alıcının belirttiği adrese kargo aracılığıyla teslim edilir. Ödeme kapıda nakit/kart veya online 3D Secure kredi kartı ile yapılabilir.</p>
              <h4 class="font-bold text-slate-900">3. CAYMA HAKKI</h4>
              <p>Alıcı 14 gün içinde cayma hakkına sahiptir. Hijyenik nitelikte ambalajı açılmış filtre veya kişisel ürünler istisnadır.</p>
            ` : state.legalModalType === 'cerez' ? `
              <h4 class="font-bold text-slate-900">ÇEREZ (COOKIE) POLİTİKASI</h4>
              <p>Aquaflow web sitesinde ziyaretçilerimize daha iyi bir hizmet sunmak, oturum yönetimini sağlamak ve güvenlik tedbirlerini uygulamak amacıyla zorunlu çerezler kullanılmaktadır.</p>
            ` : `
              <h4 class="font-bold text-slate-900">KVKK KAPSAMINDA AYDINLATMA METNİ</h4>
              <p>6698 sayılı KVKK uyarınca, veri sorumlusu sıfatıyla Onur Çete (Aquaflow), siparişinizin hazırlanması, faturalandırılması ve teslim edilmesi amacıyla verilerinizi hukuka uygun olarak işlemektedir.</p>
            `}
          </div>
          <div class="p-4 border-t border-slate-100 bg-slate-50 shrink-0 text-right">
            <button onclick="window.AQUAFLOW_APP.closeLegalModal()" class="bg-slate-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl">
              Kapat
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // FOOTER (GÖRSEL 1 İLETİŞİM BİLGİLERİ EKSİKSİZ)
  // ==========================================
  function renderFooter() {
    const c = data.companyInfo;

    return `
      <footer class="bg-slate-950 text-slate-400 text-xs pt-16 pb-16 border-t border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <!-- Şirket Bilgileri & Sosyal Medya -->
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <span class="text-2xl font-light tracking-[0.2em] text-white uppercase">AQUA<strong class="font-extrabold text-sky-400">FLOW</strong></span>
              </div>
              <p class="text-slate-400 leading-relaxed text-xs">
                Yüksek basınçlı arıtmalı duş başlıkları, kırılmaz çelik ve silikon hortumlar, 360° döner mafsallar ve modern banyo çözümleri.
              </p>

              <!-- Sosyal Medya Hesaplarımız (Madde 5) -->
              <div class="pt-1 space-y-2">
                <span class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">Bizi Takip Edin</span>
                <div class="flex items-center gap-3">
                  <!-- Instagram -->
                  <a
                    href="https://www.instagram.com/aquaflowtrr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-pink-500/60 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-rose-500 hover:to-purple-600 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-sm"
                    title="Instagram: @aquaflowtrr"
                  >
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>

                  <!-- TikTok -->
                  <a
                    href="https://www.tiktok.com/@aquaflow817?lang=tr-TR"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-all shadow-sm"
                    title="TikTok: @aquaflow817"
                  >
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.32a6.34 6.34 0 0 0-.85-.06A6.34 6.34 0 0 0 3 15.6a6.34 6.34 0 0 0 9.29 5.56 6.29 6.29 0 0 0 3.39-5.56V9.03a8.27 8.27 0 0 0 4.91 1.6V7.18a4.85 4.85 0 0 1-1-.49z"/></svg>
                  </a>

                  <!-- Facebook -->
                  <a
                    href="https://www.facebook.com/?locale=tr_TR"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/60 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-sm"
                    title="Facebook"
                  >
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <h4 class="font-bold text-white uppercase text-xs">Ürün Kategorileri</h4>
              <ul class="space-y-1.5 text-xs">
                <li><a href="#katalog" onclick="window.AQUAFLOW_APP.filterCategory('baslik')" class="hover:text-white transition-colors">Duş Başlıkları</a></li>
                <li><a href="#katalog" onclick="window.AQUAFLOW_APP.filterCategory('hortum')" class="hover:text-white transition-colors">Duş Hortumları</a></li>
                <li><a href="#katalog" onclick="window.AQUAFLOW_APP.filterCategory('mafsal')" class="hover:text-white transition-colors">Mafsallar</a></li>
                <li><a href="#katalog" onclick="window.AQUAFLOW_APP.filterCategory('musluk-ucu')" class="hover:text-white transition-colors">Musluk Uçları</a></li>
                <li><a href="#katalog" onclick="window.AQUAFLOW_APP.filterCategory('filtre')" class="hover:text-white transition-colors">Filtreler</a></li>
                <li><a href="#katalog" onclick="window.AQUAFLOW_APP.filterCategory('set')" class="hover:text-white transition-colors">Duş Başlığı Setleri</a></li>
                <li><a href="#katalog" onclick="window.AQUAFLOW_APP.filterCategory('buz-kalibi')" class="hover:text-white transition-colors">Buz Kalıpları</a></li>
                <li><a href="#katalog" onclick="window.AQUAFLOW_APP.filterCategory('fume-vakum-mafsal')" class="hover:text-white transition-colors">Füme Vakumlu Mafsal</a></li>
              </ul>
            </div>

            <div class="space-y-2">
              <h4 class="font-bold text-white uppercase text-xs">İletişim Bilgileri</h4>
              <ul class="space-y-2 text-xs text-slate-300">
                <li class="flex items-start gap-2">
                  <span class="text-sky-400">🏢</span>
                  <span><strong>Şirket:</strong> ${c.name}</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-sky-400">📍</span>
                  <span>${c.address}</span>
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-sky-400">🕒</span>
                  <span>${c.workingHours}</span>
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-sky-400">✉️</span>
                  <a href="mailto:${c.email}" class="hover:text-white text-sky-400">${c.email}</a>
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-sky-400">📞</span>
                  <a href="tel:${c.phone}" class="hover:text-white font-bold text-white">${c.phone}</a>
                </li>
              </ul>
            </div>

            <div class="space-y-3">
              <h4 class="font-bold text-white uppercase text-xs">Müşteri & Güvenlik</h4>
              <ul class="space-y-1.5 text-xs text-slate-400">
                <li><a href="javascript:void(0)" onclick="window.AQUAFLOW_APP.openOrderTrackingModal()" class="hover:text-white">📦 Sipariş Takibi Sorgula</a></li>
                <li><a href="javascript:void(0)" onclick="window.AQUAFLOW_APP.openLegalModal('mesafeli')" class="hover:text-white">Mesafeli Satış Sözleşmesi</a></li>
                <li><a href="javascript:void(0)" onclick="window.AQUAFLOW_APP.openLegalModal('cerez')" class="hover:text-white">Çerez Politikası</a></li>
                <li><a href="javascript:void(0)" onclick="window.AQUAFLOW_APP.openLegalModal('kvkk')" class="hover:text-white">KVKK Aydınlatma Metni</a></li>
              </ul>
              <div class="pt-2 text-[11px] text-slate-500 space-y-1 border-t border-slate-900">
                <div>🔒 256-Bit SSL Şifreli Güvenlik</div>
                <div>🛡️ 3D Secure Güvenli Ödeme</div>
              </div>
            </div>
          </div>

          <div class="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] gap-2">
            <p>© 2026 Aquaflow Technologies • ${c.name}. Tüm hakları saklıdır.</p>
            <div class="flex gap-4">
              ${isAdmin() ? `
                <button onclick="window.AQUAFLOW_APP.switchView('admin')" class="text-sky-400 font-bold hover:underline">🛡️ Yönetici Paneli</button>
              ` : ''}
            </div>
          </div>
        </div>
      </footer>
    `;
  }

  // ==========================================
  // GÜVENLİ GİRİŞ SAYFASI (Madde 7: Admin belirtisi ve örnek bilgiler kaldırıldı)
  // ==========================================
  function renderAdminLoginView() {
    return `
      <div class="min-h-[80vh] flex items-center justify-center p-4">
        <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          <div class="p-8 bg-slate-950 text-white text-center space-y-2">
            <div class="w-14 h-14 rounded-2xl bg-sky-500 text-slate-950 flex items-center justify-center font-black text-2xl mx-auto shadow-lg">
              🔐
            </div>
            <h2 class="text-xl font-black tracking-wide">GÜVENLİ GİRİŞ</h2>
            <p class="text-xs text-slate-400">Devam etmek için e-posta adresi ve şifrenizle giriş yapınız.</p>
          </div>

          <form onsubmit="window.AQUAFLOW_APP.submitAdminLogin(event)" class="p-6 sm:p-8 space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">E-Posta Adresi</label>
              <input
                required
                id="admin-login-email"
                type="email"
                placeholder="ornek@domain.com"
                value=""
                class="w-full border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="font-bold text-slate-700">Şifre</label>
                <button type="button" onclick="window.AQUAFLOW_APP.openPasswordResetModal()" class="text-[11px] font-bold text-sky-700 hover:underline">
                  Şifremi Unuttum?
                </button>
              </div>
              <input
                required
                id="admin-login-password"
                type="password"
                placeholder="••••••••"
                value=""
                class="w-full border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <button type="submit" class="w-full bg-slate-950 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-xl text-sm">
              Giriş Yap →
            </button>

            <div class="pt-2 text-center">
              <button type="button" onclick="window.AQUAFLOW_APP.switchView('store')" class="text-xs font-bold text-slate-500 hover:text-slate-900">
                ← Mağazaya Geri Dön
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // ==========================================
  // YÖNETİCİ PANELİ (GELEN SİPARİŞLER, RESİMLER, KÂR & MALİ ANALİTİK)
  // SADECE VE SADECE ADMİN GÖREBİLİR!
  // ==========================================
  function renderAdminPanel() {
    if (!isAdmin()) {
      return renderAdminLoginView();
    }

    const orders = data.getOrders();
    const products = data.getProducts();
    const users = (data.getUsers && data.getUsers()) || [];
    const analytics = data.getFinancialAnalytics();

    return `
      <div class="min-h-screen bg-slate-100 text-slate-900">
        <!-- Admin Header -->
        <header class="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-4">
            <div class="flex items-center gap-3">
              <span class="text-lg sm:text-xl font-black tracking-wider text-sky-400">🛡️ AQUAFLOW YÖNETİCİ PANELİ</span>
              <span class="text-xs bg-amber-950 text-amber-300 font-bold px-2.5 py-1 rounded-full border border-amber-800/60 hidden sm:inline">
                👑 ${state.session ? state.session.name : 'Yönetici'}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <button onclick="window.AQUAFLOW_APP.switchView('store')" class="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
                Mağazayı Gör →
              </button>
              <button onclick="window.AQUAFLOW_APP.logout()" class="text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-800/40 px-3 py-2 rounded-xl transition-all">
                Çıkış
              </button>
            </div>
          </div>
        </header>

        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <!-- Admin Sekmeleri -->
          <div class="flex gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
            <button onclick="window.AQUAFLOW_APP.setAdminTab('orders')" class="px-5 py-2.5 text-xs font-extrabold rounded-2xl transition-all whitespace-nowrap ${state.adminTab === 'orders' ? 'bg-slate-950 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'}">
              📦 Gelen Siparişler (${orders.length})
            </button>
            <button onclick="window.AQUAFLOW_APP.setAdminTab('products')" class="px-5 py-2.5 text-xs font-extrabold rounded-2xl transition-all whitespace-nowrap ${state.adminTab === 'products' ? 'bg-slate-950 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'}">
              🏷️ Ürün Yönetimi (${products.length})
            </button>
            <button onclick="window.AQUAFLOW_APP.setAdminTab('analytics')" class="px-5 py-2.5 text-xs font-extrabold rounded-2xl transition-all whitespace-nowrap ${state.adminTab === 'analytics' ? 'bg-slate-950 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'}">
              📊 Mali Durum & Kâr Analitiği
            </button>
            <button onclick="window.AQUAFLOW_APP.setAdminTab('users')" class="px-5 py-2.5 text-xs font-extrabold rounded-2xl transition-all whitespace-nowrap ${state.adminTab === 'users' ? 'bg-slate-950 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'}">
              👥 Yetkili & Kullanıcı Yönetimi (${users.length})
            </button>
          </div>

          <!-- SEKME 1: SİPARİŞLER (FOTOĞRAFLI KALEMLER) -->
          ${state.adminTab === 'orders' ? `
            <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 class="text-lg font-extrabold text-slate-950">Gelen Müşteri Siparişleri</h2>
                  <p class="text-xs text-slate-500">Müşterilerin sipariş ettiği ürünlerin fotoğrafları, teslimat adresleri ve tutarları</p>
                </div>
                <span class="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Toplam: ${orders.length} Sipariş</span>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th class="p-4">Sipariş No & Tarih</th>
                      <th class="p-4">Müşteri</th>
                      <th class="p-4">Teslimat Adresi</th>
                      <th class="p-4">Sipariş Edilen Ürünler (Fotoğraflı)</th>
                      <th class="p-4">Tutar / Kâr</th>
                      <th class="p-4">Sipariş Durumu</th>
                      <th class="p-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${orders.length === 0 ? `
                      <tr><td colspan="7" class="p-8 text-center text-slate-500">Henüz kayıtlı bir sipariş bulunmuyor.</td></tr>
                    ` : orders.map(order => `
                      <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="p-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <div>${order.id}</div>
                          <div class="text-[10px] text-slate-400 font-sans font-normal">${order.date}</div>
                        </td>
                        <td class="p-4">
                          <div class="font-extrabold text-slate-900 text-sm">${order.customerName}</div>
                          <div class="text-sky-600 font-bold">${order.phone}</div>
                          <div class="text-[11px] text-slate-400">${order.email}</div>
                        </td>
                        <td class="p-4 max-w-xs">
                          <div class="font-bold text-slate-800">${order.city}</div>
                          <div class="text-slate-500 text-[11px] leading-relaxed line-clamp-2">${order.address}</div>
                        </td>
                        
                        <!-- Sipariş Edilen Ürünler (Fotoğraflı & Barkodlu) -->
                        <td class="p-4 min-w-[260px]">
                          <div class="space-y-2">
                            ${(order.items || []).map(it => {
                              const prodMatch = data.getProducts().find(p => p.id === it.productId);
                              const barcodeVal = it.barcode || (prodMatch && prodMatch.barcode) || '';
                              return `
                                <div class="flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-50 border border-slate-200">
                                  <img
                                    src="${it.image || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80'}"
                                    alt="${it.title}"
                                    onclick="window.AQUAFLOW_APP.openAdminImageModal('${it.image || ''}', '${it.title.replace(/'/g, "\\'")}')"
                                    class="w-12 h-12 rounded-lg object-cover bg-white border border-slate-200 shrink-0 cursor-zoom-in hover:ring-2 hover:ring-sky-500 hover:scale-105 transition-all shadow-sm"
                                    title="Görseli büyük boyutta açmak için tıklayın"
                                  />
                                  <div class="min-w-0 flex-1">
                                    <div class="font-bold text-slate-900 text-[11px] truncate" title="${it.title}">${it.quantity}x ${it.title}</div>
                                    <div class="text-[10px] text-slate-500">${it.variant || 'Standart'} • ${formatPrice(it.price || 0)}</div>
                                    ${barcodeVal ? `
                                      <div class="mt-1">
                                        <span class="inline-flex items-center gap-1 font-mono text-[9px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                                          <span>🏷️ Barkod:</span>
                                          <span class="text-slate-950 font-mono">${barcodeVal}</span>
                                        </span>
                                      </div>
                                    ` : ''}
                                  </div>
                                </div>
                              `;
                            }).join('')}
                          </div>
                        </td>

                        <td class="p-4 whitespace-nowrap">
                          <div class="font-black text-slate-950 text-sm">${formatPrice(order.total)}</div>
                          <div class="text-[10px] text-emerald-700 font-bold">Kâr: +${formatPrice((order.total || 0) - (order.totalCost || 0))}</div>
                          <div class="text-[10px] text-slate-400">${order.paymentMethod}</div>
                        </td>
                        <td class="p-4">
                          <select onchange="window.AQUAFLOW_APP.changeOrderStatus('${order.id}', this.value)" class="text-xs font-bold rounded-lg border border-slate-200 p-1.5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                            ${data.orderStatuses.map(st => `
                              <option value="${st}" ${order.status === st ? 'selected' : ''}>${st}</option>
                            `).join('')}
                          </select>
                        </td>
                        <td class="p-4 text-right whitespace-nowrap">
                          <button onclick="window.AQUAFLOW_APP.viewOrderReceipt('${order.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                            Makbuz
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <!-- SEKME 2: ÜRÜN YÖNETİMİ (MALİYET, KÂR VE STOK BİLGİLERİYLE) -->
          ${state.adminTab === 'products' ? `
            <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-6">
              <div class="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 class="text-lg font-extrabold text-slate-900">Katalog Ürünleri ve Yönetimi</h2>
                  <p class="text-xs text-slate-500">Bilgisayarınızdan çoklu fotoğraf ve video yükleyerek ürünleri yönetin, kâr oranlarını izleyin</p>
                </div>
                <button onclick="window.AQUAFLOW_APP.openAddProductModal()" class="bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow flex items-center gap-2 transition-all">
                  <span>➕</span>
                  <span>Yeni Ürün Ekle (TL)</span>
                </button>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th class="p-4">Görsel / Medya</th>
                      <th class="p-4">Ürün Adı</th>
                      <th class="p-4">Kategori</th>
                      <th class="p-4">Satış / Maliyet</th>
                      <th class="p-4">Birim Kâr (₺ / %)</th>
                      <th class="p-4">Stok</th>
                      <th class="p-4 text-center">Görünürlük</th>
                      <th class="p-4 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${products.map(prod => {
                      const unitProfit = Math.max(0, (prod.price || 0) - (prod.costPrice || 0));
                      const profitMargin = prod.price > 0 ? Math.round((unitProfit / prod.price) * 100) : 0;
                      return `
                        <tr class="hover:bg-slate-50/80 transition-colors ${prod.isVisible === false ? 'opacity-50 bg-slate-50/40' : ''}">
                          <td class="p-4">
                            <div class="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-white">
                              <img src="${getProductImages(prod)[0] || prod.image || ''}" alt="${prod.title}" class="w-full h-full object-cover" />
                              ${getProductVideo(prod) ? `
                                <span class="absolute bottom-0.5 right-0.5 bg-slate-950 text-sky-400 text-[9px] font-black px-1 rounded">▶ Video</span>
                              ` : ''}
                            </div>
                          </td>
                          <td class="p-4 max-w-sm">
                            <div class="font-extrabold text-slate-900 text-sm">${prod.title}</div>
                            <div class="text-[11px] text-slate-500 line-clamp-1">${prod.subtitle || ''}</div>
                            ${prod.badge ? `<span class="inline-block text-[9px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded mt-1">${prod.badge}</span>` : ''}
                          </td>
                          <td class="p-4">
                            <span class="inline-block text-xs font-bold px-2.5 py-1 rounded-full uppercase bg-slate-100 text-slate-800">
                              ${prod.categoryLabel || categoryLabels[prod.category] || prod.category}
                            </span>
                          </td>
                          <td class="p-4 whitespace-nowrap">
                            <div class="font-black text-slate-900 text-sm">${formatPrice(prod.price)}</div>
                            <div class="text-[11px] text-slate-400">Maliyet: ${formatPrice(prod.costPrice || 0)}</div>
                          </td>
                          <td class="p-4 whitespace-nowrap">
                            <div class="font-extrabold text-emerald-700 text-sm">+${formatPrice(unitProfit)}</div>
                            <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">%${profitMargin} Marj</span>
                          </td>
                          <td class="p-4">
                            <span class="font-bold text-slate-800">${prod.stock} Adet</span>
                          </td>
                          <td class="p-4 text-center">
                            <button onclick="window.AQUAFLOW_APP.toggleProductVisibility('${prod.id}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${prod.isVisible !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
                              <span>${prod.isVisible !== false ? '👁️ Yayında' : '🚫 Gizli'}</span>
                            </button>
                          </td>
                          <td class="p-4 text-right whitespace-nowrap">
                            <button onclick="window.AQUAFLOW_APP.openEditProductModal('${prod.id}')" class="text-sky-700 hover:text-sky-900 font-bold px-2.5 py-1.5 rounded-lg hover:bg-sky-50 transition-colors">
                              Düzenle
                            </button>
                            <button onclick="window.AQUAFLOW_APP.deleteProduct('${prod.id}')" class="text-rose-600 hover:text-rose-800 font-bold p-1.5 rounded-lg hover:bg-rose-50 transition-colors">
                              🗑️ Sil
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <!-- SEKME 3: MALİ DURUM & KÂR ANALİTİĞİ (KULLANICI TALEBİ) -->
          ${state.adminTab === 'analytics' ? `
            <div class="space-y-6">
              <!-- Finansal Özet Kartları -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-1">
                  <div class="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
                    <span>Toplam Satış (Ciro)</span>
                    <span>💰</span>
                  </div>
                  <div class="text-2xl sm:text-3xl font-black text-slate-950">${formatPrice(analytics.totalRevenue)}</div>
                  <span class="text-[11px] text-slate-500 block">Kayıtlı ${analytics.totalOrders} sipariş üzerinden</span>
                </div>

                <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-1">
                  <div class="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
                    <span>Toplam Ürün Maliyeti</span>
                    <span>📉</span>
                  </div>
                  <div class="text-2xl sm:text-3xl font-black text-slate-600">${formatPrice(analytics.totalCost)}</div>
                  <span class="text-[11px] text-slate-500 block">Satılan malların alış/üretim gideri</span>
                </div>

                <div class="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm space-y-1 bg-gradient-to-br from-white to-emerald-50/40">
                  <div class="flex justify-between items-center text-emerald-800 text-xs font-bold uppercase">
                    <span>Net Kâr</span>
                    <span>📈</span>
                  </div>
                  <div class="text-2xl sm:text-3xl font-black text-emerald-600">+${formatPrice(analytics.netProfit)}</div>
                  <span class="text-[11px] text-emerald-700 font-bold block">%${analytics.profitMargin} Genel Kâr Oranı</span>
                </div>

                <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-1">
                  <div class="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
                    <span>Ortalama Sepet Tutarı</span>
                    <span>🛒</span>
                  </div>
                  <div class="text-2xl sm:text-3xl font-black text-sky-700">${formatPrice(analytics.averageOrder)}</div>
                  <span class="text-[11px] text-slate-500 block">Sipariş başına düşen tutar</span>
                </div>
              </div>

              <!-- En Çok Kazandıran Ürünler Tablosu -->
              <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="p-6 border-b border-slate-100">
                  <h3 class="text-base font-extrabold text-slate-900">Ürün Bazında Satış & Kâr Performansı</h3>
                  <p class="text-xs text-slate-500">Hangi ürünün kaç adet sattığı, getirdiği ciro ve net kâr analizi</p>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                      <tr>
                        <th class="p-4">Ürün</th>
                        <th class="p-4">Satılan Adet</th>
                        <th class="p-4">Toplam Ciro</th>
                        <th class="p-4">Toplam Maliyet</th>
                        <th class="p-4 text-right">Elde Edilen Net Kâr</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      ${analytics.topProducts.map(p => `
                        <tr class="hover:bg-slate-50 transition-colors">
                          <td class="p-4 font-bold text-slate-900 flex items-center gap-3">
                            <img src="${p.image || ''}" alt="${p.title}" class="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-white" />
                            <span class="truncate max-w-sm">${p.title}</span>
                          </td>
                          <td class="p-4 font-extrabold text-slate-800">${p.quantity} Adet</td>
                          <td class="p-4 font-bold text-slate-900">${formatPrice(p.revenue)}</td>
                          <td class="p-4 text-slate-500">${formatPrice(p.cost)}</td>
                          <td class="p-4 text-right font-black text-emerald-600 text-sm">+${formatPrice(p.profit)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- SEKME 4: YETKİLİ & KULLANICI YÖNETİMİ -->
          ${state.adminTab === 'users' ? `
            <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-6">
              <div class="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 class="text-lg font-extrabold text-slate-900">Kullanıcı & Yönetici Hesapları</h2>
                  <p class="text-xs text-slate-500">İstediğiniz kişiye özel şifre ile Admin veya Müşteri yetkisi verin</p>
                </div>
                <button onclick="window.AQUAFLOW_APP.openAddUserModal()" class="bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow transition-all">
                  ➕ Yeni Yetkili / Kullanıcı Ekle
                </button>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th class="p-4">Kullanıcı Adı</th>
                      <th class="p-4">E-posta</th>
                      <th class="p-4">Yetki / Rol</th>
                      <th class="p-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${users.map(u => `
                      <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="p-4 font-bold text-slate-900">${u.name}</td>
                        <td class="p-4 font-medium text-slate-600">${u.email}</td>
                        <td class="p-4">
                          <span class="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700'}">
                            ${u.role === 'admin' ? '👑 Yönetici (Admin)' : 'Müşteri'}
                          </span>
                        </td>
                        <td class="p-4 text-right">
                          ${u.email.toLowerCase() === 'ibrahimtyesim10@gmail.com' ? `
                            <span class="text-[10px] text-slate-400 font-bold">Ana Yönetici</span>
                          ` : `
                            <button onclick="window.AQUAFLOW_APP.deleteUser('${u.id}')" class="text-rose-600 hover:text-rose-800 font-bold p-1">Sil</button>
                          `}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
        </main>
      </div>

      <!-- SİPARİŞ DETAY MAKBUZU (RESİMLİ) -->
      ${state.selectedOrderReceipt ? `
        <div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 text-slate-900">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="font-black text-base">Sipariş Makbuzu: ${state.selectedOrderReceipt.id}</h3>
                <span class="text-xs text-slate-400">${state.selectedOrderReceipt.date}</span>
              </div>
              <button onclick="window.AQUAFLOW_APP.closeOrderReceipt()" class="text-slate-400 hover:text-slate-900 font-bold">✕</button>
            </div>

            <div class="bg-slate-50 p-3.5 rounded-2xl space-y-1.5 text-xs">
              <div class="font-extrabold text-sm text-slate-950">${state.selectedOrderReceipt.customerName}</div>
              <div class="text-sky-600 font-bold">📞 ${state.selectedOrderReceipt.phone}</div>
              <div class="text-slate-500">✉️ ${state.selectedOrderReceipt.email}</div>
              <div class="pt-2 border-t border-slate-200 text-slate-700 font-medium leading-relaxed">
                📍 <strong>Teslimat Adresi:</strong><br/>
                ${state.selectedOrderReceipt.address}<br/>
                <strong>${state.selectedOrderReceipt.city}</strong>
              </div>
            </div>

            <div class="space-y-2 text-xs">
              <span class="font-bold text-slate-800">Sipariş Kalemleri:</span>
              ${(state.selectedOrderReceipt.items || []).map(it => {
                const prodMatch = data.getProducts().find(p => p.id === it.productId);
                const barcodeVal = it.barcode || (prodMatch && prodMatch.barcode) || '';
                return `
                  <div class="flex items-center justify-between gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div class="flex items-center gap-2.5">
                      <img
                        src="${it.image || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80'}"
                        alt="${it.title}"
                        onclick="window.AQUAFLOW_APP.openAdminImageModal('${it.image}', '${it.title.replace(/'/g, "\\'")}')"
                        class="w-11 h-11 rounded-lg object-cover bg-white border border-slate-200 cursor-zoom-in hover:scale-105 transition-all shrink-0"
                        title="Görseli büyük boyutta açmak için tıklayın"
                      />
                      <div>
                        <div class="font-bold text-slate-900 leading-tight">${it.quantity}x ${it.title}</div>
                        ${it.variant ? `<div class="text-[10px] text-slate-500">${it.variant}</div>` : ''}
                        ${barcodeVal ? `
                          <div class="mt-0.5 inline-flex items-center gap-1 font-mono text-[9px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                            <span>🏷️ Barkod:</span> <span>${barcodeVal}</span>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                    <span class="font-bold text-slate-900 shrink-0">${formatPrice((it.price || 0) * (it.quantity || 1))}</span>
                  </div>
                `;
              }).join('')}
              <div class="flex justify-between pt-2 font-black text-sm text-slate-950 border-t border-slate-100">
                <span>Toplam Tutar:</span>
                <span>${formatPrice(state.selectedOrderReceipt.total)}</span>
              </div>
              <div class="text-[11px] text-slate-500">Ödeme Şekli: ${state.selectedOrderReceipt.paymentMethod}</div>
            </div>

            <button onclick="window.AQUAFLOW_APP.closeOrderReceipt()" class="w-full bg-slate-950 text-white font-bold text-xs py-3 rounded-xl">
              Kapat
            </button>
          </div>
        </div>
      ` : ''}

      <!-- ÜRÜN EKLEME / DÜZENLEME MODALI (BİLGİSAYARDAN ÇOKLU GÖRSEL & VİDEO & MALİYET DESTEĞİ) -->
      ${state.isAddProductModalOpen ? `
        <div class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div class="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 my-4 sm:my-8 max-h-[92vh] flex flex-col">
            <div class="p-5 bg-slate-950 text-white flex items-center justify-between rounded-t-3xl shrink-0">
              <span class="text-sky-400 font-bold text-sm">${state.editingProductId ? '✏️ Ürünü Düzenle' : '➕ Yeni Ürün Ekle (TL & Kâr Destekli)'}</span>
              <button onclick="window.AQUAFLOW_APP.closeAddProductModal()" class="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onsubmit="window.AQUAFLOW_APP.submitProductForm(event)" class="p-6 space-y-4 text-xs overflow-y-auto grow">
              <div>
                <label class="block font-bold text-slate-800 mb-1">Ürün Adı / Başlık *</label>
                <input required type="text" id="add-prod-title" value="${state.productForm.title || ''}" placeholder="Örn: Aquaflow Füme Serisi Vakumlu Mafsal" class="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-sky-500 font-semibold text-slate-900" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-slate-800 mb-1">Kategori *</label>
                  <select id="add-prod-category" class="w-full border border-slate-300 rounded-xl p-3 font-semibold text-slate-900">
                    <option value="baslik" ${state.productForm.category === 'baslik' ? 'selected' : ''}>🚿 Duş Başlığı</option>
                    <option value="hortum" ${state.productForm.category === 'hortum' ? 'selected' : ''}>➰ Duş Hortumu</option>
                    <option value="mafsal" ${state.productForm.category === 'mafsal' ? 'selected' : ''}>🔩 Mafsal</option>
                    <option value="musluk-ucu" ${state.productForm.category === 'musluk-ucu' ? 'selected' : ''}>🚰 Musluk Uçları</option>
                    <option value="filtre" ${state.productForm.category === 'filtre' ? 'selected' : ''}>🧪 Filtreler</option>
                    <option value="set" ${state.productForm.category === 'set' ? 'selected' : ''}>📦 Duş Başlığı Setleri</option>
                    <option value="buz-kalibi" ${state.productForm.category === 'buz-kalibi' ? 'selected' : ''}>🧊 Buz Kalıpları</option>
                    <option value="fume-vakum-mafsal" ${state.productForm.category === 'fume-vakum-mafsal' ? 'selected' : ''}>✨ Füme Vakumlu Mafsal</option>
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-slate-800 mb-1">Stok Miktarı *</label>
                  <input required type="number" id="add-prod-stock" value="${state.productForm.stock}" min="0" class="w-full border border-slate-300 rounded-xl p-3 font-semibold text-slate-900" />
                </div>
              </div>

              <!-- FİYAT & MALİYET & TAHMİNİ KÂR -->
              <div class="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label class="block font-bold text-slate-800 mb-1">Satış Fiyatı (TL - ₺) *</label>
                  <input required type="number" step="1" id="add-prod-price" value="${state.productForm.price || 590}" placeholder="Örn: 590" class="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900" />
                </div>
                <div>
                  <label class="block font-bold text-slate-800 mb-1">Maliyet (Alış Fiyatı TL)</label>
                  <input type="number" step="1" id="add-prod-cost" value="${state.productForm.costPrice || 240}" placeholder="Örn: 240" class="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900" />
                </div>
              </div>

              <!-- BARKOD ALANI (Madde 8: Müşterilere Gizli, Yalnızca Yönetici Görür) -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block font-bold text-slate-800">Ürün Barkodu (Müşterilere Gizli - Yalnızca Yönetici Görür)</label>
                  <span class="text-[10px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">🏷️ Özel Barkod</span>
                </div>
                <input
                  type="text"
                  id="add-prod-barcode"
                  value="${state.productForm.barcode || ''}"
                  placeholder="Örn: 869012345001"
                  class="w-full border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <p class="text-[10px] text-slate-400 mt-0.5">Barkod bilgisi müşterilere gösterilmez, siparişler bölümünde yöneticiye gösterilir.</p>
              </div>

              <!-- BİLGİSAYARDAN ÇOKLU GÖRSEL SEÇİMİ (KULLANICI TALEBİ) -->
              <div>
                <label class="block font-bold text-slate-800 mb-1">Bilgisayardan Ürün Fotoğrafları Seçin (Birden Çok Seçilebilir) *</label>
                <input id="add-prod-image-file" type="file" accept="image/*" multiple class="hidden" onchange="window.AQUAFLOW_APP.onProductImageSelected(this.files)" />
                <div
                  onclick="document.getElementById('add-prod-image-file').click()"
                  class="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-sky-50 hover:border-sky-400 transition-colors p-4"
                >
                  ${(state.productForm.images || []).length ? `
                    <div class="grid grid-cols-4 gap-2 mb-3">
                      ${state.productForm.images.map((img, idx) => `
                        <div class="relative group" onclick="event.stopPropagation()">
                          <img src="${img.src}" alt="${img.name || 'Görsel'}" class="w-full aspect-square object-cover rounded-xl border border-slate-200" />
                          <button type="button" onclick="event.stopPropagation(); window.AQUAFLOW_APP.removeProductImage(${idx})" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow">✕</button>
                        </div>
                      `).join('')}
                    </div>
                    <p class="text-[11px] text-slate-600 text-center font-semibold">Fotoğraf eklemek için tıklayın veya sürükleyin (${state.productForm.images.length}/8)</p>
                  ` : `
                    <div class="text-center py-4 space-y-1.5">
                      <p class="text-2xl">📁</p>
                      <p class="font-bold text-slate-800">Bilgisayarınızdan 1 veya birden çok fotoğraf seçin</p>
                      <p class="text-[11px] text-slate-500">JPG, PNG, WEBP — En fazla 8 fotoğraf seçebilirsiniz</p>
                    </div>
                  `}
                </div>
              </div>

              <!-- BİLGİSAYARDAN VİDEO YÜKLEME VEYA YOUTUBE (KULLANICI TALEBİ) -->
              <div>
                <label class="block font-bold text-slate-800 mb-1">Ürün Videosu (Bilgisayardan Video veya YouTube Linki)</label>
                <input id="add-prod-video-file" type="file" accept="video/*" class="hidden" onchange="window.AQUAFLOW_APP.onProductVideoSelected(this.files)" />
                
                <div class="space-y-2">
                  ${state.productForm.video ? `
                    <div class="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 p-1">
                      ${parseVideoEmbed(state.productForm.video).type === 'youtube' ? `
                        <iframe class="w-full aspect-video rounded-xl" src="${parseVideoEmbed(state.productForm.video).src}" allowfullscreen></iframe>
                      ` : `
                        <video class="w-full aspect-video rounded-xl bg-black" src="${state.productForm.video}" controls></video>
                      `}
                    </div>
                    <button type="button" onclick="window.AQUAFLOW_APP.clearProductVideo()" class="text-[11px] font-bold text-rose-600">Videoyu Kaldır</button>
                  ` : `
                    <button type="button" onclick="document.getElementById('add-prod-video-file').click()" class="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-3 text-center hover:border-sky-400 font-bold text-slate-700">
                      🎬 Bilgisayardan Video Dosyası Seç (MP4 / WEBM)
                    </button>
                  `}
                  <input type="url" id="add-prod-video-url" placeholder="veya YouTube Video Linki: https://www.youtube.com/watch?v=..." value="${state.productForm.video && !String(state.productForm.video).startsWith('data:') ? state.productForm.video : ''}" class="w-full border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900" />
                </div>
              </div>

              <div>
                <label class="block font-bold text-slate-800 mb-1">Rozet / Etiket</label>
                <input type="text" id="add-prod-badge" value="${state.productForm.badge || ''}" placeholder="Örn: Çok Satan, Popüler" class="w-full border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900" />
              </div>

              <div>
                <label class="block font-bold text-slate-800 mb-1">Kısa Açıklama</label>
                <textarea id="add-prod-subtitle" rows="2" placeholder="Kartlarda ve başlık altında görünen kısa açıklama" class="w-full border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900">${state.productForm.subtitle || ''}</textarea>
              </div>

              <div>
                <label class="block font-bold text-slate-800 mb-1">Detaylı Açıklama</label>
                <textarea id="add-prod-description" rows="3" placeholder="Ürün detay sayfasındaki kapsamlı açıklama" class="w-full border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900">${state.productForm.description || ''}</textarea>
              </div>

              <div>
                <label class="block font-bold text-slate-800 mb-1">Model / Renk Varyantları (Virgülle Ayırın)</label>
                <input type="text" id="add-prod-variants" value="${state.productForm.variantsText || ''}" placeholder="Krom, Mat Siyah, Füme" class="w-full border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900" />
              </div>

              <div class="flex gap-3 pt-3">
                <button type="submit" class="flex-1 bg-slate-950 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all">
                  ${state.editingProductId ? 'Değişiklikleri Kaydet' : 'Ürünü Kataloğa Ekle'}
                </button>
                <button type="button" onclick="window.AQUAFLOW_APP.closeAddProductModal()" class="bg-slate-100 text-slate-800 font-bold px-5 py-3.5 rounded-xl">
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}

      <!-- KULLANICI / YÖNETİCİ EKLEME MODALI -->
      ${state.isAddUserModalOpen ? `
        <div class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div class="flex justify-between items-center border-b pb-3">
              <h3 class="font-extrabold text-sm text-slate-900">➕ Yeni Yetkili / Kullanıcı Ekle</h3>
              <button onclick="window.AQUAFLOW_APP.closeAddUserModal()">✕</button>
            </div>
            <form onsubmit="window.AQUAFLOW_APP.submitUserForm(event)" class="space-y-3 text-xs">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Ad Soyad *</label>
                <input required id="new-user-name" type="text" class="w-full border rounded-xl p-2.5 font-semibold text-slate-900" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">E-posta Adresi *</label>
                <input required id="new-user-email" type="email" class="w-full border rounded-xl p-2.5 font-semibold text-slate-900" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Giriş Şifresi *</label>
                <input required id="new-user-password" type="password" class="w-full border rounded-xl p-2.5 font-semibold text-slate-900" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Yetki / Rol *</label>
                <select id="new-user-role" class="w-full border rounded-xl p-2.5 font-semibold text-slate-900">
                  <option value="admin">👑 Yönetici (Admin) — Tam Yetkili</option>
                  <option value="customer">👤 Müşteri — Yalnızca Kendi Siparişlerini Görür</option>
                </select>
              </div>
              <button type="submit" class="w-full bg-slate-950 text-white font-bold py-3 rounded-xl shadow">
                Kullanıcıyı Kaydet
              </button>
            </form>
          </div>
        </div>
      ` : ''}
    `;
  }

  // ==========================================
  // MASTER RENDER FONKSİYONU
  // ==========================================
  function renderApp() {
    renderAppView();
  }

  function renderAppView() {
    const root = document.getElementById('app');
    if (!root) return;

    // 1. Yönetici Paneli Görünümü
    if (state.viewMode === 'admin') {
      root.innerHTML = renderAdminPanel();
      return;
    }

    // 2. Müşteri Sipariş Takip Paneli Görünümü
    if (state.viewMode === 'customer_account') {
      root.innerHTML = `
        ${renderNavbar()}
        <main>
          ${renderCustomerAccountPage()}
        </main>
        ${renderFooter()}
        ${renderCartDrawer()}
        ${renderCheckoutModal()}
        ${renderAuthModal()}
        ${renderPasswordResetModal()}
        ${renderOrderTrackingModal()}
        ${renderContactModal()}
        ${renderAboutModal()}
        ${renderLegalModal()}
        ${renderCookieBanner()}
      `;
      return;
    }

    // 3. Müstakil Ürün Detay Sayfası
    if (state.viewMode === 'product' && state.activeProductId) {
      root.innerHTML = `
        ${renderNavbar()}
        <main>
          ${renderProductDetailPage(state.activeProductId)}
        </main>
        ${renderFooter()}
        ${renderCartDrawer()}
        ${renderCheckoutModal()}
        ${renderAuthModal()}
        ${renderPasswordResetModal()}
        ${renderOrderTrackingModal()}
        ${renderContactModal()}
        ${renderAboutModal()}
        ${renderLegalModal()}
        ${renderCookieBanner()}
      `;
      return;
    }

    // 4. Mağaza Ana Sayfası
    root.innerHTML = `
      ${renderNavbar()}
      <main>
        ${renderHeroClean()}
        ${renderProductsCatalog()}
      </main>
      ${renderFooter()}
      ${renderCartDrawer()}
      ${renderCheckoutModal()}
      ${renderAuthModal()}
      ${renderPasswordResetModal()}
      ${renderOrderTrackingModal()}
      ${renderContactModal()}
      ${renderAboutModal()}
      ${renderLegalModal()}
      ${renderCookieBanner()}
    `;
  }

  // ==========================================
  // GENEL CONTROLLER VE AKSİYON API
  // ==========================================
  window.AQUAFLOW_APP = {
    init() {
      if (window.location.hash === '#admin') {
        state.viewMode = 'admin';
      }
      // Ürün deposu artık IndexedDB'de tutuluyor; kayıt yazma sırasında
      // bir hata olursa kullanıcıya bunu göster (eskiden sessizce yutulup
      // "eklendi" mesajı yanlışlıkla gösteriliyordu).
      window.AQUAFLOW_ON_SAVE_ERROR = (msg) => showToast(msg, '✕');
      renderApp();
      data.ready().then(() => renderApp());
    },

    switchView(mode) {
      state.viewMode = mode;
      state.mobileMenuOpen = false;
      renderApp();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    dismissBanner() {
      state.dismissedBanner = true;
      renderApp();
    },

    // Arama Aksiyonları
    onSearchInput(val) {
      state.searchQuery = val;
      renderApp();
      const el = document.getElementById('header-search-input');
      if (el) {
        el.focus();
        el.setSelectionRange(val.length, val.length);
      }
    },

    clearSearch() {
      state.searchQuery = '';
      renderApp();
    },

    filterCategory(catId) {
      state.selectedCategory = catId;
      state.viewMode = 'store';
      state.searchQuery = '';
      state.currentPage = 1; // Kategori değişince sayfa 1'e dön
      renderApp();
      const target = document.getElementById('katalog');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    },

    // Madde 3: Sayfa değiştirme
    goToPage(pageNum) {
      const allProducts = data.getProducts();
      const visibleProducts = allProducts.filter(p => p.isVisible !== false);
      const filtered = state.selectedCategory === 'all'
        ? visibleProducts
        : visibleProducts.filter(p => p.category === state.selectedCategory);
      const totalPages = Math.max(1, Math.ceil(filtered.length / state.PRODUCTS_PER_PAGE));
      state.currentPage = Math.min(Math.max(1, pageNum), totalPages);
      renderApp();
      const target = document.getElementById('katalog');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    },

    openProductPage(productId) {
      state.activeProductId = productId;
      state.activeProductImageIndex = 0;
      state.activeProductQty = 1;
      state.activeProductVariant = null;
      state.viewMode = 'product';
      state.searchQuery = '';
      renderApp();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    setActiveProductImage(idx) {
      state.activeProductImageIndex = idx;
      state.activeProductMediaTab = 'photos';
      renderApp();
    },

    prevActiveProductImage() {
      const prod = data.getProducts().find(p => p.id === state.activeProductId);
      const images = getProductImages(prod);
      if (!images.length) return;
      state.activeProductImageIndex = (state.activeProductImageIndex - 1 + images.length) % images.length;
      renderApp();
    },

    nextActiveProductImage() {
      const prod = data.getProducts().find(p => p.id === state.activeProductId);
      const images = getProductImages(prod);
      if (!images.length) return;
      state.activeProductImageIndex = (state.activeProductImageIndex + 1) % images.length;
      renderApp();
    },

    setActiveProductMediaTab(tab) {
      state.activeProductMediaTab = tab;
      renderApp();
    },

    setActiveProductVariant(variantName) {
      state.activeProductVariant = variantName;
      renderApp();
    },

    updateActiveProductQty(delta) {
      state.activeProductQty = Math.max(1, state.activeProductQty + delta);
      renderApp();
    },

    toggleCart(open) {
      state.isCartOpen = typeof open === 'boolean' ? open : !state.isCartOpen;
      renderApp();
    },

    addActiveProductToCart() {
      const products = data.getProducts();
      const p = products.find(x => x.id === state.activeProductId);
      if (!p) return;

      const variantLabel = state.activeProductVariant || (Array.isArray(p.variants) && p.variants.length ? p.variants[0] : 'Standart');
      const existingIndex = state.cart.findIndex(item => item.id === p.id && item.variant === variantLabel);

      if (existingIndex > -1) {
        state.cart[existingIndex].quantity += state.activeProductQty;
      } else {
        state.cart.push({
          id: p.id,
          title: p.title,
          variant: variantLabel,
          price: p.price,
          costPrice: p.costPrice || Math.round(p.price * 0.45),
          quantity: state.activeProductQty,
          image: getProductImages(p)[0] || p.image
        });
      }

      state.isCartOpen = true;
      renderApp();
      showToast(`${p.title} sepete eklendi!`);
    },

    addCatalogProductToCart(productId) {
      const products = data.getProducts();
      const p = products.find(x => x.id === productId);
      if (!p) return;

      const variantLabel = Array.isArray(p.variants) && p.variants.length ? p.variants[0] : 'Standart';
      const existingIndex = state.cart.findIndex(item => item.id === p.id && item.variant === variantLabel);

      if (existingIndex > -1) {
        state.cart[existingIndex].quantity += 1;
      } else {
        state.cart.push({
          id: p.id,
          title: p.title,
          variant: variantLabel,
          price: p.price,
          costPrice: p.costPrice || Math.round(p.price * 0.45),
          quantity: 1,
          image: getProductImages(p)[0] || p.image
        });
      }

      state.isCartOpen = true;
      renderApp();
      showToast(`${p.title} sepete eklendi!`);
    },

    buyNowActiveProduct() {
      this.addActiveProductToCart();
      this.openCheckoutModal();
    },

    updateCartItemQty(index, delta) {
      if (state.cart[index]) {
        state.cart[index].quantity += delta;
        if (state.cart[index].quantity <= 0) {
          state.cart.splice(index, 1);
        }
      }
      renderApp();
    },

    removeFromCart(index) {
      state.cart.splice(index, 1);
      renderApp();
    },

    openCheckoutModal() {
      if (state.cart.length === 0) {
        showToast('Sepetiniz boş', '✕');
        return;
      }
      state.isCartOpen = false;
      state.isCheckoutModalOpen = true;
      state.orderCompleted = null;
      renderApp();
    },

    closeCheckoutModal() {
      state.isCheckoutModalOpen = false;
      state.orderCompleted = null;
      renderApp();
    },

    setPaymentMethod(method) {
      state.selectedPaymentMethod = method;
      renderApp();
    },

    submitOrder(e) {
      e.preventDefault();

      const consentTerms = document.getElementById('consent-terms');
      const consentKvkk = document.getElementById('consent-kvkk');

      if (!consentTerms || !consentTerms.checked || !consentKvkk || !consentKvkk.checked) {
        showToast('Lütfen sözleşme ve KVKK onay kutularını işaretleyin.', '✕');
        return;
      }

      const fullname = (document.getElementById('order-fullname')?.value || '').trim();
      const phone = (document.getElementById('order-phone')?.value || '').trim();
      const email = (document.getElementById('order-email')?.value || '').trim();

      // Madde 1: İl ve ilçe düz metin alanlarından oku, kenar boşluklarını temizle
      const cityRaw = (document.getElementById('order-city-text')?.value || '').trim();
      const districtRaw = (document.getElementById('order-district-text')?.value || '').trim();
      const city = cityRaw && districtRaw ? `${cityRaw} / ${districtRaw}` : (cityRaw || districtRaw || '');

      const address = (document.getElementById('order-address')?.value || '').trim();

      if (!fullname || !phone || !email || !cityRaw || !districtRaw || !address) {
        showToast('Lütfen tüm teslimat bilgilerini eksiksiz doldurun (il ve ilçe dahil).', '✕');
        return;
      }

      const totals = getCartTotals();
      const paymentMethod = state.selectedPaymentMethod === 'kart'
        ? 'Kredi Kartı (Online 3D Secure)'
        : 'Kapıda Ödeme (Nakit/Kart)';

      let totalOrderCost = 0;
      const orderItems = state.cart.map(i => {
        const cst = i.costPrice || Math.round((i.price || 0) * 0.45);
        totalOrderCost += cst * (i.quantity || 1);
        return {
          productId: i.id,
          title: i.title,
          variant: i.variant,
          quantity: i.quantity,
          price: i.price,
          costPrice: cst,
          image: i.image
        };
      });

      // Madde 4: Benzersiz sipariş kodu (tekrar üretme riski yok — timestamp + random)
      const orderId = 'AQ-' + Math.floor(100000 + Math.random() * 900000);
      const orderDate = new Date().toLocaleDateString('tr-TR') + ' ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      const newOrder = {
        id: orderId,
        date: orderDate,
        customerName: fullname,
        phone: phone,
        email: email,
        city: city,
        address: address,
        items: orderItems,
        total: totals.total,
        totalCost: totalOrderCost,
        paymentMethod: paymentMethod,
        status: 'İşleme Alındı',
        trackingNo: 'YK-' + Math.floor(1000000000 + Math.random() * 9000000000),
        emailSent: false
      };

      data.addOrder(newOrder);

      // Madde 1: Siparişten sonra state'i güncelle
      state.checkoutCity = cityRaw;
      state.checkoutDistrict = districtRaw;

      state.orderCompleted = newOrder;
      state.cart = [];
      renderApp();
      showToast('Siparişiniz başarıyla alındı ve kaydedildi!');

      // Madde 4: EmailJS ile gerçek e-posta gönder
      sendOrderConfirmationEmail(newOrder);
    },


    // Oturum & Kimlik Doğrulama
    openAuthModal() {
      state.isAuthModalOpen = true;
      state.authMode = 'login';
      state.authStep = 'form';
      state.pendingReg = null;
      renderApp();
    },

    closeAuthModal() {
      state.isAuthModalOpen = false;
      state.postLoginView = null;
      state.authStep = 'form';
      state.pendingReg = null;
      renderApp();
    },

    toggleAuthMode() {
      state.authMode = state.authMode === 'register' ? 'login' : 'register';
      state.authStep = 'form';
      state.pendingReg = null;
      renderApp();
    },

    submitAuth(e) {
      e.preventDefault();
      const email = document.getElementById('auth-email')?.value;
      const password = document.getElementById('auth-password')?.value;

      if (state.authMode === 'register') {
        const name = document.getElementById('auth-name')?.value;
        const phone = document.getElementById('auth-phone')?.value;
        const check = data.checkRegistration(email, password, phone);
        if (check.error) {
          showToast(check.error, '✕');
          return;
        }
        // Hesap hemen açılmaz: önce e-posta adresine giden kod doğrulanır
        state.pendingReg = { name, email: String(email).trim().toLowerCase(), password, phone };
        this.requestEmailCode(true);
      } else {
        const session = data.login(email, password);
        if (!session) {
          showToast('E-posta adresi veya şifre hatalı!', '✕');
          return;
        }
        state.session = session;
        state.isAuthModalOpen = false;
        renderApp();
        showToast(`Giriş yapıldı: Hoş geldiniz, ${session.name}!`);
      }
    },

    async requestEmailCode(isFirst) {
      const pending = state.pendingReg;
      if (!pending) return;
      if (!isFirst && Date.now() < state.resendAt) {
        const wait = Math.ceil((state.resendAt - Date.now()) / 1000);
        showToast(`Yeni kod için ${wait} saniye bekleyin.`, '✕');
        return;
      }
      try {
        const res = await fetch('/api/email/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pending.email, purpose: 'register' })
        });
        const body = await res.json().catch(() => ({}));
        if (res.status === 404) {
          showToast('Sunucu eski sürüm çalışıyor. Açık serve.ps1 penceresini kapatıp yeni serve.ps1\'i başlatın.', '✕');
          return;
        }
        if (!res.ok) {
          if (body.detail && ['localhost', '127.0.0.1'].includes(location.hostname)) console.warn('[E-posta hatası]', body.detail);
          if (body.retryAfter) state.resendAt = Date.now() + body.retryAfter * 1000;
          showToast(body.error || 'Doğrulama kodu gönderilemedi.', '✕');
          return;
        }
        state.verifyDevNotice = !!body.dev;
        state.verifyDevCode = body.dev ? String(body.code || '') : '';
        state.resendAt = Date.now() + (body.resendAfter || 60) * 1000;
        state.authStep = 'verify';
        renderApp();
        showToast(body.dev
          ? (state.verifyDevCode ? `E-posta gitmedi. Doğrulama kodunuz: ${state.verifyDevCode}` : 'E-posta gitmedi. Kodu serve.ps1 penceresinde görün.')
          : 'Doğrulama kodu e-posta adresinize gönderildi.');
      } catch (err) {
        showToast('Doğrulama sunucusuna ulaşılamıyor. Siteyi serve.ps1 veya baslat.bat ile açın.', '✕');
      }
    },

    resendEmailCode() {
      this.requestEmailCode(false);
    },

    backToRegisterForm() {
      state.authStep = 'form';
      renderApp();
    },

    async submitEmailCode(e) {
      e.preventDefault();
      const pending = state.pendingReg;
      if (!pending) return;
      const code = document.getElementById('verify-code-input')?.value || '';
      try {
        const res = await fetch('/api/email/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pending.email, code })
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.verified) {
          showToast(body.error || 'E-posta doğrulanamadı.', '✕');
          return;
        }
      } catch (err) {
        showToast('Doğrulama sunucusuna ulaşılamıyor. Siteyi serve.ps1 ile açın.', '✕');
        return;
      }

      const result = data.register(pending.name, pending.email, pending.password, pending.phone, true);
      if (result.error) {
        showToast(result.error, '✕');
        return;
      }
      state.session = result.session;
      state.isAuthModalOpen = false;
      state.authStep = 'form';
      state.pendingReg = null;
      if (state.postLoginView) {
        state.viewMode = state.postLoginView;
        state.postLoginView = null;
      }
      renderApp();
      showToast(`E-posta doğrulandı! Hoş geldiniz, ${result.session.name}!`);
    },

    submitAdminLogin(e) {
      e.preventDefault();
      const email = document.getElementById('admin-login-email')?.value;
      const password = document.getElementById('admin-login-password')?.value;

      const session = data.login(email, password);
      if (!session) {
        showToast('E-posta veya şifre hatalı!', '✕');
        return;
      }
      if (session.role !== 'admin') {
        showToast('Bu hesaba ait yönetici yetkisi bulunmuyor!', '✕');
        return;
      }

      state.session = session;
      state.viewMode = 'admin';
      renderApp();
      showToast('Yönetici paneline hoş geldiniz!');
    },

    quickLoginAs(role) {
      if (role === 'admin') {
        const session = data.login('ibrahimtyesim10@gmail.com', 'Yesim34.');
        state.session = session;
        state.isAuthModalOpen = false;
        renderApp();
        showToast('Yönetici olarak giriş yapıldı!');
      } else {
        const session = data.login('emre.karaca@gmail.com', 'musteri123');
        state.session = session;
        state.isAuthModalOpen = false;
        renderApp();
        showToast('Müşteri olarak giriş yapıldı!');
      }
    },

    logout() {
      data.logout();
      state.session = null;
      if (state.viewMode === 'admin' || state.viewMode === 'customer_account') {
        state.viewMode = 'store';
      }
      renderApp();
      showToast('Oturum kapatıldı.');
    },

    // 6 Haneli Kod ile Şifre Sıfırlama
    openPasswordResetModal() {
      state.isAuthModalOpen = false;
      state.isPasswordResetModalOpen = true;
      state.resetStep = 1;
      state.resetEmail = '';
      state.simulatedCodeNotice = null;
      renderApp();
    },

    closePasswordResetModal() {
      state.isPasswordResetModalOpen = false;
      renderApp();
    },

    async handleSendResetCode(e) {
      e.preventDefault();
      const email = document.getElementById('reset-email-input')?.value;
      const res = data.sendPasswordResetCode(email);

      if (res.error) {
        showToast(res.error, '✕');
        return;
      }

      try {
        const apiRes = await fetch('/api/email/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: String(email).trim().toLowerCase(), purpose: 'reset' })
        });
        const body = await apiRes.json().catch(() => ({}));
        if (!apiRes.ok) {
          showToast(body.error || 'Doğrulama kodu e-postaya gönderilemedi.', '✕');
          return;
        }
        state.resetDevCode = body.dev ? String(body.code || '') : '';
        state.resetEmail = email;
        state.resetStep = 2;
        state.simulatedCodeNotice = res;
        renderApp();
        showToast(body.dev
          ? (state.resetDevCode ? `E-posta gitmedi. Doğrulama kodunuz: ${state.resetDevCode}` : 'E-posta gitmedi. Kodu serve.ps1 penceresinde görün.')
          : 'Doğrulama kodu e-posta adresinize gönderildi.');
        return;
      } catch (err) {
        showToast('Doğrulama sunucusuna ulaşılamıyor. Siteyi serve.ps1 veya baslat.bat ile açın.', '✕');
        return;
      }
    },

    async handleVerifyAndResetPassword(e) {
      e.preventDefault();
      const code = document.getElementById('reset-code-input')?.value;
      const newPassword = document.getElementById('reset-new-password')?.value;
      const confirmPassword = document.getElementById('reset-confirm-password')?.value;

      if (newPassword !== confirmPassword) {
        showToast('Girdiğiniz şifreler eşleşmiyor!', '✕');
        return;
      }

      try {
        const apiRes = await fetch('/api/email/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: String(state.resetEmail || '').trim().toLowerCase(), code })
        });
        const body = await apiRes.json().catch(() => ({}));
        if (!apiRes.ok || !body.verified) {
          showToast(body.error || 'E-posta doğrulanamadı.', '✕');
          return;
        }
      } catch (err) {
        showToast('Doğrulama sunucusuna ulaşılamıyor. Siteyi serve.ps1 veya baslat.bat ile açın.', '✕');
        return;
      }

      const res = data.applyPasswordReset(state.resetEmail, newPassword);
      if (res.error) {
        showToast(res.error, '✕');
        return;
      }

      state.isPasswordResetModalOpen = false;
      showToast('Şifreniz başarıyla güncellendi! Giriş yapabilirsiniz.');
      this.openAuthModal();
    },

    // Misafir Sipariş Takibi
    openOrderTrackingModal() {
      state.isOrderTrackingModalOpen = true;
      state.trackedOrderResult = null;
      renderApp();
    },

    closeOrderTrackingModal() {
      state.isOrderTrackingModalOpen = false;
      state.trackedOrderResult = null;
      renderApp();
    },

    handleTrackOrder(e) {
      e.preventDefault();
      const orderId = document.getElementById('track-order-id')?.value;
      const contact = document.getElementById('track-order-contact')?.value;

      const order = data.trackOrder(orderId, contact);
      if (!order) {
        state.trackedOrderResult = { error: `#${orderId} numaralı sipariş bulunamadı. Lütfen sipariş numaranızı kontrol edin.` };
      } else {
        state.trackedOrderResult = order;
      }
      renderApp();
    },

    acceptCookies() {
      data.setCookieConsent();
      renderApp();
      showToast('Çerez tercihiniz kaydedildi.');
    },

    openContactModal() {
      state.isContactModalOpen = true;
      renderApp();
    },

    closeContactModal() {
      state.isContactModalOpen = false;
      renderApp();
    },

    openAboutModal() {
      state.isAboutModalOpen = true;
      renderApp();
    },

    closeAboutModal() {
      state.isAboutModalOpen = false;
      renderApp();
    },

    openLegalModal(type) {
      state.legalModalType = type || 'mesafeli';
      state.isLegalModalOpen = true;
      renderApp();
    },

    closeLegalModal() {
      state.isLegalModalOpen = false;
      renderApp();
    },

    toggleMobileMenu() {
      state.mobileMenuOpen = !state.mobileMenuOpen;
      renderApp();
    },

    // Admin Panel Aksiyonları
    setAdminTab(tab) {
      state.adminTab = tab;
      renderApp();
    },

    changeOrderStatus(orderId, newStatus) {
      data.updateOrderStatus(orderId, newStatus);
      renderApp();
      showToast(`Sipariş #${orderId} durumu "${newStatus}" yapıldı`);
    },

    viewOrderReceipt(orderId) {
      const orders = data.getOrders();
      state.selectedOrderReceipt = orders.find(o => o.id === orderId) || null;
      renderApp();
    },

    closeOrderReceipt() {
      state.selectedOrderReceipt = null;
      renderApp();
    },

    toggleProductVisibility(id) {
      data.toggleProductVisibility(id);
      renderApp();
      showToast('Ürün görünürlüğü güncellendi');
    },

    deleteProduct(id) {
      if (confirm('Bu ürünü katalogdan silmek istediğinize emin misiniz?')) {
        data.deleteProduct(id);
        renderApp();
        showToast('Ürün silindi');
      }
    },

    openAddProductModal() {
      resetProductForm();
      state.isAddProductModalOpen = true;
      renderApp();
    },

    openEditProductModal(id) {
      const prod = data.getProducts().find(p => p.id === id);
      if (!prod) return;
      state.editingProductId = id;
      state.productForm = {
        title: prod.title || '',
        category: prod.category || 'baslik',
        price: prod.price || 590,
        costPrice: prod.costPrice || Math.round((prod.price || 590) * 0.42),
        stock: prod.stock || 20,
        badge: prod.badge || '',
        subtitle: prod.subtitle || '',
        description: prod.description || '',
        featuresText: Array.isArray(prod.features) ? prod.features.join('\n') : '',
        variantsText: Array.isArray(prod.variants) ? prod.variants.join(', ') : '',
        images: getProductImages(prod).map(src => ({ src, name: 'Görsel' })),
        video: prod.video || '',
        videoName: ''
      };
      state.isAddProductModalOpen = true;
      renderApp();
    },

    closeAddProductModal() {
      state.isAddProductModalOpen = false;
      resetProductForm();
      renderApp();
    },

    // Bilgisayardan Çoklu Fotoğraf Seçimi & Canvas ile 1024x1540 Boyutlandırma
    onProductImageSelected(files) {
      if (!files || !files.length) return;
      captureProductFormFromDom();
      Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const img = new Image();
          img.onload = () => {
            // Hedef boyut: 1024x1540 (portrait, ~2:3 oran)
            const TARGET_W = 1024;
            const TARGET_H = 1540;
            const canvas = document.createElement('canvas');
            canvas.width = TARGET_W;
            canvas.height = TARGET_H;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, TARGET_W, TARGET_H);

            // Cover modda: resmi kırp ve tam doldur
            const srcRatio = img.width / img.height;
            const dstRatio = TARGET_W / TARGET_H;
            let sx = 0, sy = 0, sw = img.width, sh = img.height;
            if (srcRatio > dstRatio) {
              // Kaynak daha geniş: yatayda kırp
              sw = img.height * dstRatio;
              sx = (img.width - sw) / 2;
            } else {
              // Kaynak daha uzun: dikeyde kırp
              sh = img.width / dstRatio;
              sy = (img.height - sh) / 2;
            }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);

            if (!state.productForm.images) state.productForm.images = [];
            if (state.productForm.images.length < 8) {
              state.productForm.images.push({ src: compressed, name: file.name });
              renderApp();
            }
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    },


    removeProductImage(index) {
      if (state.productForm.images && state.productForm.images[index]) {
        captureProductFormFromDom();
        state.productForm.images.splice(index, 1);
        renderApp();
      }
    },

    // Bilgisayardan Video Dosyası Seçimi
    onProductVideoSelected(files) {
      if (!files || !files.length) return;
      const file = files[0];
      if (!file.type.startsWith('video/')) {
        showToast('Lütfen geçerli bir video dosyası seçin (MP4 / WEBM)', '✕');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        showToast('Video dosyası 20 MB’dan küçük olmalıdır (veya YouTube linki kullanın)', '✕');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        state.productForm.video = ev.target.result;
        state.productForm.videoName = file.name;
        renderApp();
        showToast('Video başarıyla yüklendi!');
      };
      reader.readAsDataURL(file);
    },

    clearProductVideo() {
      state.productForm.video = '';
      state.productForm.videoName = '';
      const input = document.getElementById('add-prod-video-url');
      if (input) input.value = '';
      renderApp();
    },

    submitProductForm(e) {
      e.preventDefault();
      const title = (document.getElementById('add-prod-title')?.value || '').trim();
      const category = document.getElementById('add-prod-category')?.value || 'baslik';
      const price = parseFloat(document.getElementById('add-prod-price')?.value) || 0;
      const costPrice = parseFloat(document.getElementById('add-prod-cost')?.value) || Math.round(price * 0.42);
      const stock = parseInt(document.getElementById('add-prod-stock')?.value, 10) || 0;
      const badge = (document.getElementById('add-prod-badge')?.value || '').trim();
      const subtitle = (document.getElementById('add-prod-subtitle')?.value || '').trim();
      const description = (document.getElementById('add-prod-description')?.value || '').trim();
      const videoUrl = (document.getElementById('add-prod-video-url')?.value || '').trim();
      const variantsText = (document.getElementById('add-prod-variants')?.value || '').trim();

      const video = videoUrl || state.productForm.video || '';
      const images = (state.productForm.images || []).map(img => img.src);

      if (!title) {
        showToast('Lütfen ürün başlığını girin', '✕');
        return;
      }
      if (!images.length) {
        showToast('Lütfen en az bir ürün görseli ekleyin', '✕');
        return;
      }

      const variants = variantsText ? variantsText.split(',').map(s => s.trim()).filter(Boolean) : ['Standart'];

      if (state.editingProductId) {
        const existing = data.getProducts().find(p => p.id === state.editingProductId);
        if (existing) {
          data.updateProduct({
            ...existing,
            title,
            category,
            categoryLabel: categoryLabels[category] || category,
            price,
            costPrice,
            stock,
            badge,
            subtitle,
            description,
            video,
            images,
            image: images[0],
            variants: variants.length ? variants : existing.variants
          });
          state.isAddProductModalOpen = false;
          resetProductForm();
          renderApp();
          showToast(`"${title}" güncellendi`);
          return;
        }
      }

      const newProd = {
        id: 'prod-' + category + '-' + Date.now(),
        title,
        category,
        categoryLabel: categoryLabels[category] || category,
        price,
        costPrice,
        stock,
        badge: badge || 'Yeni Ürün',
        subtitle,
        description,
        video,
        images,
        image: images[0],
        variants,
        features: ['1. Sınıf Paslanmaz Malzeme', 'Sızdırmaz Contalı Tasarım', 'Hızlı Kargo Teslimatı'],
        isVisible: true
      };

      data.addProduct(newProd);
      state.isAddProductModalOpen = false;
      resetProductForm();
      renderApp();
      showToast(`"${title}" başarıyla eklendi!`);
    },

    // Kullanıcı & Yönetici Yönetimi
    openAddUserModal() {
      state.isAddUserModalOpen = true;
      renderApp();
    },

    closeAddUserModal() {
      state.isAddUserModalOpen = false;
      renderApp();
    },

    submitUserForm(e) {
      e.preventDefault();
      const name = document.getElementById('new-user-name')?.value;
      const email = document.getElementById('new-user-email')?.value;
      const password = document.getElementById('new-user-password')?.value;
      const role = document.getElementById('new-user-role')?.value;

      const res = data.addUser({ name, email, password, role });
      if (res.error) {
        showToast(res.error, '✕');
        return;
      }
      state.isAddUserModalOpen = false;
      renderApp();
      showToast(`Yeni ${role === 'admin' ? 'Yönetici' : 'Müşteri'} hesabı "${email}" eklendi!`);
    },

    deleteUser(id) {
      if (confirm('Bu kullanıcı hesabını silmek istediğinize emin misiniz?')) {
        const res = data.deleteUser(id);
        if (res.error) {
          showToast(res.error, '✕');
          return;
        }
        renderApp();
        showToast('Kullanıcı hesabı silindi.');
      }
    }
  };

  // DOM Yüklendiğinde Başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AQUAFLOW_APP.init());
  } else {
    window.AQUAFLOW_APP.init();
  }
})();