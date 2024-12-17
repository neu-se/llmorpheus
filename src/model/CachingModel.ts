import fs from "fs";
import path from "path";
import crypto from "crypto";
import { IModel } from "./IModel";
import { PostOptions, defaultPostOptions } from "./IModel";
import { IQueryResult } from "./IQueryResult";

/**
 * A model that wraps another model and caches its results.
 */
export class CachingModel implements IModel {
  private modelName: string;

  constructor(
    private model: IModel,
    private cacheDir: string,
    private instanceOptions: PostOptions = {}
  ) {
    this.modelName = `${model.getModelName()}`;
    console.log(`Using cache dir: ${cacheDir}`);
  }
  getModelName(): string {
    return `${this.modelName}`;
  }
  getTemperature(): number {
    return this.model.getTemperature();
  }
  getMaxTokens(): number {
    return this.model.getMaxTokens();
  }

  public async query(
    prompt: string,
    requestPostOptions: PostOptions = {}
  ): Promise<IQueryResult> {
    const options: PostOptions = {
      ...defaultPostOptions,
      // options provided to constructor override default options
      ...this.instanceOptions,
      // options provided to this function override default and instance options
      ...requestPostOptions,
    };

    // compute hash using npm package `crypto`
    const hashKey = JSON.stringify({
      modelName: this.model.getModelName(),
      prompt,
      options,
    });

    const hash = crypto.createHash("sha256").update(hashKey).digest("hex");

    // compute path to cache file
    const cacheDir = path.join(
      this.cacheDir,
      this.model.getModelName(),
      hash.slice(0, 2)
    );
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
      // otherwise, call the wrapped model and cache the result
      const queryResult = await this.model.query(prompt, requestPostOptions);
      const completions = queryResult.completions;
      const prompt_tokens = queryResult.prompt_tokens;
      const completion_tokens = queryResult.completion_tokens;
      const total_tokens = queryResult.total_tokens;
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify([...completions]));
      return {
        completions,
        prompt_tokens,
        completion_tokens,
        total_tokens,
      };
    }
  }
}
