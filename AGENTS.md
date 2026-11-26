# Repository guidance

## Commands

- `npm install` installs dependencies; `npm run dev` starts Vite.
- `npm run build` runs strict TypeScript checking (`tsc`, including unused locals/parameters) before the Vite production build. There is no separate lint script.
- `npm test` runs all Vitest tests once; `npm run test:watch` starts watch mode. Run one file with `npm test -- src/engine/engine.test.ts`, or filter by name with `npm test -- -t "test name"`.
- Vitest uses jsdom and only discovers `src/**/*.test.{ts,tsx}`. `src/test/setup.ts` supplies a `ResizeObserver` stub and React Testing Library cleanup.

## Architecture and gotchas

- `src/main.tsx` mounts `App.tsx`; this is a client-side React SPA. Domain types are in `src/types/turing.ts`; simulation, validation, conversion and export logic live in `src/engine/`.
- The Zustand store in `src/store/useTuringStore.ts` composes project, graph, rules, runtime and UI slices. Changes to machine representations should account for the graph, rule tables and 4-tuple/5-tuple conversion in `src/engine/transpiler.ts`.
- Store persistence uses the `turing_diagrammer_storage_v1` localStorage key and debounced writes (250 ms); `debouncedPersistStorage.flush()` forces pending writes. Only the fields in `partialize` persist, and runtime execution resets on rehydration.
- `graphify-out/` is tracked. For architecture exploration, use `graphify query "question"` for a focused graph; `PROJECT_MAP.md` and `docs/MAP_*.md` provide more detail, but verify claims against code.
