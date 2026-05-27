@extends('layouts.app')

@section('content')
    <section class="page-stack">
        <div class="content-head notification-head">
            <div>
                <h2>Notifikasi</h2>
                <p class="notification-head__caption">Cek update pesanan terbaru Anda di sini.</p>
            </div>

            <div class="notification-menu-wrap">
                <button
                    type="button"
                    id="notifications-menu-button"
                    class="mini-action notification-menu__toggle js-notification-menu-toggle"
                    aria-label="Buka menu notifikasi"
                    aria-haspopup="menu"
                    aria-expanded="false"
                    aria-controls="notifications-menu"
                >
                    @include('partials.icon', ['name' => 'more'])
                </button>

                <div id="notifications-menu" class="notification-menu hidden" role="menu" aria-hidden="true">
                    <button type="button" class="notification-menu__item js-notification-clear-all" role="menuitem">
                        <span class="notification-menu__icon" aria-hidden="true">
                            @include('partials.icon', ['name' => 'trash'])
                        </span>
                        <span>Hapus semua notifikasi</span>
                    </button>
                </div>
            </div>
        </div>

        <div id="notifications-empty" class="panel empty-state cart-empty-state hidden">
            <div class="cart-empty-state__icon" aria-hidden="true">
                @include('partials.icon', ['name' => 'bell'])
            </div>
            <div>
                <span class="cart-empty-state__eyebrow">Notifikasi Kosong</span>
                <h2>Belum ada notifikasi</h2>
                <p>Notifikasi pesanan akan muncul otomatis setelah Anda membuat pesanan.</p>
            </div>
            <a href="{{ route('products.index') }}" class="button button--primary">Buat Pesanan</a>
        </div>

        <div id="notifications-list" class="notification-list"></div>
    </section>
@endsection
