// Lightweight word swap widget
// Targets elements with: data-tag="swap" and data-options="word1|word2|..."
(function () {
    if (typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function createSwap(el) {
        const opts = el.getAttribute('data-options');
        if (!opts) return;
        const words = opts.split('|').map(s => s.trim()).filter(Boolean);
        if (!words.length) return;

        const interval = parseInt(el.getAttribute('data-interval') || '2500', 10);
        const transition = parseInt(el.getAttribute('data-transition-duration') || '300', 10);
        // Simplified approach: single child span that fades out, swaps text, fades in
        el.classList.add('swap-words');
        const original = el.textContent && el.textContent.trim();
        if (original) el.setAttribute('aria-label', original);
        // create single span
        el.textContent = '';
        const span = document.createElement('span');
        span.className = 'swap-word';
        span.textContent = words[0];
        span.style.transition = `opacity ${transition}ms ease`;
        el.appendChild(span);

        if (prefersReduced) {
            // show first word only
            span.style.transition = 'none';
            return;
        }

        let idx = 0;
        let timer = null;

        function doSwap() {
            const next = (idx + 1) % words.length;
            // fade out
            span.style.opacity = '0';
            setTimeout(() => {
                span.textContent = words[next];
                // fade in
                span.style.opacity = '1';
                idx = next;
            }, transition);
        }

        function start() {
            if (timer) return;
            timer = setInterval(doSwap, interval);
        }

        function stop() {
            if (!timer) return;
            clearInterval(timer);
            timer = null;
        }

        // Start
        start();
        // Pause on hover/focus
        el.addEventListener('mouseenter', stop);
        el.addEventListener('mouseleave', start);
        el.addEventListener('focusin', stop);
        el.addEventListener('focusout', start);
    }

    function init() {
        document.querySelectorAll('[data-tag="swap"]').forEach(el => createSwap(el));
    }

    init();
})();
