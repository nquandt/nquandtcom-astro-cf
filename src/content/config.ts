/**
 * src/content/config.ts
 *
 * Astro Content Collections configuration.
 *
 * This file defines the content collections used by the site. Each collection
 * includes a Zod schema to validate frontmatter and to provide type-safety
 * when you use `getCollection()` or `getEntry()` in your pages or components.
 *
 * The `about` collection is set up to support multi-language entries. Each
 * entry must include a `lang` frontmatter field (e.g. "en", "ja", "es", "fr").
 *
 * Usage examples:
 *  - In an Astro page: `const aboutEntries = await getCollection('about');`
 *  - Filter: `aboutEntries.find(e => e.data.lang === Astro.locals.language)`
 */

import { z, defineCollection } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Supported languages for content collections.
 * Keep this list in sync with any other language lists you maintain.
 */
export const SUPPORTED_LANGUAGES = ["en", "ja", "es", "fr"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Common schema pieces that can be reused across collections.
 */
const baseSchema = {
  title: z.string().min(1),
  lang: z.enum(SUPPORTED_LANGUAGES as any),
};

/**
 * About collection
 *
 * Each file in `src/content/about/*` should include frontmatter matching this
 * schema. Filenames commonly follow `about.en.md`, `about.ja.md`, etc., and the
 * collection resolution will pick the entry matching the user's locale.
 */
const aboutCollection = defineCollection({
  // type: "content",
  // Allow both .md and .mdx so content collections continue to work
  // after migrating files to MDX. The glob pattern includes both
  // extensions so getCollection/getEntry will find entries regardless of
  // whether we rename to .mdx immediately.
  loader: glob({ pattern: "**/*.{md,mdx}", base: "src/pages/about/.content" }),
  schema: z.object({
    ...baseSchema,
  }),
});

const indexCollection = defineCollection({
  // Support .md and .mdx for top-level pages (home, index files)
  loader: glob({ pattern: "*.{md,mdx}", base: "src/pages/.content" }),
  schema: z.object({
    ...baseSchema,
  }),
});

/**
 * Export the collections object required by Astro.
 *
 * Add additional collections here as needed (e.g. `blog`, `projects`, etc.).
 */
export const collections = {
  about: aboutCollection,
  home: indexCollection,
} as const;
