import { getLanguageFileWithFallback } from "@/utils/collections";
import type { SupportedLanguage } from "@/utils/language";

export const { get: getHome } = {
  get: async (language: SupportedLanguage) => {
    return await getLanguageFileWithFallback("home", language);
  },
};
