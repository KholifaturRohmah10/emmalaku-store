<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class StorefrontPagesTest extends TestCase
{
    public static function pageProvider(): array
    {
        return [
            'home' => ['/', 'Kategori', 'data-page="home"'],
            'products' => ['/produk', '0 menu', 'data-page="products"'],
            'cart' => ['/keranjang', 'Rekomendasi Lain', 'data-page="cart"'],
            'checkout' => ['/checkout', 'Keranjang kosong', 'data-page="checkout"'],
            'history' => ['/riwayat', 'Belum ada pesanan', 'data-page="history"'],
            'about' => ['/tentang', 'Sederhana, cepat, dan nyaman di HP.', 'data-page="about"'],
        ];
    }

    #[DataProvider('pageProvider')]
    public function test_storefront_pages_are_accessible(string $url, string $visibleText, string $pageMarker): void
    {
        $this->get($url)
            ->assertOk()
            ->assertSee($visibleText)
            ->assertSee($pageMarker, false);
    }

    public function test_product_detail_page_passes_slug_to_shell(): void
    {
        $this->get('/produk/honey-milk-tea')
            ->assertOk()
            ->assertSee('data-page="product-detail"', false)
            ->assertSee('data-product-slug="honey-milk-tea"', false);
    }
}
