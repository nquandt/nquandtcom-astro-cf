import { createSignal, onMount } from 'solid-js';

type Props = {
  code: string;
  lang?: any;
  filename?: string;
  rawUrl?: string;
  initialWrap?: boolean;
  allowToggle?: boolean;
};

export default function CodeBlockClient(props: Props) {
  const [wrap, setWrap] = createSignal(props.initialWrap ?? true);
  let codeEl: HTMLElement | undefined;
  let liveRegion: HTMLElement | undefined;

  let rootRef: HTMLElement | undefined;

  onMount(() => {
    // Use a local root reference to find the server-rendered code element inside the same wrapper.
    // The Astro <Code> component renders a <pre><code>... so search for that structure.
    const root = rootRef ?? document.body;
    // Prefer an explicit wrapper if present
    const wrapper = (root.closest && root.closest('.codeblock-wrap')) || root.querySelector?.('.codeblock-wrap') || root.parentElement;
    // Find the first <pre><code> inside the wrapper (Astro's Code uses that structure)
    const found = wrapper ? (wrapper.querySelector('pre code') as HTMLElement | null) : null;
    codeEl = found ?? (root.querySelector ? (root.querySelector('pre code') as HTMLElement | undefined) : undefined);

    if (codeEl) {
      // Apply initial wrap state inline to ensure CSS specificity
      codeEl.style.whiteSpace = wrap() ? 'pre-wrap' : 'pre';
      (codeEl.style as any).minWidth = wrap() ? '0' : 'max-content';
      (codeEl.style as any).overflowWrap = wrap() ? 'anywhere' : 'normal';
      // Ensure ancestor data-wrap attribute matches initial state
      const rootBlock = codeEl.closest('.codeblock-root') as HTMLElement | null;
      if (rootBlock) rootBlock.setAttribute('data-wrap', wrap() ? 'on' : 'off');
    }
  });

  const copy = async (e?: Event) => {
    try {
      // ensure codeEl is captured
      const text = codeEl?.textContent ?? props.code ?? '';
      await navigator.clipboard.writeText(text);
      if (liveRegion) {
        liveRegion.textContent = 'Copied to clipboard';
        setTimeout(() => { if (liveRegion) liveRegion.textContent = ''; }, 1500);
      }
    } catch (err) {
      if (liveRegion) {
        liveRegion.textContent = 'Copy failed';
        setTimeout(() => { if (liveRegion) liveRegion.textContent = ''; }, 1500);
      }
    }
  };

  const toggle = () => {
    setWrap(!wrap());
    const w = wrap(); // current state after toggle
    if (codeEl) {
      codeEl.style.whiteSpace = w ? 'pre-wrap' : 'pre';
      codeEl.style.minWidth = w ? '0' : 'max-content';
      codeEl.style.overflowWrap = w ? 'anywhere' : 'normal';
    }

    // Update ancestor data attribute so any CSS targeting it reacts as well
    const root = codeEl?.closest('.codeblock-root') as HTMLElement | null;
    if (root) root.setAttribute('data-wrap', w ? 'on' : 'off');
  };

  return (
  <div ref={(el) => (rootRef = el as HTMLElement | undefined)} class="codeblock-action-root" data-wrap={wrap() ? 'on' : 'off'}>
      <div class="codeblock-action-bar absolute top-2 right-2 flex gap-2">
        <button class="text-xs px-2 py-0.5 rounded bg-white/80 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 border border-zinc-200/20 dark:border-zinc-800/40 shadow-sm" type="button" onClick={(e) => copy(e)} aria-label="Copy code">Copy</button>
        {props.allowToggle !== false ? (
          <button class="text-xs px-2 py-0.5 rounded bg-white/80 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 border border-zinc-200/20 dark:border-zinc-800/40 shadow-sm" type="button" aria-label="Toggle wrap" onClick={toggle}>{wrap() ? 'Scroll' : 'Wrap'}</button>
        ) : null}
        {props.rawUrl ? <a class="text-xs px-2 py-0.5 rounded bg-white/80 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 border border-zinc-200/20 dark:border-zinc-800/40 shadow-sm" href={props.rawUrl} download={props.filename ?? undefined} aria-label="Download file">Download</a> : null}
      </div>

      {/* ARIA live region for small copy feedback (prevents changing button text and layout) */}
      <span class="sr-only" aria-live="polite" ref={(el) => (liveRegion = el as HTMLElement | undefined)}></span>
    </div>
  );
}
