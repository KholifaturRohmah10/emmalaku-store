@extends('layouts.app')

@section('content')
    <section class="page-stack">
        <div id="history-empty" class="panel empty-state cart-empty-state hidden">
            <div class="cart-empty-state__icon" aria-hidden="true">
                @include('partials.icon', ['name' => 'history'])
            </div>
            <div>
                <span class="cart-empty-state__eyebrow">Riwayat Kosong</span>
                <h2>Belum ada pesanan</h2>
                <p>Pesanan selesai nanti akan tersimpan otomatis di sini.</p>
            </div>
            <a href="{{ route('products.index') }}" class="button button--primary">Jelajahi Menu</a>
        </div>

        <div id="history-list" class="history-list"></div>
    </section>
@endsection
