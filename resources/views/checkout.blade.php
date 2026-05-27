@extends('layouts.app')

@section('content')
    <section class="page-stack">
        <div id="checkout-empty" class="panel empty-state hidden">
            <h2>Keranjang kosong</h2>
            <p>Tambahkan menu terlebih dahulu.</p>
            <a href="{{ route('products.index') }}" class="button button--primary">Lihat Menu</a>
        </div>

        <div id="checkout-layout" class="checkout-stack">
            <section id="checkout-form-panel" class="panel checkout-form-panel">
                <div class="checkout-panel-intro">
                    <span class="eyebrow">Data Pesanan</span>
                    <h2>Lengkapi detail pembayaran</h2>
                    <p>Isi data dan pilih metode pembayaran sebelum membuat pesanan.</p>
                </div>

                <form id="checkout-form" class="form-stack">
                    <label class="field checkout-field">
                        <span>Nama</span>
                        <input id="checkout-name" name="full_name" type="text" placeholder="Nama penerima">
                    </label>

                    <label class="field checkout-field">
                        <span>Alamat</span>
                        <textarea id="checkout-address" name="address" rows="4" placeholder="Alamat lengkap pengantaran"></textarea>
                    </label>

                    <label class="field checkout-field">
                        <span>WhatsApp</span>
                        <input id="checkout-whatsapp" name="whatsapp" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx">
                    </label>

                    <fieldset class="payment-fieldset">
                        <legend class="payment-fieldset__legend">Pembayaran</legend>
                        <div class="payment-grid">
                            <label class="payment-option">
                                <input type="radio" name="payment_method" value="Transfer Bank">
                                <span>Transfer Bank</span>
                                <small>Verifikasi manual</small>
                            </label>
                            <label id="bank-field" class="field checkout-field bank-field hidden">
                                <span>Bank Tujuan</span>
                                <select id="checkout-bank" name="bank_name">
                                    <option value="">Pilih bank</option>
                                    <option value="BCA">BCA</option>
                                    <option value="BRI">BRI</option>
                                    <option value="Mandiri">Mandiri</option>
                                    <option value="BNI">BNI</option>
                                    <option value="BSI">BSI</option>
                                </select>
                            </label>
                            <label class="payment-option">
                                <input type="radio" name="payment_method" value="QRIS">
                                <span>QRIS</span>
                                <small>Pembayaran instan</small>
                            </label>
                            <label class="payment-option">
                                <input type="radio" name="payment_method" value="Dompet Digital">
                                <span>Dompet Digital</span>
                                <small>Cepat dan praktis</small>
                            </label>
                            <label id="wallet-field" class="field checkout-field payment-detail-field hidden">
                                <span>Pilih Dompet Digital</span>
                                <select id="checkout-wallet" name="wallet_name">
                                    <option value="">Pilih dompet digital</option>
                                    <option value="GoPay">GoPay</option>
                                    <option value="OVO">OVO</option>
                                    <option value="DANA">DANA</option>
                                    <option value="ShopeePay">ShopeePay</option>
                                    <option value="LinkAja">LinkAja</option>
                                </select>
                            </label>
                        </div>
                    </fieldset>
                </form>
            </section>

            <aside class="panel order-summary-card checkout-summary-panel">
                <div class="content-head content-head--tight">
                    <h2>Ringkasan Pesanan</h2>
                </div>
                <div id="checkout-summary"></div>
                <button
                    type="submit"
                    id="checkout-submit-button"
                    form="checkout-form"
                    class="button button--primary button--full checkout-summary-panel__submit"
                >
                    Konfirmasi
                </button>
            </aside>
        </div>

        <section id="invoice-panel" class="panel invoice-panel hidden">
            <div class="content-head">
                <h2>Struk</h2>
                <div class="invoice-actions">
                    <button type="button" id="view-barcode" class="button button--ghost" aria-expanded="false">Lihat Barcode</button>
                </div>
            </div>
            <div id="invoice-content"></div>
        </section>
    </section>
@endsection
