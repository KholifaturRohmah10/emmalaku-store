@extends('layouts.scan')

@php
    $rupiah = static fn (int $value): string => 'Rp' . number_format($value, 0, ',', '.');
@endphp

@section('content')
    @if (!$receipt)
        <section class="scan-empty">
            <article class="scan-empty__card">
                <button
                    type="button"
                    class="scan-modal__close"
                    aria-label="Kembali"
                    onclick="if (window.history.length > 1) { window.history.back(); } else { window.location.href='{{ route('home') }}'; }"
                >
                    ×
                </button>
                <h1>Struk tidak tersedia</h1>
                <p>QR ini belum berisi data pesanan yang valid atau link-nya tidak lengkap.</p>
                <a href="{{ route('home') }}" class="button button--primary">Kembali ke Dashboard</a>
            </article>
        </section>
    @else
        <section class="scan-receipt-wrap">
            <article class="scan-receipt-sheet">
                <button
                    type="button"
                    class="scan-modal__close"
                    aria-label="Kembali"
                    onclick="if (window.history.length > 1) { window.history.back(); } else { window.location.href='{{ route('home') }}'; }"
                >
                    ×
                </button>
                <header class="scan-receipt-sheet__brand">
                    <img src="{{ asset('images/brand/emmalaku-shop.svg') }}" alt="Logo {{ $brand }}">
                    <h1>{{ $brand }}</h1>
                    <p>online order</p>
                    <span>Rincian pesanan QR</span>
                </header>

                <section class="scan-receipt-sheet__meta">
                    <div>
                        <span>Pesanan</span>
                        <strong>{{ $receipt['invoice_id'] }}</strong>
                    </div>
                    <div>
                        <span>Waktu</span>
                        <strong>{{ $receipt['created_at']->format('d/m/y H:i') }}</strong>
                    </div>
                    <div>
                        <span>Pembayaran</span>
                        <strong>{{ $receipt['payment_method'] }}</strong>
                    </div>
                    <div>
                        <span>Total menu</span>
                        <strong>{{ $receipt['menu_count'] }} item</strong>
                    </div>
                </section>

                <div class="scan-receipt-sheet__divider"></div>

                <section class="scan-receipt-sheet__items">
                    @foreach ($receipt['items'] as $item)
                        <article class="scan-receipt-sheet__item">
                            <div>
                                <h2>{{ $item['name'] }}</h2>
                                <p>{{ $item['quantity'] }} x {{ $rupiah($item['unit_price']) }}</p>
                            </div>
                            <strong>{{ $rupiah($item['subtotal']) }}</strong>
                        </article>
                    @endforeach
                </section>

                <div class="scan-receipt-sheet__divider"></div>

                <section class="scan-receipt-sheet__summary">
                    <div>
                        <span>Subtotal</span>
                        <strong>{{ $rupiah($receipt['subtotal']) }}</strong>
                    </div>
                    <div>
                        <span>Biaya kirim</span>
                        <strong>{{ $rupiah($receipt['delivery_fee']) }}</strong>
                    </div>
                    <div>
                        <span>Biaya layanan</span>
                        <strong>{{ $rupiah($receipt['service_fee']) }}</strong>
                    </div>
                    <div class="scan-receipt-sheet__total">
                        <span>Total</span>
                        <strong>{{ $rupiah($receipt['total']) }}</strong>
                    </div>
                </section>

                <footer class="scan-receipt-sheet__footer">
                    <p>Terima kasih atas pesanan Anda.</p>
                    <span>{{ $receipt['invoice_id'] }}</span>
                </footer>
            </article>
        </section>
    @endif
@endsection
