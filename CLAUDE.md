# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

GrantFather is an AI-powered grant writing and management SaaS. Organizations use it to draft, manage, and track grant applications, with AI generation support from multiple LLM providers (OpenAI, Anthropic, Google Gemini).

## Commands

```bash
# Development
npm run dev              # Dev server on localhost:8080

# Build
npm run build            # Production build
npm run build:dev        # Development build (with sourcemaps)

# Linting
npm run lint             # ESLint

# Unit tests (Vitest)
npm run test:unit        # Run once
npm run test:unit:watch  # Watch mode
npm run test:unit:coverage

# E2E tests (Cypress)
npm run cypress:open     # Interactive Cypress UI
npm run cypress:run      # Headless, all specs
npm run test:e2e:core    # Individual suite examples:
npm run test:e2e:grants
npm run test:e2e:ai
```

Individual Cypress spec files live in `cypress/e2e/` (numbered `01–09` + misc). Run a single spec directly:
```bash
npx cypress run --spec cypress/e2e/03-grant-management.cy.ts
```

## Architecture

### Stack
- **React 18 + TypeScript** via Vite (SWC), dev server on port 8080
- **Supabase** — PostgreSQL, Auth, Storage, Row-Level Security
- **React Query (TanStack v5)** for server state; Context API for global app state
- **React Hook Form + Zod** for forms; **React Router v6** for routing
- **Radix UI + shadcn/ui** component patterns; **Tailwind CSS** for styling
- **AI providers**: OpenAI, Anthropic, Google Gemini — all routed through `aiProviderService`

### Key Architectural Patterns

**Provider / Context stack** (outermost → innermost):
`AuthProvider` → `AIProviderProvider` → `OrganizationContext` → `LanguageContext`
Access these via their corresponding custom hooks (`useAuth`, `useOrganization`, etc.).

**Singleton services** — core business logic lives in `src/services/` and uses `getInstance()`:
- `aiProviderService` — routes AI calls to the correct provider/model
- `sectionRegenerationService` — generates/regenerates grant section content (~1300 lines)
- `sectionConfigService` — section configuration management
- `cacheService`, `errorHandlingService`, `errorRecoveryService`, `analyticsService`, `collaborationService`

**Grant drafting flow**: `pages/` → `components/grant-draft/` (23 components) → `sectionRegenerationService` → `aiProviderService` → LLM provider.

**AI system prompts** are stored per-user/section in the `system_prompts` Supabase table and surfaced through the AI configuration UI.

### Path Alias
`@/*` maps to `./src/*` — use this for all intra-`src` imports.

### TypeScript strictness
`noImplicitAny` and `strictNullChecks` are both **off**. Don't add unnecessary `!` or type casts; the compiler will accept reasonable looseness.

### Database
20+ Supabase migrations in `supabase/migrations/`. Key tables: `organizations`, `user_roles`, `grant_applications`, `application_sections`, `system_prompts`, `organization_logos`. All tables use RLS.

### Environment variables
Copy `.env.example` to `.env` and fill in your values. Required:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon (public) key

For E2E tests only, add to `.env.local` (never commit):
- `CYPRESS_SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key for test data setup

### Logging
`src/utils/logger.ts` exposes a `logger` singleton. In production, `console.log/debug/info` are silenced automatically (the module is imported first in `main.tsx`). Use `logger.warn/error` for anything that should surface in production.

### AI providers
Perplexity and Grok are marked `comingSoon: true` in `src/services/aiProviders.ts` and are disabled in the UI. The edge function (`ai-grant-writer/multi-provider-support.ts`) will throw for these providers — do not enable them without implementing the backend first.

### Legal pages
`/privacy` → `src/pages/Privacy.tsx` and `/terms` → `src/pages/Terms.tsx` are public routes. Update these pages when business details change.
