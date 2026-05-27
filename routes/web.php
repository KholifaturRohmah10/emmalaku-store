<?php

use App\Http\Controllers\StorefrontController;
use Illuminate\Support\Facades\Route;

Route::controller(StorefrontController::class)->group(function () {
    Route::get('/', 'landing')->name('landing');
    Route::get('/s', 'receiptScan')->name('receipt.scan');
    Route::get('/beranda', 'home')->name('home');
    Route::get('/produk', 'products')->name('products.index');
    Route::get('/produk/{slug}', 'showProduct')->name('products.show');
    Route::get('/keranjang', 'cart')->name('cart.index');
    Route::get('/checkout', 'checkout')->name('checkout.index');
    Route::get('/notifikasi', 'notifications')->name('notifications.index');
    Route::get('/riwayat', 'history')->name('history.index');
    Route::get('/tentang', 'about')->name('about.index');
});
