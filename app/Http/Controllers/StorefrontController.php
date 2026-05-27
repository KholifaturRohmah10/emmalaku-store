<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class StorefrontController extends Controller
{
    private const BRAND = 'EMMALAKU';
    private const RECEIPT_PRODUCTS = [
        1 => 'Honey Milk Tea',
        2 => 'Matcha Latte',
        3 => 'Chocolate Frappe',
        4 => 'Strawberry Smoothie',
        5 => 'Spicy Ramen',
        6 => 'Chicken Bowl',
        7 => 'Crispy Burger',
        8 => 'French Fries',
        9 => 'Pepperoni Pizza',
        10 => 'Berry Cheesecake',
        11 => 'Nasi Goreng',
        12 => 'Sate Ayam',
        13 => 'Bakso Kuah',
        14 => 'Nasi Rendang',
        15 => 'Mie Ayam',
        16 => 'Gado-Gado',
        17 => 'Ayam Geprek',
        18 => 'Martabak Manis',
        19 => 'Dimsum Ayam',
    ];
    private const RECEIPT_PAYMENT_LABELS = [
        'Q' => 'QRIS',
        'B' => 'Transfer Bank',
        'D' => 'Dompet Digital',
        'O' => 'Pembayaran Online',
    ];

    public function landing(): View
    {
        return $this->entryPage(
            'landing',
            'Selamat Datang',
            'Halaman pembuka EMMALAKU sebelum masuk ke beranda pemesanan makanan.',
            'landing',
        );
    }

    public function home(): View
    {
        return $this->page(
            'home',
            'Beranda',
            'Aplikasi pesan makanan mobile-first untuk minuman dan makanan cepat saji.',
            'home',
            'home',
        );
    }

    public function receiptScan(Request $request): View
    {
        return $this->entryPage(
            'receipt-scan',
            'QR Struk',
            'Halaman hasil scan QR untuk melihat rincian pesanan EMMALAKU.',
            'receipt-scan',
            ['receipt' => $this->decodeReceiptPayload($request->query('p'))],
        );
    }

    public function products(): View
    {
        return $this->page(
            'products.index',
            'Menu',
            'Jelajahi menu makanan dan minuman EMMALAKU, filter kategori, lalu pesan dengan cepat.',
            'products',
            'products',
        );
    }

    public function showProduct(string $slug): View
    {
        return $this->page(
            'products.show',
            'Detail Menu',
            'Lihat detail menu, pilih variasi, lalu tambahkan ke keranjang.',
            'product-detail',
            'products',
            ['productSlug' => $slug],
        );
    }

    public function cart(): View
    {
        return $this->page(
            'cart',
            'Keranjang',
            'Kelola menu yang dipilih, atur jumlah, dan cek ringkasan pesanan.',
            'cart',
            'cart',
        );
    }

    public function checkout(): View
    {
        return $this->page(
            'checkout',
            'Pembayaran',
            'Masukkan detail pengantaran dan buat struk pesanan makanan.',
            'checkout',
            'cart',
        );
    }

    public function notifications(): View
    {
        return $this->page(
            'notifications',
            'Notifikasi',
            'Lihat notifikasi pesanan, pengingat masa berlaku, dan status pembayaran di EMMALAKU.',
            'notifications',
            'notifications',
        );
    }

    public function history(): View
    {
        return $this->page(
            'history',
            'Riwayat',
            'Lihat riwayat pemesanan dan menu yang pernah dipesan di EMMALAKU.',
            'history',
            'history',
        );
    }

    public function about(): View
    {
        return $this->page(
            'about',
            'Tentang',
            'Tentang EMMALAKU sebagai demo aplikasi pesan makanan tanpa database.',
            'about',
            'about',
        );
    }

    private function entryPage(
        string $view,
        string $title,
        string $description,
        string $page,
        array $extra = [],
    ): View {
        return view($view, array_merge([
            'brand' => self::BRAND,
            'title' => $title,
            'description' => $description,
            'page' => $page,
        ], $extra));
    }

    private function decodeReceiptPayload(?string $payload): ?array
    {
        if (!is_string($payload) || trim($payload) === '') {
            return null;
        }

        $parts = explode('~', $payload, 5);

        if (count($parts) !== 5 || $parts[0] !== '1') {
            return null;
        }

        [$version, $invoiceToken, $createdAtToken, $paymentCode, $itemsToken] = $parts;

        if ($version !== '1' || $invoiceToken === '' || $createdAtToken === '' || $itemsToken === '') {
            return null;
        }

        $createdAtSeconds = (int) base_convert($createdAtToken, 36, 10);

        if ($createdAtSeconds <= 0) {
            return null;
        }

        $items = collect(explode(',', $itemsToken))
            ->map(function (string $itemToken) {
                $segments = explode('.', $itemToken);

                if (count($segments) !== 3) {
                    return null;
                }

                [$productToken, $quantityToken, $subtotalToken] = $segments;
                $productId = (int) base_convert($productToken, 36, 10);
                $quantity = (int) base_convert($quantityToken, 36, 10);
                $subtotal = (int) base_convert($subtotalToken, 36, 10);
                $name = self::RECEIPT_PRODUCTS[$productId] ?? null;

                if (!$name || $quantity <= 0 || $subtotal < 0) {
                    return null;
                }

                return [
                    'name' => $name,
                    'quantity' => $quantity,
                    'subtotal' => $subtotal,
                    'unit_price' => (int) round($subtotal / max(1, $quantity)),
                ];
            })
            ->filter()
            ->values()
            ->all();

        if ($items === []) {
            return null;
        }

        $subtotal = collect($items)->sum('subtotal');
        $deliveryFee = 9000;
        $serviceFee = 3000;
        $total = $subtotal + $deliveryFee + $serviceFee;
        $createdAt = Carbon::createFromTimestamp($createdAtSeconds, config('app.timezone'));

        return [
            'invoice_id' => str_starts_with($invoiceToken, 'FOOD-') ? $invoiceToken : "FOOD-{$invoiceToken}",
            'payment_method' => self::RECEIPT_PAYMENT_LABELS[$paymentCode] ?? self::RECEIPT_PAYMENT_LABELS['O'],
            'created_at' => $createdAt,
            'items' => $items,
            'subtotal' => $subtotal,
            'delivery_fee' => $deliveryFee,
            'service_fee' => $serviceFee,
            'total' => $total,
            'menu_count' => collect($items)->sum('quantity'),
        ];
    }

    private function page(
        string $view,
        string $title,
        string $description,
        string $page,
        string $activeNav,
        array $extra = [],
    ): View {
        return view($view, array_merge([
            'brand' => self::BRAND,
            'title' => $title,
            'description' => $description,
            'page' => $page,
            'activeNav' => $activeNav,
        ], $extra));
    }
}
