import { getEntry, render, type CollectionKey } from "astro:content";
import type { SupportedLanguage } from "./language";

export const getLanguageFileWithFallback = async (
  collection: CollectionKey,
  language: SupportedLanguage,
) => {
  const entry =
    (await getEntry(collection, language)) ??
    (await getEntry(collection, "en"))!;

  const rendered = await render(entry);

  return { Content: rendered.Content, body: entry.body!, ...entry.data };
};
