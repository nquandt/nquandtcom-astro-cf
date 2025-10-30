import type { Component } from "solid-js";
import { createSignal, onMount } from "solid-js";
import { navigate } from "astro:transitions/client";
import {
  getSupportedLanguages,
  getLanguageDisplayName,
  isLanguageSupported,
} from "@/utils/languageClient";

type Props = {
  currentLanguage?: string;
  clientNavigate?: boolean;
  ariaLabel?: string;
};

const SCROLL_KEY = "nquandt_scroll_pos";
const FOCUS_KEY = "nquandt_focus_id";
const SELECT_ID = "language-switcher-select";

/**
 * Floating language select.
 * - Posts to /api/set-language with current path
 * - Navigates to returned localized path (client navigate preferred)
 * - Preserves scroll position and restores it on mount
 * - Attempts to restore focus to the select after navigation
 */
const LanguageSwitcher: Component<Props> = (props) => {
  const languages = getSupportedLanguages();
  const defaultLang = props.currentLanguage ?? languages[0];
  const clientNavigate = props.clientNavigate ?? true;
  const ariaLabel = props.ariaLabel ?? "Select site language";

  const [value, setValue] = createSignal<string>(defaultLang);
  const [loading, setLoading] = createSignal(false);

  // Polling helper: look for element by id up to timeout and focus it
  function tryRestoreFocus(id?: string, timeout = 1000): void {
    const focusId =
      id ??
      (function () {
        try {
          return sessionStorage.getItem(FOCUS_KEY) ?? undefined;
        } catch {
          return undefined;
        }
      })();

    if (!focusId) return;

    const start = Date.now();
    const attempt = () => {
      const el = document.getElementById(focusId) as HTMLElement | null;
      if (el) {
        try {
          el.focus();
        } catch {
          // ignore
        }
        try {
          sessionStorage.removeItem(FOCUS_KEY);
        } catch {
          // ignore
        }
        return;
      }
      if (Date.now() - start < timeout) {
        requestAnimationFrame(attempt);
      } else {
        try {
          sessionStorage.removeItem(FOCUS_KEY);
        } catch {
          // ignore
        }
      }
    };
    requestAnimationFrame(attempt);
  }

  onMount(() => {
    // Restore scroll position if present
    try {
      const raw = sessionStorage.getItem(SCROLL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed.x === "number" &&
          typeof parsed.y === "number"
        ) {
          // Wait a tick for layout/hydration
          setTimeout(() => {
            try {
              window.scrollTo(parsed.x, parsed.y);
            } catch {
              // ignore
            }
          }, 0);
        }
        try {
          sessionStorage.removeItem(SCROLL_KEY);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore storage / parse errors
    }

    // Restore focus if requested
    try {
      const storedFocus = sessionStorage.getItem(FOCUS_KEY);
      if (storedFocus) {
        tryRestoreFocus(storedFocus);
      }
    } catch {
      // ignore
    }

    // Initialize value from prop if provided
    if (props.currentLanguage && isLanguageSupported(props.currentLanguage)) {
      setValue(props.currentLanguage);
    }
  });

  async function onChange(e: Event) {
    const target = e.target as HTMLSelectElement | null;
    if (!target) return;
    const lang = target.value;
    setValue(lang);

    if (!isLanguageSupported(lang)) return;

    setLoading(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : undefined;

      const res = await fetch("/api/set-language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ language: lang, redirectTo }),
      });

      // parse JSON safely
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // API error: best-effort reload
        try {
          window.location.reload();
        } catch {
          // ignore
        }
        return;
      }

      const redirect = data?.redirect;

      // Save scroll position and focus before navigating
      try {
        const pos = { x: window.scrollX || 0, y: window.scrollY || 0 };
        try {
          sessionStorage.setItem(SCROLL_KEY, JSON.stringify(pos));
        } catch {
          // ignore storage errors
        }
        try {
          const active = document.activeElement as HTMLElement | null;
          if (active && active.id) {
            sessionStorage.setItem(FOCUS_KEY, active.id);
          } else {
            sessionStorage.setItem(FOCUS_KEY, SELECT_ID);
          }
        } catch {
          // ignore storage errors
        }
      } catch {
        // ignore
      }

      if (redirect && typeof redirect === "string") {
        // Prefer client navigation; fallback to full navigation
        try {
          if (clientNavigate) {
            await navigate(redirect);
            // Try immediate focus after client navigation
            try {
              const maybeEl = document.getElementById(
                SELECT_ID,
              ) as HTMLElement | null;
              if (maybeEl && typeof maybeEl.focus === "function") {
                maybeEl.focus();
              } else {
                // If not immediately available, poll for it
                tryRestoreFocus();
              }
            } catch {
              // ignore
            }
          } else {
            window.location.assign(redirect);
          }
        } catch {
          try {
            window.location.assign(redirect);
          } catch {
            // ignore
          }
        }
        return;
      }

      // No redirect: navigate/reload current path and attempt to focus after client navigation
      try {
        if (clientNavigate) {
          await navigate(window.location.pathname + window.location.search);
          try {
            const maybeEl = document.getElementById(
              SELECT_ID,
            ) as HTMLElement | null;
            if (maybeEl && typeof maybeEl.focus === "function") {
              maybeEl.focus();
            } else {
              tryRestoreFocus();
            }
          } catch {
            // ignore
          }
        } else {
          window.location.reload();
        }
      } catch {
        try {
          window.location.reload();
        } catch {
          // ignore
        }
      }
    } catch {
      // Network/other error: best-effort reload
      try {
        window.location.reload();
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }

  // Keyboard handler to allow wrapping scrolling through options with arrow keys.
  // ArrowDown moves to next option (wraps to first), ArrowUp moves to previous (wraps to last).
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();

    const list = languages;
    const current = value() as (typeof list)[number];
    const idx = list.indexOf(current);
    const len = list.length;
    if (len === 0) return;

    let nextIdx = 0;
    if (idx === -1) {
      // If current value isn't found, pick first for ArrowDown, last for ArrowUp
      nextIdx = e.key === "ArrowDown" ? 0 : len - 1;
    } else {
      if (e.key === "ArrowDown") {
        nextIdx = (idx + 1) % len;
      } else {
        nextIdx = (idx - 1 + len) % len;
      }
    }

    const next = list[nextIdx];
    // update internal state and programmatically trigger the same change flow as user selection
    setValue(next);

    // If the select element exists, update its value and invoke the onChange handler
    try {
      const selectEl = document.getElementById(
        SELECT_ID,
      ) as HTMLSelectElement | null;
      if (selectEl) {
        selectEl.value = next;
        // create and dispatch a change event so our onChange handler runs with the expected event
        const changeEvent = new Event("change", { bubbles: true });
        selectEl.dispatchEvent(changeEvent);
      } else {
        // If no select element (rare), call onChange with a synthetic event object
        // Construct a minimal event-like object for onChange to accept
        const synthetic = {
          target: { value: next },
        } as unknown as Event;
        // @ts-ignore - call onChange with synthetic target
        onChange(synthetic);
      }
    } catch {
      // ignore any errors during synthetic change
    }
  }

  return (
    <>
      <label for={SELECT_ID} class="sr-only">
        {ariaLabel}
      </label>
      <select
        id={SELECT_ID}
        class="rounded border px-3 py-2 w-full bg-white dark:bg-zinc-900 text-sm"
        aria-label={ariaLabel}
        value={value()}
        disabled={loading()}
        onChange={onChange}
        onKeyDown={handleKeyDown}
      >
        {languages.map((code) => (
          <option value={code} selected={code === value()}>
            {getLanguageDisplayName(code)}
          </option>
        ))}
      </select>
    </>
  );
};

export default LanguageSwitcher;
