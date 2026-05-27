@extends('layouts.app')

@section('content')
    <section class="page-stack about-page">
        <details class="panel about-hero about-section">
            <summary class="about-section__summary">
                <div class="about-section__headline">
                    <h2 class="about-section__title">Profil Singkat</h2>
                </div>
            </summary>
            <div class="about-section__content about-hero__copy">
                <h2>Saya KHOLIFATUR ROHMAH, 21 tahun.</h2>
                <p>Cita-cita saya punya uang unlimited. EMMALAKU saya buat sebagai project latihan untuk membangun tampilan dan alur pemesanan makanan berbasis Laravel dengan gaya yang tetap rapi dan nyaman dipakai di HP.</p>
            </div>
        </details>

        <details class="panel info-card about-block about-section">
            <summary class="about-section__summary">
                <div class="about-section__headline">
                    <h2 class="about-section__title">Fungsi Project</h2>
                </div>
            </summary>
            <div class="about-section__content">
                <h2>Project ini dipakai untuk mensimulasikan proses order makanan secara sederhana.</h2>
                <p>User bisa melihat menu, memilih kategori, menambahkan item ke keranjang, lalu lanjut ke checkout. Fokus utamanya sekarang ada di tampilan mobile dan alur penggunaan.</p>
            </div>
        </details>

        <details class="panel info-card about-note about-section">
            <summary class="about-section__summary">
                <div class="about-section__headline">
                    <h2 class="about-section__title">Peringatan Project</h2>
                </div>
            </summary>
            <div class="about-section__content">
                <h2>Project ini masih banyak kurangnya.</h2>
                <p>Saat ini program masih tanpa database, jadi data belum tersimpan permanen dan beberapa bagian masih berupa simulasi. Masih perlu banyak pengembangan dari sisi backend, validasi, dan penyempurnaan fitur.</p>
            </div>
        </details>

        <article class="panel info-card about-caption">
            <p>MENDING NGODING DARIPADA OVERTHINKING</p>
        </article>
    </section>
@endsection
