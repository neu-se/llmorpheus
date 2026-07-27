import crypto from "crypto";
import path from "path";
import { withRecordReplay, RecordReplayMode } from "async-combinators";
import { IModel, IModelFailureCounter, PostOptions, defaultPostOptions } from "./IModel";
import { IQueryResult } from "./IQueryResult";

type SerializableResult = {
  completions: string[];
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

/**
 * Compute the same fixture key as the original CachingModel/MockModel: a SHA256
 * hash of {modelName, prompt, fully-merged options}. Using the hash as the key
 * (rather than the raw JSON) keeps fixture filenames short and lets the migration
 * script reconstruct new paths from old filenames without knowing the original prompts.
 */
function computeKey(
  modelName: string,
  prompt: string,
  instanceOptions: PostOptions,
  callOptions: PostOptions
): string {
  const options = { ...defaultPostOptions, ...instanceOptions, ...callOptions };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ modelName, prompt, options }))
    .digest("hex");
}

/**
 * Wraps an IModel with withRecordReplay so query() calls are recorded to or
 * replayed from a fixture directory.
 *
 * Replaces CachingModel (use mode 'incrementalRecord') and MockModel (use mode
 * 'replay'). Fixture files live at {cacheBaseDir}/{modelName}/... to match the
 * path layout used by the classes they replace.
 */
export function withRecordReplayModel(
  model: IModel,
  cacheBaseDir: string,
  mode: RecordReplayMode = "replay",
  instanceOptions: PostOptions = {}
): IModel {
  const modelName = model.getModelName();
  const cacheDir = path.join(cacheBaseDir, modelName);

  const recordedQuery = withRecordReplay(
    async (prompt: string, opts: PostOptions): Promise<SerializableResult> => {
      const result = await model.query(prompt, opts);
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
        computeKey(modelName, prompt, instanceOptions, opts ?? {}),
    }
  );

  return {
    getModelName: () => model.getModelName(),
    getTemperature: () => model.getTemperature(),
    getMaxTokens: () => model.getMaxTokens(),
    getFailureCounter: () => model.getFailureCounter(),
    async query(prompt: string, opts: PostOptions = {}): Promise<IQueryResult> {
      const result = await recordedQuery(prompt, opts);
      return {
        completions: new Set(result.completions),
        prompt_tokens: result.prompt_tokens,
        completion_tokens: result.completion_tokens,
        total_tokens: result.total_tokens,
      };
    },
  };
}

/**
 * Convenience wrapper for the replay-only case (replaces MockModel).
 * Creates a stub underlying model (query is never called in replay mode)
 * and delegates to withRecordReplayModel with mode 'replay'.
 */
export function withReplayModel(modelName: string, modelDir: string): IModel {
  const stub: IModel = {
    getModelName: () => modelName,
    getTemperature: () => defaultPostOptions.temperature,
    getMaxTokens: () => defaultPostOptions.max_tokens,
    getFailureCounter: (): IModelFailureCounter => ({ nrRetries: 0, nrFailures: 0 }),
    query: () =>
      Promise.reject(
        new Error(`No recording found in ${path.join(modelDir, modelName)}`)
      ),
  };
  return withRecordReplayModel(stub, modelDir, "replay");
}
