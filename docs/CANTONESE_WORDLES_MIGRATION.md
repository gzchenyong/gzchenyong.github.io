# Cantonese Wordles Migration

## Summary

This repository now contains a GitHub Pages compatible version of the `Cantonese Wordles` game under `assets/games/cantonese-wordles/`.

The source game was originally built as a `Next.js + TypeScript` application with:

- client-side React state
- API routes
- LLM-based puzzle generation
- Supabase persistence

That architecture is not deployable inside the default `al-folio` GitHub Pages flow, because this starter repository is a Jekyll static site and does not host a Node server runtime.

## Migration Decision

The game was migrated to a static JavaScript implementation instead of trying to preserve the server stack.

Why:

- it is the most direct path to make the game runnable inside GitHub Pages
- it avoids introducing non-starter runtime ownership into `al-folio`
- it keeps the integration isolated to starter content and static assets

User impact:

- the game loads as a static embedded page inside the `Projects` collection
- there is no live backend puzzle generation
- daily puzzle rotation is preserved using a deterministic date-based puzzle selector
- local progress is preserved in the browser with `localStorage`

## File Layout

- Project entry page: `_projects/10_cantonese_wordles.md`
- Static game shell: `assets/games/cantonese-wordles/index.html`
- Styles: `assets/games/cantonese-wordles/assets/game.css`
- Logic: `assets/games/cantonese-wordles/assets/game.js`
- Puzzle data: `assets/games/cantonese-wordles/assets/game-data.js`

## Integration Notes

The game is embedded with an iframe inside the project page instead of being inlined directly into the Jekyll page.

Why:

- it prevents CSS leakage into the rest of the starter site
- it isolates page-level JavaScript from site-wide scripts
- it keeps the migrated artifact easy to replace or remove later
