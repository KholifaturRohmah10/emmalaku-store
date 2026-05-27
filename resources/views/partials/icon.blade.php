@switch($name)
    @case('home')
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
        </svg>
        @break
    @case('grid')
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8" />
        </svg>
        @break
    @case('cart')
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h2l1.5 8.5h9.5l2-6H8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
            <circle cx="10" cy="18.2" r="1.4" fill="currentColor" />
            <circle cx="17.2" cy="18.2" r="1.4" fill="currentColor" />
        </svg>
        @break
    @case('wallet')
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 15.5z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8" />
            <path d="M15 12h5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
            <circle cx="15.5" cy="12" r="1.1" fill="currentColor" />
        </svg>
        @break
    @case('history')
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 7.5V4.8M19 7.5V4.8M4.5 9.2h15" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
            <rect x="4" y="6.8" width="16" height="13.2" rx="3" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path d="M9.2 13h5.6M9.2 16.2h3.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
        </svg>
        @break
    @case('bell')
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8.4 18h7.2M9 18c0 1.7 1.3 3 3 3s3-1.3 3-3M6.8 18h10.4l-1.3-2.1V11a3.9 3.9 0 0 0-7.8 0v4.9z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
        </svg>
        @break
    @case('info')
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path d="M12 10.2V16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
            <circle cx="12" cy="7.7" r="1" fill="currentColor" />
        </svg>
        @break
    @case('search')
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path d="m15.4 15.4 3.6 3.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
        </svg>
        @break
    @case('more')
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="6.5" cy="12" r="1.8" fill="currentColor" />
            <circle cx="12" cy="12" r="1.8" fill="currentColor" />
            <circle cx="17.5" cy="12" r="1.8" fill="currentColor" />
        </svg>
        @break
    @case('trash')
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9.3 6.2V4.8h5.4v1.4M5.8 6.2h12.4M8.2 9.2v7.2M12 9.2v7.2M15.8 9.2v7.2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
            <path d="M7.1 6.2h9.8l-.7 11a2 2 0 0 1-2 1.8H9.8a2 2 0 0 1-2-1.8z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8" />
        </svg>
        @break
@endswitch
