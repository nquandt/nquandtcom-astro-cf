import {
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  type SupportedLanguage,
} from "./language";

/**
 * Client-side utility to set the user's language preference
 * Makes a POST request to /api/set-language endpoint
 *
 * @param language - The language code to set
 * @returns Promise that resolves to true on success, false on failure
 */
export async function setLanguagePreference(
  language: SupportedLanguage,
): Promise<boolean> {
  try {
    const response = await fetch("/api/set-language", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to set language preference:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error setting language preference:", error);
    return false;
  }
}

/**
 * Get all supported languages
 *
 * @returns Array of supported language codes
 */
export function getSupportedLanguages(): readonly SupportedLanguage[] {
  return SUPPORTED_LANGUAGES;
}

/**
 * Check if a language code is supported
 *
 * @param language - The language code to check
 * @returns true if the language is supported, false otherwise
 */
export function isLanguageSupported(
  language: unknown,
): language is SupportedLanguage {
  return isSupportedLanguage(language);
}

/**
 * Language display names for UI purposes
 * Add more translations as needed
 */
export const LANGUAGE_DISPLAY_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  // de: 'Deutsch',
  // it: 'Italiano',
  // pt: 'Português',
  ja: "日本語",
  // zh: '中文',
};

/**
 * Get the display name for a language code
 *
 * @param language - The language code
 * @returns The display name, or the language code if not found
 */
export function getLanguageDisplayName(language: SupportedLanguage): string {
  return LANGUAGE_DISPLAY_NAMES[language] || language;
}
