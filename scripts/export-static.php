<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

$baseUrl = rtrim(getenv('STATIC_APP_URL') ?: 'https://emmalaku-store.vercel.app', '/');

foreach ([
    'APP_URL' => $baseUrl,
    'APP_ENV' => 'production',
    'APP_DEBUG' => 'false',
] as $key => $value) {
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
    putenv("{$key}={$value}");
}

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);

$pages = [
    '/' => 'index.html',
    '/beranda' => 'beranda/index.html',
    '/produk' => 'produk/index.html',
    '/produk/honey-milk-tea' => 'produk/detail/index.html',
    '/keranjang' => 'keranjang/index.html',
    '/checkout' => 'checkout/index.html',
    '/notifikasi' => 'notifikasi/index.html',
    '/riwayat' => 'riwayat/index.html',
    '/tentang' => 'tentang/index.html',
    '/s' => 's/index.html',
];

foreach ($pages as $uri => $target) {
    $request = Request::create($baseUrl.$uri, 'GET');
    $response = $kernel->handle($request);
    $content = $response->getContent();

    $kernel->terminate($request, $response);

    if ($response->getStatusCode() >= 400 || $content === false || $content === '') {
        fwrite(STDERR, "Failed exporting {$uri} with status {$response->getStatusCode()}".PHP_EOL);
        exit(1);
    }

    $path = __DIR__.'/../public/'.$target;
    $directory = dirname($path);

    if (! is_dir($directory)) {
        mkdir($directory, 0777, true);
    }

    file_put_contents($path, $content);
    echo "Exported {$uri} -> public/{$target}".PHP_EOL;
}
