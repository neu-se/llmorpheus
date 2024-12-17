import fs from "fs";
import axios from "axios";
import { performance } from "perf_hooks";
import {
  BenchmarkRateLimiter,
  FixedRateLimiter,
  RateLimiter,
} from "../util/promise-utils";
import { retry } from "../util/promise-utils";
import { IModel } from "./IModel";
import { PostOptions, defaultPostOptions } from "./IModel";
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

  protected instanceOptions: PostOptions;
  protected rateLimiter: RateLimiter;

  constructor(
    private modelName: string,
    instanceOptions: PostOptions = {},
    private metaInfo: MetaInfo
  ) {
    this.instanceOptions = instanceOptions;
    if (metaInfo.benchmark) {
      console.log(`*** Using ${this.modelName} with benchmark rate limiter`);
      this.rateLimiter = new BenchmarkRateLimiter();
      metaInfo.nrAttempts = 3;
    } else if (metaInfo.rateLimit > 0) {
      this.rateLimiter = new FixedRateLimiter(metaInfo.rateLimit);
      console.log(
        `*** Using ${this.getModelName()} with rate limit: ${
          metaInfo.rateLimit
        } and ${metaInfo.nrAttempts} attempts`
      );
    } else {
      this.rateLimiter = new FixedRateLimiter(0);
      console.log(
        `*** Using ${this.getModelName()} with no rate limit and ${
          metaInfo.nrAttempts
        } attempts`
      );
    }
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
    const body = {
      model: this.getModelName(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      ...options,
    };

    performance.mark("llm-query-start");
    let res;
    try {
      res = await retry(
        () =>
          this.rateLimiter.next(() =>
            axios.post(Model.LLMORPHEUS_LLM_API_ENDPOINT, body, {
              headers: Model.LLMORPHEUS_LLM_AUTH_HEADERS,
            })
          ),
        this.metaInfo.nrAttempts
      );
    } catch (e) {
      if (res?.status === 429) {
        console.error(`*** 429 error: ${e}`);
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
}
