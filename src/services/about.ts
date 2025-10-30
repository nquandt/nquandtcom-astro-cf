import { getLanguageFileWithFallback } from "@/utils/collections";
import type { SupportedLanguage } from "@/utils/language";

export const { get: getAbout } = {
  get: async (language: SupportedLanguage) => {
    return await getLanguageFileWithFallback("about", language);
  },
};
