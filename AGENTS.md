# Repository Guidelines

## Project Structure & Module Organization
This Next.js App Router project keeps route segments, layouts, and loaders inside `app/`. Shared UI lives in `components/`, with generated primitives under `components/ui/` managed by `components.json`. Store reusable hooks in `hooks/` and cross-cutting helpers such as the Tailwind `cn` merge in `lib/`. Global style layers remain in `styles/globals.css`, while static assets and favicons belong in `public/`. Prefer the `@/*` path alias over deep relative imports.

## Build, Test, and Development Commands
Install dependencies with `npm install` (CI should prefer `npm ci`). `npm run dev` boots the hot-reload server on http://localhost:3000. `npm run build` validates the production bundle and should complete without warnings before opening a PR. `npm run start` serves the output from `.next/`. `npm run lint` runs `next lint`; keep the workspace clean and address warnings immediately.

## Coding Style & Naming Conventions
TypeScript runs in strict mode, so annotate props, return types, and discriminated unions. Follow the existing two-space indentation and trailing comma style produced by the default formatter. Components, hooks, and utilities use PascalCase (`ProjectHero`), camelCase (`useThemeToggle`), and kebab-case filenames (`project-card.tsx`) respectively. Compose Tailwind classes through the `cn` helper when conditions apply, grouping responsive modifiers from smallest to largest breakpoint.

## Testing Guidelines
Automated tests are not yet configured; always run `npm run lint` and manually exercise the key routes (`/`, `/work`, `/projects`, `/links`) in both themes. When adding tests, colocate specs in a `__tests__` folder beside the component or route, prefer React Testing Library with Vitest, and target interaction coverage over snapshots. Document any new commands in `package.json` and extend this guide once a testing toolchain lands.

## Commit & Pull Request Guidelines
Recent commits default to `fix`; expand to `type: short summary` (e.g., `feat: add work gallery`) so history remains scannable. Reference issues or tickets in the body when relevant. Pull requests should include a concise description, testing notes (`npm run build`, manual routes touched), screenshots or screen recordings for UI changes, and any reviewer setup steps. Request at least one review and wait for CI to pass once pipelines exist.

## Behavior Rules
When finished, review git diff including new files and generate a one-line commit message summarizing the changes