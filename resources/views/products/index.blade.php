@extends('layouts.app')

@section('content')
    <section class="page-stack">
        <div class="compact-meta-row">
            <span id="product-result-meta" class="status-pill">0 menu</span>
            <span id="product-category-meta" class="status-pill">0 kategori</span>
        </div>

        <section class="panel search-panel">
            <label class="search-field" for="product-search">
                <span class="search-field__icon">
                    @include('partials.icon', ['name' => 'search'])
                </span>
                <input
                    id="product-search"
                    type="search"
                    name="search"
                    inputmode="search"
                    autocomplete="off"
                    placeholder="Cari menu..."
                >
            </label>
        </section>

        <div id="category-filters" class="filter-row filter-row--scroll"></div>

        <section id="product-grid" class="menu-grid"></section>

        <section id="product-empty" class="panel empty-state hidden">
            <h2>Menu tidak ditemukan</h2>
            <p>Coba kata kunci atau kategori lain.</p>
        </section>
    </section>
@endsection
