# Plan: Adopt `withRecordReplay` for test fixtures

## Current state

Two distinct fixture mechanisms exist in the tests:

### 1. `MockModel` (4 tests)
Used by: "find source files", "mock model completion", "generate mutants", "summary.json"

- Reads fixtures from `test/input/mockModel/codellama-34b-instruct/{2char}/{hash}`
- Fixture format: bare JSON array of completion strings — `["completion text..."]`
- Hash key: `SHA256(JSON.stringify({ modelName, prompt, options: { max_tokens: 250, temperature: 0, top_p: 1 } }))`
- Directory layout already matches `withRecordReplay` (`{2char}/{hash}` sharding)

### 2. `ReplayModel` (3 tests)
Used by: "replay", "single line", "lessthan only"

- Reads from `test/input/recorded/sorters/prompts/prompt{N}.txt` and `prompt{N}_completion_{M}.txt`
- Keyed by prompt number, not content
- Tests directly compare prompt/completion files by name — this is intentional

---

## Migration strategy

### Step 1 — Migrate `MockModel` fixture file contents

The fixture filenames (SHA256 hashes) stay the same — the hash key formula is identical to
what `withRecordReplay` will use with a custom `makeKey`. Only the file contents change:

- **Old format:** `["completion text"]`
- **New format:** `{ "key": "<key string>", "value": { "completions": ["..."], "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 } }`

Write a one-time migration script (`scripts/migrateFixtures.ts`) that:
1. Reads `test/input/prompts/prompt{N}.txt` (40 files) to get the original prompt texts
2. For each prompt, computes the hash key using the same formula as `MockModel`
3. Finds the matching fixture file
4. Reads the existing `["..."]` content
5. Rewrites the file in the new `{ key, value }` format

### Step 2 — Replace `MockModel` with `withReplayModel`

- Delete `src/model/MockModel.ts`
- Add `withReplayModel` function (to `src/model/withRecordReplayModel.ts` or a new file) that
  wraps a stub model with `withRecordReplay` in `replay` mode, using the same `makeKey`:
  ```ts
  makeKey: ([prompt, opts]) =>
    SHA256(JSON.stringify({ modelName, prompt, options: { ...defaultPostOptions, ...instanceOptions, ...opts } }))
  ```
- Update `test/tests.ts` to replace `new MockModel(modelName, mockModelDir)` with
  `withReplayModel(modelName, mockModelDir, { max_tokens: 250, temperature: 0, top_p: 1 })`

### Step 3 — Leave `ReplayModel` and recorded-sorters fixtures unchanged

The 3 tests using `ReplayModel` check that `MutantGenerator` writes correctly named
`prompt{N}_completion_{M}.txt` files. That file-naming behaviour is what's under test —
migrating those fixtures to `withRecordReplay` format would eliminate that coverage.
No change needed.

### Step 4 — New reasoning-model fixtures

Once `MockModel` fixtures are migrated, new fixtures for reasoning models (e.g. GLM-5.2,
Claude Haiku) can be added to the same `test/input/mockModel/` directory in the new
`{ key, value }` format, and corresponding test cases added to `test/tests.ts`.

---

## Summary of changes

| What | Action |
|---|---|
| `test/input/mockModel/**` fixture files | Rewrite contents to `{ key, value }` format (filenames unchanged) |
| `src/model/MockModel.ts` | Delete |
| `src/model/withRecordReplayModel.ts` | Add `withReplayModel` export |
| `test/tests.ts` | Replace `new MockModel(...)` with `withReplayModel(...)` |
| `scripts/migrateFixtures.ts` | One-time migration script (can be deleted after use) |
| `test/input/recorded/sorters/**` | No change |
| `src/model/ReplayModel.ts` | No change |
