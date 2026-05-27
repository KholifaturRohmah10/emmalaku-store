@extends('layouts.app')

@section('content')
    <section id="product-detail" class="page-stack motion-skip">
        <article class="panel loading-card">
            <span class="eyebrow">Detail</span>
            <h1>Memuat menu...</h1>
            <p>Menyiapkan menu favoritmu.</p>
        </article>
    </section>

    <section class="content-block content-block--after">
        <div class="content-head">
            <h2>Menu Serupa</h2>
            <a href="{{ route('products.index') }}" class="text-link">Kembali</a>
        </div>
        <div id="related-products" class="menu-grid"></div>
    </section>
@endsection
