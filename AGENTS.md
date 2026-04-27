# Project Guidelines — Bank Sampah

## Color Theming — NO HARDCODED COLORS

This project uses **semantic Tailwind CSS theme variables** exclusively. **Never** use hardcoded color values.

### ❌ Never Use

```tsx
// No hardcoded hex colors
bg-[#1A1A1A]     text-[#1A1A1A]     border-[#1A1A1A]
bg-[#F9F9F8]     text-[#F9F9F8]     border-[#F9F9F8]
bg-[#1A1A1A]/10  text-[#1A1A1A]/50  border-[#1A1A1A]/10
bg-white         text-white
bg-black         text-black
```

### ✅ Always Use These Semantic Variables

| Purpose | Class | Example |
|---|---|---|
| Page / root background | `bg-background` | Main app container, input backgrounds |
| Primary text | `text-foreground` | Page titles, headings, important labels |
| Muted / secondary text | `text-muted-foreground` | Descriptions, placeholders, timestamps |
| Card / surface background | `bg-card` | Card components, dialog content |
| Sidebar background | `bg-sidebar` | Sidebar container |
| Sidebar accent (hover/active) | `bg-sidebar-accent` | Active menu item background |
| Muted / subtle background | `bg-muted` | Table rows, calendar day cells, code blocks |
| Accent / interactive background | `bg-accent` | Hover states, toggle switches |
| Borders | `border-border` | Dividers, card borders, input borders |
| Primary / brand color | `bg-primary` / `text-primary` | CTA buttons, links, badges |
| Destructive / danger | `bg-destructive` / `text-destructive` | Delete buttons, error states |

### Opacity Modifiers

Use `/` syntax with semantic variables instead of hardcoded fractions:

```tsx
// ✅ Good
text-muted-foreground/60
bg-accent/5
border-border/20

// ❌ Bad
text-[#1A1A1A]/40
bg-[#1A1A1A]/5
border-[#1A1A1A]/10
```

### Exceptions (allowed hardcoded colors)

- **Status / alert colors** — `text-green-400`, `bg-green-50`, `border-green-200`, `text-orange-800`, `bg-orange-50`, `border-orange-200` (success/warning alerts)
- **Chart colors** — chart-specific palette is fine
- **Brand-specific accent colors** — if a color is intentionally not part of the theme system (e.g., a specific brand color that shouldn't invert in dark mode)

### Dark Mode

Dark mode is handled via a `.dark` class on `<html>`. All semantic variables automatically swap to their dark equivalents. Do **not** add manual `dark:` overrides unless the design explicitly requires a non-standard behavior.

---

## Architecture — Feature-Sliced Design (FSD)

```
src/
  app/            — App initialization, providers, routing
  entities/       — Business entities (member, event, category, vendor, etc.)
  features/       — User actions (add-member, etc.)
  pages/          — Page-level compositions
  shared/         — Cross-cutting code (ui components, lib utilities, config, api)
  widgets/        — Complex composite blocks (sidebar, etc.)
```

---

## Available Skills (Auto-Trigger)

This project has skills in `.agents/skills/`. **Use them automatically when the context matches:**

| Skill | Trigger When |
|---|---|
| **`fsd`** | Scaffolding, structuring, or refactoring frontend architecture. When user asks "how should I organize...", mentions layers/slices/segments, or needs to extract reusable code. |
| **`shadcn`** | Adding, fixing, debugging, or composing UI components. When working with any `@/shared/ui/ui/*` component, building forms, dialogs, tables, layouts, or when the user mentions shadcn. **Always run `npx shadcn@latest docs <component>` before creating/fixing UI.** |
| **`frontend-design`** | Building new pages, components, or interfaces that need distinctive visual design. When aesthetics, styling, or creative direction is needed. |
| **`ui-ux-pro-max`** | Designing or reviewing UI/UX. Use `python3 .agents/skills/ui-ux-pro-max/scripts/search.py` to get design systems, color palettes, typography, and UX guidelines. |
| **`tauri`** | Working with Tauri configuration, Rust backend, IPC commands, events, capabilities, permissions, packaging, or signing. |

**Rule:** Don't ask the user whether to use a skill — just use it when the task matches. Read the skill's `SKILL.md` first, then follow its workflow.

---

## Custom Commands

| Command | Description |
|---|---|
| `/publish` | Build and release a new version to Cloudflare Pages updater |
| `/check-update` | Check current vs latest available version |

---

## Tech Stack

- **React 19** + **TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **shadcn/ui** (Radix UI primitives)
- **TanStack Query** for data fetching
- **Tauri v2** for desktop app packaging
- **SQLite** via `@tauri-apps/plugin-sql`
