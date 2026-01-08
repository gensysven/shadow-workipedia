# Main.ts Modularization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Bead:** N/A (manual request)

**Goal:** Modularize `src/main.ts` into focused setup modules without altering initialization order or runtime behavior.

**Architecture:** Keep `src/main.ts` as the single entrypoint and preserve the documented initialization order. Extract cohesive groups into `src/main/` modules: canvas/ctx, state, DOM, handlers, interactions, render/loop. Each module exports a single function used by `main.ts`. No logic changes, only relocation and wiring.

**Tech Stack:** TypeScript, Vite, Canvas/D3

**Constraint:** No worktrees (per user instruction). Work directly on `main`.

---

### Task 1: Add render smoke test (RED → GREEN)

**Files:**
- Create: `scripts/test-main-render.ts`

**Step 1: Write the failing test**

Create `scripts/test-main-render.ts` with the following content (expects new module that does not exist yet):

```ts
#!/usr/bin/env node
import { createCanvasContext } from '../src/main/canvas';

const { canvas, ctx } = createCanvasContext();
if (!canvas || !ctx) {
  throw new Error('Expected canvas and context from createCanvasContext.');
}
console.log('main canvas test passed.');
```

**Step 2: Run test to verify it fails**

Run: `node --import tsx scripts/test-main-render.ts`

Expected: FAIL with module not found for `src/main/canvas`.

**Step 3: Implement minimal module to make test pass**

- Create `src/main/canvas.ts`
- Move canvas setup from `src/main.ts` into `createCanvasContext()` returning `{ canvas, ctx }`.
- Update `src/main.ts` to import and use `createCanvasContext()`.

**Step 4: Run test to verify it passes**

Run: `node --import tsx scripts/test-main-render.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add scripts/test-main-render.ts src/main/canvas.ts src/main.ts
git commit -m "Extract main canvas setup"
```

---

### Task 2: Extract state initialization

**Files:**
- Create: `src/main/state.ts`
- Modify: `src/main.ts`

**Step 1: Write the failing test**

Reuse the render smoke test; it should still pass.

**Step 2: Implement minimal extraction**

- Move state variable initialization (transform state, dimensions, flags, cached values) into `initializeMainState()`.
- Return a typed object of state values.
- Update `src/main.ts` to use it.

**Step 3: Run test to verify it passes**

Run: `node --import tsx scripts/test-main-render.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/main/state.ts src/main.ts
git commit -m "Extract main state initialization"
```

---

### Task 3: Extract DOM element creation

**Files:**
- Create: `src/main/dom.ts`
- Modify: `src/main.ts`

**Step 1: Write the failing test**

Reuse the render smoke test; it should still pass.

**Step 2: Implement minimal extraction**

- Move DOM query/creation and element references to `initializeMainDom()`.
- Return an object of element references.
- Update `src/main.ts` to use it.

**Step 3: Run test to verify it passes**

Run: `node --import tsx scripts/test-main-render.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/main/dom.ts src/main.ts
git commit -m "Extract main DOM setup"
```

---

### Task 4: Extract event handlers wiring

**Files:**
- Create: `src/main/handlers.ts`
- Modify: `src/main.ts`

**Step 1: Write the failing test**

Reuse the render smoke test; it should still pass.

**Step 2: Implement minimal extraction**

- Move DOM event handler wiring into `attachMainHandlers()`.
- Pass required state + dom references.
- Update `src/main.ts` to use it.

**Step 3: Run test to verify it passes**

Run: `node --import tsx scripts/test-main-render.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/main/handlers.ts src/main.ts
git commit -m "Extract main event handlers"
```

---

### Task 5: Extract render loop

**Files:**
- Create: `src/main/render.ts`
- Modify: `src/main.ts`

**Step 1: Write the failing test**

Reuse the render smoke test; it should still pass.

**Step 2: Implement minimal extraction**

- Move render function and any loop/animation logic into `createRenderLoop()`.
- Return callable functions used by `main.ts`.
- Update `src/main.ts` to call `createRenderLoop()`.

**Step 3: Run test to verify it passes**

Run: `node --import tsx scripts/test-main-render.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/main/render.ts src/main.ts
git commit -m "Extract main render loop"
```

---

### Task 6: Verify full build

**Step 1: Run build**

Run: `pnpm build`

Expected: `tsc` and `vite build` complete successfully.

**Step 2: Commit (if needed)**

No code changes expected. If any fixes were required, commit with a clear message.

---

## Verification Checklist

- `node --import tsx scripts/test-main-render.ts` passes
- `pnpm build` passes
- Initialization order preserved (per AGENTS.md)

