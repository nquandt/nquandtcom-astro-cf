// @ts-check
import { defineConfig } from 'astro/config';

import UnoCSS from 'unocss/astro';
import solid from '@astrojs/solid-js';
import mdx from '@astrojs/mdx';

import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [
    UnoCSS({
      injectReset: "@unocss/reset/tailwind-compat.css",
    }),
    solid(),
    // MDX integration allows using components inside .mdx files
    mdx()
  ],
  markdown: {
    shikiConfig: {
      theme: 'dracula',
    },
  },
  output: 'server',
  adapter: process.env.ASTRO_ADAPTER === 'node' ? node({ mode: "standalone" }) : cloudflare({
    platformProxy: {
      enabled: true
    }
  }),
  image: {
    service: {
      entrypoint: 'astro/assets/services/compile'
    }
  }
});