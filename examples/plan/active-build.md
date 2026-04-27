# Implementation Plan: Acme Precision

<!-- factory-meta:
{
  "schema_version": "1.0",
  "project_id": "acme-precision-2026",
  "generated_at": "2026-04-25T10:08:32Z",
  "last_updated": "2026-04-27T14:32:00Z",
  "lock_status": "locked",
  "current_phase": "build"
}
-->

**Generated:** 2026-04-25
**Last updated:** 2026-04-27
**Status:** Phase 5 (Build) in progress, 13/17 page tasks done.

## Phase 0: Bootstrap ✅ Complete

- [x] Validate spec against schemas
- [x] Initialize `.factory-state/`
- [x] Setup project git repo
- [x] Generate skeleton plan.md

## Phase 1: Architecture ✅ Complete

- [x] Generate `sitemap.json`
- [x] Define `content-model.json` for Sanity types
- [x] Confirm stack track `astro-sanity`
- [x] Document `technical-plan.md`

## Phase 2: Design ✅ Complete

### 2a: Direction
- [x] Generate 3 directions (A, B, C)
- [x] HUMAN GATE: Direction chosen — B "Industrial Precision"

### 2b: Figma Generation
- [x] Foundation page (color/typography/spacing variables)
- [x] Components library (18 components)
- [x] Pages: Homepage, Sluzby, Sluzby/Detail, Pripadove studie, Detail, O nas, Kontakt, Privacy, 404
- [x] HUMAN GATE: Design approved — see `.factory-state/artifacts/design/figma-link.txt`

### 2c: Lock & Extract
- [x] Extract `design-tokens.json`
- [x] Extract `components-manifest.json`
- [x] Lock Figma file

## Phase 3: Foundation ✅ Complete

- [x] Scaffold from `templates/astro-sanity`
- [x] Apply design tokens to Tailwind config
- [x] Generate base layout component
- [x] Setup Sanity client + Studio embed

## Phase 4: Content ✅ Complete

- [x] Generate Sanity schemas for `service`, `caseStudy`, `page`, `siteSettings`
- [x] Generate Czech copy for all listed pages

## Phase 5: Build 🚧 In Progress

- [x] Build `/` (homepage)
- [x] Build `/o-nas`
- [x] Build `/sluzby`
- [x] Build `/sluzby/integrace`
- [x] Build `/sluzby/digital-twin` <!-- task-meta: {"id": "T-019", "agent": "frontend-builder", "estimated_tokens": 5000} -->
- [x] Build `/sluzby/podpora`
- [x] Build `/pripadove-studie`
- [x] Build `/pripadove-studie/[slug]`
- [x] Build `/o-nas`
- [x] Build `/kontakt`
- [x] Build `/ochrana-osobnich-udaju`
- [x] Build `/404`
- [x] Build `/sluzby/sales-engineering`
- [ ] **Build `/sluzby/consulting`** ← current
- [ ] Build `/sluzby/audit`
- [ ] Build `/sluzby/training`
- [ ] Build `/kariera` <!-- task-meta: {"priority": "could"} -->

**Progress:** 13/17 page tasks built.

## Phase 6: QA ⏸ Pending

- [ ] Route audit (broken links, redirects, 404)
- [ ] Accessibility audit (axe-core, WCAG AA)
- [ ] Performance audit (Lighthouse mobile/desktop)
- [ ] UI consistency audit (cross-page token usage)
- [ ] Content audit (tone, grammar, no placeholders)
- [ ] E2E tests (Playwright smoke flows)
- [ ] Code review

## Phase 7: Polish ⏸ Pending

- [ ] Animation suggestions
- [ ] HUMAN GATE: Animation approval
- [ ] Implement approved animations

## Phase 8: Deploy ⏸ Pending

- [ ] Deploy to staging on Cloudflare Pages
- [ ] HUMAN GATE: Staging review
- [ ] Deploy to production
- [ ] DNS handover to client
