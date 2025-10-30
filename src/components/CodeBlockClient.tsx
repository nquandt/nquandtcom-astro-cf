import { createSignal } from 'solid-js';

type Props = {
  code: string;
  lang?: string;
  filename?: string;
  rawUrl?: string;
  initialWrap?: boolean;
  allowToggle?: boolean;
};

export default function CodeBlockClient(props: Props) {
  const [wrap, setWrap] = createSignal(props.initialWrap ?? true);
  let codeEl: HTMLElement | undefined;
  let liveRegion: HTMLElement | undefined;

  const copy = async (e?: Event) => {
    try {
      await navigator.clipboard.writeText(codeEl?.textContent ?? '');
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

  const toggle = () => setWrap(!wrap());

  return (
    <div class="codeblock-root relative my-4 w-full" data-wrap={wrap() ? 'on' : 'off'}>
      <div class="prose max-w-full">
        <div class="codeblock-wrap rounded-md bg-surface relative">
          <pre class="codeblock-pre p-4">
            <code
              ref={(el) => (codeEl = el as HTMLElement)}
              class={`codeblock-code language-${props.lang ?? 'text'}`}
              style={{
                ['white-space']: wrap() ? 'pre-wrap' : 'pre',
                ['min-width']: wrap() ? '0' : 'max-content',
                ['overflow-wrap']: wrap() ? 'anywhere' : 'normal',
              } as any}
            >
              {props.code}
            </code>
          </pre>

          {/* Action bar: small chips hugging the top-right of the code block */}
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
      </div>
    </div>
  );
}
