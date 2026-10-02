// Aquaflow DTC E-Commerce Data Engine (Maliyet, Kâr, Müşteri Takibi, SMS Doğrulama & Türkiye İl/İlçe Veritabanı)
(function () {
  'use strict';

  // Şirket ve İletişim Bilgileri
  const COMPANY_ADDRESS = 'İnönü Mahallesi, 30/12A Sokak No: 1, 34203 Bağcılar/İstanbul';
  const COMPANY_MAPS_URL = 'https://maps.google.com/?q=İnönü+Mahallesi+30/12A+Sokak+No+1+34203+Bağcılar+İstanbul';

  const companyInfo = {
    name: 'Onur Çete',
    companyName: 'Onur Çete - Aquaflow',
    address: COMPANY_ADDRESS,
    mapsUrl: COMPANY_MAPS_URL,
    workingHours: 'Pazartesi-Cumartesi 09:00-17:00',
    email: 'aquaflowymv@gmail.com',
    phone: '0551 688 9214'
  };

  // Basit şifre hash fonksiyonu (btoa tabanlı)
  function hashPassword(pw) {
    return 'AQH_' + btoa(unescape(encodeURIComponent(String(pw || ''))));
  }
  function checkPassword(plain, hashed) {
    if (!hashed) return false;
    if (hashed.startsWith('AQH_')) {
      try { return decodeURIComponent(escape(atob(hashed.slice(4)))) === String(plain || ''); } catch(e) { return false; }
    }
    // Eski düz metin şifre desteği (geçiş dönemi)
    return hashed === String(plain || '');
  }

  // Kategoriler Listesi
  const categories = [
    { id: 'all', name: 'Tüm Ürünler' },
    { id: 'baslik', name: 'Duş Başlığı' },
    { id: 'hortum', name: 'Duş Hortumu' },
    { id: 'mafsal', name: 'Mafsal' },
    { id: 'musluk-ucu', name: 'Musluk Uçları' },
    { id: 'filtre', name: 'Filtreler' },
    { id: 'set', name: 'Duş Başlığı Setleri' },
    { id: 'buz-kalibi', name: 'Buz Kalıpları' },
    { id: 'fume-vakum-mafsal', name: 'Füme Vakumlu Mafsal' }
  ];

  // Türkiye 81 İl ve İlçeleri Veritabanı (Madde 3 Gereksinimi)
  const turkeyCities = {
    "Adana": ["Aladağ", "Ceyhan", "Çukurova", "Feke", "İmamoğlu", "Karaisalı", "Karataş", "Kozan", "Pozantı", "Saimbeyli", "Sarıçam", "Seyhan", "Tufanbeyli", "Yumurtalık", "Yüreğir"],
    "Adıyaman": ["Besni", "Çelikhan", "Gerger", "Gölbaşı", "Kahta", "Merkez", "Samsat", "Sincik", "Tut"],
    "Afyonkarahisar": ["Başmakçı", "Bayat", "Bolvadin", "Çay", "Çobanlar", "Dazkırı", "Dinar", "Emirdağ", "Evciler", "Hocalar", "İhsaniye", "İscehisar", "Kızılören", "Merkez", "Sandıklı", "Sinanpaşa", "Sultandağı", "Şuhut"],
    "Ağrı": ["Diyadin", "Doğubayazıt", "Eleşkirt", "Hamur", "Merkez", "Patnos", "Taşlıçay", "Tutak"],
    "Aksaray": ["Ağaçören", "Eskil", "Gülağaç", "Güzelyurt", "Merkez", "Ortaköy", "Sarıyahşi", "Sultanhanı"],
    "Amasya": ["Göynücek", "Gümüşhacıköy", "Hamamözü", "Merkez", "Merzifon", "Suluova", "Taşova"],
    "Ankara": ["Akyurt", "Altındağ", "Ayaş", "Bala", "Beypazarı", "Çamlıdere", "Çankaya", "Çubuk", "Elmadağ", "Etimesgut", "Evren", "Gölbaşı", "Güdül", "Haymana", "Kahramankazan", "Kalecik", "Keçiören", "Kızılcahamam", "Mamak", "Nallıhan", "Polatlı", "Pursaklar", "Sincan", "Şereflikoçhisar", "Yenimahalle"],
    "Antalya": ["Akseki", "Aksu", "Alanya", "Demre", "Döşemealtı", "Elmalı", "Finike", "Gazipaşa", "Gündoğmuş", "İbradı", "Kaş", "Kemer", "Kepez", "Konyaaltı", "Korkuteli", "Kumluca", "Manavgat", "Muratpaşa", "Serik"],
    "Ardahan": ["Çıldır", "Damal", "Göle", "Hanak", "Merkez", "Posof"],
    "Artvin": ["Ardanuç", "Arhavi", "Borçka", "Hopa", "Kemalpaşa", "Merkez", "Murgul", "Şavşat", "Yusufeli"],
    "Aydın": ["Bozdoğan", "Buharkent", "Çine", "Didim", "Efeler", "Germencik", "İncirliova", "Karacasu", "Karpuzlu", "Koçarlı", "Köşk", "Kuşadası", "Kuyucak", "Nazilli", "Söke", "Sultanhisar", "Yenipazar"],
    "Balıkesir": ["Altıeylül", "Ayvalık", "Balya", "Bandırma", "Bigadiç", "Burhaniye", "Dursunbey", "Edremit", "Erdek", "Gömeç", "Gönen", "Havran", "İvrindi", "Karesi", "Kepsut", "Manyas", "Marmara", "Savaştepe", "Sındırgı", "Susurluk"],
    "Bartın": ["Amasra", "Kurucaşile", "Merkez", "Ulus"],
    "Batman": ["Beşiri", "Gercüş", "Hasankeyf", "Kozluk", "Merkez", "Sason"],
    "Bayburt": ["Aydıntepe", "Demirözü", "Merkez"],
    "Bilecik": ["Bozüyük", "Gölpazarı", "İnhisar", "Merkez", "Osmaneli", "Pazaryeri", "Söğüt", "Yenipazar"],
    "Bingöl": ["Adaklı", "Genç", "Karlıova", "Kiğı", "Merkez", "Solhan", "Yayladere", "Yedisu"],
    "Bitlis": ["Adilcevaz", "Ahlat", "Güroymak", "Hizan", "Merkez", "Mutki", "Tatvan"],
    "Bolu": ["Dörtdivan", "Gerede", "Göynük", "Kıbrıscık", "Mengen", "Merkez", "Mudurnu", "Seben", "Yeniçağa"],
    "Burdur": ["Ağlasun", "Altınyayla", "Bucak", "Çavdır", "Çeltikçi", "Gölhisar", "Karamanlı", "Kemer", "Merkez", "Tefenni", "Yeşilova"],
    "Bursa": ["Büyükorhan", "Gemlik", "Gürsu", "Harmancık", "İnegöl", "İznik", "Karacabey", "Keles", "Kestel", "Mudanya", "Mustafakemalpaşa", "Nilüfer", "Orhaneli", "Orhangazi", "Osmangazi", "Yenişehir", "Yıldırım"],
    "Çanakkale": ["Ayvacık", "Bayramiç", "Biga", "Bozcaada", "Çan", "Eceabat", "Ezine", "Gelibolu", "Gökçeada", "Lapseki", "Merkez", "Yenice"],
    "Çankırı": ["Atkaracalar", "Bayramören", "Çerkeş", "Eldivan", "Ilgaz", "Kızılırmak", "Korgun", "Kurşunlu", "Merkez", "Orta", "Şabanözü", "Yapraklı"],
    "Çorum": ["Alaca", "Bayat", "Boğazkale", "Dodurga", "İskilip", "Kargı", "Laçin", "Mecitözü", "Merkez", "Oğuzlar", "Ortaköy", "Osmancık", "Sungurlu", "Uğurludağ"],
    "Denizli": ["Acıpayam", "Babadağ", "Baklan", "Bekilli", "Beyağaç", "Bozkurt", "Buldan", "Çal", "Çameli", "Çardak", "Çivril", "Güney", "Honaz", "Kale", "Merkezefendi", "Pamukkale", "Sarayköy", "Serinhisar", "Tavas"],
    "Diyarbakır": ["Bağlar", "Bismil", "Çermik", "Çınar", "Çüngüş", "Dicle", "Eğil", "Ergani", "Hani", "Hazro", "Kayapınar", "Kocaköy", "Kulp", "Lice", "Silvan", "Sur", "Yenişehir"],
    "Düzce": ["Akçakoca", "Cumayeri", "Çilimli", "Gölyaka", "Gümüşova", "Kaynaşlı", "Merkez", "Yığılca"],
    "Edirne": ["Enez", "Havsa", "İpsala", "Keşan", "Lalapaşa", "Meriç", "Merkez", "Süloğlu", "Uzunköprü"],
    "Elazığ": ["Ağın", "Alacakaya", "Arıcak", "Baskil", "Karakoçan", "Keban", "Kovancılar", "Maden", "Merkez", "Palu", "Sivrice"],
    "Erzincan": ["Çayırlı", "İliç", "Kemah", "Kemaliye", "Merkez", "Otlukbeli", "Refahiye", "Tercan", "Üzümlü"],
    "Erzurum": ["Aşkale", "Aziziye", "Çat", "Hınıs", "Horasan", "İspir", "Karaçoban", "Karayazı", "Köprüköy", "Narman", "Oltu", "Olur", "Palandöken", "Pasinler", "Pazaryolu", "Şenkaya", "Tekman", "Tortum", "Uzundere", "Yakutiye"],
    "Eskişehir": ["Alpu", "Beylikova", "Çifteler", "Günyüzü", "Han", "İnönü", "Mahmudiye", "Mihalgazi", "Mihalıççık", "Odunpazarı", "Sarıcakaya", "Seyitgazi", "Sivrihisar", "Tepebaşı"],
    "Gaziantep": ["Araban", "İslahiye", "Karkamış", "Nizip", "Nurdağı", "Oğuzeli", "Şahinbey", "Şehitkamil", "Yavuzeli"],
    "Giresun": ["Alucra", "Bulancak", "Çamoluk", "Çanakçı", "Dereli", "Doğankent", "Espiye", "Eynesil", "Görele", "Güce", "Keşap", "Merkez", "Piraziz", "Şebinkarahisar", "Tirebolu", "Yağlıdere"],
    "Gümüşhane": ["Kelkit", "Köse", "Kürtün", "Merkez", "Şiran", "Torul"],
    "Hakkari": ["Çukurca", "Derecik", "Merkez", "Şemdinli", "Yüksekova"],
    "Hatay": ["Altınözü", "Antakya", "Arsuz", "Belen", "Defne", "Dörtyol", "Erzin", "Hassa", "İskenderun", "Kırıkhan", "Kumlu", "Payas", "Reyhanlı", "Samandağ", "Yayladağı"],
    "Iğdır": ["Aralık", "Karakoyunlu", "Merkez", "Tuzluca"],
    "Isparta": ["Aksu", "Atabey", "Eğirdir", "Gelendost", "Gönen", "Keçiborlu", "Merkez", "Senirkent", "Sütçüler", "Şarkikaraağaç", "Uluborlu", "Yalvaç", "Yenişarbademli"],
    "İstanbul": ["Adalar", "Arnavutköy", "Ataşehir", "Avcılar", "Bağcılar", "Bahçelievler", "Bakırköy", "Başakşehir", "Bayrampaşa", "Beşiktaş", "Beykoz", "Beylikdüzü", "Beyoğlu", "Büyükçekmece", "Çatalca", "Çekmeköy", "Esenler", "Esenyurt", "Eyüpsultan", "Fatih", "Gaziosmanpaşa", "Güngören", "Kadıköy", "Kağıthane", "Kartal", "Küçükçekmece", "Maltepe", "Pendik", "Sancaktepe", "Sarıyer", "Silivri", "Sultanbeyli", "Sultangazi", "Şile", "Şişli", "Tuzla", "Ümraniye", "Üsküdar", "Zeytinburnu"],
    "İzmir": ["Aliağa", "Balçova", "Bayındır", "Bayraklı", "Bergama", "Beydağ", "Bornova", "Buca", "Çeşme", "Çiğli", "Dikili", "Foça", "Gaziemir", "Güzelbahçe", "Karabağlar", "Karaburun", "Karşıyaka", "Kemalpaşa", "Kınık", "Kiraz", "Konak", "Menderes", "Menemen", "Narlıdere", "Ödemiş", "Seferihisar", "Selçuk", "Tire", "Torbalı", "Urla"],
    "Kahramanmaraş": ["Afşin", "Andırın", "Çağlayancerit", "Dulkadiroğlu", "Ekinözü", "Elbistan", "Göksun", "Nurhak", "Onikişubat", "Pazarcık", "Türkoğlu"],
    "Karabük": ["Eflani", "Eskipazar", "Merkez", "Ovacık", "Safranbolu", "Yenice"],
    "Karaman": ["Ayrancı", "Başyayla", "Ermenek", "Kazımkarabekir", "Merkez", "Sarıveliler"],
    "Kars": ["Akyaka", "Arpaçay", "Digor", "Kağızman", "Merkez", "Sarıkamış", "Selim", "Susuz"],
    "Kastamonu": ["Abana", "Ağlı", "Araç", "Bozkurt", "Cide", "Çatalzeytin", "Daday", "Devrekani", "Doğanyurt", "Hanönü", "İhsangazi", "İnebolu", "Küre", "Merkez", "Pınarbaşı", "Seydiler", "Şenpazar", "Taşköprü", "Tosya"],
    "Kayseri": ["Akkışla", "Bünyan", "Develi", "Felahiye", "Hacılar", "İncesu", "Kocasinan", "Melikgazi", "Özvatan", "Pınarbaşı", "Sarıoğlan", "Sarız", "Talas", "Tomarza", "Yahyalı", "Yeşilhisar"],
    "Kırıkkale": ["Bahşılı", "Balışeyh", "Çelebi", "Delice", "Karakeçili", "Keskin", "Merkez", "Sulakyurt", "Yahşihan"],
    "Kırklareli": ["Babaeski", "Demirköy", "Kofçaz", "Lüleburgaz", "Merkez", "Pehlivanköy", "Pınarhisar", "Vize"],
    "Kırşehir": ["Akçakent", "Akpınar", "Boztepe", "Çiçekdağı", "Kaman", "Merkez", "Mucur"],
    "Kilis": ["Elbeyli", "Merkez", "Musabeyli", "Polateli"],
    "Kocaeli": ["Başiskele", "Çayırova", "Darıca", "Derince", "Dilovası", "Gebze", "Gölcük", "İzmit", "Kandıra", "Karamürsel", "Kartepe", "Körfez"],
    "Konya": ["Ahırlı", "Akören", "Akşehir", "Altınekin", "Beyşehir", "Bozkır", "Cihanbeyli", "Çeltik", "Çumra", "Derbent", "Derebucak", "Doğanhisar", "Emirgazi", "Ereğli", "Güneysınır", "Hadim", "Halkapınar", "Hüyük", "Ilgın", "Kadınhanı", "Karapınar", "Karatay", "Kulu", "Meram", "Sarayönü", "Selçuklu", "Seydişehir", "Taşkent", "Tuzlukçu", "Yalıhüyük", "Yunak"],
    "Kütahya": ["Altıntaş", "Aslanapa", "Çavdarhisar", "Domaniç", "Dumlupınar", "Emet", "Gediz", "Hisarcık", "Merkez", "Pazarlar", "Simav", "Şaphane", "Tavşanlı"],
    "Malatya": ["Akçadağ", "Arapgir", "Arguvan", "Battalgazi", "Darende", "Doğanşehir", "Doğanyol", "Hekimhan", "Kale", "Kuluncak", "Pütürge", "Yazıhan", "Yeşilyurt"],
    "Manisa": ["Ahmetli", "Akhisar", "Alaşehir", "Demirci", "Gölmarmara", "Gördes", "Kırkağaç", "Köprübaşı", "Kula", "Salihli", "Sarıgöl", "Saruhanlı", "Selendi", "Soma", "Şehzadeler", "Turgutlu", "Yunusemre"],
    "Mardin": ["Artuklu", "Dargeçit", "Derik", "Kızıltepe", "Mazıdağı", "Midyat", "Nusaybin", "Ömerli", "Savur", "Yeşilli"],
    "Mersin": ["Akdeniz", "Anamur", "Aydıncık", "Bozyazı", "Çamlıyayla", "Erdemli", "Gülnar", "Mezitli", "Mut", "Silifke", "Tarsus", "Toroslar", "Yenişehir"],
    "Muğla": ["Bodrum", "Dalaman", "Datça", "Fethiye", "Kavaklıdere", "Köyceğiz", "Marmaris", "Menteşe", "Milas", "Ortaca", "Seydikemer", "Ula", "Yatağan"],
    "Muş": ["Bulanık", "Hasköy", "Korkut", "Malazgirt", "Merkez", "Varto"],
    "Nevşehir": ["Acıgöl", "Avanos", "Derinkuyu", "Gülşehir", "Hacıbektaş", "Kozaklı", "Merkez", "Ürgüp"],
    "Niğde": ["Altunhisar", "Bor", "Çamardı", "Çiftlik", "Merkez", "Ulukışla"],
    "Ordu": ["Akkuş", "Altınordu", "Aybastı", "Çamaş", "Çatalpınar", "Çaybaşı", "Fatsa", "Gölköy", "Gülyalı", "Gürgentepe", "İkizce", "Kabadüz", "Kabataş", "Korgan", "Kumru", "Mesudiye", "Perşembe", "Ulubey", "Ünye"],
    "Osmaniye": ["Bahçe", "Düziçi", "Hasanbeyli", "Kadirli", "Merkez", "Sumbas", "Toprakkale"],
    "Rize": ["Ardeşen", "Çamlıhemşin", "Çayeli", "Derepazarı", "Fındıklı", "Güneysu", "Hemşin", "İkizdere", "İyidere", "Kalkandere", "Merkez", "Pazar"],
    "Sakarya": ["Adapazarı", "Akyazı", "Arifiye", "Erenler", "Ferizli", "Geyve", "Hendek", "Karapürçek", "Karasu", "Kaynarca", "Kocaali", "Pamukova", "Sapanca", "Serdivan", "Söğütlü", "Taraklı"],
    "Samsun": ["19 Mayıs", "Alaçam", "Asarcık", "Atakum", "Ayvacık", "Bafra", "Canik", "Çarşamba", "Havza", "İlkadım", "Kavak", "Ladik", "Salıpazarı", "Tekkeköy", "Terme", "Vezirköprü", "Yakakent"],
    "Siirt": ["Baykan", "Eruh", "Kurtalan", "Merkez", "Pervari", "Şirvan", "Tillo"],
    "Sinop": ["Ayancık", "Boyabat", "Dikmen", "Durağan", "Erfelek", "Gerze", "Merkez", "Saraydüzü", "Türkeli"],
    "Sivas": ["Akıncılar", "Altınyayla", "Divriği", "Doğanşar", "Gemerek", "Gölova", "Gürün", "Hafik", "İmranlı", "Kangal", "Koyulhisar", "Merkez", "Suşehri", "Şarkışla", "Ulaş", "Yıldızeli", "Zara"],
    "Şanlıurfa": ["Akçakale", "Birecik", "Bozova", "Ceylanpınar", "Eyyübiye", "Halfeti", "Haliliye", "Harran", "Hilvan", "Karaköprü", "Siverek", "Suruç", "Viranşehir"],
    "Şırnak": ["Beytüşşebap", "Cizre", "Güçlükonak", "İdil", "Merkez", "Silopi", "Uludere"],
    "Tekirdağ": ["Çerkezköy", "Çorlu", "Ergene", "Hayrabolu", "Kapaklı", "Malkara", "Marmaraereğlisi", "Muratlı", "Saray", "Süleymanpaşa", "Şarköy"],
    "Tokat": ["Almus", "Artova", "Başçiftlik", "Erbaa", "Merkez", "Niksar", "Pazar", "Reşadiye", "Sulusaray", "Turhal", "Yeşilyurt", "Zile"],
    "Trabzon": ["Akçaabat", "Araklı", "Arsin", "Beşikdüzü", "Çarşıbaşı", "Çaykara", "Dernekpazarı", "Düzköy", "Hayrat", "Köprübaşı", "Maçka", "Of", "Ortahisar", "Sürmene", "Şalpazarı", "Tonya", "Vakfıkebir", "Yomra"],
    "Tunceli": ["Çemişgezek", "Hozat", "Mazgirt", "Merkez", "Nazımiye", "Ovacık", "Pertek", "Pülümür"],
    "Uşak": ["Banaz", "Eşme", "Karahallı", "Merkez", "Sivaslı", "Ulubey"],
    "Van": ["Bahçesaray", "Başkale", "Çaldıran", "Çatak", "Edremit", "Erciş", "Gevaş", "Gürpınar", "İpekyolu", "Muradiye", "Özalp", "Saray", "Tuşba"],
    "Yalova": ["Altınova", "Armutlu", "Çınarcık", "Çiftlikköy", "Merkez", "Termal"],
    "Yozgat": ["Akdağmadeni", "Aydıncık", "Boğazlıyan", "Çandır", "Çayıralan", "Çekerek", "Kadışehri", "Merkez", "Saraykent", "Sarıkaya", "Sorgun", "Şefaatli", "Yenifakılı", "Yerköy"],
    "Zonguldak": ["Alaplı", "Çaycuma", "Devrek", "Ereğli", "Gökçebey", "Kilimli", "Kozlu", "Merkez"]
  };

  // Ürünler Kataloğu (Doğrudan TL Fiyatlı, Barkodlu & Maliyet/Kâr Destekli)
  const defaultProducts = [
    // --- 1. DUŞ BAŞLIĞI ---
    {
      id: 'prod-baslik-1',
      category: 'baslik',
      categoryLabel: 'Duş Başlığı',
      barcode: '869012345001', // Barkod alanı (Yalnızca yönetici görür)
      title: 'Aquaflow™ Hydro-Boost 3 Modlu Filtreli Duş Başlığı',
      subtitle: '280 mikro lazer nozul, 15 kademeli mineral kartuş filtre, tek tuşla mod değişimi',
      description: 'Aquaflow Hydro-Boost, banyonuzu spa deneyimine dönüştürmek için tasarlanan amiral gemisi duş başlığımızdır. 15 kademeli mineral filtreleme sistemi kireç ve kloru süzerken, 280 lazer mikro nozul su akışını güçlendirir.',
      price: 590,
      costPrice: 240,
      stock: 35,
      isVisible: true,
      badge: 'Çok Satan',
      rating: 4.9,
      reviewCount: 3842,
      image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=0',
      images: [
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80'
      ],
      video: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
      variants: ['Krom Ayna', 'Mat Siyah', 'Fırçalanmış Altın'],
      features: ['Yüksek Tazyikli Su Akışı', 'Kireç Önleyici Silikon Nozullar', '1/2" Üniversal Standart Diş', 'Mineral Filtre Kartuşu']
    },
    {
      id: 'prod-baslik-2',
      category: 'baslik',
      categoryLabel: 'Duş Başlığı',
      barcode: '869012345002',
      title: 'Aquaflow™ PureRain Büyük Boy Tepe Yağmurlama Başlığı',
      subtitle: 'Geniş 25 cm paslanmaz çelik ayna gövde, ultra ince homojen spa masaj akışı',
      description: 'PureRain, geniş 25 cm başlığıyla tüm vücudu saran homojen bir yağmur akışı sunar. Paslanmaz çelik ayna kaplama hem şık hem de uzun ömürlüdür.',
      price: 790,
      costPrice: 320,
      stock: 18,
      isVisible: true,
      badge: 'Lüks Seri',
      rating: 4.8,
      reviewCount: 1420,
      image: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Krom Ayna', 'Mat Siyah'],
      features: ['25 cm Geniş Gövde', 'Anti-Kireç Silikon Gözenekler', 'Paslanmaz Çelik 304 Gövde']
    },
    {
      id: 'prod-baslik-3',
      category: 'baslik',
      categoryLabel: 'Duş Başlığı',
      barcode: '869012345003',
      title: 'Aquaflow™ Vortex Turbo Fan Pervaneli Masaj Başlığı',
      subtitle: 'Görsel spiral su akışı, mekanik türbin mikser ile güçlü masaj hissi ve su durdurma butonu',
      description: 'Vortex serisi, şeffaf gövdesinin içinde dönen pervanesiyle suyu mekanik olarak sıkıştırıp güçlü masaj akışı oluşturur. Sapında su açma-kapama stop butonu mevcuttur.',
      price: 450,
      costPrice: 170,
      stock: 28,
      isVisible: true,
      badge: 'Popüler',
      rating: 4.7,
      reviewCount: 980,
      image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Mat Siyah', 'Krom'],
      features: ['Dahili Türbin Pervane', 'Şeffaf Polikarbon Gövde', 'Sap Üzerinde Stop Butonu']
    },

    // --- 2. DUŞ HORTUMU ---
    {
      id: 'prod-hortum-1',
      category: 'hortum',
      categoryLabel: 'Duş Hortumu',
      barcode: '869012345004',
      title: 'Aquaflow™ 2.0 Metre Kırılmaz & Dolanmaz Çelik Hortum',
      subtitle: '360° döner pirinç rakorlar, yüksek basınca dayanıklı çift örgülü 304 paslanmaz çelik',
      description: 'Çift örgülü 304 paslanmaz çelik yapısı sayesinde bükülmez, dolanmaz ve patlamaz. 360° döner pirinç rakorlar sızdırmaz ve rahat kullanım sunar.',
      price: 250,
      costPrice: 95,
      stock: 45,
      isVisible: true,
      badge: 'Dayanıklı',
      rating: 4.9,
      reviewCount: 1670,
      image: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Mat Siyah', 'Parlak Krom', 'Altın'],
      features: ['2.0 Metre Ekstra Uzun', '360° Döner Pirinç Başlık', 'Çift Örgülü 304 Çelik']
    },
    {
      id: 'prod-hortum-2',
      category: 'hortum',
      categoryLabel: 'Duş Hortumu',
      barcode: '869012345005',
      title: 'Aquaflow™ Mat Silikon Hijyenik Pürüzsüz Duş Hortumu',
      subtitle: 'Kir ve kireç tutmayan antibakteriyel pürüzsüz mat yüzey, kolay temizlenir 1.75m',
      description: 'Pürüzsüz mat silikon kaplama, kir ve kireç birikimini önler; sadece bir bezle silindiğinde ilk günkü gibi temizlenir. Dolanma yapmayan döner rakorlara sahiptir.',
      price: 290,
      costPrice: 110,
      stock: 30,
      isVisible: true,
      badge: 'Hijyenik',
      rating: 4.8,
      reviewCount: 740,
      image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Mat Siyah', 'Mat Beyaz', 'Antrasit Gri'],
      features: ['Pürüzsüz Kolay Temizlenen Yüzey', 'Kireç Tutmaz', 'Sessiz ve Esnek Gövde']
    },

    // --- 3. MAFSAL ---
    {
      id: 'prod-mafsal-1',
      category: 'mafsal',
      categoryLabel: 'Duş Mafsalı',
      barcode: '869012345006',
      title: 'Aquaflow™ Masif Pirinç 360° Ayarlanabilir Döner Mafsal',
      subtitle: 'Ağır hizmet tipi masif pirinç bilya mekanizması, istenen açıda kilitlenebilir sızdırmaz gövde',
      description: 'Masif pirinç gövde ve bilya mekanizması sayesinde duş başlığınızı istediğiniz açıda sabitleyebilir, sızdırmaz contalarıyla güvenle kullanabilirsiniz.',
      price: 220,
      costPrice: 85,
      stock: 40,
      isVisible: true,
      badge: 'Masif Pirinç',
      rating: 4.9,
      reviewCount: 1290,
      image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Parlak Krom', 'Mat Siyah', 'Altın'],
      features: ['Masif Pirinç Malzeme', '360° Açı Ayarı', 'Standart 1/2" Üniversal Diş']
    },
    {
      id: 'prod-mafsal-2',
      category: 'mafsal',
      categoryLabel: 'Duş Mafsalı',
      barcode: '869012345007',
      title: 'Aquaflow™ Matkap Gerektirmeyen Yapışkanlı Duvar Askı Mafsalı',
      subtitle: 'Fayans delmeye son! 20 kg taşıma kapasiteli nano emişli süper güçlü tutucu',
      description: 'Fayanslarınızı delmeden, nano yapışkan teknolojisiyle 20 kg\'a kadar taşıma kapasitesi sunan pratik ve şık duvar askısı.',
      price: 180,
      costPrice: 65,
      stock: 55,
      isVisible: true,
      badge: 'Delmesiz Montaj',
      rating: 4.7,
      reviewCount: 910,
      image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Mat Siyah', 'Krom'],
      features: ['Delmesiz Nano Yapışkan', '20kg Taşıma Kapasitesi', 'Suya Dayanıklı Özel Taban']
    },

    // --- 4. MUSLUK UÇLARI ---
    {
      id: 'prod-musluk-1',
      category: 'musluk-ucu',
      categoryLabel: 'Musluk Uçları',
      barcode: '869012345008',
      title: 'Aquaflow™ 1080° Robot Kol Döner Başlıklı Arıtmalı Musluk Ucu',
      subtitle: '3 mafsallı her yöne dönebilen robot kol, pamuk filtreli kireç önleyici çift akış modu',
      description: 'Lavabo ve evye musluklarınızı 1080 dereceye kadar her açıya döndürebilirsiniz. Yüz yıkama, gargara yapma ve lavabo temizliğini son derece pratikleştirir. Dahili kartuş filtresiyle kumu ve pası süzer.',
      price: 340,
      costPrice: 130,
      stock: 32,
      isVisible: true,
      badge: '1080° Döner',
      rating: 4.9,
      reviewCount: 1120,
      image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Krom', 'Mat Siyah'],
      features: ['1080° Çok Eksenli Dönüş', 'Dahili Tortu Filtresi', 'Çift Akış (Köpüklü / Tazyikli)']
    },
    {
      id: 'prod-musluk-2',
      category: 'musluk-ucu',
      categoryLabel: 'Musluk Uçları',
      barcode: '869012345009',
      title: 'Aquaflow™ Çift Kademeli Tasarruflu Musluk Perlatör Ucu',
      subtitle: 'Kabarcıklı havalandırma köpük modu ve tazyikli duş sprey modu, %40 su tasarrufu',
      description: 'Standart musluklara 30 saniyede vidalanan pirinç gövdeli perlatör ucu, suyu hava ile zenginleştirerek sıçramayı önler ve kullanım konforunu ikiye katlar.',
      price: 190,
      costPrice: 70,
      stock: 60,
      isVisible: true,
      badge: 'Tasarruflu',
      rating: 4.8,
      reviewCount: 650,
      image: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Krom', 'Mat Siyah'],
      features: ['Sıçrama Önleyici Havalandırma', 'Çevirmeli Mod Değişimi', 'Evrensel Adaptör Dahil']
    },

    // --- 5. FİLTRELER ---
    {
      id: 'prod-filtre-1',
      category: 'filtre',
      categoryLabel: 'Filtreler',
      barcode: '869012345010',
      title: 'Aquaflow™ 15 Kademeli Mineral & Klor Yedek Kartuş Filtre (5\'li Paket)',
      subtitle: 'Kalsiyum sülfit, KDF-55, aktif karbon ve mineral taşlar ile 1 yıla varan temiz su',
      description: 'Aquaflow duş başlıkları ve musluk filtreleriyle tam uyumlu 5 adet yedek mineral kartuş paketi. Sıcak ve soğuk suda kloru, ağır metalleri ve tortuları hapseder.',
      price: 290,
      costPrice: 105,
      stock: 50,
      isVisible: true,
      badge: '5\'li Paket',
      rating: 5.0,
      reviewCount: 2310,
      image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['5\'li Standart Paket', '10\'lu Büyük Paket'],
      features: ['15 Kademeli Filtrasyon', 'Klor ve Ağır Metal Tutucu', 'Yumuşak Saç ve Cilt Hissi']
    },
    {
      id: 'prod-filtre-2',
      category: 'filtre',
      categoryLabel: 'Filtreler',
      barcode: '869012345011',
      title: 'Aquaflow™ Üniversal Banyo & Çamaşır Makinesi Kireç Önleyici Filtre',
      subtitle: 'Hat tipi vidalı inline filtre ünitesi, yüksek kapasiteli silifoz ve mineral reçine',
      description: 'Tesisat girişine, banyo bataryası altına veya çamaşır makinesi musluğuna alet gerektirmeden takılır. Rezistans ve bataryalarda kireç taşı oluşumunu engeller.',
      price: 260,
      costPrice: 90,
      stock: 35,
      isVisible: true,
      badge: 'Kireç Kalkanı',
      rating: 4.8,
      reviewCount: 880,
      image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Şeffaf Gövde', 'Beyaz Gövde'],
      features: ['Inline Hat Tipi Montaj', 'Silifoz Kireç Önleyici', 'Tüm 1/2" ve 3/4" Hatlara Uyumlu']
    },

    // --- 6. DUŞ BAŞLIĞI SETLERİ ---
    {
      id: 'prod-set-1',
      category: 'set',
      categoryLabel: 'Duş Başlığı Setleri',
      barcode: '869012345012',
      title: 'Aquaflow™ Deluxe Spa Komple Duş Başlığı ve Hortum Seti',
      subtitle: 'Hydro-Boost Başlık + 10x Mineral Filtre + 2.0M Paslanmaz Çelik Hortum + Döner Mafsal',
      description: 'Banyonuzu tek kutuda yenileyin: Hydro-Boost arıtmalı duş başlığı, 10 adet yedek mineral filtre, kırılmaz 2 metre çelik hortum ve masif pirinç döner mafsal bir arada eksiksiz set.',
      price: 990,
      costPrice: 390,
      stock: 20,
      isVisible: true,
      badge: 'Komple Set',
      rating: 5.0,
      reviewCount: 2150,
      image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Mat Siyah Full Set', 'Krom Full Set', 'Altın Full Set'],
      features: ['10x Yedek Mineral Filtre', '2.0m Kırılmaz Çelik Hortum', 'Masif Pirinç Döner Mafsal', 'Montaj Anahtarı Hediyeli']
    },
    {
      id: 'prod-set-2',
      category: 'set',
      categoryLabel: 'Duş Başlığı Setleri',
      barcode: '869012345013',
      title: 'Aquaflow™ İkili Banyo & Lavabo Arıtma Başlangıç Seti',
      subtitle: '1x Filtreli Duş Başlığı + 1x Döner Robot Kol Musluk Ucu + 6x Yedek Filtre Kartuşu',
      description: 'Sadece duşu değil, lavabo musluğunuzu da arıtan ikili başlangıç paketi. 6 yedek kartuşuyla uzun süreli temiz ve tazyikli su sağlar.',
      price: 850,
      costPrice: 340,
      stock: 22,
      isVisible: true,
      badge: 'İkili Paket',
      rating: 4.9,
      reviewCount: 860,
      image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Krom', 'Mat Siyah'],
      features: ['Duş Başlığı + Musluk Ucu', 'Toplam 6 Yedek Kartuş', 'Aletsiz Kolay Montaj']
    },

    // --- 7. BUZ KALIPLARI ---
    {
      id: 'prod-buz-1',
      category: 'buz-kalibi',
      categoryLabel: 'Buz Kalıpları',
      barcode: '869012345014',
      title: 'Aquaflow™ XL Küre & Elmas Geometrik Silikon Buz Kalıbı Seti',
      subtitle: 'Gıda sınıfı BPA\'sız esnek silikon, kolay çıkarılan sızdırmaz huni kapaklı çiftli set',
      description: 'Büyük boy 6 cm küre buz ve geometrik elmas buz kalıbı. Yavaş eriyerek içeceklerin tadını bozmaz. Esnek silikon yapısı sayesinde buzlar kırılmadan tek hamlede kolayca çıkar.',
      price: 210,
      costPrice: 75,
      stock: 45,
      isVisible: true,
      badge: 'BPA Free',
      rating: 4.9,
      reviewCount: 780,
      image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Siyah Silikon', 'Koyu Yeşil', 'Gri'],
      features: ['Gıda Sınıfı Platin Silikon', 'Yavaş Eriyen 6cm XL Küreler', 'Sızdırmaz Geçmeli Kapak']
    },
    {
      id: 'prod-buz-2',
      category: 'buz-kalibi',
      categoryLabel: 'Buz Kalıpları',
      barcode: '869012345015',
      title: 'Aquaflow™ Bas-Çıkar Hazneli & Kürekli Lüks Buz Kalıbı',
      subtitle: 'Tek tuşla hazneden tüm buzları döken pres mekanizması, kapaklı ve koku geçirmez saklama kutusu',
      description: 'El değmeden, üstteki basma butonuna tek dokunuşla onlarca buz küpünü altındaki şeffaf hazneye döker. Kapağı buzluk kokularının buza sinmesini tamamen önler.',
      price: 260,
      costPrice: 95,
      stock: 38,
      isVisible: true,
      badge: 'Bas-Çıkar',
      rating: 4.9,
      reviewCount: 940,
      image: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Buz Mavisi & Beyaz', 'Füme & Şeffaf'],
      features: ['Tek Presle Boşaltma', 'Koku Geçirmez Kapak', 'Dahili Servis Küreği Hediyeli']
    },

    // --- 8. FÜME VAKUMLU MAFSAL ---
    {
      id: 'prod-fume-1',
      category: 'fume-vakum-mafsal',
      categoryLabel: 'Füme Vakumlu Mafsal',
      barcode: '869012345016',
      title: 'Aquaflow™ Füme Serisi Ağır Hizmet Vakumlu Döner Mafsal Askı',
      subtitle: 'Delmesiz süper güçlü vakum kilidi, lüks füme antrasit kaplama, 360° döner başlık tutucu',
      description: 'Modern antrasit ve füme banyolara tam uyumlu lüks mafsal. Güçlendirilmiş kilitlenebilir vakum mekanizması sayesinde ıslak fayanslarda dahi kayma yapmaz. Delme, vida veya yapışkan kalıntısı bırakmaz; sökülüp yeri değiştirilebilir.',
      price: 280,
      costPrice: 100,
      stock: 40,
      isVisible: true,
      badge: 'Füme Seri',
      rating: 5.0,
      reviewCount: 1040,
      image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80'
      ],
      variants: ['Füme Antrasit', 'Füme Krom'],
      features: ['Kilitli Ağır Hizmet Vakum', 'Füme Titanyum Kaplama', '360° Açı Ayarlanabilir', 'İz Bırakmadan Taşınabilir']
    }
  ];

  // Başlangıç Siparişleri (Barkodlu, Takip Kodlu ve İletişim Bilgileriyle)
  const defaultOrders = [
    {
      id: 'AQ-849201',
      date: '15.09.2026 14:20',
      customerName: 'Emre Karaca',
      phone: '05324198210',
      email: 'emre.karaca@gmail.com',
      city: 'İstanbul / Kadıköy',
      address: 'Caferağa Mah. Moda Cad. No:44 Daire:8 Kadıköy / İstanbul',
      items: [
        {
          productId: 'prod-set-1',
          title: 'Aquaflow™ Deluxe Spa Komple Duş Başlığı ve Hortum Seti',
          variant: 'Mat Siyah Full Set',
          quantity: 1,
          price: 990,
          costPrice: 390,
          barcode: '869012345012',
          image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=400&q=80'
        }
      ],
      total: 990,
      totalCost: 390,
      paymentMethod: 'Kredi Kartı (Online 3D Secure)',
      status: 'Hazırlanıyor',
      trackingNo: 'YK-4819204921'
    },
    {
      id: 'AQ-849188',
      date: '15.09.2026 12:45',
      customerName: 'Zeynep Kaya',
      phone: '05443217790',
      email: 'zeynep.kaya@outlook.com',
      city: 'Ankara / Çankaya',
      address: 'Kavaklıdere Mah. Tunalı Hilmi Cad. No:112 Daire:4 Çankaya / Ankara',
      items: [
        {
          productId: 'prod-baslik-1',
          title: 'Aquaflow™ Hydro-Boost 3 Modlu Filtreli Duş Başlığı',
          variant: 'Krom Ayna',
          quantity: 1,
          price: 590,
          costPrice: 240,
          barcode: '869012345001',
          image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80'
        },
        {
          productId: 'prod-hortum-1',
          title: 'Aquaflow™ 2.0 Metre Kırılmaz Çelik Hortum',
          variant: 'Parlak Krom',
          quantity: 1,
          price: 250,
          costPrice: 95,
          barcode: '869012345004',
          image: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=400&q=80'
        }
      ],
      total: 840,
      totalCost: 335,
      paymentMethod: 'Kapıda Ödeme (Nakit/Kart)',
      status: 'İşleme Alındı',
      trackingNo: 'YK-7819204120'
    },
    {
      id: 'AQ-848950',
      date: '14.09.2026 18:10',
      customerName: 'Barış Demir',
      phone: '05558123456',
      email: 'baris.demir@hotmail.com',
      city: 'İzmir / Karşıyaka',
      address: 'Bostanlı Mah. Cemal Gürsel Cad. No:28 D:12 Karşıyaka / İzmir',
      items: [
        {
          productId: 'prod-fume-1',
          title: 'Aquaflow™ Füme Serisi Ağır Hizmet Vakumlu Döner Mafsal Askı',
          variant: 'Füme Antrasit',
          quantity: 1,
          price: 280,
          costPrice: 100,
          barcode: '869012345016',
          image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80'
        },
        {
          productId: 'prod-musluk-1',
          title: 'Aquaflow™ 1080° Robot Kol Döner Başlıklı Musluk Ucu',
          variant: 'Mat Siyah',
          quantity: 1,
          price: 340,
          costPrice: 130,
          barcode: '869012345008',
          image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80'
        }
      ],
      total: 620,
      totalCost: 230,
      paymentMethod: 'Kredi Kartı (Online 3D Secure)',
      status: 'Kargoya Verildi',
      trackingNo: 'YK-9931827410'
    }
  ];

  // Kullanıcılar (Sistemde admin yetkisi otomatik doğrulanır)
  const defaultUsers = [
    {
      id: 'u-admin-1',
      name: 'İbrahim',
      email: 'ibrahimyesim10@gmail.com',
      password: hashPassword('1234'),
      phone: '05516889214',
      isPhoneVerified: true,
      role: 'admin'
    },
    {
      id: 'u-customer-1',
      name: 'Emre Karaca',
      email: 'emre.karaca@gmail.com',
      password: hashPassword('musteri123'),
      phone: '05324198210',
      isPhoneVerified: true,
      role: 'customer'
    }
  ];

  const STORAGE_KEYS = {
    PRODUCTS: 'AQUAFLOW_PRODUCTS_V5',
    ORDERS: 'AQUAFLOW_ORDERS_V5',
    USERS: 'AQUAFLOW_USERS_V5',
    SESSION: 'AQUAFLOW_SESSION_V5',
    RESET_CODES: 'AQUAFLOW_RESET_CODES_V5',
    PHONE_CODES: 'AQUAFLOW_PHONE_CODES_V5',
    NOTIFICATIONS: 'AQUAFLOW_NOTIFICATIONS_V5',
    COOKIE_CONSENT: 'AQUAFLOW_COOKIE_CONSENT'
  };

  function loadUsers() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      if (stored) {
        let parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
          const adminIdx = parsed.findIndex(u => u.email.toLowerCase() === 'ibrahimyesim10@gmail.com');
          if (adminIdx === -1) {
            parsed.unshift(defaultUsers[0]);
            saveUsers(parsed);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('LocalStorage users read error:', e);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
    return defaultUsers.slice();
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      return true;
    } catch (e) {
      console.error('LocalStorage users write error:', e);
      return false;
    }
  }

  function loadSession() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('LocalStorage session read error:', e);
    }
    return null;
  }

  function saveSession(session) {
    try {
      if (session) localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEYS.SESSION);
    } catch (e) {
      console.error('LocalStorage session write error:', e);
    }
  }

  function publicUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      isPhoneVerified: !!user.isPhoneVerified,
      role: user.role
    };
  }

  function enrichOrderItems(items, catalog) {
    const prods = catalog || loadProducts();
    return (items || []).map(it => {
      const match = prods.find(p => p.id === it.productId || p.title === it.title);
      const price = it.price || (match && match.price) || 0;
      const costPrice = it.costPrice || (match && match.costPrice) || Math.round(price * 0.45);
      const barcode = it.barcode || (match && match.barcode) || '';
      return {
        ...it,
        productId: it.productId || (match && match.id) || '',
        price,
        costPrice,
        barcode,
        image: it.image || (match && ((Array.isArray(match.images) && match.images[0]) || match.image)) || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80'
      };
    });
  }

  // ------------------------------------------------------------------
  // ÜRÜN DEPOLAMA KATMANI (IndexedDB)
  // ------------------------------------------------------------------
  // Ürünler her biri en fazla 8 fotoğraf + video (base64) içerebiliyor.
  // localStorage tüm origin için ~5-10MB ile sınırlı; birkaç fotoğraflı
  // ürün eklenince bu sınır dolup "QuotaExceededError" fırlatıyordu ama
  // hata sessizce yutulup arayüzde "başarıyla eklendi" gösterilmeye
  // devam ediyordu — bu yüzden 5-6 üründen sonra yeni ürünler kayboluyor
  // ve listede/gösterilmiyordu. IndexedDB'nin kotası çok daha büyük
  // olduğundan (genelde yüzlerce MB - GB), görsellerle birlikte 100+
  // ürünü rahatça saklar.
  const IDB_NAME = 'AQUAFLOW_DB';
  const IDB_VERSION = 1;
  const IDB_STORE = 'products';
  let idbConnPromise = null;

  function openIdb() {
    if (idbConnPromise) return idbConnPromise;
    idbConnPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('IndexedDB bu tarayıcıda desteklenmiyor')); return; }
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return idbConnPromise;
  }

  function idbGetAllProducts() {
    return openIdb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    }));
  }

  function idbReplaceAllProducts(products) {
    return openIdb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.clear();
      products.forEach(p => store.put(p));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }));
  }

  function normalizeProduct(p) {
    const defMatch = defaultProducts.find(dp => dp.id === p.id);
    return {
      ...p,
      barcode: p.barcode || (defMatch && defMatch.barcode) || '',
      price: Number(p.price) || 450,
      costPrice: Number(p.costPrice) || Math.round((Number(p.price) || 450) * 0.42)
    };
  }

  let productsCache = null;   // senkron okumalar için bellek içi önbellek
  let productsReadyPromise = null;

  function productsReady() {
    if (productsReadyPromise) return productsReadyPromise;
    productsReadyPromise = idbGetAllProducts().then(stored => {
      if (stored && stored.length) {
        productsCache = stored.map(normalizeProduct);
        return productsCache;
      }
      // Eski localStorage verisini (varsa) bir kereliğine IndexedDB'ye taşı
      let legacy = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        if (raw) legacy = JSON.parse(raw);
      } catch (e) { /* bozuk eski veriyi yok say */ }
      const initial = (Array.isArray(legacy) && legacy.length ? legacy : defaultProducts).map(normalizeProduct);
      productsCache = initial;
      return idbReplaceAllProducts(initial)
        .then(() => {
          try { localStorage.removeItem(STORAGE_KEYS.PRODUCTS); } catch (e) { /* yoksay */ }
          return productsCache;
        })
        .catch(() => productsCache);
    }).catch(err => {
      console.warn('IndexedDB ürün okuma hatası, varsayılan ürünler kullanılıyor:', err);
      productsCache = defaultProducts.slice();
      return productsCache;
    });
    return productsReadyPromise;
  }

  function loadProducts() {
    // Senkron API korunuyor: önbellek henüz hazır değilse geçici olarak
    // varsayılanları döndürür; productsReady() çözüldüğünde gerçek veriyle
    // güncellenir (bkz. app.js -> init()).
    return productsCache || defaultProducts.slice();
  }

  function saveProducts(products) {
    // Önbelleği hemen güncelle: arayüz IndexedDB yazması bitmeden de
    // yeni/güncellenmiş ürünü anında gösterir, "eklendi ama listede yok"
    // sorunu bu şekilde ortadan kalkar.
    productsCache = products;
    idbReplaceAllProducts(products)
      .then(() => { if (typeof window.AQUAFLOW_ON_SAVE_OK === 'function') window.AQUAFLOW_ON_SAVE_OK(); })
      .catch(err => {
        console.error('IndexedDB ürün yazma hatası:', err);
        if (typeof window.AQUAFLOW_ON_SAVE_ERROR === 'function') {
          window.AQUAFLOW_ON_SAVE_ERROR('Ürün kalıcı olarak kaydedilemedi (depolama hatası). Sayfa yenilenirse kaybolabilir; lütfen görsel/video boyutunu küçültüp tekrar deneyin.');
        }
      });
    return true;
  }

  function loadOrders() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        const catalog = loadProducts();
        return parsed.map(order => {
          const enriched = enrichOrderItems(order.items, catalog);
          const totalCost = enriched.reduce((sum, it) => sum + ((it.costPrice || 0) * (it.quantity || 1)), 0);
          return {
            ...order,
            total: Number(order.total) || 0,
            totalCost: order.totalCost || totalCost,
            items: enriched
          };
        });
      }
    } catch (e) {
      console.warn('LocalStorage orders read error:', e);
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(defaultOrders));
    return defaultOrders;
  }

  function saveOrders(orders) {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.error('LocalStorage orders write error:', e);
    }
  }

  // Master Global Export
  window.AQUAFLOW_DATA = {
    companyInfo: companyInfo,
    categories: categories,
    turkeyCities: turkeyCities,

    // Türkçe Şehir Arama Yardımcısı (Madde 3)
    searchCities(query) {
      const all = Object.keys(turkeyCities);
      if (!query || !query.trim()) return all;
      const normalize = (s) => String(s || '').toLocaleLowerCase('tr-TR')
        .replace(/i̇/g, 'i')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
      const nq = normalize(query.trim());
      
      const startsWith = [];
      const contains = [];

      all.forEach(city => {
        const nc = normalize(city);
        if (nc.startsWith(nq)) startsWith.push(city);
        else if (nc.includes(nq)) contains.push(city);
      });
      return [...startsWith, ...contains];
    },

    getDistricts(cityName) {
      if (!cityName) return [];
      return turkeyCities[cityName] || [];
    },

    searchDistricts(cityName, query) {
      const list = this.getDistricts(cityName);
      if (!query || !query.trim()) return list;
      const normalize = (s) => String(s || '').toLocaleLowerCase('tr-TR')
        .replace(/i̇/g, 'i')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
      const nq = normalize(query.trim());
      return list.filter(d => normalize(d).includes(nq));
    },

    getProducts: loadProducts,
    saveProducts: saveProducts,
    ready: productsReady,

    addProduct(newProd) {
      const prods = loadProducts();
      prods.unshift(newProd);
      saveProducts(prods);
      return prods;
    },

    updateProduct(updatedProd) {
      let prods = loadProducts();
      prods = prods.map(p => p.id === updatedProd.id ? updatedProd : p);
      saveProducts(prods);
      return prods;
    },

    deleteProduct(id) {
      let prods = loadProducts();
      prods = prods.filter(p => p.id !== id);
      saveProducts(prods);
      return prods;
    },

    toggleProductVisibility(id) {
      let prods = loadProducts();
      prods = prods.map(p => p.id === id ? { ...p, isVisible: !p.isVisible } : p);
      saveProducts(prods);
      return prods;
    },

    getOrders: loadOrders,
    saveOrders: saveOrders,

    // Müşterinin SADECE kendi siparişlerini getiren güvenli fonksiyon
    getCustomerOrders(customerEmail) {
      const all = loadOrders();
      if (!customerEmail) return [];
      const clean = String(customerEmail).trim().toLowerCase();
      return all.filter(o => String(o.email || '').trim().toLowerCase() === clean);
    },

    // Misafir Sipariş Takibi
    trackOrder(orderId, phoneOrEmail) {
      const all = loadOrders();
      if (!orderId) return null;
      const cleanId = String(orderId).trim().toUpperCase();
      const cleanContact = String(phoneOrEmail || '').trim().toLowerCase().replace(/\s+/g, '');

      return all.find(o => {
        const idMatch = String(o.id).toUpperCase() === cleanId;
        const phoneClean = String(o.phone || '').replace(/\s+/g, '').toLowerCase();
        const emailClean = String(o.email || '').toLowerCase();
        return idMatch && (cleanContact === '' || phoneClean.includes(cleanContact) || emailClean.includes(cleanContact));
      }) || null;
    },

    addOrder(order) {
      const orders = loadOrders();
      orders.unshift(order);
      saveOrders(orders);
      return orders;
    },

    updateOrderStatus(orderId, newStatus, trackingNo) {
      let orders = loadOrders();
      orders = orders.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            status: newStatus,
            trackingNo: trackingNo !== undefined ? trackingNo : o.trackingNo
          };
        }
        return o;
      });
      saveOrders(orders);
      return orders;
    },

    orderStatuses: ['İşleme Alındı', 'Hazırlanıyor', 'Kargoya Verildi', 'Teslim Edildi'],

    // Maliyet ve Kâr Analitiği
    getFinancialAnalytics() {
      const orders = loadOrders();
      const products = loadProducts();

      let totalRevenue = 0;
      let totalCost = 0;
      let totalOrders = orders.length;

      orders.forEach(ord => {
        totalRevenue += ord.total || 0;
        let ordCost = ord.totalCost || 0;
        if (!ordCost && Array.isArray(ord.items)) {
          ord.items.forEach(it => {
            const p = products.find(x => x.id === it.productId);
            const unitCost = it.costPrice || (p && p.costPrice) || Math.round((it.price || 0) * 0.45);
            ordCost += unitCost * (it.quantity || 1);
          });
        }
        totalCost += ordCost;
      });

      const netProfit = Math.max(0, totalRevenue - totalCost);
      const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
      const averageOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

      const productSales = {};
      orders.forEach(ord => {
        (ord.items || []).forEach(it => {
          const pid = it.productId || it.title;
          if (!productSales[pid]) {
            productSales[pid] = {
              title: it.title,
              image: it.image,
              barcode: it.barcode || '',
              quantity: 0,
              revenue: 0,
              cost: 0,
              profit: 0
            };
          }
          const q = it.quantity || 1;
          const rev = (it.price || 0) * q;
          const cst = (it.costPrice || Math.round((it.price || 0) * 0.45)) * q;
          productSales[pid].quantity += q;
          productSales[pid].revenue += rev;
          productSales[pid].cost += cst;
          productSales[pid].profit += (rev - cst);
        });
      });

      const topProducts = Object.values(productSales).sort((a, b) => b.profit - a.profit);

      return {
        totalRevenue,
        totalCost,
        netProfit,
        profitMargin,
        totalOrders,
        averageOrder,
        topProducts
      };
    },

    getSession: loadSession,

    isAdmin() {
      const session = loadSession();
      return !!(session && session.role === 'admin');
    },

    // Kullanıcı Girişi (Sistem admin olup olmadığını otomatik tespit eder)
    login(email, password) {
      const users = loadUsers();
      const cleanEmail = String(email || '').trim().toLowerCase();
      const user = users.find(u => u.email.toLowerCase() === cleanEmail && checkPassword(password, u.password));
      if (!user) return null;
      const session = publicUser(user);
      saveSession(session);
      return session;
    },

    loginWithEmailQuick(email) {
      const users = loadUsers();
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return { error: 'Lütfen geçerli bir e-posta adresi girin.' };
      }
      let user = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        user = {
          id: 'u-e-' + Date.now(),
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          password: 'quick-login-session',
          phone: '',
          isPhoneVerified: false,
          role: 'customer'
        };
        users.push(user);
        saveUsers(users);
      }
      const session = publicUser(user);
      saveSession(session);
      return { session };
    },

    // Kayıt öncesi yerel kontroller (e-posta kodu istenmeden önce çalışır)
    checkRegistration(email, password, phone) {
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPhone = String(phone || '').replace(/\D/g, '').slice(0, 11);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
        return { error: 'Lütfen geçerli bir e-posta adresi girin.' };
      }
      if (cleanPhone.length !== 11) {
        return { error: 'Telefon numarası 11 haneli olmalıdır (örn: 05321234567).' };
      }
      if (String(password || '').length < 6) {
        return { error: 'Şifre en az 6 karakter olmalıdır.' };
      }
      if (loadUsers().some(u => u.email.toLowerCase() === cleanEmail)) {
        return { error: 'Bu e-posta adresi zaten kayıtlı!' };
      }
      return { success: true };
    },

    // Kayıt Fonksiyonu: yalnızca sunucuda e-posta kodu doğrulandıktan sonra çağrılır
    register(name, email, password, phone, emailVerified) {
      const users = loadUsers();
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPhone = String(phone || '').replace(/\D/g, '').slice(0, 11);

      if (!emailVerified) {
        return { error: 'E-posta adresi doğrulanmadan kayıt tamamlanamaz.' };
      }

      if (cleanPhone.length !== 11) {
        return { error: 'Telefon numarası 11 haneli olmalıdır (örn: 05321234567).' };
      }

      if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
        return { error: 'Bu e-posta adresi zaten kayıtlı!' };
      }

      const user = {
        id: 'u-' + Date.now(),
        name: String(name || '').trim() || cleanEmail.split('@')[0] || 'Müşteri',
        email: cleanEmail,
        password: hashPassword(password || '123456'),
        phone: cleanPhone,
        isPhoneVerified: true,
        isEmailVerified: true,
        role: 'customer',
        createdAt: new Date().toLocaleDateString('tr-TR')
      };
      users.push(user);
      saveUsers(users);
      const session = publicUser(user);
      saveSession(session);
      return { session };
    },

    // 6 Haneli SMS Doğrulama Kodu Üretici (Madde 2)
    sendPhoneVerificationCode(phone) {
      const cleanPhone = String(phone || '').replace(/\D/g, '').slice(0, 11);
      if (cleanPhone.length !== 11) {
        return { error: 'Lütfen geçerli 11 haneli telefon numarası giriniz (Örn: 05xxxxxxxxx)' };
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const payload = {
        phone: cleanPhone,
        code: code,
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 dakika geçerli
        message: `[AQUAFLOW] Tek kullanımlık SMS onay kodunuz: ${code}. Lütfen bu kodu kimseyle paylaşmayınız.`
      };

      try {
        localStorage.setItem(STORAGE_KEYS.PHONE_CODES + '_' + cleanPhone, JSON.stringify(payload));
      } catch (e) {}

      return {
        success: true,
        phone: cleanPhone,
        code: code,
        message: payload.message
      };
    },

    verifyPhoneCode(phone, code) {
      const cleanPhone = String(phone || '').replace(/\D/g, '').slice(0, 11);
      const cleanCode = String(code || '').trim();

      if (!cleanCode) return { error: 'Lütfen 6 haneli doğrulama kodunu girin.' };

      let payload = null;
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.PHONE_CODES + '_' + cleanPhone);
        if (stored) payload = JSON.parse(stored);
      } catch (e) {}

      if (!payload || payload.phone !== cleanPhone || payload.code !== cleanCode) {
        return { error: 'Girdiğiniz 6 haneli SMS doğrulama kodu hatalı!' };
      }

      if (Date.now() > payload.expiresAt) {
        return { error: 'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.' };
      }

      // Başarılı doğrulama
      return { success: true, phone: cleanPhone };
    },

    // Sipariş Sonrası E-Posta ve SMS Bildirimi Gönderim Motoru (Madde 4)
    dispatchOrderNotifications(order) {
      const trackingNumber = order.trackingNo || ('YK-' + Math.floor(1000000000 + Math.random() * 9000000000));
      const emailPayload = {
        to: order.email,
        customerName: order.customerName,
        orderId: order.id,
        trackingNo: trackingNumber,
        total: order.total,
        subject: `Aquaflow Siparişiniz Alındı - #${order.id}`,
        body: `Sayın ${order.customerName}, #${order.id} numaralı siparişiniz başarıyla onaylandı. Kargo takip numaranız: ${trackingNumber}. Siparişiniz Yurtiçi Kargo güvencesiyle 1-3 iş gününde adresinize teslim edilecektir.`,
        sentAt: new Date().toLocaleTimeString('tr-TR')
      };

      const smsPayload = {
        to: order.phone,
        message: `Aquaflow: Sayın ${order.customerName}, #${order.id} nolu siparişiniz alındı. Kargo takip no: ${trackingNumber}. Takip linki: https://kargo.aquaflow.com.tr?kod=${trackingNumber}`,
        sentAt: new Date().toLocaleTimeString('tr-TR')
      };

      try {
        const notifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
        notifs.unshift({ orderId: order.id, email: emailPayload, sms: smsPayload, timestamp: Date.now() });
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs.slice(0, 50)));
      } catch (e) {}

      return {
        email: emailPayload,
        sms: smsPayload
      };
    },

    // Şifre sıfırlama: kod artık sunucuda üretilip e-posta ile gider
    sendPasswordResetCode(email) {
      const users = loadUsers();
      const cleanEmail = String(email || '').trim().toLowerCase();
      const user = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        return { error: 'Bu e-posta adresine ait bir hesap bulunamadı.' };
      }
      return {
        success: true,
        email: cleanEmail,
        userName: user.name
      };
    },

    applyPasswordReset(email, newPassword) {
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!newPassword || newPassword.length < 4) {
        return { error: 'Yeni şifre en az 4 karakter olmalıdır.' };
      }
      let users = loadUsers();
      const userIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
      if (userIndex === -1) {
        return { error: 'Kullanıcı bulunamadı.' };
      }
      users[userIndex].password = hashPassword(String(newPassword));
      saveUsers(users);
      try { localStorage.removeItem(STORAGE_KEYS.RESET_CODES); } catch (e) {}
      return { success: true };
    },

    verifyAndResetPassword(email, code, newPassword) {
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanCode = String(code || '').trim();

      if (!newPassword || newPassword.length < 4) {
        return { error: 'Yeni şifre en az 4 karakter olmalıdır.' };
      }

      let resetData = null;
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.RESET_CODES);
        if (stored) resetData = JSON.parse(stored);
      } catch (e) {}

      if (!resetData || resetData.email !== cleanEmail || resetData.code !== cleanCode) {
        return { error: 'Girdiğiniz 6 haneli güvenlik kodu hatalı!' };
      }

      if (Date.now() > resetData.expiresAt) {
        return { error: 'Güvenlik kodunun süresi dolmuş. Lütfen yeni kod isteyin.' };
      }

      return this.applyPasswordReset(cleanEmail, newPassword);
    },

    logout() {
      saveSession(null);
    },

    getUsers: loadUsers,

    addUser(newUser) {
      const users = loadUsers();
      const cleanEmail = String(newUser.email || '').trim().toLowerCase();
      if (!cleanEmail) return { error: 'E-posta adresi zorunludur.' };
      if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
        return { error: 'Bu e-posta adresi zaten kayıtlı!' };
      }
      const user = {
        id: 'u-' + Date.now(),
        name: String(newUser.name || '').trim() || 'Kullanıcı',
        email: cleanEmail,
        password: hashPassword(String(newUser.password || '').trim() || '123456'),
        phone: String(newUser.phone || '').replace(/\D/g, '').slice(0, 11),
        isPhoneVerified: true,
        role: newUser.role === 'admin' ? 'admin' : 'customer',
        createdAt: new Date().toLocaleDateString('tr-TR')
      };
      users.push(user);
      saveUsers(users);
      return { user };
    },

    deleteUser(id) {
      let users = loadUsers();
      const target = users.find(u => u.id === id);
      if (!target) return { error: 'Kullanıcı bulunamadı.' };
      if (target.email.toLowerCase() === 'ibrahimyesim10@gmail.com') {
        return { error: 'Ana yönetici hesabı silinemez!' };
      }
      users = users.filter(u => u.id !== id);
      saveUsers(users);
      return { success: true };
    },

    getCookieConsent() {
      return localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT) === 'true';
    },

    setCookieConsent() {
      localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, 'true');
    }
  };
})();