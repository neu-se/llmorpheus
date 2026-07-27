/**
 * One-shot migration: converts fixture files from the old CachingModel/MockModel
 * format (bare JSON array of completions) to the withRecordReplay envelope format
 * ({key, value}).
 *
 * Old path:  {baseDir}/{modelName}/XX/XXXX...  (64-char SHA256 hash)
 * New path:  {baseDir}/{modelName}/YY/YYYY...  (SHA256 of the old hash)
 *
 * The withRecordReplayModel makeKey returns SHA256({modelName,prompt,options}),
 * which equals the old filename hash. withRecordReplay then path-hashes that key
 * again, so the new filename is SHA256(oldHash). No knowledge of the original
 * prompts is needed — the filename itself is the key stored in the envelope.
 *
 * Usage (from repo root):
 *   node -e "require('./scripts/migrate-fixtures')"
 * or:
 *   npx ts-node scripts/migrate-fixtures.ts
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function migrateDirectory(baseDir) {
  if (!fs.existsSync(baseDir)) {
    console.log(`Directory not found: ${baseDir}`);
    return;
  }

  // First pass: collect all old-format files
  const toMigrate = [];
  const collect = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collect(p);
      } else if (/^[0-9a-f]{64}$/.test(entry.name)) {
        const raw = fs.readFileSync(p, "utf-8");
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          console.warn(`Skipping ${p}: invalid JSON`);
          continue;
        }
        if (Array.isArray(parsed)) {
          toMigrate.push({ shardDir: dir, hash: entry.name, completions: parsed });
        } else {
          console.log(`Already new format: ${entry.name.slice(0, 12)}...`);
        }
      }
    }
  };
  collect(baseDir);

  console.log(`Found ${toMigrate.length} file(s) to migrate in ${baseDir}`);

  // Second pass: rewrite each file
  for (const { shardDir, hash: oldHash, completions } of toMigrate) {
    const oldPath = path.join(shardDir, oldHash);
    const newHash = crypto.createHash("sha256").update(oldHash).digest("hex");
    const modelDir = path.dirname(shardDir); // strip the XX shard prefix dir
    const newShardDir = path.join(modelDir, newHash.slice(0, 2));
    const newPath = path.join(newShardDir, newHash);

    fs.mkdirSync(newShardDir, { recursive: true });
    fs.writeFileSync(
      newPath,
      JSON.stringify(
        {
          key: oldHash,
          value: {
            completions,
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        },
        null,
        2
      )
    );
    fs.unlinkSync(oldPath);

    // Remove old shard dir if now empty
    if (fs.readdirSync(shardDir).length === 0) {
      fs.rmdirSync(shardDir);
    }

    console.log(`  ${oldHash.slice(0, 12)}... -> ${newHash.slice(0, 12)}...`);
  }

  console.log("Done.");
}

migrateDirectory(path.resolve("test/input/mockModel"));
