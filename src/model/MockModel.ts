import fs from "fs";
import path from "path";
import crypto from "crypto";
import { IModel } from "./IModel";
import { defaultPostOptions } from "./IModel";
import { IQueryResult } from "./IQueryResult";

/**
 * A mock model that extracts its responses from a directory containing previously recorded cache files.
 */

export class MockModel implements IModel {
  private modelName: string;
  private mockOptions = { max_tokens: 250, temperature: 0, top_p: 1 };
  constructor(modelName: string, private modelDir: string) {
    this.modelName = `${modelName}`;
  }

  getModelName(): string {
    return this.modelName;
  }
  getTemperature(): number {
    return defaultPostOptions.temperature;
  }
  getMaxTokens(): number {
    return defaultPostOptions.max_tokens;
  }

  public async query(prompt: string): Promise<IQueryResult> {
    // compute hash using npm package `crypto`
    const hashKey = JSON.stringify({
      modelName: this.modelName,
      prompt,
      options: this.mockOptions,
    });
    const hash = crypto.createHash("sha256").update(hashKey).digest("hex");

    // compute path to cache file
    const cacheDir = path.join(this.modelDir, this.modelName, hash.slice(0, 2));
    const cacheFile = path.join(cacheDir, hash);
    // if the cache file exists, return its contents
    if (fs.existsSync(cacheFile)) {
      const completionsJSON = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      const completions = new Set<string>();
      for (const completion of completionsJSON) {
        completions.add(completion);
      }
      return {
        completions,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };
    } else {
      throw new Error(`MockModel: cache file ${cacheFile} does not exist`);
    }
  }
}
