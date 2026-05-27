<?php

if (isset($_ENV['VERCEL']) || isset($_SERVER['VERCEL'])) {
    $runtimePath = '/tmp/emmalaku';
    $setRuntimeEnv = static function (string $key, string $value): void {
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
        putenv("{$key}={$value}");
    };

    foreach (['views', 'cache', 'sessions', 'logs'] as $directory) {
        $path = "{$runtimePath}/{$directory}";

        if (!is_dir($path)) {
            mkdir($path, 0777, true);
        }
    }

    $setRuntimeEnv('VIEW_COMPILED_PATH', $runtimePath.'/views');
    $setRuntimeEnv('SESSION_DRIVER', $_ENV['SESSION_DRIVER'] ?? $_SERVER['SESSION_DRIVER'] ?? 'cookie');
    $setRuntimeEnv('CACHE_STORE', $_ENV['CACHE_STORE'] ?? $_SERVER['CACHE_STORE'] ?? 'array');
    $setRuntimeEnv('QUEUE_CONNECTION', $_ENV['QUEUE_CONNECTION'] ?? $_SERVER['QUEUE_CONNECTION'] ?? 'sync');
    $setRuntimeEnv('LOG_CHANNEL', $_ENV['LOG_CHANNEL'] ?? $_SERVER['LOG_CHANNEL'] ?? 'stderr');
}

require __DIR__ . '/../public/index.php';
