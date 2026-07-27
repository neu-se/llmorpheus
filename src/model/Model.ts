import fs from "fs";
import axios from "axios";
import { performance } from "perf_hooks";
import { withRetry, withRateLimit, withTimeout } from "async-combinators";
import { BenchmarkRateLimiter } from "../util/promise-utils";
import { IModel, IModelFailureCounter, PostOptions, defaultPostOptions } from "./IModel";
import { getEnv } from "../util/code-utils";
import { IQueryResult } from "./IQueryResult";
import { MetaInfo } from "../generator/MetaInfo";

/**
 * This class provides an abstraction for an LLM.
 */
export class Model implements IModel {
  protected static LLMORPHEUS_LLM_API_ENDPOINT = getEnv(
    "LLMORPHEUS_LLM_API_ENDPOINT"
  );
  protected static LLMORPHEUS_LLM_AUTH_HEADERS = JSON.parse(
    getEnv("LLMORPHEUS_LLM_AUTH_HEADERS")
  );

  protected static LLMORPHEUS_LLM_PROVIDER = Model.getLLMProvider();

  private static getLLMProvider() {
    const llmProvider = getEnv("LLMORPHEUS_LLM_PROVIDER", false);
    if (llmProvider) {
      return JSON.parse(llmProvider);
    } else {
      return null;
    }
  }

  protected instanceOptions: PostOptions;
  protected counter: IModelFailureCounter = { nrRetries: 0, nrFailures: 0 };
  // Composed stack: axiosPost → withRateLimit? → withTimeout → withRetry
  private readonly _queryFn: (body: any) => Promise<any>;

  constructor(
    private modelName: string,
    instanceOptions: PostOptions = {},
    private metaInfo: MetaInfo
  ) {
    this.instanceOptions = instanceOptions;

    const axiosPost = (body: any) =>
      axios.post(Model.LLMORPHEUS_LLM_API_ENDPOINT, body, {
        headers: Model.LLMORPHEUS_LLM_AUTH_HEADERS,
      });

    // Rate limiting
    let limitedPost: typeof axiosPost;
    if (metaInfo.benchmark) {
      console.log(`*** Using ${modelName} with benchmark rate limiter`);
      const benchLimiter = new BenchmarkRateLimiter();
      metaInfo.nrAttempts = 3;
      limitedPost = (body) => benchLimiter.next(() => axiosPost(body));
    } else if (metaInfo.rateLimit > 0) {
      console.log(
        `*** Using ${modelName} with rate limit: ${metaInfo.rateLimit} and ${metaInfo.nrAttempts} attempts`
      );
      limitedPost = withRateLimit(axiosPost, metaInfo.rateLimit);
    } else {
      console.log(
        `*** Using ${modelName} with no rate limit and ${metaInfo.nrAttempts} attempts`
      );
      limitedPost = axiosPost;
    }

    const timeoutMs = metaInfo.timeoutMs ?? 60_000;
    const timedPost = withTimeout(limitedPost, timeoutMs);

    this._queryFn = withRetry(timedPost, metaInfo.nrAttempts, {
      onRetry: (attempt, err) => {
        console.log(
          `  retry ${attempt}/${metaInfo.nrAttempts}: ${(err as Error).message}`
        );
        this.counter.nrRetries++;
      },
    });
  }

  public getModelName(): string {
    return this.modelName;
  }

  public getTemperature(): number {
    if (this.instanceOptions.temperature === undefined) {
      return defaultPostOptions.temperature;
    }
    return this.instanceOptions.temperature;
  }

  public getMaxTokens(): number {
    if (this.instanceOptions.max_tokens === undefined) {
      return defaultPostOptions.max_tokens;
    }
    return this.instanceOptions.max_tokens;
  }

  /**
   * Query Model for completions with a given prompt.
   *
   * @param prompt The prompt to use for the completion.
   * @param requestPostOptions The options to use for the request.
   * @returns A promise that resolves to a set of completions.
   */
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

    const systemPrompt = fs.readFileSync(
      `templates/${this.metaInfo.systemPrompt}`,
      "utf8"
    );
    let body: any = {
      model: this.getModelName(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      ...options,
    };
    if (Model.LLMORPHEUS_LLM_PROVIDER) {
      body = { ...body, provider: Model.LLMORPHEUS_LLM_PROVIDER };
    }

    performance.mark("llm-query-start");
    let res: any;
    try {
      res = await this._queryFn(body);
    } catch (e) {
      if (res?.status === 429) {
        console.error(`*** 429 error: ${e}`);
        this.counter.nrFailures++;
      }
      throw e;
    }

    performance.measure(
      `llm-query:${JSON.stringify({
        ...options,
        promptLength: prompt.length,
      })}`,
      "llm-query-start"
    );
    if (res.status !== 200) {
      throw new Error(
        `Request failed with status ${res.status} and message ${res.statusText}`
      );
    }
    if (!res.data) {
      throw new Error("Response data is empty");
    }

    const prompt_tokens = res.data.usage.prompt_tokens;
    const completion_tokens = res.data.usage.completion_tokens;
    const total_tokens = res.data.usage.total_tokens;
    console.log(
      `*** prompt tokens: ${prompt_tokens}, completion tokens: ${completion_tokens}, total tokens: ${total_tokens}`
    );

    const completions = new Set<string>();
    completions.add(res.data.choices[0].message.content);
    return {
      completions,
      prompt_tokens,
      completion_tokens,
      total_tokens,
    };
  }

  public getFailureCounter(): IModelFailureCounter {
    return this.counter;
  }
}
