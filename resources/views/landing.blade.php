@extends('layouts.entry')

@section('content')
    <section class="page-stack landing-stack">
        <a
            href="{{ route('home') }}"
            class="home-opening--landing"
            data-landing-redirect="{{ route('home') }}"
            aria-label="Masuk ke dashboard EMMALAKU"
        >
            <div class="home-opening__brand">
                <div class="home-opening__logo-stage" aria-hidden="true">
                    <span class="home-opening__logo-card">
                        <img src="{{ asset('images/brand/emmalaku-shop.svg') }}" alt="">
                    </span>
                </div>
            </div>

            <span class="home-opening__progress" aria-hidden="true">
                <span></span>
            </span>
        </a>
    </section>
@endsection
