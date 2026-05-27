@extends('layouts.app')

@section('content')
    <section class="home-stack">
        <div id="home-promo" class="promo-banner">
            <div class="promo-banner__placeholder"></div>
        </div>

        <label class="search-field" for="home-search">
            <span class="search-field__icon">
                @include('partials.icon', ['name' => 'search'])
            </span>
            <input
                id="home-search"
                type="search"
                placeholder="Cari teh susu, ramen, burger..."
                autocomplete="off"
            >
        </label>

        <section class="content-block">
            <div class="content-head">
                <h2>Kategori</h2>
            </div>
            <div id="home-category-grid" class="category-grid"></div>
        </section>

        <section class="content-block">
            <div class="content-head">
                <h2>Rekomendasi</h2>
                <a href="{{ route('products.index') }}" class="text-link">Lihat semua</a>
            </div>
            <div id="recommended-grid" class="menu-grid"></div>
            <div id="home-search-empty" class="panel empty-state hidden">
                <h3>Menu tidak ditemukan</h3>
                <p>Coba kata kunci lain untuk lihat menu yang cocok.</p>
            </div>
        </section>

        <section class="content-block">
            <div class="content-head">
                <h2>Pernah Anda Pesan</h2>
                <a href="{{ route('history.index') }}" class="text-link">Riwayat</a>
            </div>
            <div id="home-mini-summary" class="quick-cart-card"></div>
        </section>
    </section>
@endsection
