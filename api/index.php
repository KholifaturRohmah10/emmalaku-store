<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Bootstrap\LoadConfiguration;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Http\Request;
use Illuminate\View\FileViewFinder;
use Illuminate\View\ViewServiceProvider;

if (isset($_ENV['VERCEL']) || isset($_SERVER['VERCEL'])) {
    $runtimePath = '/tmp/emmalaku';
    $storagePath = $runtimePath.'/storage';
    $setRuntimeEnv = static function (string $key, string $value): void {
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
        putenv("{$key}={$value}");
    };

    foreach ([
        $runtimePath.'/views',
        $storagePath.'/framework/cache',
        $storagePath.'/framework/cache/data',
        $storagePath.'/framework/sessions',
        $storagePath.'/framework/views',
        $storagePath.'/logs',
    ] as $path) {

        if (!is_dir($path)) {
            mkdir($path, 0777, true);
        }
    }

    $setRuntimeEnv('LARAVEL_STORAGE_PATH', $storagePath);
    $setRuntimeEnv('VIEW_COMPILED_PATH', $runtimePath.'/views');
    $setRuntimeEnv('SESSION_DRIVER', $_ENV['SESSION_DRIVER'] ?? $_SERVER['SESSION_DRIVER'] ?? 'cookie');
    $setRuntimeEnv('CACHE_STORE', $_ENV['CACHE_STORE'] ?? $_SERVER['CACHE_STORE'] ?? 'array');
    $setRuntimeEnv('QUEUE_CONNECTION', $_ENV['QUEUE_CONNECTION'] ?? $_SERVER['QUEUE_CONNECTION'] ?? 'sync');
    $setRuntimeEnv('LOG_CHANNEL', $_ENV['LOG_CHANNEL'] ?? $_SERVER['LOG_CHANNEL'] ?? 'stderr');
}

try {
    define('LARAVEL_START', microtime(true));

    if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
        require $maintenance;
    }

    require __DIR__.'/../vendor/autoload.php';

    /** @var Application $app */
    $app = require_once __DIR__.'/../bootstrap/app.php';

    if (isset($_ENV['VERCEL']) || isset($_SERVER['VERCEL'])) {
        $app->afterBootstrapping(LoadConfiguration::class, static function (Application $app) {
            $app['config']->set('view.paths', [dirname(__DIR__).'/resources/views']);
            $app['config']->set('view.compiled', $_ENV['VIEW_COMPILED_PATH'] ?? $_SERVER['VIEW_COMPILED_PATH'] ?? '/tmp/emmalaku/views');

            if (! $app->bound('files')) {
                $app->singleton('files', static fn () => new Filesystem);
            }

            $app->bind('view.finder', static function (Application $app) {
                return new FileViewFinder($app['files'], $app['config']->get('view.paths'));
            });
        });

        if (! $app->bound('view')) {
            $app->register(ViewServiceProvider::class);
        }
    }

    $app->handleRequest(Request::capture());
} catch (Throwable $exception) {
    error_log('EMMALAKU_EXCEPTION='.get_class($exception).': '.$exception->getMessage());
    error_log((string) $exception);

    if ($previous = $exception->getPrevious()) {
        error_log('EMMALAKU_PREVIOUS='.get_class($previous).': '.$previous->getMessage());
        error_log('Previous exception: '.(string) $previous);
    }

    if (! headers_sent()) {
        http_response_code(500);
        header('Content-Type: text/plain; charset=UTF-8');
    }

    echo 'EMMALAKU server error. Cek Vercel Function Logs untuk detail terbaru.';
}
