import {
  defineConfig,
  presetWind3,
  presetTypography,
  presetIcons,
  presetWebFonts,
  transformerDirectives,
} from "unocss";

export default defineConfig({
  content: {
    filesystem: ["./src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte,md,mdx}"],
  },
  transformers: [transformerDirectives()],
  presets: [
    presetWind3(),
    presetTypography(),
    presetIcons(),
    presetWebFonts({
      provider: "google",
      fonts: {
        // sans: "Roboto",
        // mono: ["Fira Code", "Fira Mono:400,700"],
        lato: [
          {
            name: "Lato",
            weights: ["400", "700"],
            italic: true,
          },
          // {
          //   name: "sans-serif",
          //   provider: "none",
          // },
        ],
      },
    }),
  ],
  extendTheme: (theme) => {
    return {
      ...theme,
      breakpoints: {
        ...theme.breakpoints,
        lg: "860px",
      },
    };
  },
});
