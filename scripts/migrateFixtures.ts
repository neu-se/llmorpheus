/**
 * One-time migration script: rewrites MockModel fixture files from the old
 * bare-array format to the { key, value } format expected by withRecordReplay.
 *
 * Old format:  ["completion text..."]
 * New format:  { "key": "<key string>", "value": { "completions": [...], "prompt_tokens": 0, ... } }
 *
 * The fixture filenames (SHA256 hashes) are unchanged — the hash key formula is
 * identical, so withRecordReplay will find them at the same paths.
 *
 * Usage: npx ts-node scripts/migrateFixtures.ts
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PromptSpecGenerator } from "../src/generator/PromptSpecGenerator";
import { MetaInfo } from "../src/generator/MetaInfo";
import { Prompt } from "../src/prompt/Prompt";
import { Completion } from "../src/prompt/Completion";

const MODEL_NAME = "codellama-34b-instruct";
const MOCK_OPTIONS = { max_tokens: 250, temperature: 0, top_p: 1 };
const FIXTURE_DIR = path.join("test/input/mockModel", MODEL_NAME);

// Regenerate all prompts from the test project source, mirroring what the tests do
Prompt.resetIdCounter();
Completion.resetIdCounter();

const metaInfo: MetaInfo = {
  modelName: MODEL_NAME,
  template: "./templates/template-full.hb",
  systemPrompt: "",
  maxTokens: 250,
  temperature: 0,
  maxNrPrompts: 100,
  nrAttempts: 1,
  timeout: 60_000,
  mutate: "src/**/*.ts",
  ignore: "**/*.spec.ts",
  rateLimit: 1000,
  mutateOnly: undefined,
  mutateOnlyLines: undefined,
  maxLinesInPlaceHolder: 1,
};

const tmpDir = fs.mkdtempSync("migrate-");
const subDirName = "template-full_codellama-34b-instruct_0.0";
fs.mkdirSync(path.join(tmpDir, subDirName));

const generator = new PromptSpecGenerator(
  ["TreeSorter.ts"],
  "test/input/testProject/sorters/src/",
  tmpDir,
  subDirName,
  metaInfo
);

const prompts = generator.getPrompts();
console.log(`Generated ${prompts.length} prompts from TreeSorter.ts`);

// Also include prompt1.txt (used by the "mock model completion" test) which
// was recorded separately and may not appear in the PromptSpecGenerator output.
const extraPrompts: string[] = [];
const prompt1Path = "test/input/prompts/prompt1.txt";
if (fs.existsSync(prompt1Path)) {
  extraPrompts.push(fs.readFileSync(prompt1Path, "utf8"));
}

function computeKey(promptText: string): string {
  return JSON.stringify({
    modelName: MODEL_NAME,
    prompt: promptText,
    options: MOCK_OPTIONS,
  });
}

function computeHash(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function migrateFixture(promptText: string, label: string): void {
  const key = computeKey(promptText);
  const hash = computeHash(key);
  const fixtureFile = path.join(FIXTURE_DIR, hash.slice(0, 2), hash);

  if (!fs.existsSync(fixtureFile)) {
    // Not every prompt necessarily has a fixture (e.g. prompt1.txt may already
    // be handled by the generator prompts above).
    return;
  }

  const raw = fs.readFileSync(fixtureFile, "utf8");
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error(`  ERROR parsing ${fixtureFile}: ${e}`);
    return;
  }

  // Already migrated — has { key, value } shape
  if (!Array.isArray(parsed)) {
    console.log(`  SKIP (already migrated): ${label}`);
    return;
  }

  const newContent = {
    key,
    value: {
      completions: parsed as string[],
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };

  fs.writeFileSync(fixtureFile, JSON.stringify(newContent, null, 2), "utf8");
  console.log(`  MIGRATED: ${label} → ${fixtureFile}`);
}

// Migrate fixtures for all generated prompts
for (const prompt of prompts) {
  migrateFixture(prompt.getText(), `prompt id=${prompt.getId()}`);
}

// Migrate fixtures for extra prompts (prompt1.txt)
for (const promptText of extraPrompts) {
  migrateFixture(promptText, "prompt1.txt");
}

// Clean up temp dir
fs.rmdirSync(tmpDir, { recursive: true });

// Report any fixture files that were NOT covered
const allFixtures = new Set<string>();
function walkFixtures(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFixtures(full);
    else allFixtures.add(full);
  }
}
walkFixtures(FIXTURE_DIR);

const migratedOrSkipped = new Set<string>();
for (const prompt of prompts) {
  const hash = computeHash(computeKey(prompt.getText()));
  migratedOrSkipped.add(path.join(FIXTURE_DIR, hash.slice(0, 2), hash));
}
for (const promptText of extraPrompts) {
  const hash = computeHash(computeKey(promptText));
  migratedOrSkipped.add(path.join(FIXTURE_DIR, hash.slice(0, 2), hash));
}

const uncovered = [...allFixtures].filter((f) => !migratedOrSkipped.has(f));
if (uncovered.length > 0) {
  console.warn(`\nWARNING: ${uncovered.length} fixture file(s) not covered by any prompt:`);
  for (const f of uncovered) console.warn(`  ${f}`);
} else {
  console.log(`\nAll ${allFixtures.size} fixture files accounted for.`);
}
