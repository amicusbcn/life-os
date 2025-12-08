<!-- Copilot instructions for contributors and AI coding agents -->
# Life OS — Copilot Instructions

This repository is a Next.js (App Router) TypeScript project. Below are concise, repository-specific notes to help AI coding agents be productive immediately.

- **Big picture**: The app uses Next.js App Router with Server Components by default. UI lives in `app/` (routes and layouts), reusable components in `components/`, utilities in `utils/` and `lib/`, and Supabase is the authentication/data backend wired through `utils/supabase`.

- **Key entry points**:
  - `app/layout.tsx` — root layout and global fonts/styles.
  - `app/*/page.tsx` and nested folders — route handlers and UI.
  - `app/*/actions.ts` — server actions (Next.js server functions used as form actions).

- **Auth & backend integration**:
  - `utils/supabase/server.ts` — creates a server-side Supabase client using `@supabase/ssr` and `next/headers` cookies. Handle cookies carefully (the file wraps `cookieStore.set` in a try/catch).
  - `utils/supabase/client.ts` — browser client for client-side auth calls.
  - Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- **Patterns you must follow / watch for**:
  - Server Actions: form actions are implemented as `export async function <name>(formData: FormData)` inside `app/*/actions.ts`. These call `createClient()` from `utils/supabase/server.ts`, use `revalidatePath()` and `redirect()` from `next/navigation`. When editing these, preserve server-only imports (`'use server'`).
  - Revalidation: code uses `revalidatePath('/', 'layout')` to trigger ISR-style revalidation for app routes — do not replace with direct cache-clearing hacks.
  - Redirects: use `redirect('/path?message=...')` for client navigation from server actions.
  - Component styling: UI primitives live under `components/ui/*` and use `class-variance-authority`, Tailwind, and a `cn()` helper in `lib/utils.ts` to merge class names.

- **Developer workflows**:
  - Install: `npm install` (project uses standard Node tooling).
  - Dev server: `npm run dev` (see `README.md`).
  - Build: `npm run build`; Start: `npm start` or `npm run start` depending on `package.json` scripts.
  - No automated tests found in repository root — do not assume test runners are configured.

- **Project-specific conventions**:
  - Prefer Server Components for pages and server actions for forms; add `async` to page components when you need `searchParams` or server data during render (see `app/login/page.tsx`).
  - Keep logic for auth/data access in `utils/supabase/*`. Use `createClient()` (server) when running on the server and the browser `createClient()` for client-side operations.
  - UI kit: Reuse `components/ui/*` primitives; follow `button.tsx` pattern (CVA + `cn`) for new components.
  - Minimal inline styling; use Tailwind classes and `cva` variants.

- **Common pitfalls**:
  - Do not attempt to set cookies from Server Components directly — `utils/supabase/server.ts` wraps cookie writes carefully and may swallow errors.
  - When modifying route handlers or server actions, preserve `'use server'` and avoid importing browser-only modules.
  - Keep redirects and revalidation in server actions rather than client-side hacks for state consistency.

- **Files to inspect when making changes**:
  - `app/layout.tsx`, `app/login/actions.ts`, `app/login/page.tsx`
  - `utils/supabase/server.ts`, `utils/supabase/client.ts`
  - `components/ui/*` and `lib/utils.ts`

If anything here is incomplete or you want more examples (e.g., additional patterns for `app/*/actions.ts` or component creation), say which area to expand and I'll update this file.
