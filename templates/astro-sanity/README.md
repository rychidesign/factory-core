# Astro + Sanity starter

Default content track (`astro-sanity`) for **Rychi Design Factory** client projects. Astro 5 + Tailwind 4 + Sanity hosted CMS + shadcn/ui via React islands.

The `factory new <project-id>` command (added in step 3.4) copies this directory into a new client project, then the bootstrap-agent rewrites `astro.config.mjs` site URL, `package.json` name and the placeholder copy.

## Run locally

```bash
cd templates/astro-sanity
pnpm install
pnpm dev          # http://localhost:4321 — works with mock data, no Sanity needed
```

To wire up a real Sanity project:

```bash
cp .env.example .env
# Fill in SANITY_PROJECT_ID, SANITY_DATASET (default "production").
# Optional: SANITY_READ_TOKEN for draft / private content.
```

## Sanity Studio (standalone)

This template ships with the **client** for Sanity but not a Studio app.
The Studio lives in a sibling `studio/` directory created by the operator
(or the cms-builder agent) once a project_id exists in Sanity:

```bash
pnpm create sanity@latest -- --template clean --create-project "<client name>"     --dataset production --typescript --output-path studio
# Then move src/sanity/schemas/* into studio/schemaTypes/ and import them.
```

The schemas in `src/sanity/schemas/` (`siteSettings`, `page`) are intended
to be moved or symlinked into the Studio's `schemaTypes/` directory. The
TypeScript types they expose are imported by the Astro site for typed
GROQ results.

For an embedded Studio (served from `/studio` on the Astro site itself),
see `docs/how-to/use-astro-sanity-template.md` in the parent factory-core
repo. Embedded is more complex; the V1 default is standalone.

## Project layout

```
templates/astro-sanity/
├── src/
│   ├── pages/                # Astro routes
│   │   ├── index.astro
│   │   └── 404.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── ui/               # shadcn/ui (React)
│   │   │   ├── Button.tsx
│   │   │   └── Card.tsx
│   │   └── islands/          # other React islands per project
│   ├── lib/
│   │   ├── sanity.ts         # client + fetchOrMock helper
│   │   └── utils.ts          # cn() for shadcn/ui
│   ├── sanity/schemas/       # GROQ-typed schema definitions
│   ├── styles/
│   │   ├── global.css
│   │   └── tokens.css        # @theme — overwritten by Phase 2c extractor
│   └── content/              # typed TS data, per project
├── public/
├── astro.config.mjs
├── components.json           # shadcn/ui config
├── eslint.config.js
├── tsconfig.json
├── .env.example
└── README.md
```

## Conventions

- **Path alias `~/*` → `src/*`** (configured in tsconfig).
- **`output: 'hybrid'`** — static by default, page can opt into SSR for forms.
- **`trailingSlash: 'never'`**.
- **CSS tokens in `@theme`** — Tailwind 4 reads them directly. The factory's
  Phase 2c (lock & extract) overwrites `tokens.css` with values from the
  approved Figma file.
- **shadcn/ui via React islands** — components live in `src/components/ui/`
  and are added with `pnpm dlx shadcn@latest add <component>`. The two
  bundled (Button, Card) are intentionally minimal stubs; the factory's
  frontend-builder may swap them for the canonical versions.
- **Sanity client returns mocks if `SANITY_PROJECT_ID` is unset** — the
  scaffold renders without credentials, swap to live data with one env var.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Astro dev server at http://localhost:4321 |
| `pnpm build` | Production build to `dist/` |
| `pnpm preview` | Preview built site |
| `pnpm typecheck` | `astro check` + `tsc --noEmit` |
| `pnpm lint` | ESLint + `astro check` |

## Why this stack

ADR-0014 (Sanity as default CMS), ADR-0006 (universal agents + skill injection
make `astro-sanity` the canonical content-static track), ADR-0008 (Figma-first
design — `tokens.css` is the contract between Phase 2c and the build phase).

## License

WTFPL — see the parent factory-core repo.
