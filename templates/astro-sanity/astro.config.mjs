import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Site URL is overridden per project — replace via factory bootstrap.
  site: 'https://example.com',
  output: 'static',
  trailingSlash: 'never',
  integrations: [react(), sitemap()],
  env: {
    schema: {
      SANITY_PROJECT_ID: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
      }),
      SANITY_DATASET: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
        default: 'production',
      }),
      SANITY_API_VERSION: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
        default: '2025-01-01',
      }),
      SANITY_READ_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
