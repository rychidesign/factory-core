# How-to: použít astro-sanity template

**Účel tohoto dokumentu:** popsat, jak operátor (nebo bootstrap-agent automatizovaně) inicializuje nový klientský projekt z `templates/astro-sanity/`.

Stack track popsán ve [`stack-catalog.yaml`](../../stack-catalog.yaml). Rationale výběru tracku v ADR-0014. Pro `output: hybrid → static` migraci viz §"Známé gotchas".

---

## 1. Kdy tento track použít

Default content track. Použij ho pro:

- Marketingové weby (B2B, B2C)
- Portfolia
- Blogy, dokumentace, news sites
- Malé až střední firmy bez gated content
- Většinu Rychi Design klientů

Nepoužívej, když:

- Klient chce data on-premise → `astro-payload`
- Web má auth/portál/member area → `nextjs-sanity`
- Klient chce sám editovat vizuálně → `webflow` (až bude implementovaný)

---

## 2. Co template obsahuje

Funkční Astro 5 + Tailwind 4 + Sanity scaffold:

- **Astro 5 static** s per-route `prerender = false` opt-out (forms, dynamic routes do CMS).
- **Tailwind 4** přes `@tailwindcss/vite`. CSS-first config: tokens v `src/styles/tokens.css` jako `@theme` block.
- **shadcn/ui** přes `@astrojs/react`. Initial set: `Button`, `Card` (jako `src/components/ui/*.tsx`). Rozšiřuje se přes `pnpm dlx shadcn@latest add <component>`.
- **Sanity client** s graceful fallback: bez `SANITY_PROJECT_ID` v `.env` vrací mock data, takže `pnpm dev` funguje hned po `pnpm install`.
- **shadcn/ui CSS variables** namapované na naše design tokens — Tailwind utility `bg-primary` a shadcn `--primary` ukazují na stejnou barvu.
- **TypeScript strict** (extends `astro/tsconfigs/strict`).
- **ESLint** přes tseslint + eslint-plugin-astro.
- **Path alias `~/*`** mapuje na `src/*`.
- **Trailing slash never**, sitemap přes `@astrojs/sitemap`.
- **404 stránka** v češtině.
- **Skip-link** pro klávesnicovou navigaci.

---

## 3. Manuální použití (operátor)

```bash
# 1. Zkopíruj template do nového projektu (bootstrap-agent to dělá automaticky)
cp -r templates/astro-sanity /path/to/clients/<project-id>/.factory-state/workspace
cd /path/to/clients/<project-id>/.factory-state/workspace

# 2. Vyčisti package.json name a astro.config.mjs site URL
sed -i 's/factory-template-astro-sanity/<project-id>/' package.json
sed -i "s|https://example.com|https://<final-domain>|" astro.config.mjs

# 3. Install + smoke test bez Sanity credentials
pnpm install
pnpm dev          # http://localhost:4321 — funguje s mock daty

# 4. Až máš Sanity projekt:
cp .env.example .env
# Vyplň SANITY_PROJECT_ID, SANITY_DATASET, případně SANITY_READ_TOKEN
pnpm dev          # nyní se připojuje na live dataset
```

---

## 4. Automatické použití (factory)

Bootstrap-agent v Phase 0 dělá kroky 1–3 výše automaticky podle hodnot v `spec/`:

| Spec field | Použití |
|---|---|
| `meta.project_id` | název v `package.json`, slug ve workspace path |
| `stack.domain.primary` | `site:` v `astro.config.mjs` |
| `meta.language` | `lang` atribut v `BaseLayout.astro` |
| `business.tone_of_voice` | čte content-writer agent (Phase 4), template stays neutral |

`SANITY_PROJECT_ID` se neplní z spec — je to runtime secret, žije v `~/.config/factory/secrets.env` na serveru a injektuje se do systemd unit.

---

## 5. Sanity Studio

Studio **není** součástí template (úmyslné rozhodnutí — embed by připoutal Studio deploy ke každému site deploy a komplikoval permissions). Vytvoř ho samostatně, typicky v sourozeneckém adresáři `studio/`:

```bash
cd /path/to/clients/<project-id>/.factory-state/workspace
pnpm create sanity@latest -- \
  --template clean \
  --create-project "<client name>" \
  --dataset production \
  --typescript \
  --output-path studio
```

Pak:

1. Zkopíruj nebo nasymlinkuj schemas:
   ```bash
   cp src/sanity/schemas/* studio/schemaTypes/
   ```
2. V `studio/schemaTypes/index.ts` importuj a zaregistruj schemas:
   ```ts
   import { siteSettingsSchema } from './siteSettings';
   import { pageSchema } from './page';
   export const schemaTypes = [siteSettingsSchema, pageSchema];
   ```
3. `cd studio && pnpm dev` zvedne Studio na `http://localhost:3333`.
4. Deploy přes `pnpm sanity deploy` na `<project>.sanity.studio`.

Pokud klient chce mít Studio **na vlastní doméně** (typicky `studio.<domain>`), nakonfiguruj DNS CNAME na deployed Sanity URL.

---

## 6. Design tokens — kontrakt s Phase 2c

`src/styles/tokens.css` je **přepisovaný** Phase 2c (lock & extract):

1. figma-extractor agent vyplívá `design-tokens.json` z Figma variables.
2. Token-to-CSS skript (přijde v Krok 4.4) zapíše hodnoty do `tokens.css` jako `@theme` block.
3. Tailwind 4 je čte přímo — žádný build krok navíc.

**Co operátor / agent nesmí porušit:**

- Klíče `@theme` (`--color-bg`, `--color-fg`, `--color-accent`, `--font-display`, `--text-hero`, …) jsou stable contract. Jejich přejmenování by rozbilo komponenty.
- shadcn/ui kompatibilita: `:root { --primary, --background, --foreground, … }` v `tokens.css` musí pokračovat aliasovat na naše tokens, jinak shadcn komponenty přestanou fungovat.

Adding token: nový `--color-…` v `@theme` automaticky pickne Tailwind 4 jako utility (`bg-…`, `text-…`).

---

## 7. shadcn/ui rozšíření

Z výchozího Button + Card přidáš canonickou shadcn komponentu:

```bash
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add toast
```

Komponenty se ukládají do `src/components/ui/`. Importují přes `~/components/ui/Dialog` (path alias).

V `.astro` souborech používej shadcn komponenty jako React islands:

```astro
---
import { Button } from '~/components/ui/Button';
---

<Button client:load variant="default" size="lg">
  Klikni
</Button>
```

`client:load` (nebo `client:idle`, `client:visible`) je nezbytný — bez něj Astro server-renderuje statický HTML bez interakce. Použij nejlehčí variantu, která dává smysl pro UX.

---

## 8. Forms a per-route SSR

Astro 5 default je `output: 'static'`. Pro jednu route, která potřebuje SSR (např. POST handler kontaktního formuláře):

```astro
---
// src/pages/api/contact.ts
export const prerender = false;

export const POST = async ({ request }: { request: Request }) => {
  const data = await request.formData();
  // ... odeslání e-mailu / zápis do Sanity / Resend / ...
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
---
```

Pro server-side dependency (např. Resend API) přidej Cloudflare Pages adapter:

```bash
pnpm astro add cloudflare
```

To upraví `astro.config.mjs` automaticky.

---

## 9. Smoke test

Z čerstvé kopie template:

```bash
pnpm install
pnpm typecheck    # 0 errors, 0 warnings, 0 hints
pnpm lint         # clean
pnpm build        # 2 stránky (/ a /404), sitemap-index.xml
pnpm dev          # localhost:4321 vrací HTTP 200 s mock content
```

Když některý krok selže na čerstvém clonu (před `factory bootstrap`), open BACKLOG entry a buď fixuj v template, nebo doplň poznámku do tohoto how-to.

---

## 10. Známé gotchas

- **`output: 'hybrid'` v Astro 5 deprecated.** Předchozí Astro 4 mělo `static` / `hybrid` / `server`; Astro 5 má jen `static` / `server`. Per-route SSR opt-out přes `export const prerender = false;`. Template už používá `static`.
- **Tailwind 4 syntax pro CSS variable utilities.** Pro design token utility používej `text-(length:--text-hero)`, `max-w-(--max-content)`, `bg-(--color-accent)`. Zápis `text-[var(--text-hero)]` (Tailwind 3) **nefunguje**.
- **`@astrojs/tailwind` integration je deprecated** v Astro 5 + Tailwind 4. Template používá `@tailwindcss/vite` plugin přímo (správný way).
- **Sanity bez tokenu funguje s mock daty.** Pokud build nebo dev failne s "Sanity client not configured" hláškou, zkontroluj že `src/lib/sanity.ts` voláš přes `fetchOrMock(...)`, ne přímo `sanityClient().fetch(...)`.
- **shadcn/ui pro Astro vyžaduje `@astrojs/react`** (community-driven, ne oficiální Astro support). Components.json je v rootu, `cn()` helper v `src/lib/utils.ts`.
- **Path alias v Vite plugins** — pokud přidáš nový Vite plugin a ten nezná `~/*`, přidej alias do plugin config nebo použij relativní cestu.
