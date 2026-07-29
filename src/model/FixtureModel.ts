import path from "path";
import { withRecordReplay } from "async-combinators";
import { IModel, IModelFailureCounter, PostOptions } from "./IModel";
import { IQueryResult } from "./IQueryResult";

type FixtureValue = {
  completions: string[];
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

/**
 * A model that replays LLM responses from fixture files recorded by withRecordReplay.
 * Drop-in replacement for MockModel.
 *
 * Fixture files live at {fixtureDir}/{modelName}/{hash[0:2]}/{hash}, where the
 * hash is SHA256 of JSON.stringify({ modelName, prompt, options }).
 */
export class FixtureModel implements IModel {
  private static readonly DEFAULT_OPTIONS: PostOptions = {
    max_tokens: 250,
    temperature: 0,
    top_p: 1,
  };

  private readonly replayQuery: (
    prompt: string,
    opts: PostOptions
  ) => Promise<FixtureValue>;

  constructor(
    private readonly modelName: string,
    fixtureDir: string,
    private readonly instanceOptions: PostOptions = FixtureModel.DEFAULT_OPTIONS
  ) {
    const cacheDir = path.join(fixtureDir, modelName);

    this.replayQuery = withRecordReplay(
      async (_prompt: string, _opts: PostOptions): Promise<FixtureValue> => {
        throw new Error(
          "FixtureModel: no recording found — run in incrementalRecord mode to add new fixtures"
        );
      },
      cacheDir,
      {
        mode: "replay",
        makeKey: ([prompt, opts]) =>
          JSON.stringify({
            modelName,
            prompt,
            options: { ...this.instanceOptions, ...opts },
          }),
      }
    );
  }

  getModelName(): string {
    return this.modelName;
  }

  getTemperature(): number {
    return this.instanceOptions.temperature ?? 0;
  }

  getMaxTokens(): number {
    return this.instanceOptions.max_tokens ?? 250;
  }

  getFailureCounter(): IModelFailureCounter {
    return { nrRetries: 0, nrFailures: 0 };
  }

  public async query(
    prompt: string,
    opts: PostOptions = {}
  ): Promise<IQueryResult> {
    const result = await this.replayQuery(prompt, opts);
    return {
      completions: new Set(result.completions),
      prompt_tokens: result.prompt_tokens,
      completion_tokens: result.completion_tokens,
      total_tokens: result.total_tokens,
    };
  }
}
