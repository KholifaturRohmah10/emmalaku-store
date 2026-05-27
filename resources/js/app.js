import './bootstrap';
import { categories, findProductBySlug, products, recommendedProducts } from './store/products';

const CART_KEY = 'emmalaku-food-cart-v1';
const CART_DESELECTED_KEY = 'emmalaku-food-cart-deselected-v1';
const INVOICE_KEY = 'emmalaku-food-invoice-v1';
const INVOICE_HISTORY_KEY = 'emmalaku-food-invoice-history-v1';
const NOTIFICATION_ALERTED_KEY = 'emmalaku-food-notification-alerted-v1';
const NOTIFICATION_SEEN_KEY = 'emmalaku-food-notification-seen-v1';
const NOTIFICATION_HIDDEN_KEY = 'emmalaku-food-notification-hidden-v1';
const PROFILE_KEY = 'emmalaku-food-profile-v1';
const THEME_KEY = 'emmalaku-food-theme-v1';
const SIDEBAR_KEY = 'emmalaku-food-sidebar-collapsed-v1';
const NOTIFICATION_SWIPE_REVEAL = 84;
const NOTIFICATION_CHECK_INTERVAL_MS = 15000;

const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
});

const compactDateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const notificationDateFormatter = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

const notificationTimeFormatter = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
});

const addMonths = (date, months = 1) => {
    const nextDate = new Date(date);
    const originalDate = nextDate.getDate();

    nextDate.setMonth(nextDate.getMonth() + months);

    if (nextDate.getDate() !== originalDate) {
        nextDate.setDate(0);
    }

    return nextDate;
};

const addDays = (date, days = 0) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (leftDate, rightDate) => startOfDay(leftDate).getTime() === startOfDay(rightDate).getTime();

const getInvoiceExpiresAt = (invoice) =>
    invoice.expiresAt ? new Date(invoice.expiresAt) : addMonths(new Date(invoice.createdAt), 1);

const page = document.body.dataset.page ?? '';
const detailState = {
    productSlug: null,
    quantity: 1,
    selections: {},
    editLineId: null,
};
let homePromoIntervalId = null;
let notificationMonitorIntervalId = null;
let notificationTitleFlashIntervalId = null;
let notificationTitleResetTimeoutId = null;
let notificationListSignature = '';
const defaultDocumentTitle = document.title;
const MOTION_TARGET_SELECTORS = [
    '.page-stack > *',
    '.home-stack > *',
    '.checkout-stack > *',
    '.menu-grid > *',
    '.category-grid > *',
    '.highlight-grid > *',
    '.history-list > *',
    '.notification-list > *',
    '.order-list > *',
    '.checkout-items > *',
    '.invoice-card > *',
    '.invoice-grid > *',
    '.invoice-items > *',
    '.payment-grid > *',
    '.quick-cart-card__items > *',
    '.filter-row > *',
    '.detail-card > *',
    '.option-group',
];
const MOTION_CONTAINER_ONLY_SELECTORS = [
    '.menu-grid',
    '.category-grid',
    '.highlight-grid',
    '.history-list',
    '.notification-list',
    '.order-list',
    '.checkout-items',
    '.invoice-card',
    '.invoice-grid',
    '.invoice-items',
    '.payment-grid',
    '.quick-cart-card__items',
    '.filter-row',
];
let motionObserver = null;
let motionMutationObserver = null;
let motionRefreshFrameId = 0;

const applyTheme = (theme = 'day') => {
    const normalizedTheme = theme === 'night' ? 'night' : 'day';
    document.documentElement.dataset.theme = normalizedTheme;
    document.querySelectorAll('.js-theme-label').forEach((element) => {
        element.textContent = normalizedTheme === 'night' ? 'Siang' : 'Malam';
    });
    document.querySelectorAll('.js-theme-toggle').forEach((element) => {
        element.setAttribute(
            'aria-label',
            normalizedTheme === 'night' ? 'Ganti tampilan siang' : 'Ganti tampilan malam',
        );
    });
};

const toggleTheme = () => {
    const nextTheme = document.documentElement.dataset.theme === 'night' ? 'day' : 'night';
    writeStorage(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
};

const setSidebarCollapsed = (isCollapsed) => {
    document.documentElement.classList.toggle('sidebar-collapsed', isCollapsed);
    document.querySelectorAll('.js-sidebar-toggle').forEach((element) => {
        element.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
        element.setAttribute('aria-label', isCollapsed ? 'Buka menu' : 'Tutup menu');
    });
};

const toggleSidebar = () => {
    const nextCollapsed = !document.documentElement.classList.contains('sidebar-collapsed');
    writeStorage(SIDEBAR_KEY, nextCollapsed);
    setSidebarCollapsed(nextCollapsed);
};

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const isMotionContainerOnly = (element) =>
    MOTION_CONTAINER_ONLY_SELECTORS.some((selector) => element.matches(selector));

const getMotionTargets = (root = document) => {
    const targets = new Set();

    MOTION_TARGET_SELECTORS.forEach((selector) => {
        root.querySelectorAll(selector).forEach((element) => targets.add(element));
    });

    return [...targets].filter((element) => !isMotionContainerOnly(element) && !element.closest('.motion-skip'));
};

const getMotionVariant = (element) => {
    if (element.matches('.menu-card, .category-card, .history-card, .notification-card, .highlight-card, .payment-option, .order-item, .checkout-item, .invoice-item')) {
        return 'card';
    }

    if (element.matches('.home-opening, .promo-banner, .detail-card, .quick-cart-card, .order-summary-card, .invoice-panel, .content-block')) {
        return 'soft';
    }

    return 'rise';
};

const getMotionKeyframes = (variant = 'rise') => {
    if (variant === 'card') {
        return [
            { opacity: 0, transform: 'translateY(22px) scale(0.97)', filter: 'blur(8px)' },
            { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
        ];
    }

    if (variant === 'soft') {
        return [
            { opacity: 0, transform: 'translateY(16px) scale(0.99)', filter: 'blur(6px)' },
            { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
        ];
    }

    return [
        { opacity: 0, transform: 'translateY(20px)', filter: 'blur(6px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
    ];
};

const revealMotionElement = (element) => {
    if (element.dataset.motionVisible === 'true') {
        return;
    }

    element.dataset.motionVisible = 'true';

    if (prefersReducedMotion() || typeof element.animate !== 'function') {
        element.classList.add('is-visible');
        return;
    }

    const delay = Number(element.dataset.motionDelay ?? 0);
    const animation = element.animate(getMotionKeyframes(element.dataset.motion), {
        duration: 620,
        delay,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both',
    });

    animation.onfinish = () => {
        element.classList.add('is-visible');
    };
};

const shouldRevealMotionElementNow = (element) => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    if (rect.width === 0 && rect.height === 0) {
        return false;
    }

    return rect.top <= viewportHeight + 80
        && rect.bottom >= -24
        && rect.left <= viewportWidth
        && rect.right >= 0;
};

const decorateMotionTargets = (root = document) => {
    const targets = getMotionTargets(root);
    const groupedTargets = new Map();

    targets.forEach((element) => {
        element.classList.add('motion-item');
        element.dataset.motion = element.dataset.motion || getMotionVariant(element);

        const parent = element.parentElement ?? document.body;

        if (!groupedTargets.has(parent)) {
            groupedTargets.set(parent, []);
        }

        groupedTargets.get(parent).push(element);
    });

    groupedTargets.forEach((elements) => {
        elements.forEach((element, index) => {
            element.dataset.motionDelay = String(Math.min(index, 8) * 55);

            if (prefersReducedMotion()) {
                element.classList.add('is-visible');
                element.dataset.motionVisible = 'true';
                return;
            }

            if (shouldRevealMotionElementNow(element)) {
                revealMotionElement(element);
                return;
            }

            if (element.dataset.motionObserved === 'true' || element.dataset.motionVisible === 'true') {
                return;
            }

            motionObserver?.observe(element);
            element.dataset.motionObserved = 'true';
        });
    });
};

const queueMotionRefresh = (root = document) => {
    if (motionRefreshFrameId) {
        window.cancelAnimationFrame(motionRefreshFrameId);
    }

    motionRefreshFrameId = window.requestAnimationFrame(() => {
        motionRefreshFrameId = 0;
        decorateMotionTargets(root);
    });
};

const setupMotionSystem = () => {
    const screen = document.querySelector('.app-screen');

    if (!screen) {
        return;
    }

    if (!motionObserver && !prefersReducedMotion()) {
        motionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                revealMotionElement(entry.target);
                motionObserver?.unobserve(entry.target);
            });
        }, {
            threshold: 0.01,
            rootMargin: '0px 0px 12% 0px',
        });
    }

    if (!motionMutationObserver) {
        motionMutationObserver = new MutationObserver((mutations) => {
            const shouldRefresh = mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length);

            if (shouldRefresh) {
                queueMotionRefresh(screen);
            }
        });

        motionMutationObserver.observe(screen, { childList: true, subtree: true });
    }

    queueMotionRefresh(screen);
    window.requestAnimationFrame(() => document.body.classList.add('motion-ready'));
};

const categoryMeta = {
    Minuman: {
        accent: '#ef5a97',
        icon: 'MT',
        image: '/images/menu/honey-milk-tea.png',
    },
    'Makanan Berat': {
        accent: '#7567f8',
        icon: 'ML',
        image: '/images/menu/nasi-goreng.png',
    },
    Camilan: {
        accent: '#4aa67a',
        icon: 'SN',
        image: '/images/menu/crispy-burger.png',
    },
    Spesial: {
        accent: '#e54863',
        icon: 'SP',
        image: '/images/menu/pepperoni-pizza.png',
    },
    'Hidangan Manis': {
        accent: '#ff83a7',
        icon: 'DS',
        image: '/images/menu/berry-cheesecake.png',
    },
    Bakso: {
        accent: '#6d8b55',
        icon: 'BK',
        image: '/images/menu/bakso-kuah.png',
    },
    Mie: {
        accent: '#d49a3a',
        icon: 'MI',
        image: '/images/menu/mie-ayam.png',
    },
    'Sayur & Salad': {
        accent: '#509f67',
        icon: 'SS',
        image: '/images/menu/gado-gado.png',
    },
    Dimsum: {
        accent: '#d79a72',
        icon: 'DM',
        image: '/images/menu/dimsum-ayam.png',
    },
};

const formatCurrency = (value) => currencyFormatter.format(value);

const escapeHtml = (value) =>
    String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

const nl2br = (value) => escapeHtml(value).replaceAll('\n', '<br>');

const productUrl = (slug) => `/produk/${slug}`;

const getCategoryMeta = (category) => categoryMeta[category] ?? { accent: '#ef5a97', icon: 'FD' };

const hasBogoPromo = (product) => ['BOGO', 'Beli 1 Gratis 1'].includes(product?.promo);

const getDiscountPercent = (product) => {
    const match = String(product?.promo ?? '').match(/Diskon\s+(\d{1,2})%/i);
    const percent = match ? Number(match[1]) : 0;

    return percent > 0 && percent < 100 ? percent : 0;
};

const getOptionPriceAdjustment = (group, value) => {
    const amount = Number(group?.pricing?.[value] ?? 0);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const getSelectionPriceAdjustment = (product, selectionsOverride = null) => {
    const selections = normalizeSelections(product, selectionsOverride ?? product.selections ?? {});

    return (product.options ?? []).reduce(
        (total, group) => total + getOptionPriceAdjustment(group, selections[group.id]),
        0,
    );
};

const getProductOriginalPrice = (product, selectionsOverride = null) =>
    product.price + getSelectionPriceAdjustment(product, selectionsOverride);

const getProductPrice = (product, selectionsOverride = null) =>
    Math.round(product.price * (100 - getDiscountPercent(product)) / 100) + getSelectionPriceAdjustment(product, selectionsOverride);

const getProductSavings = (product, quantity = 1, selectionsOverride = null) =>
    (getProductOriginalPrice(product, selectionsOverride) - getProductPrice(product, selectionsOverride))
    * Math.max(1, Number(quantity) || 1);

const formatOptionChoiceLabel = (group, value) => {
    if (!value) {
        return '';
    }

    const adjustment = getOptionPriceAdjustment(group, value);

    return adjustment > 0 ? `${value} (+${formatCurrency(adjustment)})` : value;
};

const isNeutralOptionValue = (value) => /^tanpa\b/i.test(String(value ?? '').trim());

const shouldHideSelectionSummaryValue = (group, value) =>
    ['topping', 'add_on', 'extra'].includes(group?.id) && isNeutralOptionValue(value);

const priceTemplate = (product, quantity = 1, strongClass = '', selectionsOverride = null) => {
    const discountPercent = getDiscountPercent(product);
    const safeQuantity = Math.max(1, Number(quantity) || 1);
    const effectiveSelections = selectionsOverride ?? product.selections ?? {};
    const finalUnitPrice = Number(product.unitPrice) || getProductPrice(product, effectiveSelections);
    const originalUnitPrice = Number(product.originalUnitPrice) || getProductOriginalPrice(product, effectiveSelections);
    const finalPrice = finalUnitPrice * safeQuantity;

    if (!discountPercent || originalUnitPrice <= finalUnitPrice) {
        return `<strong class="${strongClass}">${formatCurrency(finalPrice)}</strong>`;
    }

    return `
        <div class="price-stack">
            <del>${formatCurrency(originalUnitPrice * safeQuantity)}</del>
            <strong class="${strongClass}">${formatCurrency(finalPrice)}</strong>
        </div>
    `;
};

const getDisplayQuantityForProduct = (product, quantity = 1) =>
    hasBogoPromo(product) ? Math.max(1, Number(quantity) || 1) * 2 : Math.max(1, Number(quantity) || 1);

const getDisplayQuantityForItem = (item) =>
    Number(item.displayQuantity) || getDisplayQuantityForProduct(item, item.quantity ?? 1);

const formatItemQuantity = (item) => `x${getDisplayQuantityForItem(item)}`;

const formatOrderItemDetails = (item) => {
    const parts = [];
    const baseSummary = item.selectionSummary?.trim();

    if (baseSummary) {
        parts.push(baseSummary);
    }

    if (hasBogoPromo(item)) {
        parts.push(`Promo Beli 1 Gratis 1 - ${formatItemQuantity(item)}`);
    } else {
        parts.push(formatItemQuantity(item));
    }

    return parts.join(' - ');
};

const formatCartVariantSummary = (item) => {
    const labels = {
        sweetness: 'Gula',
        ice: 'Es',
        spice: 'Pedas',
        sauce: 'Saus',
    };
    const parts = (item.options ?? [])
        .map((group) => {
            const value = item.selections?.[group.id];

            if (!value || isNeutralOptionValue(value)) {
                return null;
            }

            const optionLabel = formatOptionChoiceLabel(group, value);

            return labels[group.id] ? `${labels[group.id]} ${optionLabel}` : optionLabel;
        })
        .filter(Boolean);

    return parts.slice(0, 3).join(' • ') || item.category;
};

const cartItemMetaTemplate = (item) => `
    <p class="order-item__variant">${escapeHtml(formatCartVariantSummary(item))}</p>
    ${
        hasBogoPromo(item)
            ? `<span class="order-item__promo">Beli 1 Gratis 1 • ${formatItemQuantity(item)}</span>`
            : ''
    }
`;

const getPromoToastMessage = (product, quantity = 1) =>
    `Promo Beli 1 Gratis 1 aktif. ${Math.max(1, Number(quantity) || 1)} pesanan jadi ${getDisplayQuantityForProduct(product, quantity)} menu.`;

const readStorage = (key, fallback) => {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const writeStorage = (key, value) => {
    window.localStorage.setItem(key, JSON.stringify(value));
};

const getDefaultSelections = (product) =>
    Object.fromEntries((product.options ?? []).map((group) => [group.id, group.default ?? group.options[0] ?? '']));

const normalizeSelections = (product, selections = {}) =>
    Object.fromEntries(
        (product.options ?? []).map((group) => {
            const chosen = selections[group.id];
            const allowed = group.options ?? [];
            const fallback = group.default ?? allowed[0] ?? '';

            return [group.id, allowed.includes(chosen) ? chosen : fallback];
        }),
    );

const stableSelectionKey = (selections) =>
    JSON.stringify(
        Object.keys(selections)
            .sort()
            .reduce((carry, key) => {
                carry[key] = selections[key];
                return carry;
            }, {}),
    );

const buildLineId = (slug, selections) => `${slug}::${stableSelectionKey(selections)}`;

const normalizeCart = (items) =>
    items
        .map((item) => {
            const product = findProductBySlug(item.slug);

            if (!product) {
                return null;
            }

            const selections = normalizeSelections(product, item.selections ?? {});

            return {
                slug: item.slug,
                quantity: Math.max(1, Number(item.quantity) || 1),
                selections,
                lineId: buildLineId(item.slug, selections),
            };
        })
        .filter(Boolean);

const getCart = () => normalizeCart(readStorage(CART_KEY, []));

const getCartItem = (lineId) => getCart().find((item) => item.lineId === lineId) ?? null;

const getDeselectedCartLineIds = () => {
    const currentLineIds = new Set(getCart().map((item) => item.lineId));

    return readStorage(CART_DESELECTED_KEY, []).filter((lineId) => currentLineIds.has(lineId));
};

const saveDeselectedCartLineIds = (lineIds) => {
    const currentLineIds = new Set(getCart().map((item) => item.lineId));
    writeStorage(CART_DESELECTED_KEY, [...new Set(lineIds)].filter((lineId) => currentLineIds.has(lineId)));
};

const isCartLineSelected = (lineId) => !getDeselectedCartLineIds().includes(lineId);

const toggleCartLineSelection = (lineId) => {
    const deselected = getDeselectedCartLineIds();
    const nextDeselected = deselected.includes(lineId)
        ? deselected.filter((itemLineId) => itemLineId !== lineId)
        : [...deselected, lineId];

    saveDeselectedCartLineIds(nextDeselected);
};

const getInvoiceHistory = () => {
    const storedHistory = readStorage(INVOICE_HISTORY_KEY, null);

    if (Array.isArray(storedHistory)) {
        return storedHistory.filter((invoice) => invoice?.id && Array.isArray(invoice.items));
    }

    const legacyInvoice = readStorage(INVOICE_KEY, null);

    return legacyInvoice?.id && Array.isArray(legacyInvoice.items) ? [legacyInvoice] : [];
};

const getSeenNotificationIds = () =>
    readStorage(NOTIFICATION_SEEN_KEY, []).filter((notificationId) => typeof notificationId === 'string');

const saveSeenNotificationIds = (notificationIds) => {
    writeStorage(NOTIFICATION_SEEN_KEY, [...new Set(notificationIds)]);
};

const getAlertedNotificationIds = () => {
    const storedIds = readStorage(NOTIFICATION_ALERTED_KEY, null);

    return Array.isArray(storedIds) ? storedIds.filter((notificationId) => typeof notificationId === 'string') : null;
};

const saveAlertedNotificationIds = (notificationIds) => {
    writeStorage(NOTIFICATION_ALERTED_KEY, [...new Set(notificationIds)]);
};

const getHiddenNotificationIds = () =>
    readStorage(NOTIFICATION_HIDDEN_KEY, []).filter((notificationId) => typeof notificationId === 'string');

const saveHiddenNotificationIds = (notificationIds) => {
    writeStorage(NOTIFICATION_HIDDEN_KEY, [...new Set(notificationIds)]);
};

const hideNotifications = (notificationIds = []) => {
    const nextHiddenIds = [...getHiddenNotificationIds(), ...notificationIds];
    saveHiddenNotificationIds(nextHiddenIds);
};

const saveCart = (items) => {
    const normalized = normalizeCart(items);
    writeStorage(
        CART_KEY,
        normalized.map(({ lineId, ...item }) => item),
    );
};

const formatSelectionSummary = (product, selections) =>
    (product.options ?? [])
        .map((group) => {
            const value = selections[group.id];

            if (shouldHideSelectionSummaryValue(group, value)) {
                return null;
            }

            return formatOptionChoiceLabel(group, value);
        })
        .filter(Boolean)
        .join(' * ');

const getCartDetails = () =>
    getCart()
        .map((item) => {
            const product = findProductBySlug(item.slug);

            if (!product) {
                return null;
            }

            return {
                ...product,
                lineId: item.lineId,
                quantity: item.quantity,
                displayQuantity: getDisplayQuantityForProduct(product, item.quantity),
                selections: item.selections,
                selectionSummary: formatSelectionSummary(product, item.selections),
                unitPrice: getProductPrice(product, item.selections),
                originalUnitPrice: getProductOriginalPrice(product, item.selections),
                discountPercent: getDiscountPercent(product),
                savings: getProductSavings(product, item.quantity, item.selections),
                subtotal: getProductPrice(product, item.selections) * item.quantity,
            };
        })
        .filter(Boolean);

const getSelectedCartDetails = () => getCartDetails().filter((item) => isCartLineSelected(item.lineId));

const getCartCount = () =>
    getCart().reduce((total, item) => {
        const product = findProductBySlug(item.slug);

        return total + (product ? getDisplayQuantityForProduct(product, item.quantity) : item.quantity);
    }, 0);

const getCartSubtotal = (items = getCartDetails()) => items.reduce((total, item) => total + item.subtotal, 0);

const getCartOriginalSubtotal = (items = getCartDetails()) =>
    items.reduce((total, item) => total + (item.originalUnitPrice ?? item.price) * item.quantity, 0);

const getCartDiscountTotal = (items = getCartDetails()) => getCartOriginalSubtotal(items) - getCartSubtotal(items);

const getDeliveryFee = (items = getCartDetails()) => (items.length ? 9000 : 0);

const getServiceFee = (items = getCartDetails()) => (items.length ? 3000 : 0);

const getGrandTotal = (items = getCartDetails()) => getCartSubtotal(items) + getDeliveryFee(items) + getServiceFee(items);

const addToCart = (slug, quantity = 1, selectionsOverride = null) => {
    const product = findProductBySlug(slug);

    if (!product) {
        return null;
    }

    const nextQuantity = Math.max(1, Number(quantity) || 1);
    const selections = normalizeSelections(product, selectionsOverride ?? getDefaultSelections(product));
    const lineId = buildLineId(slug, selections);
    const cart = getCart();
    const currentIndex = cart.findIndex((item) => item.lineId === lineId);

    if (currentIndex >= 0) {
        cart[currentIndex].quantity += nextQuantity;
    } else {
        cart.push({ slug, quantity: nextQuantity, selections, lineId });
    }

    saveCart(cart);
    updateCartIndicators();

    return {
        promoApplied: hasBogoPromo(product),
        quantity: nextQuantity,
        displayQuantity: getDisplayQuantityForProduct(product, nextQuantity),
        product,
    };
};

const updateCartItem = (currentLineId, slug, quantity = 1, selectionsOverride = null) => {
    const product = findProductBySlug(slug);

    if (!product) {
        return null;
    }

    const selections = normalizeSelections(product, selectionsOverride ?? getDefaultSelections(product));
    const nextLineId = buildLineId(slug, selections);
    const nextQuantity = Math.max(1, Number(quantity) || 1);
    const cart = getCart();
    const currentIndex = cart.findIndex((item) => item.lineId === currentLineId);

    if (currentIndex < 0) {
        return null;
    }

    cart.splice(currentIndex, 1);

    const mergeIndex = cart.findIndex((item) => item.lineId === nextLineId);

    if (mergeIndex >= 0) {
        cart[mergeIndex].quantity += nextQuantity;
    } else {
        cart.push({ slug, quantity: nextQuantity, selections, lineId: nextLineId });
    }

    saveCart(cart);
    updateCartIndicators();

    return {
        updated: true,
        promoApplied: hasBogoPromo(product),
        quantity: nextQuantity,
        displayQuantity: getDisplayQuantityForProduct(product, nextQuantity),
        product,
    };
};

const removeFromCart = (lineId) => {
    saveCart(getCart().filter((item) => item.lineId !== lineId));
    updateCartIndicators();
};

const changeCartQuantity = (lineId, delta) => {
    const cart = getCart();
    const currentIndex = cart.findIndex((item) => item.lineId === lineId);

    if (currentIndex < 0) {
        return;
    }

    const nextQuantity = cart[currentIndex].quantity + delta;

    if (nextQuantity <= 0) {
        cart.splice(currentIndex, 1);
    } else {
        cart[currentIndex].quantity = nextQuantity;
    }

    saveCart(cart);
    updateCartIndicators();
};

const clearCart = () => {
    window.localStorage.removeItem(CART_KEY);
    window.localStorage.removeItem(CART_DESELECTED_KEY);
    updateCartIndicators();
};

const clearPurchasedCartItems = (purchasedItems) => {
    const purchasedLineIds = new Set(purchasedItems.map((item) => item.lineId));

    if (!purchasedLineIds.size) {
        return;
    }

    saveCart(getCart().filter((item) => !purchasedLineIds.has(item.lineId)));
    saveDeselectedCartLineIds(getDeselectedCartLineIds().filter((lineId) => !purchasedLineIds.has(lineId)));
    updateCartIndicators();
};

const showToast = (message) => {
    const root = document.getElementById('toast-root');

    if (!root) {
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    root.appendChild(toast);

    window.setTimeout(() => toast.classList.add('is-visible'), 20);
    window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
    window.setTimeout(() => toast.remove(), 3000);
};

const stopNotificationTitleAlert = () => {
    if (notificationTitleFlashIntervalId !== null) {
        window.clearInterval(notificationTitleFlashIntervalId);
        notificationTitleFlashIntervalId = null;
    }

    if (notificationTitleResetTimeoutId !== null) {
        window.clearTimeout(notificationTitleResetTimeoutId);
        notificationTitleResetTimeoutId = null;
    }

    document.title = defaultDocumentTitle;
};

const getIncomingNotificationToastMessage = (incomingNotifications = []) => {
    if (!incomingNotifications.length) {
        return '';
    }

    return incomingNotifications.length === 1
        ? `Notifikasi baru: ${incomingNotifications[0].title}.`
        : `${incomingNotifications.length} notifikasi baru masuk. Cek menu Notifikasi.`;
};

const flashNotificationTitle = (incomingNotifications = []) => {
    if (!incomingNotifications.length || document.visibilityState === 'visible') {
        return;
    }

    const highlightedTitle = incomingNotifications.length === 1
        ? `${incomingNotifications[0].title} | ${defaultDocumentTitle}`
        : `(${incomingNotifications.length}) Notifikasi Baru | ${defaultDocumentTitle}`;

    stopNotificationTitleAlert();

    let showHighlightedTitle = true;
    document.title = highlightedTitle;
    notificationTitleFlashIntervalId = window.setInterval(() => {
        document.title = showHighlightedTitle ? highlightedTitle : defaultDocumentTitle;
        showHighlightedTitle = !showHighlightedTitle;
    }, 900);
    notificationTitleResetTimeoutId = window.setTimeout(() => {
        stopNotificationTitleAlert();
    }, 7200);
};

const showBrowserNotificationAlert = (incomingNotifications = []) => {
    if (
        !incomingNotifications.length
        || !('Notification' in window)
        || window.Notification.permission !== 'granted'
        || document.visibilityState === 'visible'
    ) {
        return;
    }

    const firstNotification = incomingNotifications[0];
    const title = incomingNotifications.length === 1 ? firstNotification.title : `${incomingNotifications.length} notifikasi baru`;
    const body = incomingNotifications.length === 1
        ? `${firstNotification.message} | ${firstNotification.invoiceId}`
        : `${incomingNotifications.length} update pesanan baru tersedia di EMMALAKU.`;

    try {
        const browserNotification = new window.Notification(title, {
            body,
            tag: incomingNotifications.length === 1 ? firstNotification.id : `incoming-${Date.now()}`,
            icon: `${window.location.origin}/images/brand/emmalaku-shop.svg`,
            badge: `${window.location.origin}/images/brand/emmalaku-shop.svg`,
        });

        browserNotification.onclick = () => {
            window.focus();
            browserNotification.close();
            window.location.assign('/notifikasi');
        };

        window.setTimeout(() => browserNotification.close(), 6500);
    } catch {
        // Fall back to the in-app toast when the browser blocks system notifications.
    }
};

const triggerIncomingNotificationAlert = (incomingNotifications = []) => {
    const toastMessage = getIncomingNotificationToastMessage(incomingNotifications);

    if (!toastMessage) {
        return;
    }

    showToast(toastMessage);

    if (navigator.vibrate) {
        navigator.vibrate(incomingNotifications.length > 1 ? [140, 80, 140] : [180]);
    }

    flashNotificationTitle(incomingNotifications);
    showBrowserNotificationAlert(incomingNotifications);
};

const confirmAction = ({ title = 'Lanjutkan aksi?', message, confirmText = 'Ya, lanjut', showCancel = true }) =>
    new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleElement = document.getElementById('confirm-title');
        const messageElement = document.getElementById('confirm-message');
        const okButton = modal?.querySelector('[data-confirm-ok]');
        const cancelButtons = modal?.querySelectorAll('[data-confirm-cancel]');
        const cancelActionButtons = modal?.querySelectorAll('.confirm-modal__actions [data-confirm-cancel]');

        if (!modal || !titleElement || !messageElement || !okButton || !cancelButtons?.length) {
            resolve(window.confirm(message));
            return;
        }

        const close = (result) => {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            okButton.removeEventListener('click', handleConfirm);
            cancelButtons.forEach((button) => button.removeEventListener('click', handleCancel));
            document.removeEventListener('keydown', handleKeydown);
            resolve(result);
        };

        const handleConfirm = () => close(true);
        const handleCancel = () => {
            if (!showCancel) {
                return;
            }

            close(false);
        };
        const handleKeydown = (event) => {
            if (event.key === 'Escape' && showCancel) {
                close(false);
            }
        };

        titleElement.textContent = title;
        messageElement.textContent = message;
        okButton.textContent = confirmText;
        cancelActionButtons?.forEach((button) => button.classList.toggle('hidden', !showCancel));
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');

        okButton.addEventListener('click', handleConfirm);
        cancelButtons.forEach((button) => button.addEventListener('click', handleCancel));
        document.addEventListener('keydown', handleKeydown);
        okButton.focus();
    });

const alertAction = ({ title, message, confirmText = 'OK' }) =>
    confirmAction({ title, message, confirmText, showCancel: false });

const categoryTileTemplate = (category) => {
    const meta = getCategoryMeta(category);

    return `
        <a href="/produk?category=${encodeURIComponent(category)}" class="category-card" style="--category-accent:${meta.accent}">
            <span class="category-card__icon ${meta.image ? 'category-card__icon--image' : ''}">
                ${
                    meta.image
                        ? `<img src="${meta.image}" alt="${escapeHtml(category)}">`
                        : escapeHtml(meta.icon)
                }
            </span>
            <span class="category-card__label">${escapeHtml(category)}</span>
        </a>
    `;
};

const productCardTemplate = (product) => {
    const meta = getCategoryMeta(product.category);

    return `
        <article class="menu-card">
            <a href="${productUrl(product.slug)}" class="menu-card__media">
                <img src="${product.image}" alt="${escapeHtml(product.name)}">
                <span class="menu-card__promo">${escapeHtml(product.promo)}</span>
            </a>
            <div class="menu-card__body">
                <div class="menu-card__meta">
                    <span>${product.prepTime} menit</span>
                    <span>${product.rating.toFixed(1)}</span>
                </div>
                <a href="${productUrl(product.slug)}" class="menu-card__name">${escapeHtml(product.shortName)}</a>
                <div class="menu-card__footer">
                    <div class="menu-card__summary">
                        ${priceTemplate(product)}
                        <span class="menu-card__category" style="color:${meta.accent}">${escapeHtml(product.category)}</span>
                    </div>
                    <button type="button" class="menu-card__add js-add-to-cart" data-slug="${product.slug}" aria-label="Tambah ${escapeHtml(product.name)}">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 6h2l1.5 8.5h9.5l2-6H8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                            <circle cx="10" cy="18.2" r="1.35" fill="currentColor" />
                            <circle cx="17.2" cy="18.2" r="1.35" fill="currentColor" />
                        </svg>
                    </button>
                </div>
            </div>
        </article>
    `;
};

const summaryRowsTemplate = (items, totalLabel = 'Total') => `
    <div class="summary-list">
        <div class="summary-row">
            <span>Subtotal menu</span>
            <strong>${formatCurrency(getCartOriginalSubtotal(items))}</strong>
        </div>
        ${
            getCartDiscountTotal(items) > 0
                ? `
                    <div class="summary-row summary-row--discount">
                        <span>Diskon menu</span>
                        <strong>- ${formatCurrency(getCartDiscountTotal(items))}</strong>
                    </div>
                `
                : ''
        }
        <div class="summary-row">
            <span>Ongkir</span>
            <strong>${formatCurrency(getDeliveryFee(items))}</strong>
        </div>
        <div class="summary-row">
            <span>Biaya layanan</span>
            <strong>${formatCurrency(getServiceFee(items))}</strong>
        </div>
        <div class="summary-row summary-row--total">
            <span>${totalLabel}</span>
            <strong>${formatCurrency(getGrandTotal(items))}</strong>
        </div>
    </div>
`;

const cartPaybarTotalTemplate = (items) => `
    <div class="cart-paybar__summary">
        <span class="cart-paybar__hint">${items.reduce((total, item) => total + item.displayQuantity, 0)} item dipilih</span>
        <div class="cart-paybar__total">
            <span>Total</span>
            <strong>${formatCurrency(getGrandTotal(items))}</strong>
        </div>
    </div>
`;

const filterProductsByQuery = (searchTerm = '', selectedCategory = 'Semua') => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
        const matchesCategory = selectedCategory === 'Semua' || product.category === selectedCategory;
        const haystack = `${product.name} ${product.category} ${product.description} ${product.tagline}`.toLowerCase();
        const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);

        return matchesCategory && matchesSearch;
    });
};

const renderHomePromo = () => {
    const container = document.getElementById('home-promo');

    if (!container) {
        return;
    }

    const promoSlides = [
        {
            eyebrow: 'Voucher Online',
            title: 'Dapatkan Voucher Menarik',
            description: 'Pesan online di sini, harga lebih murah dan bebas antrean.',
            image: products.find((product) => product.slug === 'pepperoni-pizza')?.image,
            href: '/produk',
            variant: 'voucher',
        },
        {
            eyebrow: 'Beli 1 Gratis 1',
            title: 'Honey Milk Tea',
            description: 'Promo ulang tahun, beli 1 jadi 2 minuman.',
            image: products.find((product) => product.slug === 'honey-milk-tea')?.image,
            href: productUrl('honey-milk-tea'),
        },
        {
            eyebrow: 'Promo Minuman Dingin',
            title: 'Chocolate Frappe',
            description: 'Favorit dingin dengan topping creamy seharian.',
            image: products.find((product) => product.slug === 'iced-chocolate-frappe')?.image,
            href: productUrl('iced-chocolate-frappe'),
        },
        {
            eyebrow: 'Spesial Makanan',
            title: 'Spicy Ramen',
            description: 'Menu hangat untuk makan siang dan malam.',
            image: products.find((product) => product.slug === 'spicy-ramen')?.image,
            href: productUrl('spicy-ramen'),
        },
        {
            eyebrow: 'Manis Favorit',
            title: 'Berry Cheesecake',
            description: 'Hidangan manis untuk melengkapi pesanan.',
            image: products.find((product) => product.slug === 'berry-cheesecake')?.image,
            href: productUrl('berry-cheesecake'),
        },
        {
            eyebrow: 'Waktu Matcha',
            title: 'Matcha Latte',
            description: 'Teh hijau creamy dengan manis seimbang.',
            image: products.find((product) => product.slug === 'matcha-latte')?.image,
            href: productUrl('matcha-latte'),
        },
        {
            eyebrow: 'Promo Camilan',
            title: 'Crispy Burger',
            description: 'Burger renyah untuk ngemil cepat.',
            image: products.find((product) => product.slug === 'crispy-burger')?.image,
            href: productUrl('crispy-burger'),
        },
        {
            eyebrow: 'Menu Rame-Rame',
            title: 'Pepperoni Pizza',
            description: 'Pizza keju untuk makan bareng.',
            image: products.find((product) => product.slug === 'pepperoni-pizza')?.image,
            href: productUrl('pepperoni-pizza'),
        },
        {
            eyebrow: 'Pilihan Rice Bowl',
            title: 'Chicken Bowl',
            description: 'Ayam glazed gurih di atas nasi hangat.',
            image: products.find((product) => product.slug === 'grilled-chicken-bowl')?.image,
            href: productUrl('grilled-chicken-bowl'),
        },
    ].filter((slide) => slide.image);

    if (!promoSlides.length) {
        container.innerHTML = '<div class="promo-banner__placeholder"></div>';
        return;
    }

    let activeIndex = 0;
    let gestureStartX = 0;
    let gestureStartY = 0;
    let isSwipingPromo = false;

    const renderSlide = () => {
        const slide = promoSlides[activeIndex];

        container.innerHTML = `
            <div class="promo-banner__frame">
                <a href="${slide.href}" class="promo-banner__slide ${slide.variant ? `promo-banner__slide--${escapeHtml(slide.variant)}` : ''}">
                    <div class="promo-banner__ambient" aria-hidden="true">
                        <img src="${slide.image}" alt="">
                    </div>
                    <div class="promo-banner__copy">
                        <span class="promo-banner__tag">${escapeHtml(slide.eyebrow)}</span>
                        <h2>${escapeHtml(slide.title)}</h2>
                        <p>${escapeHtml(slide.description)}</p>
                    </div>
                    <div class="promo-banner__visual promo-banner__visual--single">
                        <img src="${slide.image}" alt="${escapeHtml(slide.title)}">
                    </div>
                </a>
            </div>
            <div class="promo-banner__dots">
                ${promoSlides
                    .map(
                        (_, index) => `
                            <button
                                type="button"
                                class="promo-banner__dot ${index === activeIndex ? 'is-active' : ''} js-promo-dot"
                                data-index="${index}"
                                aria-label="Promo ${index + 1}"
                            ></button>
                        `,
                    )
                    .join('')}
            </div>
        `;
    };

    const setSlide = (index) => {
        activeIndex = (index + promoSlides.length) % promoSlides.length;
        renderSlide();
    };

    const startAutoplay = () => {
        if (homePromoIntervalId) {
            window.clearInterval(homePromoIntervalId);
        }

        homePromoIntervalId = window.setInterval(() => {
            setSlide(activeIndex + 1);
        }, 3200);
    };

    if (container.__promoClickHandler) {
        container.removeEventListener('click', container.__promoClickHandler);
    }

    container.__promoClickHandler = (event) => {
        const dot = event.target.closest('.js-promo-dot');

        if (dot) {
            event.preventDefault();
            setSlide(Number(dot.dataset.index) || 0);
            startAutoplay();
            return;
        }

        if ((container.__promoSuppressClickUntil ?? 0) > Date.now() && event.target.closest('.promo-banner__slide')) {
            event.preventDefault();
        }
    };

    if (container.__promoPointerDownHandler) {
        container.removeEventListener('pointerdown', container.__promoPointerDownHandler);
    }

    if (container.__promoPointerUpHandler) {
        container.removeEventListener('pointerup', container.__promoPointerUpHandler);
    }

    if (container.__promoPointerCancelHandler) {
        container.removeEventListener('pointercancel', container.__promoPointerCancelHandler);
    }

    container.__promoPointerDownHandler = (event) => {
        if (!event.target.closest('.promo-banner__slide')) {
            return;
        }

        gestureStartX = event.clientX;
        gestureStartY = event.clientY;
        isSwipingPromo = true;
    };

    container.__promoPointerUpHandler = (event) => {
        if (!isSwipingPromo) {
            return;
        }

        isSwipingPromo = false;

        const deltaX = event.clientX - gestureStartX;
        const deltaY = event.clientY - gestureStartY;

        if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) {
            return;
        }

        container.__promoSuppressClickUntil = Date.now() + 350;
        setSlide(activeIndex + (deltaX < 0 ? 1 : -1));
        startAutoplay();
    };

    container.__promoPointerCancelHandler = () => {
        isSwipingPromo = false;
    };

    container.addEventListener('click', container.__promoClickHandler);
    container.addEventListener('pointerdown', container.__promoPointerDownHandler);
    container.addEventListener('pointerup', container.__promoPointerUpHandler);
    container.addEventListener('pointercancel', container.__promoPointerCancelHandler);
    renderSlide();
    startAutoplay();
};

const renderHomeCategories = () => {
    const container = document.getElementById('home-category-grid');
    const countElement = document.getElementById('home-category-count');
    const visibleCategories = categories.filter((category) => category !== 'Semua');

    if (!container) {
        return;
    }

    if (countElement) {
        countElement.textContent = `${visibleCategories.length} kategori`;
    }

    container.innerHTML = visibleCategories.map(categoryTileTemplate).join('');
};

const renderHomeMiniSummary = () => {
    const container = document.getElementById('home-mini-summary');

    if (!container) {
        return;
    }

    const history = getInvoiceHistory();
    const orderedMenus = [];
    const seenMenus = new Set();

    for (const invoice of history) {
        for (const item of invoice.items ?? []) {
            if (!item?.slug || seenMenus.has(item.slug)) {
                continue;
            }

            seenMenus.add(item.slug);
            orderedMenus.push({
                ...item,
                latestCount: getDisplayQuantityForItem(item),
                latestSummary: formatCartVariantSummary(item),
            });

            if (orderedMenus.length >= 3) {
                break;
            }
        }

        if (orderedMenus.length >= 3) {
            break;
        }
    }

    if (!orderedMenus.length) {
        const starter = recommendedProducts[0];

        container.innerHTML = `
            <div class="quick-cart-card__empty">
                <img src="${starter.image}" alt="${escapeHtml(starter.name)}">
                <div>
                    <strong>Belum ada riwayat</strong>
                    <p>Pesanan favoritmu akan muncul setelah pesanan pertama selesai.</p>
                </div>
            </div>
            <a href="${productUrl(starter.slug)}" class="button button--soft button--full">Mulai Pesan</a>
        `;
        return;
    }

    container.innerHTML = `
        <div class="quick-cart-card__items">
            ${orderedMenus
                .map(
                    (item) => `
                        <a href="${productUrl(item.slug)}" class="quick-cart-item quick-cart-item--link">
                            <img src="${item.image}" alt="${escapeHtml(item.name)}">
                            <div class="quick-cart-item__content">
                                <div class="quick-cart-item__copy">
                                    <strong>${escapeHtml(item.shortName)}</strong>
                                    <span>${escapeHtml(item.latestSummary || 'Pesanan terakhir')}</span>
                                </div>
                                <span class="quick-cart-item__qty">x${item.latestCount}</span>
                            </div>
                        </a>
                    `,
                )
                .join('')}
        </div>
    `;
};

const renderRecommendedProducts = () => {
    const container = document.getElementById('recommended-grid');
    const searchInput = document.getElementById('home-search');
    const emptyState = document.getElementById('home-search-empty');

    if (!container) {
        return;
    }

    const renderResults = () => {
        const searchTerm = searchInput?.value ?? '';
        const results = searchTerm.trim() ? filterProductsByQuery(searchTerm).slice(0, 6) : recommendedProducts.slice(0, 6);

        container.innerHTML = results.map(productCardTemplate).join('');
        container.classList.toggle('hidden', results.length === 0);

        if (emptyState) {
            emptyState.classList.toggle('hidden', results.length > 0);
        }
    };

    renderResults();

    if (searchInput && searchInput.dataset.bound !== 'true') {
        searchInput.addEventListener('input', renderResults);
        searchInput.dataset.bound = 'true';
    }
};

const renderAboutHighlights = () => {
    const container = document.getElementById('about-highlights');

    if (!container) {
        return;
    }

    const cards = [
        {
            value: `${products.length} menu`,
            title: 'Katalog menu',
            description: 'Minuman, camilan, makanan, dan hidangan manis dalam satu alur mobile.',
        },
        {
            value: `${products.length} gambar`,
            title: 'Foto menu lokal',
            description: 'Setiap menu utama sudah memakai gambar lokal di proyek.',
        },
        {
            value: 'Penyimpanan lokal',
            title: 'Keranjang tersimpan',
            description: 'Pesanan tetap tersimpan walau halaman di-refresh.',
        },
        {
            value: 'Struk',
            title: 'Pembayaran sederhana',
            description: 'Detail pengantaran dan struk siap cetak tanpa database.',
        },
    ];

    container.innerHTML = cards
        .map(
            (card) => `
                <article class="highlight-card">
                    <strong>${escapeHtml(card.value)}</strong>
                    <h3>${escapeHtml(card.title)}</h3>
                    <p>${escapeHtml(card.description)}</p>
                </article>
            `,
        )
        .join('');
};

const updateCartIndicators = () => {
    const count = getCartCount();

    document.querySelectorAll('.js-cart-count').forEach((element) => {
        element.textContent = String(count);
        element.classList.toggle('is-empty', count === 0);
    });

    renderHomeMiniSummary();
};

const renderProductsPage = () => {
    const grid = document.getElementById('product-grid');
    const empty = document.getElementById('product-empty');
    const resultMeta = document.getElementById('product-result-meta');
    const categoryMetaElement = document.getElementById('product-category-meta');
    const searchInput = document.getElementById('product-search');
    const filterContainer = document.getElementById('category-filters');

    if (!grid || !empty || !resultMeta || !categoryMetaElement || !searchInput || !filterContainer) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    let selectedCategory = categories.includes(params.get('category')) ? params.get('category') : 'Semua';
    let searchTerm = params.get('search') ?? '';

    const syncUrl = () => {
        const nextParams = new URLSearchParams();

        if (searchTerm.trim()) {
            nextParams.set('search', searchTerm.trim());
        }

        if (selectedCategory && selectedCategory !== 'Semua') {
            nextParams.set('category', selectedCategory);
        }

        const query = nextParams.toString();
        const nextUrl = query ? `/produk?${query}` : '/produk';
        window.history.replaceState({}, '', nextUrl);
    };

    const renderFilters = () => {
        filterContainer.innerHTML = categories
            .map(
                (category) => `
                    <button
                        type="button"
                        class="filter-chip ${selectedCategory === category ? 'is-active' : ''}"
                        data-category="${escapeHtml(category)}"
                    >
                        ${escapeHtml(category)}
                    </button>
                `,
            )
            .join('');
    };

    const renderResults = () => {
        const filtered = filterProductsByQuery(searchTerm, selectedCategory);

        grid.innerHTML = filtered.map(productCardTemplate).join('');
        empty.classList.toggle('hidden', filtered.length > 0);
        resultMeta.textContent = `${filtered.length} menu`;
        categoryMetaElement.textContent = `${categories.filter((category) => category !== 'Semua').length} kategori`;
        syncUrl();
    };

    searchInput.value = searchTerm;
    renderFilters();
    renderResults();

    searchInput.addEventListener('input', (event) => {
        searchTerm = event.target.value;
        renderResults();
    });

    filterContainer.addEventListener('click', (event) => {
        const button = event.target.closest('[data-category]');

        if (!button) {
            return;
        }

        selectedCategory = button.dataset.category ?? 'Semua';
        renderFilters();
        renderResults();
    });
};

const optionGroupTemplate = (group, value) => `
    <section class="option-group">
        <div class="option-group__head">
            <h3>${escapeHtml(group.label)}</h3>
            <span>${escapeHtml(formatOptionChoiceLabel(group, value))}</span>
        </div>
        <div class="option-group__chips">
            ${group.options
                .map(
                    (option) => `
                        <button
                            type="button"
                            class="option-chip ${value === option ? 'is-active' : ''} js-option-select"
                            data-option-group="${escapeHtml(group.id)}"
                            data-option-value="${escapeHtml(option)}"
                        >
                            ${escapeHtml(formatOptionChoiceLabel(group, option))}
                        </button>
                    `,
                )
                .join('')}
        </div>
    </section>
`;

const optionLevelTemplate = (group, value) => {
    const activeIndex = Math.max(group.options.indexOf(value), 0);
    const progress = group.options.length > 1 ? (activeIndex / (group.options.length - 1)) * 100 : 0;

    return `
        <section class="option-group option-group--level">
            <div class="option-group__head">
                <h3>${escapeHtml(group.label)}</h3>
                <span>${escapeHtml(formatOptionChoiceLabel(group, value))}</span>
            </div>
            <div class="option-level">
                <div class="option-level__track">
                    <span class="option-level__progress" style="width:${progress}%"></span>
                </div>
                <div class="option-level__steps">
                    ${group.options
                        .map(
                            (option) => `
                                <button
                                    type="button"
                                    class="option-level__step ${value === option ? 'is-active' : ''} js-option-select"
                                    data-option-group="${escapeHtml(group.id)}"
                                    data-option-value="${escapeHtml(option)}"
                                >
                                    <span class="option-level__dot"></span>
                                    <span class="option-level__label">${escapeHtml(formatOptionChoiceLabel(group, option))}</span>
                                </button>
                            `,
                        )
                        .join('')}
                </div>
            </div>
        </section>
    `;
};

const renderOptionGroup = (group, value) => (group.ui === 'level' ? optionLevelTemplate(group, value) : optionGroupTemplate(group, value));

const renderProductDetailPage = () => {
    const container = document.getElementById('product-detail');
    const relatedContainer = document.getElementById('related-products');
    const slug = document.body.dataset.productSlug;
    const editLineId = new URLSearchParams(window.location.search).get('edit');

    if (!container || !relatedContainer || !slug) {
        return;
    }

    const product = findProductBySlug(slug);

    if (!product) {
        container.innerHTML = `
            <article class="panel empty-state">
                <h2>Menu tidak ditemukan</h2>
                <p>Silakan kembali ke daftar menu.</p>
                <a href="/produk" class="button button--primary">Kembali ke Menu</a>
            </article>
        `;
        return;
    }

    if (detailState.productSlug !== product.slug) {
        const editableCartItem = editLineId ? getCartItem(editLineId) : null;

        detailState.productSlug = product.slug;
        detailState.editLineId = editableCartItem?.slug === product.slug ? editableCartItem.lineId : null;
        detailState.quantity = editableCartItem?.slug === product.slug ? editableCartItem.quantity : 1;
        detailState.selections = editableCartItem?.slug === product.slug
            ? normalizeSelections(product, editableCartItem.selections)
            : getDefaultSelections(product);
    }

    const normalizedSelections = normalizeSelections(product, detailState.selections);
    detailState.selections = normalizedSelections;

    container.innerHTML = `
        <article class="detail-card">
            <div class="detail-card__visual">
                <img src="${product.image}" alt="${escapeHtml(product.name)}">
            </div>
            <div class="detail-card__body">
                <div class="detail-card__meta">
                    <span class="tag">${escapeHtml(product.category)}</span>
                    <span>${product.prepTime} menit</span>
                    <span>${product.rating.toFixed(1)}</span>
                </div>
                <h1>${escapeHtml(product.name)}</h1>
                ${priceTemplate(product, 1, 'detail-card__price', normalizedSelections)}
                <p class="detail-card__description">${escapeHtml(product.description)}</p>
                ${
                    getDiscountPercent(product)
                        ? `
                            <div class="detail-card__promo-note detail-card__promo-note--discount">
                                Diskon ${getDiscountPercent(product)}% aktif.
                            </div>
                        `
                        : ''
                }
                ${
                    hasBogoPromo(product)
                        ? `
                            <div class="detail-card__promo-note">
                                Promo Beli 1 Gratis 1 aktif.
                            </div>
                        `
                        : ''
                }

                <div class="detail-card__features">
                    ${product.features
                        .map(
                            (feature) => `
                                <span class="feature-pill">${escapeHtml(feature)}</span>
                            `,
                        )
                        .join('')}
                </div>

                ${(product.options ?? []).map((group) => renderOptionGroup(group, normalizedSelections[group.id])).join('')}

                <div class="detail-card__footer">
                    <div class="quantity-stepper">
                        <button type="button" class="js-detail-qty" data-delta="-1">-</button>
                        <span>${detailState.quantity}</span>
                        <button type="button" class="js-detail-qty" data-delta="1">+</button>
                    </div>
                    <button type="button" class="button button--primary button--wide detail-card__cta js-detail-add">
                        <span class="detail-card__cta-label">${detailState.editLineId ? 'Simpan' : 'Tambah Menu'}</span>
                        <strong class="detail-card__cta-price">${formatCurrency(getProductPrice(product, normalizedSelections) * detailState.quantity)}</strong>
                    </button>
                </div>
            </div>
        </article>
    `;

    relatedContainer.innerHTML = products
        .filter((item) => item.slug !== product.slug && item.category === product.category)
        .slice(0, 4)
        .map(productCardTemplate)
        .join('');
};

const ensureCartPaybarLayer = () => {
    const summaryCard = document.querySelector('.cart-paybar');
    const bottomNav = document.querySelector('.bottom-nav');

    if (!summaryCard || !bottomNav || summaryCard.dataset.floatingMounted === 'true') {
        return summaryCard;
    }

    bottomNav.parentElement?.insertBefore(summaryCard, bottomNav);
    summaryCard.dataset.floatingMounted = 'true';

    return summaryCard;
};

const renderCartPage = () => {
    const itemsContainer = document.getElementById('cart-items');
    const summaryContainer = document.getElementById('cart-summary');
    const recommendationContainer = document.getElementById('cart-recommendations');
    const summaryCard = ensureCartPaybarLayer();
    const checkoutButton = document.querySelector('.order-summary-card .button--primary');

    if (!itemsContainer || !summaryContainer || !recommendationContainer || !summaryCard || !checkoutButton) {
        return;
    }

    const items = getCartDetails();
    const selectedItems = items.filter((item) => isCartLineSelected(item.lineId));

    if (!items.length) {
        summaryCard.classList.add('hidden');
        itemsContainer.innerHTML = `
            <article class="empty-state cart-empty-state">
                <div class="cart-empty-state__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="M4 6h2l1.5 8.5h9.5l2-6H8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                        <circle cx="10" cy="18.2" r="1.35" fill="currentColor" />
                        <circle cx="17.2" cy="18.2" r="1.35" fill="currentColor" />
                    </svg>
                </div>
                <div>
                    <span class="cart-empty-state__eyebrow">Keranjang Kosong</span>
                    <h2>Yuk pilih menu favorit</h2>
                    <p>Minuman, makanan, dan promo menarik siap kamu pesan.</p>
                </div>
                <a href="/produk" class="button button--primary">Jelajahi Menu</a>
            </article>
        `;
        summaryContainer.innerHTML = '';
        checkoutButton.textContent = 'Lihat Menu';
        checkoutButton.setAttribute('href', '/produk');
    } else {
        itemsContainer.innerHTML = items
            .map(
                (item) => `
                    <article class="order-item ${isCartLineSelected(item.lineId) ? 'is-selected' : 'is-muted'}">
                        <button
                            type="button"
                            class="cart-select js-cart-select ${isCartLineSelected(item.lineId) ? 'is-active' : ''}"
                            data-line-id="${escapeHtml(item.lineId)}"
                            aria-label="${isCartLineSelected(item.lineId) ? 'Batalkan pilihan' : 'Pilih'} ${escapeHtml(item.shortName)}"
                            aria-pressed="${isCartLineSelected(item.lineId) ? 'true' : 'false'}"
                        ></button>
                        <a href="${productUrl(item.slug)}?edit=${encodeURIComponent(item.lineId)}" class="order-item__main" aria-label="Ubah ${escapeHtml(item.shortName)}">
                            <img src="${item.image}" alt="${escapeHtml(item.name)}">
                            <div class="order-item__content">
                                <strong>${escapeHtml(item.shortName)}</strong>
                                ${cartItemMetaTemplate(item)}
                                ${priceTemplate(item, item.quantity, 'order-item__price')}
                            </div>
                        </a>
                        <div class="order-item__side">
                            <button type="button" class="link-danger js-remove-item" data-line-id="${escapeHtml(item.lineId)}">Hapus</button>
                            <div class="quantity-stepper quantity-stepper--small">
                                <button type="button" class="js-cart-change" data-line-id="${escapeHtml(item.lineId)}" data-delta="-1">-</button>
                                <span>${item.displayQuantity}</span>
                                <button type="button" class="js-cart-change" data-line-id="${escapeHtml(item.lineId)}" data-delta="1">+</button>
                            </div>
                        </div>
                    </article>
                `,
            )
            .join('');
        summaryCard.classList.toggle('hidden', selectedItems.length === 0);
        summaryContainer.innerHTML = selectedItems.length ? cartPaybarTotalTemplate(selectedItems) : '';
        checkoutButton.textContent = 'Checkout';
        checkoutButton.setAttribute('href', '/checkout');
        checkoutButton.classList.remove('is-disabled');
        checkoutButton.setAttribute('aria-disabled', 'false');
    }

    recommendationContainer.innerHTML = products
        .filter((product) => !items.find((item) => item.slug === product.slug))
        .slice(0, 4)
        .map(productCardTemplate)
        .join('');
};

const renderCheckoutSummary = (items, invoiceCreated = false) => {
    const container = document.getElementById('checkout-summary');

    if (!container) {
        return;
    }

    if (!items.length) {
        container.innerHTML = '<p class="summary-note">Belum ada pesanan aktif.</p>';
        return;
    }

    container.innerHTML = `
        <div class="checkout-items">
            ${items
                .map(
                    (item) => `
                        <div class="checkout-item">
                            <div>
                                <strong>${escapeHtml(item.shortName)}</strong>
                                <span>${escapeHtml(formatOrderItemDetails(item))}</span>
                            </div>
                            ${priceTemplate(item, item.quantity)}
                        </div>
                    `,
                )
                .join('')}
        </div>
        ${summaryRowsTemplate(items, invoiceCreated ? 'Total Dibayar' : 'Total Bayar')}
        ${invoiceCreated ? '<p class="summary-note summary-note--success">Struk berhasil dibuat.</p>' : ''}
    `;
};

const getSavedProfile = () => readStorage(PROFILE_KEY, {});

const togglePaymentDetailFields = () => {
    const bankField = document.getElementById('bank-field');
    const bankInput = document.getElementById('checkout-bank');
    const walletField = document.getElementById('wallet-field');
    const walletInput = document.getElementById('checkout-wallet');
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value ?? '';
    const usesBankTransfer = paymentMethod === 'Transfer Bank';
    const usesDigitalWallet = paymentMethod === 'Dompet Digital';

    if (!bankField || !bankInput || !walletField || !walletInput) {
        return;
    }

    bankField.classList.toggle('hidden', !usesBankTransfer);
    walletField.classList.toggle('hidden', !usesDigitalWallet);
    bankInput.toggleAttribute('required', usesBankTransfer);
    walletInput.toggleAttribute('required', usesDigitalWallet);

    if (!usesBankTransfer) {
        bankInput.value = '';
    }

    if (!usesDigitalWallet) {
        walletInput.value = '';
    }
};

const fillCheckoutProfile = () => {
    const profile = getSavedProfile();
    const nameInput = document.getElementById('checkout-name');
    const addressInput = document.getElementById('checkout-address');
    const whatsappInput = document.getElementById('checkout-whatsapp');
    const bankInput = document.getElementById('checkout-bank');
    const walletInput = document.getElementById('checkout-wallet');

    if (nameInput) {
        nameInput.value = profile.fullName ?? '';
    }

    if (addressInput) {
        addressInput.value = profile.address ?? '';
    }

    if (whatsappInput) {
        whatsappInput.value = profile.whatsapp ?? '';
    }

    if (profile.paymentMethod || profile.paymentType) {
        const paymentType = profile.paymentType
            ?? (profile.paymentMethod?.startsWith('Transfer Bank')
                ? 'Transfer Bank'
                : (profile.paymentMethod?.startsWith('Dompet Digital') ? 'Dompet Digital' : profile.paymentMethod));
        const radio = document.querySelector(`input[name="payment_method"][value="${paymentType}"]`);
        if (radio) {
            radio.checked = true;
        }
    }

    if (bankInput) {
        bankInput.value = profile.bankName
            ?? (profile.paymentMethod?.startsWith('Transfer Bank - ') ? profile.paymentMethod.replace('Transfer Bank - ', '') : '');
    }

    if (walletInput) {
        walletInput.value = profile.walletName
            ?? (profile.paymentMethod?.startsWith('Dompet Digital - ') ? profile.paymentMethod.replace('Dompet Digital - ', '') : '');
    }

    togglePaymentDetailFields();
};

const truncateText = (value, maxLength = 24) => {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();

    return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}.` : text;
};

const RECEIPT_SCAN_PATH = '/s';
const receiptCurrency = (value) => formatCurrency(value).replace(/\s/g, '');
const getReceiptPaymentCode = (paymentMethod = '') => {
    if (paymentMethod.startsWith('Transfer Bank')) {
        return 'B';
    }

    if (paymentMethod.startsWith('Dompet Digital')) {
        return 'D';
    }

    if (paymentMethod.startsWith('QRIS')) {
        return 'Q';
    }

    return 'O';
};

const encodeReceiptNumber = (value) => Math.max(0, Math.round(Number(value) || 0)).toString(36);

const buildReceiptPayload = (invoice) => {
    const invoiceToken = String(invoice.id ?? '').replace(/^FOOD-/i, '') || '00000000';
    const createdAtToken = encodeReceiptNumber(Math.floor(new Date(invoice.createdAt).getTime() / 1000));
    const paymentCode = getReceiptPaymentCode(invoice.customer?.paymentMethod ?? '');
    const itemsToken = (invoice.items ?? [])
        .map((item) => {
            const productId = Number(item.id) || Number(findProductBySlug(item.slug)?.id) || 0;

            return [
                encodeReceiptNumber(productId),
                encodeReceiptNumber(getDisplayQuantityForItem(item)),
                encodeReceiptNumber(item.subtotal),
            ].join('.');
        })
        .join(',');

    return ['1', invoiceToken, createdAtToken, paymentCode, itemsToken].join('~');
};

const buildReceiptUrl = (invoice) => {
    const receiptUrl = new URL(RECEIPT_SCAN_PATH, window.location.origin);

    receiptUrl.searchParams.set('p', buildReceiptPayload(invoice));

    return receiptUrl.toString();
};

const receiptRowsTemplate = (invoice) => `
    <div class="barcode-receipt" aria-label="Ringkasan struk">
        <div class="barcode-receipt__row">
            <span>Struk</span>
            <strong>${escapeHtml(invoice.id)}</strong>
        </div>
        <div class="barcode-receipt__row">
            <span>Waktu</span>
            <strong>${escapeHtml(compactDateFormatter.format(new Date(invoice.createdAt)))}</strong>
        </div>
        <div class="barcode-receipt__row">
            <span>Kadaluarsa</span>
            <strong>${escapeHtml(compactDateFormatter.format(getInvoiceExpiresAt(invoice)))}</strong>
        </div>
        <div class="barcode-receipt__row">
            <span>Pembayaran</span>
            <strong>${escapeHtml(invoice.customer.paymentMethod)}</strong>
        </div>
        <div class="barcode-receipt__items">
            ${(invoice.items ?? [])
                .map(
                    (item) => `
                        <div class="barcode-receipt__item">
                            <span>${escapeHtml(item.shortName)} x${getDisplayQuantityForItem(item)}</span>
                            <strong>${receiptCurrency(item.subtotal)}</strong>
                        </div>
                    `,
                )
                .join('')}
        </div>
        <div class="barcode-receipt__total">
            <span>Total</span>
            <strong>${receiptCurrency(invoice.total)}</strong>
        </div>
    </div>
`;

const qrMultiply = (left, right) => {
    let product = 0;

    for (let bit = 7; bit >= 0; bit -= 1) {
        product = (product << 1) ^ ((product >>> 7) * 0x11D);
        product ^= ((right >>> bit) & 1) * left;
    }

    return product & 0xFF;
};

const qrReedSolomonDivisor = (degree) => {
    const result = Array(degree).fill(0);
    let root = 1;

    result[degree - 1] = 1;

    for (let index = 0; index < degree; index += 1) {
        for (let item = 0; item < degree; item += 1) {
            result[item] = qrMultiply(result[item], root);

            if (item + 1 < degree) {
                result[item] ^= result[item + 1];
            }
        }

        root = qrMultiply(root, 0x02);
    }

    return result;
};

const qrReedSolomonRemainder = (data, divisor) => {
    const result = Array(divisor.length).fill(0);

    data.forEach((byte) => {
        const factor = byte ^ result.shift();

        result.push(0);
        divisor.forEach((coefficient, index) => {
            result[index] ^= qrMultiply(coefficient, factor);
        });
    });

    return result;
};

const qrAppendBits = (bits, value, length) => {
    for (let index = length - 1; index >= 0; index -= 1) {
        bits.push((value >>> index) & 1);
    }
};

const qrDataCodewords = (text) => {
    const bytes = Array.from(new TextEncoder().encode(text));
    const dataCapacity = 274;
    const bits = [];

    if (bytes.length > 271) {
        throw new Error('QR payload is too long.');
    }

    qrAppendBits(bits, 0x4, 4);
    qrAppendBits(bits, bytes.length, 16);
    bytes.forEach((byte) => qrAppendBits(bits, byte, 8));

    qrAppendBits(bits, 0, Math.min(4, dataCapacity * 8 - bits.length));

    while (bits.length % 8) {
        bits.push(0);
    }

    const codewords = [];

    for (let index = 0; index < bits.length; index += 8) {
        codewords.push(Number.parseInt(bits.slice(index, index + 8).join(''), 2));
    }

    for (let padIndex = 0; codewords.length < dataCapacity; padIndex += 1) {
        codewords.push(padIndex % 2 ? 0x11 : 0xEC);
    }

    return codewords;
};

const qrAllCodewords = (text) => {
    const data = qrDataCodewords(text);
    const blockSpecs = [
        { count: 2, dataLength: 68, totalLength: 86 },
        { count: 2, dataLength: 69, totalLength: 87 },
    ];
    const divisor = qrReedSolomonDivisor(18);
    const blocks = [];
    let offset = 0;

    blockSpecs.forEach((spec) => {
        for (let index = 0; index < spec.count; index += 1) {
            const blockData = data.slice(offset, offset + spec.dataLength);

            offset += spec.dataLength;
            blocks.push({
                data: blockData,
                ecc: qrReedSolomonRemainder(blockData, divisor).slice(0, spec.totalLength - spec.dataLength),
            });
        }
    });

    const result = [];
    const maxDataLength = Math.max(...blocks.map((block) => block.data.length));

    for (let index = 0; index < maxDataLength; index += 1) {
        blocks.forEach((block) => {
            if (index < block.data.length) {
                result.push(block.data[index]);
            }
        });
    }

    for (let index = 0; index < 18; index += 1) {
        blocks.forEach((block) => result.push(block.ecc[index]));
    }

    return result;
};

const qrMask = (mask, x, y) => {
    const patterns = [
        (xValue, yValue) => (xValue + yValue) % 2 === 0,
        (xValue, yValue) => yValue % 2 === 0,
        (xValue) => xValue % 3 === 0,
        (xValue, yValue) => (xValue + yValue) % 3 === 0,
        (xValue, yValue) => (Math.floor(xValue / 3) + Math.floor(yValue / 2)) % 2 === 0,
        (xValue, yValue) => ((xValue * yValue) % 2) + ((xValue * yValue) % 3) === 0,
        (xValue, yValue) => (((xValue * yValue) % 2) + ((xValue * yValue) % 3)) % 2 === 0,
        (xValue, yValue) => (((xValue + yValue) % 2) + ((xValue * yValue) % 3)) % 2 === 0,
    ];

    return patterns[mask](x, y);
};

const qrBchRemainder = (value, generator, bitLength) => {
    let remainder = value;

    for (let index = bitLength - 1; index >= 10; index -= 1) {
        if (((remainder >>> index) & 1) !== 0) {
            remainder ^= generator << (index - 10);
        }
    }

    return remainder;
};

const qrFormatBits = (mask) => {
    const data = (1 << 3) | mask;
    const remainder = qrBchRemainder(data << 10, 0x537, 15);

    return ((data << 10) | remainder) ^ 0x5412;
};

const qrVersionBits = (version) => {
    let remainder = version;

    for (let index = 0; index < 12; index += 1) {
        remainder = (remainder << 1) ^ (((remainder >>> 11) & 1) * 0x1F25);
    }

    return (version << 12) | (remainder & 0xFFF);
};

const qrCodeSvgTemplate = (text) => {
    const version = 10;
    const size = 21 + (version - 1) * 4;
    const mask = 0;
    const modules = Array.from({ length: size }, () => Array(size).fill(false));
    const functionModules = Array.from({ length: size }, () => Array(size).fill(false));
    const setFunction = (x, y, isDark) => {
        if (x >= 0 && x < size && y >= 0 && y < size) {
            modules[y][x] = isDark;
            functionModules[y][x] = true;
        }
    };
    const getBit = (value, index) => ((value >>> index) & 1) !== 0;
    const drawFinder = (x, y) => {
        for (let dy = -1; dy <= 7; dy += 1) {
            for (let dx = -1; dx <= 7; dx += 1) {
                const xx = x + dx;
                const yy = y + dy;
                const isInside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
                const isDark = isInside && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));

                setFunction(xx, yy, isDark);
            }
        }
    };
    const drawAlignment = (x, y) => {
        for (let dy = -2; dy <= 2; dy += 1) {
            for (let dx = -2; dx <= 2; dx += 1) {
                setFunction(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
            }
        }
    };

    drawFinder(0, 0);
    drawFinder(size - 7, 0);
    drawFinder(0, size - 7);

    for (let index = 8; index < size - 8; index += 1) {
        const isDark = index % 2 === 0;

        setFunction(6, index, isDark);
        setFunction(index, 6, isDark);
    }

    [6, 28, 50].forEach((y) => {
        [6, 28, 50].forEach((x) => {
            if (!((x === 6 && y === 6) || (x === 6 && y === size - 7) || (x === size - 7 && y === 6))) {
                drawAlignment(x, y);
            }
        });
    });

    const versionBits = qrVersionBits(version);
    for (let index = 0; index < 18; index += 1) {
        const bit = getBit(versionBits, index);
        const a = size - 11 + (index % 3);
        const b = Math.floor(index / 3);

        setFunction(a, b, bit);
        setFunction(b, a, bit);
    }

    const formatBits = qrFormatBits(mask);
    for (let index = 0; index <= 5; index += 1) {
        setFunction(8, index, getBit(formatBits, index));
    }
    setFunction(8, 7, getBit(formatBits, 6));
    setFunction(8, 8, getBit(formatBits, 7));
    setFunction(7, 8, getBit(formatBits, 8));
    for (let index = 9; index < 15; index += 1) {
        setFunction(14 - index, 8, getBit(formatBits, index));
    }
    for (let index = 0; index < 8; index += 1) {
        setFunction(size - 1 - index, 8, getBit(formatBits, index));
    }
    for (let index = 8; index < 15; index += 1) {
        setFunction(8, size - 15 + index, getBit(formatBits, index));
    }
    setFunction(8, size - 8, true);

    const dataBits = qrAllCodewords(text).flatMap((codeword) =>
        Array.from({ length: 8 }, (_, index) => ((codeword >>> (7 - index)) & 1) !== 0));
    let bitIndex = 0;

    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) {
            right -= 1;
        }

        for (let vertical = 0; vertical < size; vertical += 1) {
            const y = ((right + 1) & 2) === 0 ? size - 1 - vertical : vertical;

            for (let column = 0; column < 2; column += 1) {
                const x = right - column;

                if (!functionModules[y][x]) {
                    modules[y][x] = (dataBits[bitIndex] ?? false) !== qrMask(mask, x, y);
                    bitIndex += 1;
                }
            }
        }
    }

    const darkModules = modules
        .flatMap((row, y) => row.map((isDark, x) => (isDark ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : '')))
        .join('');

    return `
        <svg class="barcode-card__svg" viewBox="-4 -4 ${size + 8} ${size + 8}" role="img" aria-label="QR struk pesanan">
            <rect x="-4" y="-4" width="${size + 8}" height="${size + 8}" fill="#fff"/>
            <g fill="#000">${darkModules}</g>
        </svg>
    `;
};

const barcodeTemplate = (invoice) => {
    const receiptUrl = buildReceiptUrl(invoice);

    return `
        <div id="barcode-card" class="barcode-card hidden">
            <span class="barcode-card__label">QR Struk</span>
            <div class="barcode-card__matrix" aria-label="QR struk pesanan ${escapeHtml(invoice.id)}">
                ${qrCodeSvgTemplate(receiptUrl)}
            </div>
            <p>Scan QR untuk buka rincian order lengkap.</p>
            ${receiptRowsTemplate(invoice)}
        </div>
    `;
};

const invoiceTemplate = (invoice) => `
    <div class="invoice-card">
        ${barcodeTemplate(invoice)}

        <div class="invoice-section">
            <h3>Pembeli</h3>
            <div class="invoice-customer">
                <strong>${escapeHtml(invoice.customer.fullName)}</strong>
                <p>${nl2br(invoice.customer.address)}</p>
                <span>WhatsApp: ${escapeHtml(invoice.customer.whatsapp)}</span>
            </div>
        </div>

        <div class="invoice-section">
            <h3>Item Pesanan</h3>
            <div class="invoice-items">
                ${invoice.items
                    .map(
                        (item) => `
                            <div class="invoice-item">
                                <div>
                                    <strong>${escapeHtml(item.shortName)}</strong>
                                    <span>${escapeHtml(formatOrderItemDetails(item))}</span>
                                </div>
                                ${priceTemplate(item, item.quantity)}
                            </div>
                        `,
                    )
                    .join('')}
            </div>
        </div>

        <div class="invoice-total">
            <span>Total</span>
            <strong>${formatCurrency(invoice.total)}</strong>
        </div>
    </div>
`;

const setBarcodeCardVisibility = (isVisible) => {
    const barcodeCard = document.getElementById('barcode-card');
    const barcodeButton = document.getElementById('view-barcode');

    if (barcodeCard) {
        barcodeCard.classList.toggle('hidden', !isVisible);
    }

    if (barcodeButton) {
        barcodeButton.textContent = isVisible ? 'Tutup Barcode' : 'Lihat Barcode';
        barcodeButton.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
    }
};

const renderInvoice = (invoice) => {
    const panel = document.getElementById('invoice-panel');
    const content = document.getElementById('invoice-content');

    if (!panel || !content) {
        return;
    }

    content.innerHTML = invoiceTemplate(invoice);
    panel.classList.remove('hidden');
    setBarcodeCardVisibility(false);
};

const renderCheckoutPage = () => {
    const emptyState = document.getElementById('checkout-empty');
    const layout = document.getElementById('checkout-layout');
    const invoicePanel = document.getElementById('invoice-panel');
    const submitButton = document.getElementById('checkout-submit-button');

    if (!emptyState || !layout || !invoicePanel || !submitButton) {
        return;
    }

    const cartItems = getCartDetails();
    const items = getSelectedCartDetails();
    const invoiceId = new URLSearchParams(window.location.search).get('invoice');
    const requestedInvoice = invoiceId ? getInvoiceHistory().find((invoice) => invoice.id === invoiceId) : null;
    const lastInvoice = readStorage(INVOICE_KEY, null);

    fillCheckoutProfile();

    if (requestedInvoice) {
        emptyState.classList.add('hidden');
        layout.classList.remove('hidden');
        document.getElementById('checkout-form-panel')?.classList.add('hidden');
        submitButton.classList.add('hidden');
        renderCheckoutSummary(requestedInvoice.items, true);
        renderInvoice(requestedInvoice);
        return;
    }

    if (!items.length) {
        const emptyStateTitle = emptyState.querySelector('h2');
        const emptyStateMessage = emptyState.querySelector('p');
        const emptyStateAction = emptyState.querySelector('a');
        const hasCartItems = cartItems.length > 0;

        if (emptyStateTitle) {
            emptyStateTitle.textContent = hasCartItems ? 'Belum ada item yang dipilih' : 'Keranjang kosong';
        }

        if (emptyStateMessage) {
            emptyStateMessage.textContent = hasCartItems
                ? 'Pilih item dari keranjang dulu sebelum lanjut checkout.'
                : 'Tambahkan menu terlebih dahulu.';
        }

        if (emptyStateAction) {
            emptyStateAction.textContent = hasCartItems ? 'Kembali ke Keranjang' : 'Lihat Menu';
            emptyStateAction.setAttribute('href', hasCartItems ? '/keranjang' : '/produk');
        }

        emptyState.classList.remove('hidden');
        layout.classList.add('hidden');
        submitButton.classList.add('hidden');
        renderCheckoutSummary([]);

        if (lastInvoice) {
            renderInvoice(lastInvoice);
        }

        return;
    }

    emptyState.classList.add('hidden');
    layout.classList.remove('hidden');
    invoicePanel.classList.add('hidden');
    submitButton.classList.remove('hidden');
    renderCheckoutSummary(items);
};

const getInvoiceMenuCount = (invoice) =>
    (invoice.items ?? []).reduce((total, item) => total + getDisplayQuantityForItem(item), 0);

const buildInvoiceItemPreview = (invoice, itemLimit = 3) => {
    const visibleItems = (invoice.items ?? []).slice(0, itemLimit);
    const hiddenCount = Math.max(0, (invoice.items ?? []).length - visibleItems.length);
    const preview = visibleItems
        .map((item) => `${item.shortName ?? item.name} ${formatItemQuantity(item)}`)
        .join(', ');

    if (!preview) {
        return 'Ringkasan item belum tersedia.';
    }

    return hiddenCount > 0 ? `${preview} +${hiddenCount} lainnya` : preview;
};

const buildNotifications = () => {
    const now = Date.now();
    const today = startOfDay(new Date());
    const hiddenIds = new Set(getHiddenNotificationIds());

    return getInvoiceHistory()
        .flatMap((invoice) => {
            const createdAt = new Date(invoice.createdAt);
            const expiresAt = getInvoiceExpiresAt(invoice);
            const reminderAt = startOfDay(addDays(expiresAt, -3));
            const expiredAt = startOfDay(expiresAt);
            const preview = buildInvoiceItemPreview(invoice);
            const notificationBase = {
                invoice,
                invoiceId: invoice.id,
                preview,
            };
            const notifications = [
                {
                    ...notificationBase,
                    id: `${invoice.id}:created`,
                    timestamp: createdAt.toISOString(),
                    eyebrow: 'Pesanan Baru',
                    status: 'Baru',
                    tone: 'success',
                    title: 'Pesanan berhasil dibuat',
                    message: `Anda telah melakukan pesanan pada ${dateFormatter.format(createdAt)}.`,
                },
                {
                    ...notificationBase,
                    id: `${invoice.id}:processed`,
                    timestamp: new Date(createdAt.getTime() + 60 * 1000).toISOString(),
                    eyebrow: 'Pembayaran',
                    status: 'Selesai',
                    tone: 'info',
                    title: 'Scan pembayaran selesai',
                    message: 'Pembayaran sudah terdeteksi dan pesanan otomatis langsung diproses.',
                },
            ];

            if (isSameDay(today, reminderAt)) {
                notifications.push({
                    ...notificationBase,
                    id: `${invoice.id}:reminder-h3`,
                    timestamp: reminderAt.toISOString(),
                    eyebrow: 'Peringatan',
                    status: 'H-3',
                    tone: 'warning',
                    title: 'Pesanan akan segera kadaluarsa',
                    message: `Masa berlaku pesanan ini tinggal 3 hari lagi, sampai ${compactDateFormatter.format(expiresAt)}.`,
                });
            }

            if (today.getTime() >= expiredAt.getTime()) {
                notifications.push({
                    ...notificationBase,
                    id: `${invoice.id}:expired`,
                    timestamp: expiredAt.toISOString(),
                    eyebrow: 'Kadaluarsa',
                    status: 'Hari H',
                    tone: 'danger',
                    title: 'Pesanan telah kadaluarsa',
                    message: `Pesanan ini sudah masuk masa kadaluarsa pada ${compactDateFormatter.format(expiresAt)}.`,
                });
            }

            return notifications;
        })
        .filter((notification) => !hiddenIds.has(notification.id))
        .filter((notification) => new Date(notification.timestamp).getTime() <= now)
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
};

const getUnreadNotificationCount = (notifications = buildNotifications()) => {
    const seenIds = new Set(getSeenNotificationIds());
    return notifications.filter((notification) => !seenIds.has(notification.id)).length;
};

const initializeNotificationAlerts = (notifications = buildNotifications()) => {
    if (getAlertedNotificationIds() !== null) {
        return;
    }

    saveAlertedNotificationIds(notifications.map((notification) => notification.id));
};

const updateNotificationIndicators = () => {
    const notifications = buildNotifications();
    const unreadCount = getUnreadNotificationCount(notifications);

    document.querySelectorAll('.js-notification-count').forEach((element) => {
        element.textContent = String(Math.min(unreadCount, 99));
        element.classList.toggle('is-empty', unreadCount === 0);
    });
};

const announceIncomingNotifications = (notifications = buildNotifications()) => {
    const alertedIds = getAlertedNotificationIds();

    if (alertedIds === null) {
        saveAlertedNotificationIds(notifications.map((notification) => notification.id));
        return [];
    }

    const alertedSet = new Set(alertedIds);
    const incomingNotifications = notifications.filter((notification) => !alertedSet.has(notification.id));

    if (!incomingNotifications.length) {
        return [];
    }

    saveAlertedNotificationIds([...alertedIds, ...incomingNotifications.map((notification) => notification.id)]);
    triggerIncomingNotificationAlert(incomingNotifications);

    return incomingNotifications;
};

const getNotificationStateSignature = (notifications = []) => notifications.map((notification) => notification.id).join('|');

const refreshNotificationState = ({ forceRender = false } = {}) => {
    const notifications = buildNotifications();
    const incomingNotifications = announceIncomingNotifications(notifications);
    const nextSignature = getNotificationStateSignature(notifications);
    const shouldRenderNotificationsPage = page === 'notifications'
        && (forceRender || nextSignature !== notificationListSignature);

    notificationListSignature = nextSignature;

    updateNotificationIndicators();

    if (shouldRenderNotificationsPage) {
        renderNotificationsPage();
    }

    return incomingNotifications;
};

const startNotificationMonitor = () => {
    if (notificationMonitorIntervalId !== null) {
        return;
    }

    const syncNotifications = () => {
        refreshNotificationState();
    };

    notificationMonitorIntervalId = window.setInterval(syncNotifications, NOTIFICATION_CHECK_INTERVAL_MS);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            stopNotificationTitleAlert();
            syncNotifications();
        }
    });

    window.addEventListener('focus', () => {
        stopNotificationTitleAlert();
        syncNotifications();
    });

    window.addEventListener('storage', (event) => {
        const syncKeys = [
            INVOICE_KEY,
            INVOICE_HISTORY_KEY,
            NOTIFICATION_ALERTED_KEY,
            NOTIFICATION_SEEN_KEY,
            NOTIFICATION_HIDDEN_KEY,
        ];

        if (event.key && !syncKeys.includes(event.key)) {
            return;
        }

        syncNotifications();
    });
};

const markNotificationsAsSeen = (notifications = buildNotifications()) => {
    saveSeenNotificationIds(notifications.map((notification) => notification.id));
};

const closeNotificationMenu = () => {
    const menu = document.getElementById('notifications-menu');
    const menuButton = document.getElementById('notifications-menu-button');
    const menuWrap = menuButton?.closest('.notification-menu-wrap');

    if (!menu || !menuButton) {
        return;
    }

    menu.classList.add('hidden');
    menu.setAttribute('aria-hidden', 'true');
    menuButton.setAttribute('aria-expanded', 'false');
    menuWrap?.classList.remove('is-open');
};

const closeRevealedNotificationSwipes = (exceptElement = null) => {
    const exception =
        exceptElement instanceof HTMLElement ? exceptElement.closest('.notification-swipe') ?? exceptElement : null;

    document.querySelectorAll('.notification-swipe.is-revealed').forEach((element) => {
        if (element !== exception) {
            element.classList.remove('is-revealed');
        }
    });
};

const toggleNotificationMenu = () => {
    const menu = document.getElementById('notifications-menu');
    const menuButton = document.getElementById('notifications-menu-button');

    if (!menu || !menuButton || menuButton.disabled) {
        return;
    }

    const willOpen = menu.classList.contains('hidden');

    closeRevealedNotificationSwipes();

    if (willOpen) {
        menu.classList.remove('hidden');
        menu.setAttribute('aria-hidden', 'false');
        menuButton.setAttribute('aria-expanded', 'true');
        menuButton.closest('.notification-menu-wrap')?.classList.add('is-open');
        return;
    }

    closeNotificationMenu();
};

const bindNotificationSwipe = (container) => {
    container.querySelectorAll('.js-notification-swipe').forEach((swipe) => {
        if (swipe.dataset.swipeBound === 'true') {
            return;
        }

        swipe.dataset.swipeBound = 'true';

        let startX = 0;
        let startY = 0;
        let pointerActive = false;

        swipe.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) {
                return;
            }

            const swipeToggleButton = event.target.closest('.js-notification-toggle');

            if (event.target.closest('a') || event.target.closest('.js-notification-delete')) {
                return;
            }

            if (event.target.closest('button') && !swipeToggleButton) {
                return;
            }

            startX = event.clientX;
            startY = event.clientY;
            pointerActive = true;
            swipe.setPointerCapture?.(event.pointerId);
        });

        swipe.addEventListener('pointerup', (event) => {
            if (!pointerActive) {
                return;
            }

            pointerActive = false;

            const deltaX = event.clientX - startX;
            const deltaY = Math.abs(event.clientY - startY);
            const revealThreshold = NOTIFICATION_SWIPE_REVEAL / 2;

            if (deltaY > 36 || Math.abs(deltaX) < revealThreshold) {
                return;
            }

            if (deltaX < 0) {
                swipe.dataset.preventToggleUntil = String(Date.now() + 320);
                closeNotificationMenu();
                closeRevealedNotificationSwipes(swipe);
                swipe.classList.add('is-revealed');
                return;
            }

            swipe.dataset.preventToggleUntil = String(Date.now() + 320);
            swipe.classList.remove('is-revealed');
        });

        swipe.addEventListener('pointercancel', () => {
            pointerActive = false;
        });
    });
};

const formatNotificationDateLabel = (date) => {
    const formattedDate = notificationDateFormatter.format(date);
    return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
};

const groupNotificationsByDate = (notifications = []) =>
    notifications.reduce((groups, notification) => {
        const notificationDate = new Date(notification.timestamp);
        const dateKey = startOfDay(notificationDate).toISOString();
        const currentGroup = groups[groups.length - 1];

        if (!currentGroup || currentGroup.key !== dateKey) {
            groups.push({
                key: dateKey,
                label: formatNotificationDateLabel(notificationDate),
                items: [notification],
            });
            return groups;
        }

        currentGroup.items.push(notification);
        return groups;
    }, []);

const getNotificationPaymentLabel = (notification) => notification.invoice.customer?.paymentMethod ?? 'Pembayaran';

const getNotificationIconTemplate = (notification) => {
    if (notification.tone === 'success') {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.2 8.6h9.6l-.7 7a2 2 0 0 1-2 1.8H10a2 2 0 0 1-2-1.8z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8" />
                <path d="M9.2 8.6V7.8a2.8 2.8 0 0 1 5.6 0v.8M9.5 12.3l1.7 1.7 3.4-3.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
            </svg>
        `;
    }

    if (notification.tone === 'warning') {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 7.2v5.2M12 16.2h.01" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
                <path d="M10.1 4.9 4.8 14a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3l-5.3-9.1a2 2 0 0 0-3.5 0z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8" />
            </svg>
        `;
    }

    if (notification.tone === 'danger') {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="7.8" fill="none" stroke="currentColor" stroke-width="1.8" />
                <path d="M9.3 9.3 14.7 14.7M14.7 9.3l-5.4 5.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
            </svg>
        `;
    }

    return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.8 12h10.4M12 6.8V12l3.2 2.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
            <circle cx="12" cy="12" r="7.8" fill="none" stroke="currentColor" stroke-width="1.8" />
        </svg>
    `;
};

const toggleNotificationDetails = (notificationId) => {
    const entries = [...document.querySelectorAll('.js-notification-entry')];
    const targetEntry = entries.find((entry) => entry.dataset.notificationId === notificationId);

    if (!targetEntry) {
        return;
    }

    const willOpen = !targetEntry.classList.contains('is-open');

    entries.forEach((entry) => {
        const isTarget = entry === targetEntry;
        const nextExpanded = willOpen && isTarget;
        entry.classList.toggle('is-open', nextExpanded);
        entry.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
        entry.querySelector('.js-notification-toggle')?.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
    });
};

const notificationSwipeCardTemplate = (notification) => `
    <div class="notification-swipe js-notification-swipe" data-notification-id="${escapeHtml(notification.id)}">
        <button
            type="button"
            class="notification-swipe__action js-notification-delete"
            data-notification-id="${escapeHtml(notification.id)}"
            aria-label="Hapus notifikasi ${escapeHtml(notification.title)}"
        >
            <span class="notification-swipe__action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M9.3 6.2V4.8h5.4v1.4M5.8 6.2h12.4M8.2 9.2v7.2M12 9.2v7.2M15.8 9.2v7.2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
                    <path d="M7.1 6.2h9.8l-.7 11a2 2 0 0 1-2 1.8H9.8a2 2 0 0 1-2-1.8z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8" />
                </svg>
            </span>
            <span>Hapus</span>
        </button>
        <article
            class="notification-entry js-notification-entry"
            data-notification-id="${escapeHtml(notification.id)}"
            aria-expanded="false"
        >
            <button
                type="button"
                class="notification-entry__summary js-notification-toggle"
                data-notification-id="${escapeHtml(notification.id)}"
                aria-expanded="false"
            >
                <span class="notification-entry__icon notification-entry__icon--${escapeHtml(notification.tone)}" aria-hidden="true">
                    ${getNotificationIconTemplate(notification)}
                </span>
                <span class="notification-entry__copy">
                    <strong>${escapeHtml(notification.title)}</strong>
                    <small>${escapeHtml(getNotificationPaymentLabel(notification))} • ${escapeHtml(notification.invoiceId)}</small>
                </span>
                <span class="notification-entry__aside">
                    <strong class="notification-entry__amount notification-entry__amount--${escapeHtml(notification.tone)}">${escapeHtml(formatCurrency(notification.invoice.total))}</strong>
                    <small>${escapeHtml(notificationTimeFormatter.format(new Date(notification.timestamp)))}</small>
                </span>
            </button>
            <div class="notification-entry__detail">
                <div class="notification-entry__detail-inner">
                    <div class="notification-entry__chips">
                        <span class="notification-entry__chip">${escapeHtml(notification.eyebrow)}</span>
                        <span class="notification-entry__chip notification-entry__chip--${escapeHtml(notification.tone)}">${escapeHtml(notification.status)}</span>
                    </div>
                    <p class="notification-entry__message">${escapeHtml(notification.message)}</p>
                    <div class="notification-entry__summary-box">
                        <strong>Ringkasan order</strong>
                        <p>${escapeHtml(notification.preview)}</p>
                        <span>Total ${escapeHtml(formatCurrency(notification.invoice.total))} • Kadaluarsa ${escapeHtml(compactDateFormatter.format(getInvoiceExpiresAt(notification.invoice)))}</span>
                    </div>
                    <div class="notification-entry__meta">
                        <span>${escapeHtml(compactDateFormatter.format(new Date(notification.timestamp)))}</span>
                        <span>${escapeHtml(getNotificationPaymentLabel(notification))}</span>
                    </div>
                    <a href="/checkout?invoice=${encodeURIComponent(notification.invoiceId)}" class="button button--soft notification-entry__link">Lihat Struk</a>
                </div>
            </div>
        </article>
    </div>
`;

const notificationGroupTemplate = (group) => `
    <section class="notification-group" aria-label="${escapeHtml(group.label)}">
        <h3 class="notification-group__title">${escapeHtml(group.label)}</h3>
        <div class="notification-group__list">
            ${group.items.map(notificationSwipeCardTemplate).join('')}
        </div>
    </section>
`;

const renderNotificationsPage = () => {
    const emptyState = document.getElementById('notifications-empty');
    const list = document.getElementById('notifications-list');
    const menuButton = document.getElementById('notifications-menu-button');

    if (!emptyState || !list) {
        return;
    }

    const notifications = buildNotifications();
    notificationListSignature = getNotificationStateSignature(notifications);

    if (!notifications.length) {
        emptyState.classList.remove('hidden');
        list.innerHTML = '';
        closeNotificationMenu();

        if (menuButton) {
            menuButton.disabled = true;
        }

        saveSeenNotificationIds([]);
        updateNotificationIndicators();
        return;
    }

    emptyState.classList.add('hidden');

    if (menuButton) {
        menuButton.disabled = false;
    }

    list.innerHTML = groupNotificationsByDate(notifications).map(notificationGroupTemplate).join('');
    closeNotificationMenu();
    bindNotificationSwipe(list);
    markNotificationsAsSeen(notifications);
    updateNotificationIndicators();
};

const historyItemTemplate = (item) => `
    <a href="${productUrl(item.slug)}" class="history-card__item">
        <img src="${item.image}" alt="${escapeHtml(item.name)}">
        <div>
            <strong>${escapeHtml(item.shortName)}</strong>
            <span>${escapeHtml(formatOrderItemDetails(item))}</span>
        </div>
        ${priceTemplate(item, item.quantity)}
    </a>
`;

const historyCardTemplate = (invoice) => `
    <article class="panel history-card js-open-invoice" data-invoice-id="${escapeHtml(invoice.id)}" tabindex="0" role="button" aria-label="Buka pesanan ${escapeHtml(invoice.id)}">
        <div class="history-card__head">
            <span class="history-card__status">Selesai</span>
            <span class="history-card__count">${getInvoiceMenuCount(invoice)} menu</span>
            <h2>${escapeHtml(invoice.id)}</h2>
            <div class="history-card__meta">
                <span>${escapeHtml(dateFormatter.format(new Date(invoice.createdAt)))}</span>
                <span>${escapeHtml(invoice.customer.paymentMethod)}</span>
            </div>
        </div>
        <div class="history-card__items">
            ${invoice.items[0] ? historyItemTemplate(invoice.items[0]) : ''}
            ${
                invoice.items.length > 1
                    ? `
                        <div class="history-card__more hidden js-history-more">
                            ${invoice.items.slice(1).map(historyItemTemplate).join('')}
                        </div>
                        <button
                            type="button"
                            class="history-card__toggle js-history-toggle"
                            aria-expanded="false"
                        >
                            Lihat lainnya${invoice.items.length > 2 ? ` (+${invoice.items.length - 1})` : ''}
                        </button>
                    `
                    : ''
            }
        </div>
        <div class="history-card__footer">
            <div class="history-card__total">
                <span>Total</span>
                <strong>${formatCurrency(invoice.total)}</strong>
            </div>
            <a href="${invoice.items[0] ? productUrl(invoice.items[0].slug) : '/produk'}" class="button button--soft history-card__reorder">Pesan Lagi</a>
        </div>
    </article>
`;

const renderHistoryPage = () => {
    const emptyState = document.getElementById('history-empty');
    const list = document.getElementById('history-list');

    if (!emptyState || !list) {
        return;
    }

    const invoices = getInvoiceHistory();

    if (!invoices.length) {
        emptyState.classList.remove('hidden');
        list.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    list.innerHTML = invoices.map(historyCardTemplate).join('');
};

const buildInvoice = () => {
    const items = getSelectedCartDetails();
    const hasCartItems = getCartDetails().length > 0;
    const fullName = document.getElementById('checkout-name')?.value.trim() ?? '';
    const address = document.getElementById('checkout-address')?.value.trim() ?? '';
    const whatsapp = document.getElementById('checkout-whatsapp')?.value.trim() ?? '';
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value ?? '';
    const bankName = document.getElementById('checkout-bank')?.value.trim() ?? '';
    const walletName = document.getElementById('checkout-wallet')?.value.trim() ?? '';
    const paymentDetail = paymentMethod === 'Transfer Bank' ? bankName : walletName;
    const paymentLabel = ['Transfer Bank', 'Dompet Digital'].includes(paymentMethod) && paymentDetail
        ? `${paymentMethod} - ${paymentDetail}`
        : paymentMethod;

    const compactWhatsapp = whatsapp.replaceAll(/[^\d+]/g, '');

    if (!items.length) {
        showToast(hasCartItems ? 'Pilih item yang mau di-checkout dulu.' : 'Keranjang masih kosong.');
        return null;
    }

    if (!fullName || !address || !compactWhatsapp || !paymentMethod) {
        showToast('Lengkapi data pengantaran dulu.');
        return null;
    }

    if (paymentMethod === 'Transfer Bank' && !bankName) {
        showToast('Pilih bank tujuan dulu.');
        return null;
    }

    if (paymentMethod === 'Dompet Digital' && !walletName) {
        showToast('Pilih dompet digital dulu.');
        return null;
    }

    if (compactWhatsapp.length < 10) {
        showToast('Nomor WhatsApp belum lengkap.');
        return null;
    }

    const createdAt = new Date();
    const expiresAt = addMonths(createdAt, 1);

    return {
        id: `FOOD-${createdAt.getTime().toString().slice(-8)}`,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        customer: {
            fullName,
            address,
            whatsapp: compactWhatsapp,
            paymentMethod: paymentLabel,
            paymentType: paymentMethod,
            bankName,
            walletName,
        },
        items,
        total: getGrandTotal(items),
    };
};

const persistInvoice = (invoice) => {
    writeStorage(INVOICE_KEY, invoice);
    writeStorage(
        INVOICE_HISTORY_KEY,
        [invoice, ...getInvoiceHistory().filter((entry) => entry.id !== invoice.id)].slice(0, 12),
    );
    writeStorage(PROFILE_KEY, invoice.customer);
    const incomingNotifications = refreshNotificationState();

    return incomingNotifications;
};

const printInvoice = () => {
    const invoice = readStorage(INVOICE_KEY, null);

    if (!invoice) {
        showToast('Belum ada struk.');
        return;
    }

    const printWindow = window.open('', '_blank', 'width=780,height=900');

    if (!printWindow) {
        showToast('Popup cetak diblokir browser.');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="id">
            <head>
                <meta charset="utf-8">
                <title>${escapeHtml(invoice.id)} | EMMALAKU</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; background: #f2f2f4; color: #2a2433; }
                    .sheet { max-width: 760px; margin: 24px auto; padding: 32px; background: white; border-radius: 28px; }
                    h1, h2, h3, p { margin: 0; }
                    .invoice-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
                    .invoice-meta-box { padding: 16px; border-radius: 18px; background: #fff2f7; }
                    .invoice-meta-box span, .invoice-item span { display: block; margin-bottom: 6px; color: #786d81; font-size: 14px; }
                    .invoice-section { margin-top: 28px; }
                    .invoice-customer { padding: 16px; border: 1px solid #edd8e4; border-radius: 18px; }
                    .invoice-customer p, .invoice-customer span { margin-top: 8px; color: #786d81; }
                    .invoice-item, .invoice-total { display: flex; justify-content: space-between; gap: 16px; padding: 14px 0; border-bottom: 1px solid #f0e6ed; }
                    .invoice-item:last-child { border-bottom: 0; }
                    .invoice-total { margin-top: 18px; padding-top: 18px; border-top: 1px solid #f0e6ed; font-size: 20px; font-weight: 700; }
                </style>
            </head>
            <body>
                <div class="sheet">
                    <h1>EMMALAKU</h1>
                    <p>Struk pemesanan makanan</p>
                    ${invoiceTemplate(invoice)}
                </div>
                <script>
                    window.onload = () => window.print();
                </script>
            </body>
        </html>
    `);

    printWindow.document.close();
};

const initializeLandingSplash = () => {
    const landingSplash = document.querySelector('[data-landing-redirect]');

    if (!landingSplash) {
        return;
    }

    const redirectUrl = landingSplash.dataset.landingRedirect;

    if (!redirectUrl) {
        return;
    }

    const redirectDelay = prefersReducedMotion() ? 1200 : 2550;
    const exitDelay = prefersReducedMotion() ? 80 : 280;

    const redirectToDashboard = () => {
        if (landingSplash.dataset.redirecting === 'true') {
            return;
        }

        landingSplash.dataset.redirecting = 'true';
        document.body.classList.add('is-landing-exit');

        window.setTimeout(() => {
            window.location.assign(redirectUrl);
        }, exitDelay);
    };

    window.setTimeout(redirectToDashboard, redirectDelay);

    landingSplash.addEventListener('click', (event) => {
        event.preventDefault();
        redirectToDashboard();
    });
};

const initializePage = () => {
    applyTheme(readStorage(THEME_KEY, 'day'));
    setSidebarCollapsed(readStorage(SIDEBAR_KEY, false));
    updateCartIndicators();
    initializeNotificationAlerts();
    refreshNotificationState();
    startNotificationMonitor();
    setupMotionSystem();

    if (page === 'landing') {
        initializeLandingSplash();
        return;
    }

    renderHomePromo();
    renderHomeCategories();
    renderRecommendedProducts();
    renderAboutHighlights();

    if (page === 'products') {
        renderProductsPage();
    }

    if (page === 'product-detail') {
        renderProductDetailPage();
    }

    if (page === 'cart') {
        renderCartPage();
    }

    if (page === 'checkout') {
        renderCheckoutPage();
    }

    if (page === 'history') {
        renderHistoryPage();
    }
};

document.addEventListener('click', async (event) => {
    const addButton = event.target.closest('.js-add-to-cart');
    const cartChangeButton = event.target.closest('.js-cart-change');
    const removeButton = event.target.closest('.js-remove-item');
    const selectCartButton = event.target.closest('.js-cart-select');
    const notificationMenuButton = event.target.closest('.js-notification-menu-toggle');
    const notificationClearAllButton = event.target.closest('.js-notification-clear-all');
    const notificationDeleteButton = event.target.closest('.js-notification-delete');
    const notificationToggleButton = event.target.closest('.js-notification-toggle');
    const notificationSwipe = event.target.closest('.js-notification-swipe');
    const notificationMenu = event.target.closest('#notifications-menu');
    const disabledCheckoutButton = event.target.closest('.order-summary-card .button--primary[aria-disabled="true"]');
    const sidebarButton = event.target.closest('.js-sidebar-toggle');
    const sidebarScrim = event.target.closest('.js-sidebar-scrim');
    const barcodeButton = event.target.closest('#view-barcode');
    const invoiceCard = event.target.closest('.js-open-invoice');
    const historyToggleButton = event.target.closest('.js-history-toggle');
    const themeButton = event.target.closest('.js-theme-toggle');
    const optionButton = event.target.closest('.js-option-select');
    const detailQtyButton = event.target.closest('.js-detail-qty');
    const detailAddButton = event.target.closest('.js-detail-add');

    if (!notificationMenuButton && !notificationMenu) {
        closeNotificationMenu();
    }

    if (!notificationSwipe && !notificationDeleteButton) {
        closeRevealedNotificationSwipes();
    }

    if (sidebarButton || sidebarScrim) {
        event.preventDefault();
        toggleSidebar();
        return;
    }

    if (notificationMenuButton) {
        event.preventDefault();
        toggleNotificationMenu();
        return;
    }

    if (notificationToggleButton) {
        event.preventDefault();

        const notificationSwipeCard = notificationToggleButton.closest('.js-notification-swipe');
        const preventToggleUntil = Number(notificationSwipeCard?.dataset.preventToggleUntil ?? 0);

        if (preventToggleUntil > Date.now()) {
            if (notificationSwipeCard) {
                notificationSwipeCard.dataset.preventToggleUntil = '0';
            }

            return;
        }

        closeNotificationMenu();
        closeRevealedNotificationSwipes(notificationSwipeCard);
        toggleNotificationDetails(notificationToggleButton.dataset.notificationId);
        return;
    }

    if (notificationClearAllButton) {
        event.preventDefault();

        const notifications = buildNotifications();

        if (!notifications.length) {
            closeNotificationMenu();
            return;
        }

        const confirmed = await confirmAction({
            title: 'Hapus semua notifikasi?',
            message: 'Semua notifikasi yang tampil saat ini akan dihapus dari daftar.',
            confirmText: 'Hapus semua',
        });

        if (!confirmed) {
            return;
        }

        hideNotifications(notifications.map((notification) => notification.id));
        closeNotificationMenu();
        closeRevealedNotificationSwipes();
        renderNotificationsPage();
        showToast('Semua notifikasi sudah dihapus.');
        return;
    }

    if (notificationDeleteButton) {
        event.preventDefault();

        const notificationId = notificationDeleteButton.dataset.notificationId;
        const notification = buildNotifications().find((entry) => entry.id === notificationId);

        if (!notificationId || !notification) {
            return;
        }

        const confirmed = await confirmAction({
            title: 'Hapus notifikasi ini?',
            message: `${notification.title} akan dihapus dari daftar notifikasi.`,
            confirmText: 'Hapus',
        });

        if (!confirmed) {
            return;
        }

        hideNotifications([notificationId]);
        closeNotificationMenu();
        closeRevealedNotificationSwipes();
        renderNotificationsPage();
        showToast('Notifikasi dihapus.');
        return;
    }

    if (themeButton) {
        toggleTheme();
    }

    if (disabledCheckoutButton) {
        event.preventDefault();
        showToast('Pilih minimal satu menu dulu.');
        return;
    }

    if (historyToggleButton) {
        event.preventDefault();

        const historyCard = historyToggleButton.closest('.history-card');
        const moreItems = historyCard?.querySelector('.js-history-more');

        if (!moreItems) {
            return;
        }

        const expanded = historyToggleButton.getAttribute('aria-expanded') === 'true';

        moreItems.classList.toggle('hidden', expanded);
        historyToggleButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        historyToggleButton.textContent = expanded
            ? `Lihat lainnya${moreItems.children.length > 1 ? ` (+${moreItems.children.length})` : ''}`
            : 'Sembunyikan';
        return;
    }

    if (selectCartButton) {
        toggleCartLineSelection(selectCartButton.dataset.lineId);

        if (page === 'cart') {
            renderCartPage();
        }

        if (page === 'checkout') {
            renderCheckoutPage();
        }

        return;
    }

    if (addButton) {
        const product = findProductBySlug(addButton.dataset.slug);

        const confirmed = await confirmAction({
            title: 'Masukkan ke keranjang?',
            message: `Tambahkan ${product?.shortName ?? 'menu ini'} ke keranjang sekarang?`,
            confirmText: 'Tambah',
        });

        if (!confirmed) {
            return;
        }

        const result = addToCart(addButton.dataset.slug);
        showToast(result?.promoApplied ? getPromoToastMessage(result.product, result.quantity) : 'Menu ditambahkan ke keranjang.');

        if (page === 'cart') {
            renderCartPage();
        }

        if (page === 'checkout') {
            renderCheckoutPage();
        }
    }

    if (cartChangeButton) {
        const currentItem = getCartDetails().find((item) => item.lineId === cartChangeButton.dataset.lineId);
        const delta = Number(cartChangeButton.dataset.delta);

        if (currentItem && delta < 0 && currentItem.quantity <= 1) {
            const confirmed = await confirmAction({
                title: 'Hapus dari keranjang?',
                message: `${currentItem.shortName} akan dihapus dari pesanan Anda.`,
                confirmText: 'Hapus',
            });

            if (!confirmed) {
                return;
            }
        }

        changeCartQuantity(cartChangeButton.dataset.lineId, delta);

        if (page === 'cart') {
            renderCartPage();
        }

        if (page === 'checkout') {
            renderCheckoutPage();
        }
    }

    if (removeButton) {
        const currentItem = getCartDetails().find((item) => item.lineId === removeButton.dataset.lineId);

        const confirmed = await confirmAction({
            title: 'Hapus dari keranjang?',
            message: `${currentItem?.shortName ?? 'Menu ini'} akan dihapus dari pesanan Anda.`,
            confirmText: 'Hapus',
        });

        if (!confirmed) {
            return;
        }

        removeFromCart(removeButton.dataset.lineId);
        showToast('Item dihapus dari keranjang.');

        if (page === 'cart') {
            renderCartPage();
        }

        if (page === 'checkout') {
            renderCheckoutPage();
        }
    }

    if (barcodeButton) {
        const barcodeCard = document.getElementById('barcode-card');

        if (barcodeCard) {
            const willShow = barcodeCard.classList.contains('hidden');

            setBarcodeCardVisibility(willShow);

            if (willShow) {
                barcodeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return;
    }

    if (invoiceCard && !event.target.closest('a, button')) {
        const invoice = getInvoiceHistory().find((entry) => entry.id === invoiceCard.dataset.invoiceId);

        if (invoice) {
            writeStorage(INVOICE_KEY, invoice);
            window.location.assign(`/checkout?invoice=${encodeURIComponent(invoice.id)}`);
        }
    }

    if (optionButton && page === 'product-detail') {
        detailState.selections = {
            ...detailState.selections,
            [optionButton.dataset.optionGroup]: optionButton.dataset.optionValue,
        };
        renderProductDetailPage();
    }

    if (event.target.closest('input[name="payment_method"]')) {
        togglePaymentDetailFields();
    }

    if (detailQtyButton && page === 'product-detail') {
        detailState.quantity = Math.max(1, detailState.quantity + Number(detailQtyButton.dataset.delta));
        renderProductDetailPage();
    }

    if (detailAddButton && page === 'product-detail' && detailState.productSlug) {
        const product = findProductBySlug(detailState.productSlug);
        const confirmed = await confirmAction({
            title: detailState.editLineId ? 'Simpan perubahan?' : 'Masukkan ke keranjang?',
            message: detailState.editLineId
                ? `Simpan pilihan baru untuk ${product?.shortName ?? 'menu ini'}?`
                : `Tambahkan ${product?.shortName ?? 'menu ini'} ke keranjang sekarang?`,
            confirmText: detailState.editLineId ? 'Simpan' : 'Tambah',
        });

        if (!confirmed) {
            return;
        }

        if (detailState.editLineId) {
            updateCartItem(
                detailState.editLineId,
                detailState.productSlug,
                detailState.quantity,
                detailState.selections,
            );
            window.location.assign('/keranjang');
            return;
        }

        const result = addToCart(detailState.productSlug, detailState.quantity, detailState.selections);
        showToast(
            result?.promoApplied ? getPromoToastMessage(result.product, result.quantity) : 'Pesanan custom ditambahkan ke keranjang.',
        );
    }
});

document.addEventListener('submit', async (event) => {
    if (!(event.target instanceof HTMLFormElement) || event.target.id !== 'checkout-form') {
        return;
    }

    event.preventDefault();

    const invoice = buildInvoice();

    if (!invoice) {
        return;
    }

    const confirmed = await confirmAction({
        title: 'Konfirmasi pesanan?',
        message: `Total pesanan ${formatCurrency(invoice.total)}. Jika sudah sesuai, lanjutkan pembayaran sekarang.`,
        confirmText: 'Bayar',
    });

    if (!confirmed) {
        return;
    }

    await alertAction({
        title: 'Pembayaran berhasil',
        /*
        message: 'ANGGAP AJA KALIAN SUDAH BAYAR YAA😚\n\nbtw status pesanan akan otomatis jadi selesai, karena disini belom ada outletnya\n\nsekian terimakasih🤍',
        */
        message: 'Pembayaran berhasil disimulasikan.\n\nUntuk versi saat ini, scan pembayaran langsung dianggap selesai dan pesanan otomatis masuk ke notifikasi sebagai diproses.',
        confirmText: 'OK',
    });

    const incomingNotifications = persistInvoice(invoice);
    clearPurchasedCartItems(invoice.items);
    renderInvoice(invoice);
    renderCheckoutSummary(invoice.items, true);
    document.getElementById('checkout-form-panel')?.classList.add('hidden');
    document.getElementById('checkout-submit-button')?.classList.add('hidden');
    const barcodeCard = document.getElementById('barcode-card');

    if (barcodeCard) {
        setBarcodeCardVisibility(true);
        barcodeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (!incomingNotifications.length) {
        showToast('Struk dibuat.');
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeNotificationMenu();
        closeRevealedNotificationSwipes();
    }

    if (event.target.closest?.('button, a, input, textarea, select')) {
        return;
    }

    const invoiceCard = event.target.closest?.('.js-open-invoice');

    if (!invoiceCard || !['Enter', ' '].includes(event.key)) {
        return;
    }

    event.preventDefault();
    const invoice = getInvoiceHistory().find((entry) => entry.id === invoiceCard.dataset.invoiceId);

    if (invoice) {
        writeStorage(INVOICE_KEY, invoice);
        window.location.assign(`/checkout?invoice=${encodeURIComponent(invoice.id)}`);
    }
});

initializePage();
