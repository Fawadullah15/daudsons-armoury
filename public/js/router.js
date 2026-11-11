/**
 * DAUDSONS ARMOURY (PVT.) LTD. — CLIENT-SIDE ROUTER
 * Full HTML5 History API (pushState / popstate) with dynamic deep-link support.
 */

class DsaRouter {
  constructor() {
    this.currentRoute = 'home';
    this.routes = [
      'home',
      'products',
      'firearms',
      'defense',
      'aerospace',
      'engineering',
      'product-detail',
      'shop',
      'cart',
      'checkout',
      'about-us',
      'dealers',
      'news-and-events',
      'daudsons-foundation',
      'downloads',
      'contact-us',
      'legal',
      'privacy-policy',
      'terms',
      'licensing-compliance',
      'admin',
      '404-demo'
    ];

    window.addEventListener('popstate', () => {
      this.handlePath(window.location.pathname, false);
    });
  }

  init() {
    // Intercept clicks on links or buttons with data-route
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-route]');
      if (!target) return;

      const route = target.getAttribute('data-route');
      const param = target.getAttribute('data-route-param');
      if (route) {
        e.preventDefault();
        this.navigate(route, param);
      }
    });

    // Handle initial route based on URL path
    this.handlePath(window.location.pathname, false);
  }

  handlePath(path, push = true) {
    let cleanPath = path.replace(/^\/+|\/+$/g, '');
    if (!cleanPath) cleanPath = 'home';

    // Deep product link
    if (cleanPath.startsWith('product/')) {
      const slug = cleanPath.split('/')[1];
      this.renderRoute('product-detail', slug, push, `/product/${slug}`);
      return;
    }

    // Deep news link
    if (cleanPath.startsWith('news/')) {
      const slug = cleanPath.split('/')[1];
      this.renderRoute('news-and-events', slug, push, `/news/${slug}`);
      return;
    }

    // Deep shop link
    if (cleanPath.startsWith('shop/')) {
      const id = cleanPath.split('/')[1];
      this.renderRoute('shop', id, push, `/shop/${id}`);
      return;
    }

    // Direct legal routes
    if (['privacy-policy', 'terms', 'licensing-compliance', 'legal'].includes(cleanPath)) {
      this.renderRoute('legal', cleanPath, push, `/${cleanPath}`);
      return;
    }

    if (this.routes.includes(cleanPath)) {
      this.renderRoute(cleanPath, null, push, `/${cleanPath === 'home' ? '' : cleanPath}`);
    } else {
      this.renderRoute('404-demo', null, push, `/${cleanPath}`);
    }
  }

  navigate(routeKey, param = null) {
    let urlPath = `/${routeKey === 'home' ? '' : routeKey}`;
    if (routeKey === 'product-detail' && param) {
      urlPath = `/product/${param}`;
    } else if (routeKey === 'news-and-events' && param) {
      urlPath = `/news/${param}`;
    } else if (routeKey === 'shop' && param) {
      urlPath = `/shop/${param}`;
    }
    this.renderRoute(routeKey, param, true, urlPath);
  }

  renderRoute(routeKey, param = null, push = true, urlPath = null) {
    if (push && urlPath !== null && window.location.pathname !== urlPath) {
      window.history.pushState({ route: routeKey, param }, '', urlPath);
    }

    this.currentRoute = routeKey;

    // Hide all views
    const views = document.querySelectorAll('.route-view');
    views.forEach(v => v.classList.add('hidden'));

    // Close mobile menu if open
    const mobileMenu = document.getElementById('mobileMegaMenu');
    if (mobileMenu) mobileMenu.classList.add('hidden');

    const indicator = document.getElementById('activeRouteIndicator');

    // Title mapping
    const titles = {
      home: 'Daudsons Armoury (Pvt.) Ltd. — Made in Pakistan Since 1953',
      products: 'Master Product & Capability Catalog — Daudsons Armoury',
      firearms: 'Firearms Division — Daudsons Armoury',
      defense: 'Defense Division — Ordnance & Systems — Daudsons Armoury',
      aerospace: 'Aerospace Division — AS9100 Rev D — Daudsons Armoury',
      engineering: 'Precision Engineering Division — Daudsons Armoury',
      'product-detail': 'Product Technical Specifications — Daudsons Armoury',
      shop: 'Official Merchandise & Accessories E-Shop — Daudsons Armoury',
      cart: 'Merchandise Cart — Daudsons Armoury',
      checkout: 'Merchandise Checkout — Daudsons Armoury',
      'about-us': 'Heritage & Leadership Since 1953 — Daudsons Armoury',
      dealers: 'Authorized Dealer Network & Interactive Map — Daudsons Armoury',
      'news-and-events': 'News, Defense Expos & CSR — Daudsons Armoury',
      'daudsons-foundation': 'Daudsons Foundation — Philanthropic Trust',
      downloads: 'Technical Datasheets & Brochures — Daudsons Armoury',
      'contact-us': 'Contact & Inbound Procurement RFQ — Daudsons Armoury',
      legal: 'Licensing Compliance & Statutory Warnings — Daudsons Armoury',
      'privacy-policy': 'Privacy Policy — Daudsons Armoury',
      terms: 'Terms of Use & Statutory Warranty — Daudsons Armoury',
      'licensing-compliance': 'Licensing Compliance & MoDP Guidelines — Daudsons Armoury',
      admin: 'Enterprise Core CMS Dashboard — Daudsons Armoury',
      '404-demo': '404 — System Not Found — Daudsons Armoury'
    };

    document.title = titles[routeKey] || 'Daudsons Armoury (Pvt.) Ltd.';

    // Division routes route to catalog with division filter
    if (['firearms', 'defense', 'aerospace', 'engineering'].includes(routeKey)) {
      const prodView = document.getElementById('view-products');
      if (prodView) prodView.classList.remove('hidden');
      if (window.dsaApp && typeof window.dsaApp.setCatalogDivision === 'function') {
        window.dsaApp.setCatalogDivision(routeKey);
      }
      if (indicator) indicator.textContent = `/${routeKey} (DIVISION PORTAL)`;
    } else if (routeKey === 'products') {
      const prodView = document.getElementById('view-products');
      if (prodView) prodView.classList.remove('hidden');
      if (window.dsaApp && typeof window.dsaApp.setCatalogDivision === 'function') {
        window.dsaApp.setCatalogDivision('all');
      }
      if (indicator) indicator.textContent = '/products (MASTER CATALOG)';
    } else if (routeKey === 'checkout') {
      const cartView = document.getElementById('view-cart');
      if (cartView) cartView.classList.remove('hidden');
      if (indicator) indicator.textContent = '/checkout (PKR MERCHANDISE CHECKOUT)';
    } else if (routeKey === 'product-detail') {
      const detailView = document.getElementById('view-product-detail');
      if (detailView) detailView.classList.remove('hidden');
      if (param && window.dsaApp && typeof window.dsaApp.openProductDetail === 'function') {
        window.dsaApp.openProductDetail(param);
      }
      if (indicator) indicator.textContent = `/product/${param || 'detail'}`;
    } else if (['privacy-policy', 'terms', 'licensing-compliance', 'legal'].includes(routeKey)) {
      const legalView = document.getElementById('view-legal');
      if (legalView) legalView.classList.remove('hidden');
      if (indicator) indicator.textContent = `/${routeKey.toUpperCase()}`;
    } else {
      const target = document.getElementById(`view-${routeKey}`);
      if (target) {
        target.classList.remove('hidden');
        if (indicator) indicator.textContent = routeKey === 'home' ? '/ (HOME)' : `/${routeKey}`;
      } else {
        const notFound = document.getElementById('view-404-demo');
        if (notFound) notFound.classList.remove('hidden');
        if (indicator) indicator.textContent = '/404 (NOT FOUND)';
      }
    }

    // Trigger view-specific re-renders
    if (routeKey === 'admin' && window.dsaApp) {
      window.dsaApp.loadAdminData();
    } else if (routeKey === 'cart' || routeKey === 'checkout') {
      if (window.dsaApp) window.dsaApp.renderCartUI();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

window.dsaRouter = new DsaRouter();
