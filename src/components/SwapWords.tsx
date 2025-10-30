import type { Component } from "solid-js";
import { createSignal, onCleanup, onMount } from "solid-js";

type Props = {
  options: string[];
  interval?: number; // ms
  transition?: number; // ms
  class?: string;
  ariaLabel?: string;
  startIndex?: number;
};

function tokenize(s: string) {
  // Split on whitespace but preserve whitespace tokens so layout stays consistent
  return s.split(/(\s+)/);
}

const SwapWords: Component<Props> = (props) => {
  const opts = () => props.options ?? [];
  const interval = () => props.interval ?? 2500;
  const transition = () => props.transition ?? 300;
  const ariaLabel = () => props.ariaLabel ?? undefined;
  const startIndex = () => Math.max(0, props.startIndex ?? 0);

  const [index, setIndex] = createSignal(startIndex());
  const initial = tokenize(opts()[index() ?? 0] ?? "");
  const [displayedTokens, setDisplayedTokens] = createSignal<string[]>(initial);

  // refs to token spans so we can animate individual tokens
  const tokenRefs: Array<HTMLElement | undefined> = [];

  let timer: number | undefined;
  let running = true;

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ensureLength(arr: string[], len: number, fill = "") {
    const copy = arr.slice(0);
    while (copy.length < len) copy.push(fill);
    return copy;
  }

  function doSwapOnce() {
    const list = opts();
    if (!list || list.length <= 1) return;
    const nextIdx = (index() + 1) % list.length;
    const currentTokens = tokenize(list[index()]);
    const nextTokens = tokenize(list[nextIdx]);

    const maxLen = Math.max(currentTokens.length, nextTokens.length);
    const cur = ensureLength(displayedTokens(), maxLen, "");
    const target = ensureLength(nextTokens, maxLen, "");

    // If reduced motion, update immediately
    if (prefersReduced) {
      setDisplayedTokens(target);
      setIndex(nextIdx);
      return;
    }

    // For each token that differs, animate opacity out -> change text -> opacity in
    for (let i = 0; i < maxLen; i++) {
      const ref = tokenRefs[i];
      const curTok = cur[i] ?? "";
      const nextTok = target[i] ?? "";
      if (curTok === nextTok) continue;

      if (ref) {
        try {
          ref.style.transition = `opacity ${transition()}ms ease`;
          ref.style.opacity = "0";
        } catch {
          // ignore style errors
        }
      }

      // schedule the content swap after the fade-out duration
      window.setTimeout(() => {
        // update displayed token
        setDisplayedTokens((prev) => {
          const copy = prev.slice(0);
          copy[i] = nextTok;
          return copy;
        });

        // fade back in
        if (ref) {
          try {
            ref.style.opacity = "1";
          } catch {
            // ignore
          }
        }
      }, transition());
    }

    // update index at end of cycle so derived state is consistent
    setIndex(nextIdx);
  }

  function start() {
    if (timer !== undefined || !running) return;
    // first tick should wait the full interval
    timer = window.setInterval(doSwapOnce, interval());
  }

  function stop() {
    if (timer === undefined) return;
    clearInterval(timer);
    timer = undefined;
  }

  onMount(() => {
    // Ensure initial opacity values and refs
    const nodes = displayedTokens().length;
    for (let i = 0; i < nodes; i++) {
      const ref = tokenRefs[i];
      if (ref) {
        try {
          ref.style.opacity = "1";
          ref.style.transition = `opacity ${transition()}ms ease`;
        } catch {
          // ignore
        }
      }
    }

    if (!prefersReduced) start();
  });

  onCleanup(() => {
    stop();
    running = false;
  });

  // Pause on hover/focus
  function handleMouseEnter() {
    stop();
  }
  function handleMouseLeave() {
    if (!prefersReduced) start();
  }

  // Provide a setter for token refs so Solid can assign DOM nodes by index
  function setTokenRef(i: number) {
    return (el?: HTMLElement) => {
      tokenRefs[i] = el ?? undefined;
      if (el) {
        // set initial styles
        try {
          el.style.opacity = "1";
          el.style.transition = `opacity ${transition()}ms ease`;
        } catch {
          // ignore
        }
      }
    };
  }

  return (
    <span
      class={props.class ?? "swap-words"}
      aria-label={ariaLabel()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusIn={handleMouseEnter}
      onFocusOut={handleMouseLeave}
    >
      {displayedTokens().map((tok, i) => (
        <span
          ref={setTokenRef(i)}
          class={`swap-word-token ${tok.trim() ? "swap-word-token--text" : "swap-word-token--sep"}`}
          style={{ display: "inline-block" }}
        >
          {tok}
        </span>
      ))}
    </span>
  );
};

export default SwapWords;
