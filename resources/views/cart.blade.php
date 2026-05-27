@extends('layouts.app')

@section('content')
    <section class="page-stack">
        <section class="panel">
            <div id="cart-items" class="order-list"></div>
        </section>

        <aside class="panel order-summary-card cart-paybar hidden">
            <div id="cart-summary"></div>
            <a href="{{ route('checkout.index') }}" class="button button--primary button--full">Checkout</a>
        </aside>

        <section class="content-block">
            <div class="content-head">
                <h2>Rekomendasi Lain</h2>
            </div>
            <div id="cart-recommendations" class="menu-grid"></div>
        </section>
    </section>
@endsection
