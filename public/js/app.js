/**
 * DAUDSONS ARMOURY (PVT.) LTD. — ENTERPRISE CLIENT APPLICATION
 * Peshawar, Pakistan — Established 1953
 * Full-stack integration connecting client views directly to Express / SQLite API.
 */

class DsaApp {
  constructor() {
    this.cart = this.loadCart();
    this.products = [];
    this.shopItems = [];
    this.dealers = [];
    this.news = [];
    this.downloads = [];
    this.faqs = [];

    this.homeTabFilter = 'all';
    this.homeVisibleCount = 6;
    this.catalogDivFilter = 'all';
    this.shopCatFilter = 'all';
  }

  // Safe Cart Persistence
  loadCart() {
    try {
      const raw = localStorage.getItem('DSA_CART_V2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveCart() {
    try {
      localStorage.setItem('DSA_CART_V2', JSON.stringify(this.cart));
      this.renderCartUI();
    } catch (err) {
      console.warn('Failed to save cart to localStorage:', err);
    }
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'dsa-toast';
    const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="${type === 'success' ? 'text-[#C8A24A]' : type === 'error' ? 'text-[#E4572E]' : 'text-theme-primary'} font-bold">${icon}</span>
        <span>${message}</span>
      </div>
      <button type="button" class="text-xs text-theme-steel hover:text-white" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4500);
  }

  acceptCookies() {
    try {
      localStorage.setItem("DSA_COOKIE_CONSENT", "true");
    } catch (e) {
      console.warn("localStorage notice:", e);
    }
    const banner = document.getElementById("cookieBanner");
    if (banner) {
      banner.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      banner.style.opacity = "0";
      banner.style.transform = "translateY(16px)";
      setTimeout(() => {
        banner.style.display = "none";
        if (banner.parentElement) banner.remove();
      }, 260);
    }
    this.showToast("Compliance preferences accepted", "success");
  }

  async init() {
    // Check cookie consent early
    try {
      if (localStorage.getItem("DSA_COOKIE_CONSENT") === "true") {
        const cb = document.getElementById("cookieBanner");
        if (cb) cb.style.display = "none";
      }
    } catch (e) {}

    // 1. Preloader Year Counter 1953 -> 2026
    const preloader = document.getElementById("preloaderOverlay");
    const yearEl = document.getElementById("preloaderYear");
    const barEl = document.getElementById("preloaderBar");
    if (preloader) {
      const dismissPreloader = () => {
        preloader.classList.add("opacity-0", "pointer-events-none", "hide-preloader");
        setTimeout(() => { preloader.style.display = "none"; }, 350);
      };

      if (yearEl && barEl) {
        let currentYear = 1953;
        const timer = setInterval(() => {
          currentYear += 4;
          if (currentYear >= 2026) {
            currentYear = 2026;
            clearInterval(timer);
            setTimeout(dismissPreloader, 200);
          }
          yearEl.textContent = currentYear;
          barEl.style.width = (((currentYear - 1953) / (2026 - 1953)) * 100) + "%";
        }, 20);

        const skipBtn = document.getElementById("skipPreloaderBtn");
        if (skipBtn) {
          skipBtn.addEventListener("click", () => {
            clearInterval(timer);
            dismissPreloader();
          });
        }

        // Safety fallback: ensure preloader is dismissed after 2.2 seconds max
        setTimeout(() => {
          clearInterval(timer);
          dismissPreloader();
        }, 2200);
      } else {
        dismissPreloader();
      }
    }

    // 2. Fetch Initial Catalog & Data in parallel from REST API
    try {
      const [prods, shop, dlrs, nws, dls, fqs] = await Promise.all([
        window.dsaApi.getProducts(),
        window.dsaApi.getShopItems(),
        window.dsaApi.getDealers(),
        window.dsaApi.getNews(),
        window.dsaApi.getDownloads(),
        window.dsaApi.getFaqs()
      ]);

      this.products = prods || [];
      this.shopItems = shop || [];
      this.dealers = dlrs || [];
      this.news = nws || [];
      this.downloads = dls || [];
      this.faqs = fqs || [];

      // Render initial sections
      this.renderHomeCatalog();
      this.renderFullCatalog();
      this.renderShop();
      this.renderCartUI();
      this.renderDealersDirectory();
      this.renderFAQ();
      this.renderNewsAndDownloads();

      // Initialize Interactive Modules
      try {
        if (typeof window.initPakistanMap === "function") {
          window.initPakistanMap(this.dealers);
        }
      } catch (e) {
        console.warn("Map init notice:", e);
      }

      try {
        if (typeof window.initTrushot3DViewer === "function") {
          window.initTrushot3DViewer();
        }
      } catch (e) {
        console.warn("3D viewer notice:", e);
      }

      try {
        if (typeof window.initMantisSimulator === "function") {
          window.initMantisSimulator();
        }
      } catch (e) {
        console.warn("Mantis simulator notice:", e);
      }

      // Apply dynamic sections and check auth status
      try {
        await this.applyLiveSections();
      } catch (e) {
        console.warn("Live sections notice:", e);
      }

      try {
        await this.checkAuthStatus();
      } catch (e) {
        // not logged in
      }
    } catch (err) {
      console.error("Initialization error:", err);
      console.info("Application initialized with resilient catalog fallback:", err.message);
    }

    // 3. Setup Listeners
    this.setupEventListeners();

    // 4. Initialize Client Router
    if (window.dsaRouter) {
      window.dsaRouter.init();
    }
  }

  setupEventListeners() {
    // Theme Toggle
    const themeBtn = document.getElementById("themeToggleBtn");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const html = document.documentElement;
        const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
        html.setAttribute("data-theme", next);
        const icon = document.getElementById("themeIcon");
        const label = document.getElementById("themeLabel");
        if (icon) icon.textContent = next === "dark" ? "☀️" : "🌙";
        if (label) label.textContent = next === "dark" ? "LIGHT" : "DARK";
      });
    }

    // Mobile Menu Toggle
    const mobileBtn = document.getElementById("mobileMenuToggleBtn");
    const mobileMenu = document.getElementById("mobileMegaMenu");
    if (mobileBtn && mobileMenu) {
      mobileBtn.addEventListener("click", () => {
        mobileMenu.classList.toggle("hidden");
      });
    }

    // Home Catalog Division Tabs
    document.querySelectorAll(".home-cat-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        this.homeTabFilter = tab.getAttribute("data-home-tab") || "all";
        this.homeVisibleCount = 6;
        document.querySelectorAll(".home-cat-tab").forEach(t => {
          t.className = "home-cat-tab px-4 py-2 font-mono-tech text-xs uppercase border border-theme-brass bg-theme-surface hover:border-[#C8A24A]";
        });
        tab.className = "home-cat-tab px-4 py-2 font-mono-tech text-xs uppercase border border-theme-brass bg-[#C8A24A] text-[#0A0B0D] font-bold";
        this.renderHomeCatalog();
      });
    });

    // Home Load More
    const homeLoadMore = document.getElementById("homeLoadMoreBtn");
    if (homeLoadMore) {
      homeLoadMore.addEventListener("click", () => {
        this.homeVisibleCount += 6;
        this.renderHomeCatalog();
      });
    }

    // Full Catalog Filters
    const catSearch = document.getElementById("catalogSearchInput");
    if (catSearch) {
      catSearch.addEventListener("input", () => this.renderFullCatalog());
    }

    const catSort = document.getElementById("catalogSortSelect");
    if (catSort) {
      catSort.addEventListener("change", () => this.renderFullCatalog());
    }

    document.querySelectorAll(".cat-div-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.catalogDivFilter = btn.getAttribute("data-cat-div") || "all";
        this.setCatalogDivision(this.catalogDivFilter);
        this.renderFullCatalog();
      });
    });

    // Shop Category Buttons
    document.querySelectorAll(".shop-cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.shopCatFilter = btn.getAttribute("data-shop-cat") || "all";
        document.querySelectorAll(".shop-cat-btn").forEach(b => {
          b.className = "shop-cat-btn px-4 py-2 font-mono-tech text-xs uppercase bg-theme-surface border border-theme-brass";
        });
        btn.className = "shop-cat-btn px-4 py-2 font-mono-tech text-xs uppercase bg-[#C8A24A] text-[#0A0B0D] font-bold";
        this.renderShop();
      });
    });

    // Mini Cart Drawer
    const drawer = document.getElementById("miniCartDrawerBackdrop");
    const openCartBtn = document.getElementById("openCartDrawerBtn");
    const closeCartBtn = document.getElementById("closeCartDrawerBtn");
    const drawerCartBtn = document.getElementById("drawerGoToCartBtn");
    const drawerChkBtn = document.getElementById("drawerGoToCheckoutBtn");

    if (openCartBtn && drawer) {
      openCartBtn.addEventListener("click", () => {
        drawer.classList.remove("hidden");
        drawer.classList.add("flex");
        this.renderCartUI();
      });
    }
    if (closeCartBtn && drawer) {
      closeCartBtn.addEventListener("click", () => {
        drawer.classList.add("hidden");
        drawer.classList.remove("flex");
      });
    }
    if (drawerCartBtn && drawer) {
      drawerCartBtn.addEventListener("click", () => {
        drawer.classList.add("hidden");
        drawer.classList.remove("flex");
        window.dsaRouter.navigate("cart");
      });
    }
    if (drawerChkBtn && drawer) {
      drawerChkBtn.addEventListener("click", () => {
        drawer.classList.add("hidden");
        drawer.classList.remove("flex");
        window.dsaRouter.navigate("checkout");
      });
    }

    // Checkout Order Form
    const chkForm = document.getElementById("checkoutOrderForm");
    if (chkForm) {
      chkForm.addEventListener("submit", async e => {
        e.preventDefault();
        await this.handleOrderSubmit(e.target);
      });
    }

    // Main Contact & RFQ Form
    const cntForm = document.getElementById("mainContactForm");
    if (cntForm) {
      cntForm.addEventListener("submit", async e => {
        e.preventDefault();
        await this.handleContactSubmit(e.target);
      });
    }

    // Dealership Application Form
    const dlrForm = document.getElementById("dealerApplicationForm");
    if (dlrForm) {
      dlrForm.addEventListener("submit", async e => {
        e.preventDefault();
        await this.handleDealerAppSubmit(e.target);
      });
    }

    // FAQ & Dealer Search inputs
    const faqSearch = document.getElementById("faqSearchInput");
    if (faqSearch) {
      faqSearch.addEventListener("input", e => this.renderFAQ(e.target.value));
    }
    const dlrSearch = document.getElementById("dealerSearchInput");
    if (dlrSearch) {
      dlrSearch.addEventListener("input", e => this.renderDealersDirectory(e.target.value));
    }

    // Admin Panel Tab Switcher
    document.querySelectorAll(".adm-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-adm-tab");
        document.querySelectorAll(".adm-panel").forEach(p => p.classList.add("hidden"));
        const panel = document.getElementById("adm-panel-" + target);
        if (panel) panel.classList.remove("hidden");
        document.querySelectorAll(".adm-tab-btn").forEach(b => {
          b.className = "adm-tab-btn px-4 py-2.5 bg-theme-surface border border-theme-brass uppercase text-xs font-mono-tech";
        });
        btn.className = "adm-tab-btn px-4 py-2.5 bg-[#C8A24A] text-[#0A0B0D] font-bold uppercase text-xs font-mono-tech";
      });
    });

    // Admin Add Product Form
    const addProdForm = document.getElementById("admAddProductForm");
    if (addProdForm) {
      addProdForm.addEventListener("submit", async e => {
        e.preventDefault();
        await this.handleAdminAddProduct(e.target);
      });
    }

    // Admin Add Dealer Form
    const addDlrForm = document.getElementById("admAddDealerForm");
    if (addDlrForm) {
      addDlrForm.addEventListener("submit", async e => {
        e.preventDefault();
        await this.handleAdminAddDealer(e.target);
      });
    }

    // Admin Staff Login Form
    const loginForm = document.getElementById("admLoginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async e => {
        e.preventDefault();
        const email = document.getElementById("admLoginEmail").value.trim();
        const password = document.getElementById("admLoginPassword").value;
        const totpCode = document.getElementById("admLoginTotp") ? document.getElementById("admLoginTotp").value.trim() : null;
        await this.handleLogin(email, password, totpCode);
      });
    }

    // Admin Logout Button
    const logoutBtn = document.getElementById("admLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await this.handleLogout();
      });
    }

    // Admin Site Settings Form
    const settingsForm = document.getElementById("admSiteSettingsForm");
    if (settingsForm) {
      settingsForm.addEventListener("submit", async e => {
        e.preventDefault();
        const formData = new FormData(settingsForm);
        const payload = {};
        for (const [k, v] of formData.entries()) {
          payload[k] = v;
        }
        payload.announcement_active = document.getElementById("setAnnouncementActive")?.checked ? "true" : "false";
        payload.maintenance_mode = document.getElementById("setMaintenanceMode")?.checked ? "true" : "false";
        await this.handleUpdateSettings(payload);
      });
    }

    // Admin Add User Form
    const addUserForm = document.getElementById("admAddUserForm");
    if (addUserForm) {
      addUserForm.addEventListener("submit", async e => {
        e.preventDefault();
        const payload = {
          name: document.getElementById("admUserName").value.trim(),
          email: document.getElementById("admUserEmail").value.trim(),
          role: document.getElementById("admUserRole").value,
          password: document.getElementById("admUserPass").value
        };
        await this.handleCreateUser(payload);
      });
    }

    // Admin 2FA Setup & Verify Buttons
    const init2faBtn = document.getElementById("admInit2faBtn");
    if (init2faBtn) {
      init2faBtn.addEventListener("click", async () => {
        await this.handleInit2FA();
      });
    }
    const verify2faBtn = document.getElementById("admVerify2faBtn");
    if (verify2faBtn) {
      verify2faBtn.addEventListener("click", async () => {
        const token = document.getElementById("adm2faTokenInput").value.trim();
        await this.handleVerify2FA(token);
      });
    }

    // Admin Change Password Form
    const passForm = document.getElementById("admChangePasswordForm");
    if (passForm) {
      passForm.addEventListener("submit", async e => {
        e.preventDefault();
        const curr = document.getElementById("admCurrentPass").value;
        const newP = document.getElementById("admNewPass").value;
        const conf = document.getElementById("admNewPassConfirm").value;
        if (newP !== conf) {
          this.showToast("New passwords do not match", "error");
          return;
        }
        await this.handleChangePassword(curr, newP);
      });
    }

    // Admin Refresh Audit Trail Button
    const refAuditBtn = document.getElementById("admRefreshAuditBtn");
    if (refAuditBtn) {
      refAuditBtn.addEventListener("click", async () => {
        await this.loadAuditLogs();
        this.showToast("Audit trail refreshed", "info");
      });
    }

    // Admin Reset DB Button
    const resetDbBtn = document.getElementById("adminResetDbBtn");
    if (resetDbBtn) {
      resetDbBtn.addEventListener("click", async () => {
        if (!confirm("Reset database to official Daudsons catalog seed data?")) return;
        try {
          await window.dsaApi.resetDatabase();
          this.showToast("Database reset to factory default seed data", "success");
          await this.refreshCatalogData();
          this.loadAdminData();
        } catch (err) {
          this.showToast(err.message, "error");
        }
      });
    }

    // Admin Export DB Button
    const exportDbBtn = document.getElementById("adminExportDbBtn");
    if (exportDbBtn) {
      exportDbBtn.addEventListener("click", () => {
        window.open(window.dsaApi.getExportDbUrl(), '_blank');
      });
    }

    // Admin Edit Product Form
    const editProdForm = document.getElementById("admEditProductForm");
    if (editProdForm) {
      editProdForm.addEventListener("submit", async e => {
        e.preventDefault();
        const id = document.getElementById("editProdId").value;
        const updates = {
          name: document.getElementById("editProdName").value.trim(),
          division: document.getElementById("editProdDiv").value,
          requiresLicense: document.getElementById("editProdLic").value === "true",
          category: document.getElementById("editProdCat").value.trim(),
          image: document.getElementById("editProdImg").value.trim(),
          shortDesc: document.getElementById("editProdDesc").value.trim(),
          needsVerification: document.getElementById("editProdNeedsVerif").checked
        };

        try {
          await window.dsaApi.updateProduct(id, updates);
          this.showToast(`Updated specifications for ${updates.name}!`, "success");
          document.getElementById("admEditProductModal").classList.add("hidden");
          await this.refreshCatalogData();
          this.loadAdminData();
        } catch (err) {
          this.showToast(err.message, "error");
        }
      });
    }

    // Admin Add News Form
    const addNewsForm = document.getElementById("admAddNewsForm");
    if (addNewsForm) {
      addNewsForm.addEventListener("submit", async e => {
        e.preventDefault();
        const title = document.getElementById("admNewsTitle").value.trim();
        const date_str = document.getElementById("admNewsDate").value.trim();
        const desc = document.getElementById("admNewsDesc").value.trim();

        try {
          await window.dsaApi.createNews({
            title,
            date_str,
            desc,
            tags: ["Defense News", "Peshawar Manufacturing"]
          });
          this.showToast("News article published live!", "success");
          addNewsForm.reset();
          await this.loadNewsAdmin();
        } catch (err) {
          this.showToast(err.message, "error");
        }
      });
    }

    // Admin Upload Media Form
    const uploadMediaForm = document.getElementById("admUploadMediaForm");
    if (uploadMediaForm) {
      uploadMediaForm.addEventListener("submit", async e => {
        e.preventDefault();
        const fileInput = document.getElementById("admMediaFile");
        const altInput = document.getElementById("admMediaAlt");
        if (!fileInput.files || fileInput.files.length === 0) {
          this.showToast("Please choose a file to upload", "error");
          return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            await window.dsaApi.uploadMedia(file.name, file.type, reader.result, altInput.value.trim());
            this.showToast(`Uploaded ${file.name} to media library!`, "success");
            uploadMediaForm.reset();
            await this.loadMediaAdmin();
          } catch (err) {
            this.showToast(err.message, "error");
          }
        };
        reader.readAsDataURL(file);
      });
    }

    // Cookie Banner Accept Button
    const acceptCookiesBtn = document.getElementById("acceptCookiesBtn");
    if (acceptCookiesBtn) {
      acceptCookiesBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.acceptCookies();
      });
    }

    // Scroll Back to Top Button
    const backToTopBtn = document.getElementById("backToTopBtn");
    if (backToTopBtn) {
      backToTopBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Global ESC key listener to dismiss active modals & drawers
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const prodModal = document.getElementById("admEditProductModal");
        if (prodModal) prodModal.classList.add("hidden");
        const cartDrawer = document.getElementById("miniCartDrawerBackdrop");
        if (cartDrawer) {
          cartDrawer.classList.add("hidden");
          cartDrawer.classList.remove("flex");
        }
      }
    });

    // Admin API Explorer runner button
    const admTestApiBtn = document.getElementById("admTestApiGetBtn");
    if (admTestApiBtn) {
      admTestApiBtn.addEventListener("click", async () => {
        const consoleEl = document.getElementById("admApiLogConsole");
        if (!consoleEl) return;
        try {
          const res = await fetch("/api/stats");
          const data = await res.json();
          consoleEl.innerHTML = `<div class="p-2 bg-green-950/60 border border-green-500/40 text-green-300 font-mono text-[11px] mb-2">✓ HTTP 200 GET /api/stats (OK)</div><pre class="text-[10px] text-theme-steel overflow-x-auto">${JSON.stringify(data, null, 2)}</pre>` + consoleEl.innerHTML;
        } catch (err) {
          consoleEl.innerHTML = `<div class="p-2 bg-red-950/60 border border-red-500/40 text-red-300 font-mono text-[11px] mb-2">✗ Error GET /api/stats: ${err.message}</div>` + consoleEl.innerHTML;
        }
      });
    }
  }

  // -------------------------------------------------------------
  // CATALOG & PRODUCTS RENDERING
  // -------------------------------------------------------------
  setCatalogDivision(divKey) {
    this.catalogDivFilter = divKey;
    const titles = {
      all: ["MASTER PRODUCT & CAPABILITY CATALOG • 30 SYSTEMS", "All Divisions & Products"],
      firearms: ["02 // FIREARMS DIVISION • MADE IN PESHAWAR", "Firearms Division (9mm, 30 Bore, 12-GA & .223)"],
      defense: ["01 // DEFENSE DIVISION • ARMED FORCES VENDOR", "Defense Equipment & Ordnance Hardware"],
      aerospace: ["03 // AEROSPACE DIVISION • AS9100 REV D CERTIFIED", "Aerospace Assemblies & Flight-Critical Parts"],
      engineering: ["04 // PRECISION ENGINEERING • ISO 9001 & 14001", "Machining, Grinding, Honing, Forging & Welding"]
    };
    const pair = titles[divKey] || titles.all;
    const eyebrow = document.getElementById("catalogDivisionEyebrow");
    const title = document.getElementById("catalogPageTitle");
    if (eyebrow) eyebrow.textContent = pair[0];
    if (title) title.textContent = pair[1];

    document.querySelectorAll(".cat-div-btn").forEach(b => {
      const isCurrent = b.getAttribute("data-cat-div") === divKey;
      b.className = isCurrent
        ? "cat-div-btn px-4 py-2 font-mono-tech text-xs uppercase bg-[#C8A24A] text-[#0A0B0D] font-bold border border-[#C8A24A]"
        : "cat-div-btn px-4 py-2 font-mono-tech text-xs uppercase bg-theme-surface border border-theme-brass text-theme-steel hover:border-[#C8A24A]";
    });
  }

  renderHomeCatalog() {
    const grid = document.getElementById("homeCatalogGrid");
    if (!grid) return;

    let filtered = this.products;
    if (this.homeTabFilter !== 'all') {
      filtered = filtered.filter(p => p.division === this.homeTabFilter);
    }

    const visible = filtered.slice(0, this.homeVisibleCount);
    grid.innerHTML = visible.map(p => this.createProductCardHTML(p)).join("");

    const loadMoreBtn = document.getElementById("homeLoadMoreBtn");
    if (loadMoreBtn) {
      loadMoreBtn.classList.toggle("hidden", visible.length >= filtered.length);
    }
  }

  renderFullCatalog() {
    const grid = document.getElementById("fullCatalogGrid");
    if (!grid) return;

    const searchTerm = (document.getElementById("catalogSearchInput")?.value || "").toLowerCase().trim();
    const sortVal = document.getElementById("catalogSortSelect")?.value || "default";

    let filtered = [...this.products];

    if (this.catalogDivFilter !== "all") {
      filtered = filtered.filter(p => p.division === this.catalogDivFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        (p.short_desc || p.shortDesc || p.desc || "").toLowerCase().includes(searchTerm) ||
        p.category.toLowerCase().includes(searchTerm)
      );
    }

    if (sortVal === "name-asc") filtered.sort((a, b) => a.name.localeCompare(b.name));
    if (sortVal === "name-desc") filtered.sort((a, b) => b.name.localeCompare(a.name));

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full p-12 text-center border border-theme-muted bg-theme-surface space-y-3 font-mono-tech">
          <p class="text-theme-brass text-sm">NO SYSTEMS FOUND MATCHING QUERY</p>
          <p class="text-xs text-theme-steel">Try adjusting search keywords or selecting "All Divisions".</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => this.createProductCardHTML(p)).join("");
  }

  createProductCardHTML(p) {
    const isFirearm = p.requiresLicense;
    const badgeColor = isFirearm ? "bg-[#E4572E] text-white" : "bg-[#C8A24A] text-[#0A0B0D]";
    const badgeText = isFirearm ? "REQUIRES ARMS LICENSE" : "COMMERCIAL / INDUSTRIAL";

    return `
      <div class="bg-theme-surface border border-theme-brass p-5 flex flex-col justify-between group hover:border-[#C8A24A] transition-all">
        <div class="space-y-4">
          <div class="relative overflow-hidden bg-theme-surface-2 h-52 flex items-center justify-center p-3 border border-theme-muted">
            <img src="${p.image}" alt="${p.name}" class="max-h-full max-w-full object-contain filter contrast-105 group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            <span class="absolute top-2 left-2 px-2 py-0.5 font-mono-tech text-[10px] uppercase font-bold tracking-wider ${badgeColor}">
              ${badgeText}
            </span>
            <span class="absolute bottom-2 right-2 px-2 py-0.5 font-mono-tech text-[10px] uppercase bg-[#0A0B0D]/80 text-theme-steel border border-theme-muted">
              DIV: ${p.division.toUpperCase()}
            </span>
          </div>

          <div>
            <p class="font-mono-tech text-[11px] uppercase tracking-wider text-theme-brass mb-1">${p.category}</p>
            <h4 class="font-display text-lg font-bold text-theme-primary leading-tight">${p.name}</h4>
          </div>

          <p class="text-xs text-theme-steel leading-relaxed line-clamp-3 font-normal">${p.short_desc || p.shortDesc || p.desc || ""}</p>

          <div class="border-t border-theme-muted pt-3 space-y-1 font-mono-tech text-[11px]">
            ${(p.specs || []).slice(0, 3).map(s => `
              <div class="flex justify-between text-theme-steel">
                <span>${s[0]}:</span>
                <span class="text-theme-primary font-medium text-right">${s[1]}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="pt-5 mt-4 border-t border-theme-muted flex gap-2">
          <button type="button" onclick="window.dsaApp.openProductDetail('${p.slug}')" class="flex-1 btn-brass py-2.5 px-3 text-center font-mono-tech text-xs uppercase tracking-wider">
            Specs &amp; CAD Data
          </button>
          <button type="button" onclick="window.dsaApp.enquireAboutProduct('${p.name.replace(/'/g, "\\'")}')" class="px-3 py-2.5 bg-theme-surface-2 border border-theme-muted text-theme-brass hover:border-[#C8A24A] font-mono-tech text-xs uppercase" title="Request Official Quotation">
            RFQ
          </button>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // PRODUCT DETAIL VIEW
  // -------------------------------------------------------------
  async openProductDetail(slugOrId) {
    let p = this.products.find(item => item.slug === slugOrId || item.id === slugOrId);
    if (!p) {
      try {
        p = await window.dsaApi.getProductBySlug(slugOrId);
      } catch (err) {
        this.showToast("Product not found", "error");
        return;
      }
    }

    const container = document.getElementById("productDetailContainer");
    if (!container) return;

    const isFirearm = p.requiresLicense;

    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <!-- Image & Badges -->
        <div class="lg:col-span-6 space-y-6">
          <div class="bg-theme-surface-2 border border-theme-brass p-8 flex items-center justify-center min-h-[380px] relative">
            <img src="${p.image}" alt="${p.name}" class="max-h-[340px] max-w-full object-contain filter contrast-105" />
            <span class="absolute top-4 left-4 px-3 py-1 font-mono-tech text-xs uppercase font-bold tracking-wider ${isFirearm ? 'bg-[#E4572E] text-white' : 'bg-[#C8A24A] text-[#0A0B0D]'}">
              ${isFirearm ? 'STATUTORY COMPLIANCE: ARMS LICENSE REQUIRED' : 'DEFENSE / AEROSPACE INDUSTRIAL COMPONENT'}
            </span>
          </div>

          <div class="p-5 bg-theme-surface border border-theme-muted space-y-2 font-mono-tech text-xs">
            <p class="text-theme-brass uppercase font-bold">// MANUFACTURING CERTIFICATIONS &amp; ORIGIN</p>
            <p class="text-theme-steel">ISO 9001:2015, ISO 14001:2015 &amp; AS9100 Rev D Aerospace Facility</p>
            <p class="text-theme-steel">Kohat Road Industrial Estate, Peshawar 25210, Khyber Pakhtunkhwa, Pakistan</p>
          </div>
        </div>

        <!-- Details & Specs -->
        <div class="lg:col-span-6 space-y-6">
          <div>
            <div class="flex items-center gap-3 font-mono-tech text-xs text-theme-brass mb-2">
              <span class="uppercase">DIVISION: ${p.division}</span>
              <span>•</span>
              <span class="uppercase">${p.category}</span>
            </div>
            <h1 class="font-display fluid-h2 font-bold uppercase leading-tight text-theme-primary">${p.name}</h1>
          </div>

          <p class="text-sm sm:text-base text-theme-steel leading-relaxed">${p.short_desc || p.shortDesc || p.desc || ""}</p>

          <!-- Key Features -->
          <div class="space-y-3 border-y border-theme-muted py-5">
            <h3 class="font-mono-tech text-xs uppercase tracking-wider text-theme-brass">Key Engineering Features</h3>
            <ul class="space-y-2 text-xs sm:text-sm text-theme-primary font-mono-tech">
              ${(p.features || []).map(f => `
                <li class="flex items-start gap-2">
                  <span class="text-[#C8A24A]">▸</span>
                  <span>${f}</span>
                </li>
              `).join("")}
            </ul>
          </div>

          <!-- Full Specifications Table -->
          <div class="space-y-3">
            <h3 class="font-mono-tech text-xs uppercase tracking-wider text-theme-brass">Technical Specifications Matrix</h3>
            <div class="border border-theme-muted divide-y divide-theme-muted font-mono-tech text-xs">
              ${(p.specs || []).map(s => `
                <div class="flex justify-between p-2.5 bg-theme-surface even:bg-theme-surface-2">
                  <span class="text-theme-steel">${s[0]}</span>
                  <span class="text-theme-primary font-bold text-right">${s[1]}</span>
                </div>
              `).join("")}
            </div>
          </div>

          <!-- Licensing Guardrail & Actions -->
          <div class="pt-4 space-y-4">
            ${isFirearm ? `
              <div class="p-4 bg-theme-base border-l-4 border-[#E4572E] space-y-2 font-mono-tech text-xs">
                <p class="text-[#E4572E] font-bold">STATUTORY NOTICE: ARMS CANNOT BE PURCHASED ONLINE</p>
                <p class="text-theme-steel leading-relaxed">
                  Under the Pakistan Arms Ordinance and Khyber Pakhtunkhwa Arms Rules, firearms may only be acquired in person at our Peshawar Factory Outlet or through Authorized Dealers with an official valid Arms License &amp; Demand Note.
                </p>
              </div>
            ` : ''}

            <div class="flex flex-wrap gap-3">
              <button type="button" onclick="window.dsaApp.enquireAboutProduct('${p.name.replace(/'/g, "\\'")}')" class="btn-signal px-6 py-3 font-mono-tech text-xs uppercase tracking-wider font-bold">
                Request Formal Quotation / RFQ
              </button>
              <button type="button" onclick="window.dsaRouter.navigate('dealers')" class="btn-brass px-6 py-3 font-mono-tech text-xs uppercase tracking-wider">
                Locate Authorized Dealers
              </button>
              <button type="button" onclick="window.dsaRouter.navigate('products')" class="px-5 py-3 bg-theme-surface border border-theme-muted font-mono-tech text-xs uppercase text-theme-steel hover:text-white">
                ← Back to Catalog
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    window.dsaRouter.navigate('product-detail', p.slug);
  }

  enquireAboutProduct(prodName) {
    window.dsaRouter.navigate('contact-us');
    setTimeout(() => {
      const subj = document.getElementById("cntSubject");
      const msg = document.getElementById("cntMessage");
      if (subj) subj.value = `Official RFQ: ${prodName}`;
      if (msg) {
        msg.value = `We are requesting technical details, commercial terms, and delivery schedules for ${prodName}. Our organization/license credentials are provided.`;
        msg.focus();
      }
    }, 150);
  }

  // -------------------------------------------------------------
  // MERCHANDISE SHOP & CART (PKR ₨)
  // -------------------------------------------------------------
  renderShop() {
    const grid = document.getElementById("shopMerchandiseGrid");
    if (!grid) return;

    let items = this.shopItems;
    if (this.shopCatFilter !== 'all') {
      items = items.filter(i => i.category.toLowerCase().includes(this.shopCatFilter.toLowerCase()));
    }

    grid.innerHTML = items.map(item => `
      <div class="bg-theme-surface border border-theme-brass p-5 flex flex-col justify-between group hover:border-[#C8A24A] transition-all">
        <div class="space-y-4">
          <div class="bg-theme-surface-2 border border-theme-muted h-52 flex items-center justify-center p-3 relative overflow-hidden">
            <img src="${item.image}" alt="${item.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
            <span class="absolute top-2 right-2 px-2 py-0.5 font-mono-tech text-[10px] bg-[#0A0B0D] text-theme-brass border border-theme-muted uppercase">
              Stock: ${item.stock} Units
            </span>
          </div>

          <div>
            <p class="font-mono-tech text-[11px] text-theme-brass uppercase tracking-wider">${item.category}</p>
            <h4 class="font-display text-lg font-bold text-theme-primary leading-tight">${item.name}</h4>
          </div>

          <p class="text-xs text-theme-steel leading-relaxed font-normal">${item.desc}</p>
        </div>

        <div class="pt-5 mt-4 border-t border-theme-muted flex items-center justify-between">
          <span class="font-mono-tech text-base font-bold text-[#C8A24A]">₨ ${item.price.toLocaleString()}</span>
          <button type="button" onclick="window.dsaApp.addToCart('${item.id}')" class="btn-brass py-2 px-4 font-mono-tech text-xs uppercase tracking-wider flex items-center gap-2">
            <span>+ Add to Cart</span>
          </button>
        </div>
      </div>
    `).join("");
  }

  addToCart(itemId, qty = 1) {
    const item = this.shopItems.find(i => i.id === itemId);
    if (!item) return;

    const existing = this.cart.find(c => c.id === itemId);
    if (existing) {
      existing.qty += qty;
    } else {
      this.cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        qty: qty
      });
    }

    this.saveCart();
    this.showToast(`Added ${item.name} to cart`, "success");

    // Open mini drawer
    const drawer = document.getElementById("miniCartDrawerBackdrop");
    if (drawer) {
      drawer.classList.remove("hidden");
      drawer.classList.add("flex");
    }
  }

  updateCartQty(itemId, delta) {
    const item = this.cart.find(c => c.id === itemId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      this.cart = this.cart.filter(c => c.id !== itemId);
    }

    this.saveCart();
  }

  renderCartUI() {
    const totalCount = this.cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const shipping = this.cart.length > 0 ? 450 : 0;
    const total = subtotal + shipping;

    // Badges
    const badge = document.getElementById("headerCartBadge");
    if (badge) badge.textContent = totalCount;

    // Drawer line items
    const drawerList = document.getElementById("miniCartDrawerList");
    if (drawerList) {
      if (this.cart.length === 0) {
        drawerList.innerHTML = `<p class="text-xs font-mono-tech text-theme-steel text-center py-10">Your bag is empty.</p>`;
      } else {
        drawerList.innerHTML = this.cart.map(item => `
          <div class="p-3.5 bg-theme-base border border-theme-muted flex items-center justify-between gap-3">
            <div>
              <h4 class="font-display text-sm font-bold text-theme-primary">${item.name}</h4>
              <p class="font-mono-tech text-xs text-theme-brass">₨ ${item.price.toLocaleString()} × ${item.qty} = ₨ ${(item.price * item.qty).toLocaleString()}</p>
            </div>
            <div class="flex items-center gap-1.5 font-mono-tech text-xs">
              <button type="button" onclick="window.dsaApp.updateCartQty('${item.id}', -1)" class="px-2.5 py-1 border border-theme-muted hover:border-[#C8A24A] text-theme-steel hover:text-white">-</button>
              <span class="px-2 font-bold">${item.qty}</span>
              <button type="button" onclick="window.dsaApp.updateCartQty('${item.id}', 1)" class="px-2.5 py-1 border border-theme-muted hover:border-[#C8A24A] text-theme-steel hover:text-white">+</button>
            </div>
          </div>
        `).join("");
      }
    }

    // Full Cart View Items
    const fullList = document.getElementById("fullCartItemsContainer");
    if (fullList) {
      if (this.cart.length === 0) {
        fullList.innerHTML = `
          <div class="p-8 text-center font-mono-tech text-theme-steel space-y-3 bg-theme-surface border border-theme-muted">
            <p>Your shopping cart is currently empty.</p>
            <button type="button" onclick="window.dsaRouter.navigate('shop')" class="btn-brass px-4 py-2 text-xs uppercase">Browse Merchandise</button>
          </div>
        `;
      } else {
        fullList.innerHTML = `
          <div class="border border-theme-brass divide-y divide-theme-muted">
            ${this.cart.map(item => `
              <div class="p-4 bg-theme-surface flex items-center justify-between gap-4 font-mono-tech text-xs">
                <div class="flex items-center gap-4">
                  <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-contain bg-theme-surface-2 p-1 border border-theme-muted" />
                  <div>
                    <h4 class="font-bold text-theme-primary text-sm">${item.name}</h4>
                    <p class="text-[#C8A24A]">₨ ${item.price.toLocaleString()} each</p>
                  </div>
                </div>
                <div class="flex items-center gap-6">
                  <div class="flex items-center gap-2 border border-theme-muted px-2 py-1">
                    <button type="button" onclick="window.dsaApp.updateCartQty('${item.id}', -1)" class="text-theme-steel hover:text-white">-</button>
                    <span class="w-6 text-center font-bold">${item.qty}</span>
                    <button type="button" onclick="window.dsaApp.updateCartQty('${item.id}', 1)" class="text-theme-steel hover:text-white">+</button>
                  </div>
                  <span class="font-bold text-[#C8A24A] w-24 text-right">₨ ${(item.price * item.qty).toLocaleString()}</span>
                </div>
              </div>
            `).join("")}
          </div>
        `;
      }
    }

    // Totals in Drawer and Checkout
    const miniSub = document.getElementById("miniCartSubtotal");
    const chkSub = document.getElementById("checkoutSubtotalPKR");
    const chkTot = document.getElementById("checkoutGrandTotalPKR");

    if (miniSub) miniSub.textContent = `₨ ${subtotal.toLocaleString()}`;
    if (chkSub) chkSub.textContent = `₨ ${subtotal.toLocaleString()}`;
    if (chkTot) chkTot.textContent = `₨ ${total.toLocaleString()}`;
  }

  async handleOrderSubmit(form) {
    if (this.cart.length === 0) {
      this.showToast("Your cart is empty", "error");
      return;
    }

    const payload = {
      customerName: form.chkName.value.trim(),
      customerPhone: form.chkPhone.value.trim(),
      city: form.chkCity.value.trim(),
      address: form.chkAddress.value.trim(),
      items: this.cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty }))
    };

    try {
      const res = await window.dsaApi.createOrder(payload);
      const banner = document.getElementById("checkoutFeedbackBanner");
      if (banner) {
        banner.innerHTML = `
          <div class="space-y-2">
            <p class="font-bold text-base text-[#C8A24A]">✓ MERCHANDISE ORDER CONFIRMED: ${res.order.id}</p>
            <p class="text-xs text-theme-steel">Total: ₨ ${res.order.totalPKR.toLocaleString()} (including courier delivery).</p>
            <p class="text-xs text-theme-primary">Your order has been written to the persistent database and queued in the Admin Panel for dispatch.</p>
          </div>
        `;
        banner.classList.remove("hidden");
      }

      this.cart = [];
      this.saveCart();
      form.reset();
      this.showToast(`Order ${res.order.id} placed successfully!`, "success");

      // Refresh shop items to reflect deducted warehouse stock
      const freshShop = await window.dsaApi.getShopItems();
      this.shopItems = freshShop || [];
      this.renderShop();

    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  // -------------------------------------------------------------
  // CONTACT & DEALER FORMS
  // -------------------------------------------------------------
  async handleContactSubmit(form) {
    const payload = {
      type: 'CONTACT_RFQ',
      name: form.cntName.value.trim(),
      email: form.cntEmail.value.trim(),
      phone: form.cntPhone.value.trim(),
      subject: form.cntSubject.value.trim(),
      message: form.cntMessage.value.trim()
    };

    try {
      const res = await window.dsaApi.createEnquiry(payload);
      const st = document.getElementById("contactFormStatus");
      if (st) {
        st.textContent = `✓ Inbound RFQ / Enquiry ${res.enquiry.id} successfully recorded in database & visible in Admin Panel!`;
        st.classList.remove("hidden");
      }
      form.reset();
      this.showToast(`Enquiry ${res.enquiry.id} submitted!`, "success");
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async handleDealerAppSubmit(form) {
    const payload = {
      type: 'DEALER_APPLICATION',
      name: form.dlrBizName.value.trim(),
      phone: form.dlrPhone.value.trim(),
      subject: `Dealership App (${form.dlrCity.value.trim()}) — License: ${form.dlrLicense.value.trim()}`,
      message: `Applicant holds Provincial/All-Pakistan arms license # ${form.dlrLicense.value.trim()}. Proposed facility in ${form.dlrCity.value.trim()}.`
    };

    try {
      const res = await window.dsaApi.createEnquiry(payload);
      const st = document.getElementById("dealerFormStatus");
      if (st) {
        st.textContent = `✓ Dealership Application ${res.enquiry.id} logged in persistent database & queued in Admin Panel!`;
        st.classList.remove("hidden");
      }
      form.reset();
      this.showToast(`Application ${res.enquiry.id} submitted!`, "success");
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  // -------------------------------------------------------------
  // DEALERS, FAQS, NEWS, DOWNLOADS
  // -------------------------------------------------------------
  renderDealersDirectory(query = "") {
    const list = document.getElementById("dealersDirectoryGrid");
    if (!list) return;

    const q = (query || "").toLowerCase().trim();
    let filtered = this.dealers;
    if (q) {
      filtered = filtered.filter(d =>
        d.city.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.province.toLowerCase().includes(q)
      );
    }

    list.innerHTML = filtered.map(d => `
      <div class="p-6 bg-theme-surface border border-theme-brass space-y-3 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex justify-between font-mono-tech text-[11px] text-theme-brass">
            <span>${d.province}</span>
            <span>${d.lat.toFixed(2)}°N, ${d.lng.toFixed(2)}°E</span>
          </div>
          <h3 class="font-display text-xl font-bold uppercase text-theme-primary">${d.city}</h3>
          <p class="text-xs font-semibold text-theme-primary">${d.name}</p>
          <p class="text-xs text-theme-steel">${d.address}</p>
          <p class="font-mono-tech text-xs text-theme-brass">${d.phone}</p>
        </div>
        <div class="border-t border-theme-muted pt-2 space-y-2">
          <p class="text-[11px] font-mono-tech text-theme-steel">${d.note || 'Requires valid license.'}</p>
          <button type="button" onclick="window.selectDealerCity('${d.id}'); window.dsaRouter.navigate('dealers');" class="btn-brass py-1.5 px-3 font-mono-tech text-[11px] uppercase tracking-wider w-full">
            Focus on Map
          </button>
        </div>
      </div>
    `).join("");
  }

  renderFAQ(query = "") {
    const wrap = document.getElementById("faqAccordionContainer");
    if (!wrap) return;

    const q = (query || "").toLowerCase().trim();
    let filtered = this.faqs;
    if (q) {
      filtered = filtered.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
    }

    wrap.innerHTML = filtered.map((item, idx) => `
      <div class="border border-theme-brass bg-theme-surface">
        <button type="button" onclick="window.dsaApp.toggleFaqItem(${idx})" class="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-display font-bold text-sm sm:text-base hover:text-[#C8A24A]">
          <span>${item.q}</span>
          <span id="faqIcon-${idx}" class="text-theme-brass font-mono-tech text-lg">+</span>
        </button>
        <div id="faqBody-${idx}" class="hidden px-5 pb-5 pt-1 text-xs sm:text-sm text-theme-steel border-t border-theme-muted leading-relaxed font-sans">
          ${item.a}
        </div>
      </div>
    `).join("");
  }

  toggleFaqItem(idx) {
    const body = document.getElementById(`faqBody-${idx}`);
    const icon = document.getElementById(`faqIcon-${idx}`);
    if (!body || !icon) return;
    const isHidden = body.classList.contains("hidden");
    body.classList.toggle("hidden", !isHidden);
    icon.textContent = isHidden ? "−" : "+";
  }

  renderNewsAndDownloads() {
    const newsHTML = this.news.map(n => `
      <article class="bg-theme-surface border border-theme-brass p-6 space-y-3 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex justify-between font-mono-tech text-[11px] text-theme-brass">
            <span>${n.tag}</span>
            <span>${n.date}</span>
          </div>
          <h3 class="font-display text-xl font-bold">${n.title}</h3>
          <p class="text-xs sm:text-sm text-theme-steel leading-relaxed">${n.desc}</p>
        </div>
        <button type="button" onclick="window.dsaRouter.navigate('daudsons-foundation')" class="font-mono-tech text-xs uppercase text-theme-brass text-left hover:underline pt-2">
          Read Full Foundation Report →
        </button>
      </article>
    `).join("");

    const homeNews = document.getElementById("homeNewsGrid");
    const fullNews = document.getElementById("fullNewsGrid");
    if (homeNews) homeNews.innerHTML = newsHTML;
    if (fullNews) fullNews.innerHTML = newsHTML;

    const dlGrid = document.getElementById("downloadsGrid");
    if (dlGrid) {
      dlGrid.innerHTML = this.downloads.map(d => `
        <div class="p-6 bg-theme-surface border border-theme-brass flex flex-col justify-between space-y-4">
          <div class="space-y-2">
            <div class="flex justify-between font-mono-tech text-xs text-theme-brass">
              <span>FORMAT: ${d.type}</span>
              <span>SIZE: ${d.size}</span>
            </div>
            <h3 class="font-display text-xl font-bold">${d.title}</h3>
            <p class="text-xs text-theme-steel leading-relaxed">${d.desc}</p>
          </div>
          <a href="${d.url}" target="_blank" rel="noopener noreferrer" class="btn-signal px-5 py-3 font-mono-tech text-xs uppercase tracking-wider font-bold text-center">
            ⬇ Download Document (${d.type})
          </a>
        </div>
      `).join("");
    }
  }

  // -------------------------------------------------------------
  // ADMIN DASHBOARD & SECURE CMS
  // -------------------------------------------------------------
  async checkAuthStatus() {
    try {
      const res = await window.dsaApi.getMe();
      if (res && res.authenticated) {
        this.currentUser = res.user;
        const loginBox = document.getElementById("admLoginContainer");
        const mainBox = document.getElementById("admMainContent");
        if (loginBox) loginBox.classList.add("hidden");
        if (mainBox) mainBox.classList.remove("hidden");

        const emEl = document.getElementById("admCurrentUserEmail");
        const rlEl = document.getElementById("admCurrentUserRole");
        const p2fa = document.getElementById("adm2faStatusPill");
        if (emEl) emEl.textContent = res.user.email;
        if (rlEl) rlEl.textContent = res.user.role;
        if (p2fa) {
          p2fa.textContent = res.user.totpEnabled ? "2FA: ACTIVE" : "2FA: INACTIVE";
          p2fa.className = res.user.totpEnabled
            ? "px-2 py-1 bg-green-900/40 text-green-300 border border-green-700 text-[10px]"
            : "px-2 py-1 bg-yellow-900/40 text-yellow-300 border border-yellow-700 text-[10px]";
        }
        return true;
      }
    } catch {
      // not authenticated
    }
    const loginBox = document.getElementById("admLoginContainer");
    const mainBox = document.getElementById("admMainContent");
    if (loginBox) loginBox.classList.remove("hidden");
    if (mainBox) mainBox.classList.add("hidden");
    return false;
  }

  async handleLogin(email, password, totpCode) {
    try {
      const res = await window.dsaApi.login(email, password, totpCode);
      if (res.requires2FA) {
        const container = document.getElementById("adm2faInputContainer");
        if (container) container.classList.remove("hidden");
        const totpIn = document.getElementById("admLoginTotp");
        if (totpIn) totpIn.focus();
        this.showToast("Two-Factor Authentication code required. Please enter 6 digits.", "info");
        return;
      }
      if (res.success) {
        this.currentUser = res.user;
        this.showToast(`Authenticated as ${res.user.name || res.user.email}`, "success");
        await this.checkAuthStatus();
        await this.loadAdminData();
      }
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async handleLogout() {
    try {
      await window.dsaApi.logout();
      this.currentUser = null;
      this.showToast("Signed out from administrative console", "info");
      const loginBox = document.getElementById("admLoginContainer");
      const mainBox = document.getElementById("admMainContent");
      if (loginBox) loginBox.classList.remove("hidden");
      if (mainBox) mainBox.classList.add("hidden");
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async loadAdminData() {
    const isAuthed = await this.checkAuthStatus();
    if (!isAuthed) return;

    try {
      const [stats, orders, enquiries, logs] = await Promise.all([
        window.dsaApi.getStats(),
        window.dsaApi.getOrders(),
        window.dsaApi.getEnquiries(),
        window.dsaApi.getLogs(30)
      ]);

      // Metrics
      const mProd = document.getElementById("admStatProducts");
      const mUnverif = document.getElementById("admStatUnverified");
      const mShop = document.getElementById("admStatShop");
      const mOrders = document.getElementById("admStatOrders");
      const mRev = document.getElementById("admStatRevenue");
      const mEnq = document.getElementById("admStatEnquiries");
      const mPend = document.getElementById("admStatPendingEnq");
      const mDlr = document.getElementById("admStatDealers");
      const mUsers = document.getElementById("admStatUsers");

      if (mProd) mProd.textContent = stats.totalProducts;
      if (mUnverif) mUnverif.textContent = `${stats.unverifiedProducts || 0} Flagged for Audit`;
      if (mShop) mShop.textContent = stats.totalShopItems;
      if (mOrders) mOrders.textContent = stats.totalOrders;
      if (mRev) mRev.textContent = `₨ ${(stats.totalRevenuePKR || 0).toLocaleString()}`;
      if (mEnq) mEnq.textContent = stats.totalEnquiries;
      if (mPend) mPend.textContent = `${stats.pendingEnquiries || 0} Pending Action`;
      if (mDlr) mDlr.textContent = stats.totalDealers;
      if (mUsers) mUsers.textContent = stats.totalUsers || 1;

      // 1. Products Table
      const prodTable = document.getElementById("admProductsTableBody");
      if (prodTable) {
        prodTable.innerHTML = this.products.map(p => `
          <tr class="hover:bg-theme-surface-2 font-mono-tech text-xs">
            <td class="py-2 px-2"><img src="${p.image}" alt="${p.name}" class="w-12 h-9 object-cover border border-theme-muted bg-black" /></td>
            <td class="py-2 px-2 font-bold text-theme-primary">
              ${p.name}
              ${p.needsVerification ? '<span class="ml-2 px-1.5 py-0.5 bg-yellow-900/60 text-yellow-300 text-[9px] uppercase border border-yellow-700">Needs Verification</span>' : ''}
            </td>
            <td class="py-2 px-2 uppercase text-theme-brass">${p.division}</td>
            <td class="py-2 px-2">
              <button type="button" onclick="window.dsaApp.adminToggleProductVerif('${p.id}', ${Boolean(p.needsVerification)})" class="text-[10px] underline ${p.needsVerification ? 'text-yellow-400' : 'text-green-400'}">
                ${p.needsVerification ? 'Flagged (Unverified)' : 'Verified Truth'}
              </button>
            </td>
            <td class="py-2 px-2 text-right space-x-2">
              <button type="button" onclick="window.dsaApp.openProductDetail('${p.slug}')" class="text-theme-brass underline">View</button>
              <button type="button" onclick="window.dsaApp.openEditProductModal('${p.id}')" class="text-blue-400 underline">Edit</button>
              <button type="button" onclick="window.dsaApp.adminDeleteProduct('${p.id}')" class="text-[#E4572E] underline">Delete</button>
            </td>
          </tr>
        `).join("");
      }

      // 2. Shop Inventory
      const shopList = document.getElementById("admShopInventoryList");
      if (shopList) {
        shopList.innerHTML = this.shopItems.map(item => `
          <div class="p-3 bg-theme-base border border-theme-muted flex items-center justify-between gap-2 font-mono-tech text-xs">
            <div class="flex items-center gap-2.5">
              <img src="${item.image}" alt="${item.name}" class="w-10 h-10 object-cover border border-theme-muted bg-black" />
              <div>
                <h5 class="font-bold text-theme-primary">${item.name}</h5>
                <p class="text-theme-steel">Stock: <span class="text-theme-brass">${item.stock}</span> units</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-[#C8A24A]">₨ ${item.price.toLocaleString()}</span>
              <button type="button" onclick="window.dsaApp.adminUpdateShopPrice('${item.id}', ${item.price}, ${item.stock})" class="px-2 py-1 bg-theme-surface border border-theme-muted hover:border-[#C8A24A] text-[10px] uppercase">
                Adjust
              </button>
            </div>
          </div>
        `).join("");
      }

      // 3. Orders List
      const ordList = document.getElementById("admOrdersList");
      if (ordList) {
        ordList.innerHTML = orders.map(o => `
          <div class="p-3 bg-theme-base border border-theme-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono-tech text-xs">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-theme-brass">${o.id}</span>
                <span class="text-theme-steel">• ${o.created_at}</span>
                <span class="px-1.5 py-0.5 text-[10px] ${o.status === 'DELIVERED' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'} font-bold">${o.status}</span>
              </div>
              <p class="text-theme-primary font-medium mt-1">${o.customer_name} (${o.customer_phone}) — ${o.city}</p>
              <p class="text-theme-steel text-[11px]">${o.address}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-bold text-[#C8A24A] text-sm">₨ ${o.total_pkr.toLocaleString()}</span>
              <button type="button" onclick="window.dsaApp.adminCycleOrderStatus('${o.id}', '${o.status}')" class="btn-brass px-2 py-1 text-[10px] uppercase">
                Advance
              </button>
            </div>
          </div>
        `).join("");
      }

      // 4. Enquiries List
      const enqList = document.getElementById("admEnquiriesList");
      if (enqList) {
        enqList.innerHTML = enquiries.map(e => `
          <div class="p-3 bg-theme-base border border-theme-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono-tech text-xs">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-theme-brass">${e.id}</span>
                <span class="text-theme-steel">• ${e.type}</span>
                <span class="px-1.5 py-0.5 text-[10px] ${e.status === 'RESOLVED' ? 'bg-green-900/60 text-green-300' : 'bg-orange-900/60 text-orange-300'}">${e.status}</span>
              </div>
              <p class="text-theme-primary font-bold mt-1">${e.name} (${e.phone})</p>
              <p class="text-theme-steel text-[11px]">${e.subject}</p>
            </div>
            <button type="button" onclick="window.dsaApp.adminToggleEnquiry('${e.id}', '${e.status}')" class="btn-brass px-2 py-1 text-[10px] uppercase self-start sm:self-auto">
              ${e.status === 'RESOLVED' ? 'Reopen' : 'Mark Resolved'}
            </button>
          </div>
        `).join("");
      }

      // 5. Dealers Table
      const dlrTable = document.getElementById("admDealersTable");
      if (dlrTable) {
        dlrTable.innerHTML = this.dealers.map(d => `
          <div class="p-2.5 bg-theme-base border border-theme-muted flex items-center justify-between gap-2 font-mono-tech text-xs">
            <div>
              <span class="font-bold text-theme-primary">${d.name}</span>
              <span class="text-theme-steel ml-2">${d.city} (${d.province})</span>
              <span class="text-theme-brass ml-2">${d.phone}</span>
              ${d.isHQ ? '<span class="ml-2 px-1.5 py-0.5 text-[9px] bg-[#E4572E] text-white font-bold">Factory HQ</span>' : ''}
            </div>
            <div>
              ${!d.isHQ ? `
                <button type="button" onclick="window.dsaApp.adminDeleteDealer('${d.id}')" class="text-[#E4572E] underline text-[11px]">Delete</button>
              ` : '<span class="text-theme-steel text-[10px]">LOCKED</span>'}
            </div>
          </div>
        `).join("");
      }

      // 6. Section Builder & Additional CMS Views
      await this.loadSectionsAdmin();
      await this.loadSettingsAdmin();
      await this.loadUsersAdmin();
      await this.loadCredentialsAdmin();
      await this.loadAuditLogs();
      await this.loadNewsAdmin();
      await this.loadMediaAdmin();

      // 7. API Logs Console
      const logConsole = document.getElementById("admApiLogConsole");
      if (logConsole) {
        logConsole.textContent = logs.map(l => `[${l.timestamp}] ${l.method} ${l.path} (${l.status_code}) ${l.message}`).join("\n");
      }

    } catch (err) {
      console.error("Admin data load error:", err);
    }
  }

  // -------------------------------------------------------------
  // DYNAMIC SECTION BUILDER
  // -------------------------------------------------------------
  async loadSectionsAdmin() {
    const container = document.getElementById("admSectionsList");
    if (!container) return;
    try {
      const sections = await window.dsaApi.getAllAdminSections();
      container.innerHTML = sections.map(s => `
        <div class="p-4 bg-theme-base border border-theme-muted space-y-3 font-mono-tech text-xs">
          <div class="flex items-center justify-between border-b border-theme-muted/50 pb-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-[#C8A24A] text-black font-bold uppercase text-[10px]">${s.section_key}</span>
              <span class="text-theme-steel">Page: ${s.page} • Display Order: ${s.display_order}</span>
            </div>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" id="sec_vis_${s.id}" ${s.is_visible ? 'checked' : ''} class="w-4 h-4 bg-theme-base" />
              <span class="text-theme-primary text-[11px]">Visible on Site</span>
            </label>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-theme-steel mb-1">Headline Title</label>
              <input type="text" id="sec_title_${s.id}" value="${(s.title || '').replace(/"/g, '&quot;')}" class="w-full px-2.5 py-1.5 bg-theme-surface border border-theme-muted text-theme-primary" />
            </div>
            <div>
              <label class="block text-theme-steel mb-1">Badge Tag</label>
              <input type="text" id="sec_badge_${s.id}" value="${(s.badge || '').replace(/"/g, '&quot;')}" class="w-full px-2.5 py-1.5 bg-theme-surface border border-theme-muted text-theme-primary" />
            </div>
          </div>
          <div>
            <label class="block text-theme-steel mb-1">Subtitle / Descriptive Text</label>
            <textarea id="sec_sub_${s.id}" rows="2" class="w-full px-2.5 py-1.5 bg-theme-surface border border-theme-muted text-theme-primary">${s.subtitle || ''}</textarea>
          </div>
          <div class="flex justify-end pt-1">
            <button type="button" onclick="window.dsaApp.adminSaveSection('${s.id}')" class="btn-brass px-4 py-1.5 uppercase font-bold text-[11px]">
              Save Section Changes
            </button>
          </div>
        </div>
      `).join("");
    } catch (err) {
      console.error("Failed to load sections in admin:", err);
    }
  }

  async adminSaveSection(secId) {
    const title = document.getElementById(`sec_title_${secId}`).value.trim();
    const subtitle = document.getElementById(`sec_sub_${secId}`).value.trim();
    const badge = document.getElementById(`sec_badge_${secId}`).value.trim();
    const isVisible = document.getElementById(`sec_vis_${secId}`).checked;

    try {
      const updated = await window.dsaApi.updateSection(secId, {
        title,
        subtitle,
        badge,
        is_visible: isVisible
      });
      this.showToast(`Section '${updated.section.section_key}' updated live!`, "success");
      await this.applyLiveSections();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async applyLiveSections() {
    try {
      const sections = await window.dsaApi.getSections('home');
      if (!Array.isArray(sections)) return;
      for (const s of sections) {
        const secEl = document.getElementById(`sec-home-${s.section_key}`);
        if (secEl) {
          // Toggle visibility live
          if (s.is_visible === 0 || s.is_visible === false) {
            secEl.style.display = 'none';
          } else {
            secEl.style.display = '';
          }

          // Update title if heading exists
          const h2 = secEl.querySelector("h2");
          if (h2 && s.title && s.section_key !== 'hero') {
            h2.textContent = s.title;
          }

          // Update subtitle
          const sub = secEl.querySelector("p.text-theme-steel");
          if (sub && s.subtitle && s.section_key !== 'hero') {
            sub.textContent = s.subtitle;
          }
        }

        if (s.section_key === 'hero') {
          const hTitle = document.querySelector("#view-home h1");
          if (hTitle && s.title) hTitle.innerHTML = s.title.replace('(PVT.) LTD.', '<span class="text-theme-brass">(PVT.) LTD.</span>');
          const hSub = document.querySelector("#view-home p.text-base");
          if (hSub && s.subtitle) hSub.textContent = s.subtitle;
        }
      }

      await this.applyLiveSettings();
    } catch (err) {
      console.warn("Failed to apply live sections:", err);
    }
  }

  async applyLiveSettings() {
    try {
      const settings = await window.dsaApi.getSettings();
      if (!settings) return;

      // Top Announcement Bar
      const annBar = document.getElementById("globalAnnouncementBar");
      const annText = document.getElementById("globalAnnouncementText");
      if (annBar && annText) {
        if (settings.announcement_active === 'true' && settings.announcement_text) {
          annText.textContent = settings.announcement_text;
          annBar.classList.remove("hidden");
        } else {
          annBar.classList.add("hidden");
        }
      }
    } catch (err) {
      console.warn("Failed to apply live settings:", err);
    }
  }

  // -------------------------------------------------------------
  // SITE SETTINGS & SEO
  // -------------------------------------------------------------
  async loadSettingsAdmin() {
    try {
      const settings = await window.dsaApi.getSettings();
      if (!settings) return;
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
      };
      setVal('setCompanyName', settings.company_name);
      setVal('setFoundingYear', settings.founding_year);
      setVal('setPhonePrimary', settings.phone_primary);
      setVal('setEmailSales', settings.email_sales);
      setVal('setHqAddress', settings.hq_address);
      setVal('setAnnouncementText', settings.announcement_text);

      const chkAnn = document.getElementById('setAnnouncementActive');
      if (chkAnn) chkAnn.checked = settings.announcement_active === 'true';

      const chkMaint = document.getElementById('setMaintenanceMode');
      if (chkMaint) chkMaint.checked = settings.maintenance_mode === 'true';
    } catch (err) {
      console.error("Failed to load settings in admin:", err);
    }
  }

  async handleUpdateSettings(payload) {
    try {
      await window.dsaApi.updateSettings(payload);
      this.showToast("Global site settings updated successfully", "success");
      await this.loadSettingsAdmin();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  // -------------------------------------------------------------
  // USERS & RBAC
  // -------------------------------------------------------------
  async loadUsersAdmin() {
    const container = document.getElementById("admUsersTable");
    if (!container) return;
    try {
      const users = await window.dsaApi.getAdminUsers();
      container.innerHTML = users.map(u => `
        <div class="p-3 bg-theme-base border border-theme-muted flex items-center justify-between gap-3 font-mono-tech text-xs">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-theme-primary">${u.name}</span>
              <span class="text-theme-steel">(${u.email})</span>
              <span class="px-1.5 py-0.5 text-[10px] bg-[#C8A24A] text-black font-bold uppercase">${u.role}</span>
            </div>
            <span class="text-[10px] text-theme-steel">Status: ${u.status} • 2FA: ${u.totp_enabled ? 'Active' : 'Not Configured'}</span>
          </div>
          <div>
            ${u.email !== 'admin@daudsons.com' ? `
              <button type="button" onclick="window.dsaApp.adminDeleteUser('${u.id}')" class="text-[#E4572E] underline text-[11px]">Delete</button>
            ` : '<span class="text-theme-steel text-[10px]">ROOT OWNER</span>'}
          </div>
        </div>
      `).join("");
    } catch (err) {
      console.error("Failed to load users in admin:", err);
    }
  }

  async handleCreateUser(payload) {
    try {
      const res = await window.dsaApi.createAdminUser(payload);
      this.showToast(`User ${res.email} (${res.role}) created`, "success");
      const form = document.getElementById("admAddUserForm");
      if (form) form.reset();
      await this.loadUsersAdmin();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async adminDeleteUser(userId) {
    if (!confirm("Permanently delete this administrative account?")) return;
    try {
      await window.dsaApi.deleteAdminUser(userId);
      this.showToast("User account deleted", "success");
      await this.loadUsersAdmin();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  // -------------------------------------------------------------
  // 2FA TOTP & PASSWORDS
  // -------------------------------------------------------------
  async handleInit2FA() {
    try {
      const res = await window.dsaApi.setup2FA();
      const codeEl = document.getElementById("adm2faSecretCode");
      const urlEl = document.getElementById("adm2faOtpUrl");
      const recList = document.getElementById("admRecoveryCodesList");
      const confirmBox = document.getElementById("adm2faConfirmBox");

      if (codeEl) codeEl.textContent = res.secret;
      if (urlEl) urlEl.textContent = res.otpAuthUrl;
      if (recList && res.recoveryCodes) {
        recList.innerHTML = res.recoveryCodes.map(c => `<code class="bg-theme-surface p-1 border border-theme-muted block">${c}</code>`).join("");
      }
      if (confirmBox) confirmBox.classList.remove("hidden");
      this.showToast("2FA Secret generated. Scan or enter into Authenticator app.", "info");
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async handleVerify2FA(token) {
    if (!token) {
      this.showToast("Please enter the 6-digit code", "error");
      return;
    }
    try {
      await window.dsaApi.verify2FA(token);
      this.showToast("Two-Factor Authentication successfully activated!", "success");
      await this.checkAuthStatus();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async handleChangePassword(curr, newP) {
    try {
      await window.dsaApi.changePassword(curr, newP);
      this.showToast("Password updated successfully. Other sessions revoked.", "success");
      const form = document.getElementById("admChangePasswordForm");
      if (form) form.reset();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  // -------------------------------------------------------------
  // AUDIT LOGS & CREDENTIALS
  // -------------------------------------------------------------
  async loadAuditLogs() {
    const container = document.getElementById("admAuditLogsList");
    if (!container) return;
    try {
      const logs = await window.dsaApi.getAuditLogs(60);
      container.innerHTML = logs.map(l => `
        <div class="p-2 bg-theme-base border border-theme-muted flex items-center justify-between gap-2 font-mono-tech text-[11px]">
          <div>
            <span class="font-bold text-theme-brass">${l.action}</span>
            <span class="text-theme-primary ml-2">${l.user_email || 'SYSTEM'}</span>
            <span class="text-theme-steel ml-1">[${l.role || 'GUEST'}]</span>
            ${l.entity_type ? `<span class="text-theme-steel ml-2">• ${l.entity_type}:${l.entity_id || ''}</span>` : ''}
          </div>
          <div class="text-right text-theme-steel text-[10px]">
            <span>${l.ip_address}</span>
            <span class="ml-2">${l.created_at}</span>
          </div>
        </div>
      `).join("");
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
  }

  async loadCredentialsAdmin() {
    const certContainer = document.getElementById("admCertsList");
    const timeContainer = document.getElementById("admTimelineList");
    try {
      const [certs, timeline] = await Promise.all([
        window.dsaApi.getCertificates(),
        window.dsaApi.getTimeline()
      ]);
      if (certContainer && certs) {
        certContainer.innerHTML = certs.map(c => `
          <div class="p-3 bg-theme-base border border-theme-muted space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-theme-brass">${c.code}</span>
              <span class="text-[10px] text-green-400">VALID: ${c.valid_until || 'PERMANENT'}</span>
            </div>
            <p class="font-bold text-theme-primary">${c.title}</p>
            <p class="text-[11px] text-theme-steel">${c.scope}</p>
          </div>
        `).join("");
      }
      if (timeContainer && timeline) {
        timeContainer.innerHTML = timeline.map(t => `
          <div class="p-2.5 bg-theme-base border border-theme-muted flex items-start gap-3">
            <span class="font-bold text-theme-brass text-sm">${t.year}</span>
            <div>
              <h5 class="font-bold text-theme-primary">${t.title}</h5>
              <p class="text-[11px] text-theme-steel">${t.desc}</p>
            </div>
          </div>
        `).join("");
      }
    } catch (err) {
      console.error("Failed to load credentials in admin:", err);
    }
  }

  // -------------------------------------------------------------
  // PRODUCT & ORDER DISPATCH ACTIONS
  // -------------------------------------------------------------
  async adminToggleProductVerif(prodId, currentVal) {
    try {
      await window.dsaApi.updateProduct(prodId, { needsVerification: !currentVal });
      this.showToast(`Product ${prodId} verification flag toggled`, "success");
      await this.refreshCatalogData();
      await this.loadAdminData();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async adminCycleOrderStatus(orderId, currentStatus) {
    const cycle = {
      'NEW': 'CONFIRMED',
      'CONFIRMED': 'SHIPPED',
      'SHIPPED': 'DELIVERED',
      'DELIVERED': 'CANCELLED',
      'CANCELLED': 'NEW'
    };
    const nextStatus = cycle[currentStatus] || 'CONFIRMED';
    try {
      await window.dsaApi.updateOrderStatus(orderId, nextStatus);
      this.showToast(`Order ${orderId} updated to ${nextStatus}`, "success");
      this.loadAdminData();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async adminToggleEnquiry(enqId, currentStatus) {
    const nextStatus = currentStatus === 'RESOLVED' ? 'NEW' : 'RESOLVED';
    try {
      await window.dsaApi.updateEnquiryStatus(enqId, nextStatus);
      this.showToast(`Enquiry ${enqId} marked as ${nextStatus}`, "success");
      this.loadAdminData();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async adminDeleteProduct(prodId) {
    if (!confirm(`Permanently delete product ${prodId}?`)) return;
    try {
      await window.dsaApi.deleteProduct(prodId);
      this.showToast(`Product ${prodId} deleted`, "success");
      await this.refreshCatalogData();
      this.loadAdminData();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async adminUpdateShopPrice(itemId, currentPrice, currentStock) {
    const newPriceStr = prompt("Enter new price in PKR (₨):", currentPrice);
    if (newPriceStr === null) return;
    const newStockStr = prompt("Enter new warehouse stock units:", currentStock);
    if (newStockStr === null) return;

    const newPrice = parseInt(newPriceStr);
    const newStock = parseInt(newStockStr);

    if (isNaN(newPrice) || isNaN(newStock)) {
      this.showToast("Invalid number entered", "error");
      return;
    }

    try {
      await window.dsaApi.updateShopItem(itemId, { price: newPrice, stock: newStock });
      this.showToast(`Updated item ${itemId} to ₨ ${newPrice.toLocaleString()}`, "success");
      const freshShop = await window.dsaApi.getShopItems();
      this.shopItems = freshShop || [];
      this.renderShop();
      this.loadAdminData();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async adminDeleteDealer(dealerId) {
    if (!confirm(`Delete authorized dealer ${dealerId}?`)) return;
    try {
      await window.dsaApi.deleteDealer(dealerId);
      this.showToast(`Dealer ${dealerId} deleted`, "success");
      const freshDlrs = await window.dsaApi.getDealers();
      this.dealers = freshDlrs || [];
      this.renderDealersDirectory();
      if (typeof window.initPakistanMap === "function") {
        window.initPakistanMap(this.dealers);
      }
      this.loadAdminData();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async handleAdminAddProduct(form) {
    const payload = {
      name: form.admProdName.value.trim(),
      division: form.admProdDiv.value,
      category: form.admProdCat.value.trim(),
      requiresLicense: form.admProdLic.value === "true",
      image: form.admProdImg.value.trim() || 'https://daudsons.com/wp-content/uploads/2023/07/DSA-9mm-Pistols.png',
      shortDesc: form.admProdDesc.value.trim(),
      needsVerification: document.getElementById("admProdNeedsVerif")?.checked || false,
      features: ["Enterprise Added System via CMS", "AS9100 Rev D & ISO 9001:2015 Manufacturing Quality"],
      specs: [["Origin", "Peshawar, Pakistan"], ["Division", form.admProdDiv.value.toUpperCase()]]
    };

    try {
      const res = await window.dsaApi.createProduct(payload);
      this.showToast(`Created product ${res.name}`, "success");
      form.reset();
      await this.refreshCatalogData();
      this.loadAdminData();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async handleAdminAddDealer(form) {
    const payload = {
      city: form.admDlrCity.value.trim(),
      province: form.admDlrProv.value.trim(),
      lat: parseFloat(form.admDlrLat.value),
      lng: parseFloat(form.admDlrLng.value),
      name: form.admDlrName.value.trim(),
      address: form.admDlrAddr.value.trim(),
      phone: form.admDlrPhone ? form.admDlrPhone.value.trim() : '+92-XX-XXXXXXX',
      note: 'Authorized Retail Partner'
    };

    try {
      const res = await window.dsaApi.createDealer(payload);
      this.showToast(`Dealer in ${res.city} created`, "success");
      form.reset();
      const freshDlrs = await window.dsaApi.getDealers();
      this.dealers = freshDlrs || [];
      this.renderDealersDirectory();
      if (typeof window.initPakistanMap === "function") {
        window.initPakistanMap(this.dealers);
      }
      this.loadAdminData();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  openEditProductModal(prodId) {
    const prod = this.products.find(p => p.id === prodId);
    if (!prod) return;

    const modal = document.getElementById("admEditProductModal");
    if (!modal) return;

    document.getElementById("editProdId").value = prod.id;
    document.getElementById("editProdName").value = prod.name;
    document.getElementById("editProdDiv").value = prod.division;
    document.getElementById("editProdLic").value = prod.requiresLicense ? "true" : "false";
    document.getElementById("editProdCat").value = prod.category;
    document.getElementById("editProdImg").value = prod.image;
    document.getElementById("editProdDesc").value = prod.short_desc || prod.shortDesc || prod.desc || "";
    document.getElementById("editProdNeedsVerif").checked = Boolean(prod.needsVerification);

    modal.classList.remove("hidden");
  }

  async loadNewsAdmin() {
    const container = document.getElementById("admNewsList");
    if (!container) return;
    try {
      const articles = await window.dsaApi.getNews();
      this.news = articles || [];
      if (this.news.length === 0) {
        container.innerHTML = '<div class="p-4 text-theme-steel border border-theme-muted">No published news articles yet.</div>';
        return;
      }
      container.innerHTML = this.news.map(n => `
        <div class="p-3 bg-theme-base border border-theme-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-theme-brass font-bold">${n.date_str || n.created_at}</span>
              ${n.tags ? (Array.isArray(n.tags) ? n.tags : JSON.parse(n.tags || '[]')).map(t => `<span class="px-1.5 py-0.5 text-[9px] bg-theme-surface border border-theme-muted text-theme-steel">${t}</span>`).join('') : ''}
            </div>
            <h4 class="font-bold text-theme-primary mt-1">${n.title}</h4>
            <p class="text-theme-steel text-[11px] line-clamp-2 mt-0.5">${n.desc}</p>
          </div>
          <button type="button" onclick="window.dsaApp.adminDeleteNews('${n.id}')" class="text-[#E4572E] hover:underline text-[11px] font-bold self-start sm:self-auto">
            Delete
          </button>
        </div>
      `).join("");
      this.renderNewsAndDownloads();
    } catch (err) {
      console.warn("Failed to load news in admin:", err);
    }
  }

  async adminDeleteNews(newsId) {
    if (!confirm("Are you sure you want to delete this news article?")) return;
    try {
      await window.dsaApi.deleteNews(newsId);
      this.showToast("News article deleted", "info");
      await this.loadNewsAdmin();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async loadMediaAdmin() {
    const container = document.getElementById("admMediaList");
    const countEl = document.getElementById("admMediaCount");
    if (!container) return;
    try {
      const media = await window.dsaApi.getMediaAssets();
      if (countEl) countEl.textContent = `${(media || []).length} Stored Assets`;
      if (!media || media.length === 0) {
        container.innerHTML = `<div class="col-span-full p-6 text-center text-theme-steel border border-theme-muted">No media assets uploaded yet. Upload blueprints, CAD renders or certificates.</div>`;
        return;
      }
      container.innerHTML = media.map(m => `
        <div class="p-3 bg-theme-base border border-theme-muted space-y-2 group hover:border-[#C8A24A] transition-all">
          <div class="h-28 bg-black flex items-center justify-center overflow-hidden border border-theme-muted">
            ${m.mimeType.startsWith('image/') 
              ? `<img src="${m.url}" alt="${m.altText || m.originalName}" class="max-h-full max-w-full object-contain" />` 
              : `<div class="text-center text-theme-brass"><span class="text-2xl block">📄</span><span class="text-[9px] uppercase">${m.extension}</span></div>`}
          </div>
          <div>
            <p class="font-bold text-theme-primary truncate" title="${m.originalName}">${m.originalName}</p>
            <p class="text-[10px] text-theme-steel">${(m.sizeBytes / 1024).toFixed(1)} KB • ${m.uploadedAt}</p>
          </div>
          <div class="flex gap-1.5 pt-1 border-t border-theme-muted">
            <button type="button" onclick="navigator.clipboard.writeText('${m.url}'); window.dsaApp.showToast('Copied URL to clipboard: ${m.url}', 'success');" class="flex-1 py-1 bg-theme-surface border border-theme-muted hover:border-theme-brass text-[10px] uppercase font-bold text-center">
              Copy URL
            </button>
            <button type="button" onclick="window.dsaApp.adminDeleteMedia('${m.id}')" class="px-2 py-1 text-[#E4572E] hover:bg-[#E4572E]/10 text-[10px] font-bold">
              ✕
            </button>
          </div>
        </div>
      `).join("");
    } catch (err) {
      console.warn("Failed to load media assets in admin:", err);
    }
  }

  async adminDeleteMedia(mediaId) {
    if (!confirm("Delete this media asset?")) return;
    try {
      await window.dsaApi.deleteMedia(mediaId);
      this.showToast("Media asset deleted", "info");
      await this.loadMediaAdmin();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async refreshCatalogData() {
    const prods = await window.dsaApi.getProducts();
    this.products = prods || [];
    this.renderHomeCatalog();
    this.renderFullCatalog();
  }
}

// Global App Instance & Window Aliases for HTML Handlers
window.dsaApp = new DsaApp();

window.switchRoute = (routeKey) => {
  if (window.dsaRouter) window.dsaRouter.navigate(routeKey);
};
window.openProductDetail = (slugOrId) => {
  if (window.dsaApp) window.dsaApp.openProductDetail(slugOrId);
};
window.addToCart = (itemId, qty) => {
  if (window.dsaApp) window.dsaApp.addToCart(itemId, qty);
};
window.updateCartQty = (itemId, delta) => {
  if (window.dsaApp) window.dsaApp.updateCartQty(itemId, delta);
};
window.toggleFaqItem = (idx) => {
  if (window.dsaApp) window.dsaApp.toggleFaqItem(idx);
};
window.adminDeleteProduct = (id) => {
  if (window.dsaApp) window.dsaApp.adminDeleteProduct(id);
};
window.adminSaveSection = (id) => {
  if (window.dsaApp) window.dsaApp.adminSaveSection(id);
};
window.adminToggleProductVerif = (id, currentVal) => {
  if (window.dsaApp) window.dsaApp.adminToggleProductVerif(id, currentVal);
};
window.adminDeleteUser = (id) => {
  if (window.dsaApp) window.dsaApp.adminDeleteUser(id);
};
window.openEditProductModal = (id) => {
  if (window.dsaApp) window.dsaApp.openEditProductModal(id);
};
window.adminDeleteNews = (id) => {
  if (window.dsaApp) window.dsaApp.adminDeleteNews(id);
};
window.adminDeleteMedia = (id) => {
  if (window.dsaApp) window.dsaApp.adminDeleteMedia(id);
};
window.acceptCookies = () => {
  if (window.dsaApp) {
    window.dsaApp.acceptCookies();
  } else {
    try { localStorage.setItem("DSA_COOKIE_CONSENT", "true"); } catch (e) {}
    const b = document.getElementById("cookieBanner");
    if (b) b.remove();
  }
};

window.addEventListener("DOMContentLoaded", () => {
  window.dsaApp.init();
});
