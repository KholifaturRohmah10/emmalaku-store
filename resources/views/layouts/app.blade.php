@php
    $navItems = [
        ['key' => 'home', 'label' => 'Beranda', 'route' => route('home'), 'icon' => 'home'],
        ['key' => 'products', 'label' => 'Menu', 'route' => route('products.index'), 'icon' => 'grid'],
        ['key' => 'notifications', 'label' => 'Notifikasi', 'route' => route('notifications.index'), 'icon' => 'bell'],
        ['key' => 'history', 'label' => 'Riwayat', 'route' => route('history.index'), 'icon' => 'history'],
        ['key' => 'about', 'label' => 'Tentang', 'route' => route('about.index'), 'icon' => 'info'],
    ];
@endphp
<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="description" content="{{ $description }}">
        <title>{{ $title }} | {{ $brand }}</title>

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">

        @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
            @vite(['resources/css/app.css', 'resources/js/app.js'])
        @endif
    </head>
    <body
        data-page="{{ $page }}"
        @isset($productSlug)
            data-product-slug="{{ $productSlug }}"
        @endisset
    >
        <div class="app-backdrop">
            <div class="phone-shell">
                <div class="phone-shell__chrome"></div>
                <div class="phone-shell__body">
                    <header class="app-topbar">
                        <div class="topbar-primary">
                            <button type="button" class="sidebar-toggle js-sidebar-toggle" aria-label="Buka/tutup menu" aria-expanded="true">
                                <span></span>
                                <span></span>
                                <span></span>
                            </button>

                            <a href="{{ route('home') }}" class="brand-lockup" aria-label="Ke beranda {{ $brand }}">
                                <span class="brand-mark brand-mark--logo">
                                    <img src="{{ asset('images/brand/emmalaku-shop.svg') }}" alt="" aria-hidden="true">
                                </span>
                                <span>
                                    <strong>{{ $brand }}</strong>
                                    <small>online order</small>
                                </span>
                            </a>

                            <h1 class="topbar-title">{{ $title }}</h1>
                        </div>

                        <div class="topbar-actions">
                            <button type="button" class="mini-action mini-action--theme js-theme-toggle" aria-label="Ganti tampilan malam">
                                <span class="js-theme-label">Malam</span>
                            </button>
                            <a href="{{ route('cart.index') }}" class="mini-action mini-action--cart {{ in_array($page, ['cart', 'checkout'], true) ? 'is-active' : '' }}" aria-label="Buka keranjang">
                                @include('partials.icon', ['name' => 'cart'])
                                <span class="mini-badge js-cart-count">0</span>
                            </a>
                        </div>
                    </header>

                    <main class="app-screen">
                        @yield('content')
                    </main>
                </div>
            </div>
        </div>

        <nav id="app-sidebar" class="bottom-nav" aria-label="Navigasi utama">
            <a href="{{ route('home') }}" class="sidebar-brand" aria-label="Ke beranda {{ $brand }}">
                <span class="brand-mark brand-mark--logo">
                    <img src="{{ asset('images/brand/emmalaku-shop.svg') }}" alt="" aria-hidden="true">
                </span>
                <span>
                    <small>Food order</small>
                    <strong>{{ $brand }}</strong>
                    <em>online order</em>
                </span>
            </a>

            <span class="sidebar-section">Menu Utama</span>

            @foreach ($navItems as $item)
                <a href="{{ $item['route'] }}" class="bottom-nav__item {{ $activeNav === $item['key'] ? 'is-active' : '' }}">
                    <span class="bottom-nav__icon">
                        @include('partials.icon', ['name' => $item['icon']])
                        @if ($item['key'] === 'notifications')
                            <span class="bottom-nav__badge js-notification-count">0</span>
                        @endif
                    </span>
                    <span>{{ $item['label'] }}</span>
                </a>
            @endforeach
        </nav>
        <button type="button" class="sidebar-scrim js-sidebar-scrim" aria-label="Tutup menu"></button>

        <div id="toast-root" class="toast-root" aria-live="polite" aria-atomic="true"></div>
        <div id="confirm-modal" class="confirm-modal hidden" aria-hidden="true">
            <div class="confirm-modal__backdrop" data-confirm-cancel></div>
            <section class="confirm-modal__card" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                <div class="confirm-modal__icon">?</div>
                <div class="confirm-modal__copy">
                    <span>Konfirmasi</span>
                    <h2 id="confirm-title">Lanjutkan aksi?</h2>
                    <p id="confirm-message">Pastikan pilihan Anda sudah benar.</p>
                </div>
                <div class="confirm-modal__actions">
                    <button type="button" class="button button--ghost" data-confirm-cancel>Batal</button>
                    <button type="button" class="button button--primary" data-confirm-ok>Ya, lanjut</button>
                </div>
            </section>
        </div>
    </body>
</html>
