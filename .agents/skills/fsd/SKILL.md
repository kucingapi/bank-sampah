---
name: feature-sliced-design
description: "Apply Feature-Sliced Design (FSD) architectural methodology when scaffolding, structuring, or refactoring frontend projects. Use this skill whenever the user mentions FSD, Feature-Sliced Design, or asks about organizing a frontend project into layers/slices/segments. Also trigger when the user asks to create, scaffold, restructure, or refactor a React, Vue, Svelte, Next.js, Nuxt, Remix, or SvelteKit project with a scalable architecture, or when they mention terms like 'entities layer', 'features layer', 'widgets layer', 'shared layer', 'public API for slices', 'cross-imports', '@x notation', or 'Steiger linter'. Trigger even when the user simply asks 'how should I structure my frontend app' or 'what architecture should I use for my React project'."
---

# Feature-Sliced Design (FSD) v2.1

Feature-Sliced Design is an architectural methodology for frontend projects. It organizes code by **scope of influence** (layers), **business domain** (slices), and **technical purpose** (segments). This creates a standardized, discoverable architecture with controlled dependencies.

**Official resources:** https://feature-sliced.design · https://github.com/feature-sliced/documentation

---

## Core Hierarchy

FSD has three levels of organization, nesting left to right:

```
Layer → Slice → Segment
```

- **Layers** are the top-level folders. They are standardized and fixed (do not invent new ones).
- **Slices** divide a layer by business domain. Names are determined by your app's domain (not standardized).
- **Segments** divide a slice by technical purpose (ui, model, api, lib, config, etc.).

---

## The 7 Layers (top to bottom = most to least responsibility)

| Layer | Purpose | Has Slices? |
|---|---|---|
| `app` | App initialization: providers, routing, global styles, entrypoints | **No** — segments only |
| `processes` | ⚠️ **Deprecated.** Move logic to `features` or `app`. | Yes |
| `pages` | Full pages or large page sections (nested routing) | Yes |
| `widgets` | Large self-contained UI blocks delivering entire use cases | Yes |
| `features` | Reusable product features — actions that bring business value to the user | Yes |
| `entities` | Business entities the project works with (user, product, order, etc.) | Yes |
| `shared` | Reusable, business-agnostic code (UI kit, API client, libs, config) | **No** — segments only |

**Minimum viable layers:** Most projects need at least `shared`, `pages`, and `app`.

---

## The Import Rule on Layers (CRITICAL)

> **A module in a slice can only import from slices on layers STRICTLY BELOW.**

This is the single most important rule:

- `pages/feed` **CAN** import from `widgets`, `features`, `entities`, `shared`
- `pages/feed` **CANNOT** import from `pages/article` (same layer) or `app` (above)
- `features/auth` **CAN** import from `entities`, `shared`
- `features/auth` **CANNOT** import from `features/comments` (same layer), `widgets`, `pages`, `app`

**Exceptions:**
- `app` and `shared` are both a layer AND a slice simultaneously. Segments within them CAN import each other freely.
- Cross-imports between entities are allowed via the `@x` notation (see below).

---

## Slices

Slices partition a layer by **business domain**. Their names are NOT standardized — they come from your app's domain:

- Photo gallery: `photo`, `album`, `gallery`
- Social network: `post`, `user`, `newsfeed`
- E-commerce: `product`, `cart`, `order`, `checkout`

### Slice Rules

1. **Isolation:** Slices on the same layer CANNOT import from each other (enforced by the layer import rule).
2. **Cohesion:** A slice should be a highly cohesive group of related code.
3. **Public API:** Every slice MUST have a public API definition (typically `index.ts`). External modules can ONLY import through this public API, never reach into the slice internals.
4. **Grouping:** Closely related slices can be grouped in a subfolder, but they must still follow isolation rules — no shared code in the grouping folder.

### v2.1 "Pages First" Approach

Keep more code in pages. Large blocks of UI, forms, data logic that are NOT reused on other pages should stay in the page's slice. Only extract to lower layers when code is actually reused. Similarly, widgets should store their own stores, business logic, and API interactions — not just compose lower layers.

---

## Segments

Segments divide slices (or sliceless layers) by **technical purpose**. Common conventional names:

| Segment | Purpose |
|---|---|
| `ui` | UI components, styles, component-level logic |
| `model` | Business logic, stores, state management, actions, selectors |
| `api` | API requests, data fetching, mutations |
| `lib` | Utility functions scoped to this slice (NOT a generic "helpers" dump) |
| `config` | Feature flags, constants, configuration |
| `types` | TypeScript types and interfaces (when needed separately) |

### Naming Rule
Segment names must describe **purpose (the why)**, NOT **essence (the what)**. Avoid names like `components`, `hooks`, `modals` — these describe what files are, not what they do.

### Custom Segments
You can create custom segments. Most common in `app` and `shared`. Example: `shared/routes`, `shared/i18n`, `app/providers`.

---

## Public API

Every slice must expose a **public API** (typically an `index.ts` barrel file):

```
features/
  auth/
    ui/
      LoginForm.tsx
      LoginForm.module.css
    model/
      auth-store.ts
    api/
      login.ts
    index.ts          ← Public API: re-exports only what's needed
```

```ts
// features/auth/index.ts
export { LoginForm } from './ui/LoginForm';
export { useAuth, logout } from './model/auth-store';
```

### Public API Rules

1. Modules outside the slice can ONLY import from the public API.
2. Do NOT use wildcard re-exports (`export * from ...`) — they hurt discoverability and can leak internals.
3. For `shared/ui` and `shared/lib`, prefer separate index files per component/library to avoid bundle bloat.

---

## Cross-Imports with @x Notation

When entities legitimately need to reference each other (e.g., `Artist` contains `Song`), use the `@x` notation:

```
entities/
  song/
    @x/
      artist.ts      ← Special public API just for the artist entity
      playlist.ts    ← Special public API just for the playlist entity
    ui/
    model/
    index.ts
```

```ts
// entities/artist/model/artist.ts
import type { Song } from 'entities/song/@x/artist';

export interface Artist {
  name: string;
  songs: Array<Song>;
}
```

**Rules for @x:**
- Only use on the `entities` layer. Minimize cross-imports.
- "A/@x/B" is read as "A crossed with B" — A exposes a special API for B to consume.
- Makes inter-entity dependencies explicit and trackable.

---

## Typical Project Structure

```
src/
├── app/                          # Layer: App (no slices)
│   ├── providers/                # Segment
│   │   └── index.tsx
│   ├── styles/                   # Segment
│   │   └── global.css
│   ├── router.tsx
│   └── index.tsx                 # Entrypoint
│
├── pages/                        # Layer: Pages
│   ├── home/                     # Slice
│   │   ├── ui/                   # Segment
│   │   │   └── HomePage.tsx
│   │   ├── api/                  # Segment
│   │   │   └── load-feed.ts
│   │   └── index.ts              # Public API
│   ├── article/                  # Slice
│   │   ├── ui/
│   │   ├── model/
│   │   └── index.ts
│   └── settings/
│       └── ...
│
├── widgets/                      # Layer: Widgets
│   ├── header/                   # Slice
│   │   ├── ui/
│   │   └── index.ts
│   └── sidebar/
│       └── ...
│
├── features/                     # Layer: Features
│   ├── auth/                     # Slice
│   │   ├── ui/
│   │   ├── model/
│   │   ├── api/
│   │   └── index.ts
│   └── comments/
│       └── ...
│
├── entities/                     # Layer: Entities
│   ├── user/                     # Slice
│   │   ├── ui/
│   │   ├── model/
│   │   ├── api/
│   │   ├── @x/                   # Cross-import APIs
│   │   └── index.ts
│   └── article/
│       └── ...
│
└── shared/                       # Layer: Shared (no slices)
    ├── ui/                       # Segment: UI kit
    │   ├── Button/
    │   │   └── index.ts
    │   ├── Input/
    │   │   └── index.ts
    │   └── index.ts
    ├── api/                      # Segment: API client
    │   └── index.ts
    ├── lib/                      # Segment: Internal libraries
    │   ├── dates/
    │   └── format/
    └── config/                   # Segment: App-wide config
        └── index.ts
```

---

## Decision Guide: Where Does This Code Go?

| Question | Destination |
|---|---|
| Is it app initialization, routing, providers, or global styles? | `app/` |
| Is it a full page or route? | `pages/<page-name>/` |
| Is it a large reusable self-contained UI block? | `widgets/<widget-name>/` |
| Is it a reusable user-facing interaction or action? | `features/<feature-name>/` |
| Is it a core business entity/data model? | `entities/<entity-name>/` |
| Is it a generic utility, UI component, or API client with no business logic? | `shared/<segment>/` |
| Is it only used on one page and not reused? | Keep it inside that page's slice (v2.1 "pages first") |

---

## Framework-Specific Notes

### Next.js / Remix (File-based routing)
Place FSD's `src/` alongside the framework's routing directory. Route files import from page slices:

```ts
// app/routes/index.tsx (Remix) or app/page.tsx (Next.js App Router)
import { HomePage } from 'pages/home';
export default HomePage;
```

### Vue / Nuxt / Svelte / SvelteKit
FSD is framework-agnostic. The same layer/slice/segment hierarchy applies. Adjust segment contents for your framework's conventions (e.g., `.vue` single-file components in `ui/`).

---

## Tooling

### Steiger — Architectural Linter
```bash
npm i -D steiger @feature-sliced/steiger-plugin
```

```ts
// steiger.config.ts
import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([...fsd.configs.recommended]);
```

Key rules it enforces: `public-api`, `no-layer-violation`, `no-cross-imports`, `no-segmentless-slices`, `excessive-slicing`, `no-processes`.

### ESLint Plugin
```bash
npm i -D @conarti/eslint-plugin-feature-sliced eslint-plugin-import
```

Enforces: `layers-slices` (import direction), `public-api` (no deep imports), `absolute-relative` (correct import style).

---

## Common Anti-Patterns to Avoid

1. **Importing from a sibling slice** — violates the layer import rule. Refactor shared logic to a lower layer.
2. **Reaching into slice internals** — always go through the public API (`index.ts`).
3. **Naming segments by essence** — don't use `components/`, `hooks/`, `helpers/`. Use purpose-driven names.
4. **Extracting too eagerly** — v2.1 says keep code in pages until reuse is needed. Don't pre-optimize.
5. **Wildcard re-exports** — `export * from` hides the interface and leaks internals.
6. **Too many features/entities** — if a layer has dozens of slices, some may be too granular. Group or consolidate.
7. **Business logic in Shared** — shared is for business-agnostic utilities only (though app-aware things like route constants and API URLs are allowed).

---

## When Generating FSD Projects

When scaffolding a new project or restructuring an existing one:

1. **Start with the domain.** Identify the core business entities and user-facing features before creating folders.
2. **Start minimal.** Use `shared`, `pages`, and `app` initially. Add `entities`, `features`, `widgets` as needed.
3. **Create public APIs immediately.** Every slice gets an `index.ts` from the start.
4. **Configure path aliases** (e.g., `@/shared`, `@/features`) for clean imports.
5. **Set up Steiger** early to catch architectural violations automatically.
6. **Follow "pages first"** (v2.1) — keep code in pages until genuine reuse demands extraction.
