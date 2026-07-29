import path from "path";
import { withRecordReplay, RecordReplayMode } from "async-combinators";
import { IModel, IModelFailureCounter, PostOptions } from "./IModel";
import { IQueryResult } from "./IQueryResult";

type FixtureValue = {
  completions: string[];
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

/**
 * A model that records and replays LLM responses using fixture files.
 *
 * Modes (passed as the last constructor argument):
 *  - "replay" (default) — replay from fixtures only; fail loudly on a miss.
 *    No underlying model needed.
 *  - "incrementalRecord" — replay if a fixture exists, otherwise call the
 *    underlying model and record the result.
 *  - "record" — always call the underlying model and overwrite all fixtures.
 *
 * Fixture files live at {fixtureDir}/{modelName}/{hash[0:2]}/{hash}.
 *
 * Workflow:
 *  1. Create a test with mode "incrementalRecord" and a real Model underneath.
 *  2. Run the test to populate fixtures from the live LLM.
 *  3. Examine results, update assertions.
 *  4. Switch mode to "replay" and remove the underlying model.
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

  /**
   * @param modelName     The model name (used in fixture paths and key computation).
   * @param fixtureDir    Directory under which fixtures are stored.
   * @param instanceOptions  Options baked into the fixture key (must match what
   *                      was used when fixtures were recorded).
   * @param mode          Record/replay mode (default: "replay").
   * @param underlyingModel  Required for "record" and "incrementalRecord" modes;
   *                      ignored in "replay" mode.
   */
  constructor(
    private readonly modelName: string,
    fixtureDir: string,
    private readonly instanceOptions: PostOptions = FixtureModel.DEFAULT_OPTIONS,
    mode: RecordReplayMode = "replay",
    underlyingModel?: IModel
  ) {
    if (mode !== "replay" && !underlyingModel) {
      throw new Error(
        `FixtureModel: an underlyingModel is required when mode is "${mode}"`
      );
    }

    const cacheDir = path.join(fixtureDir, modelName);

    this.replayQuery = withRecordReplay(
      async (prompt: string, opts: PostOptions): Promise<FixtureValue> => {
        const result = await underlyingModel!.query(prompt, opts);
        return {
          completions: [...result.completions],
          prompt_tokens: result.prompt_tokens,
          completion_tokens: result.completion_tokens,
          total_tokens: result.total_tokens,
        };
      },
      cacheDir,
      {
        mode,
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
