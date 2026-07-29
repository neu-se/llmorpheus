import fs from "fs";
import axios from "axios";
import { performance } from "perf_hooks";
import {
  BenchmarkRateLimiter,
  FixedRateLimiter,
  RateLimiter,
} from "../util/promise-utils";
import { retry } from "../util/promise-utils";
import { IModel, IModelFailureCounter, PostOptionsType } from "./IModel";
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
  protected rateLimiter: RateLimiter;
  protected counter: IModelFailureCounter = { nrRetries: 0, nrFailures: 0 };

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
    let body = {
      model: this.getModelName(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      ...options,
    };
    if (Model.LLMORPHEUS_LLM_PROVIDER) {
      const provider = Model.LLMORPHEUS_LLM_PROVIDER;
      body = {
        ...body,
        provider: provider,
      };
    }

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
        this.metaInfo.nrAttempts,
        () => {
          this.counter.nrRetries++;
        }
      );
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
    const content = Model.extractContent(res.data.choices[0].message);
    if (content !== null) {
      completions.add(content);
    } else {
      console.warn(
        `*** Warning: received null content from model ${this.modelName}. Full message: ${JSON.stringify(res.data.choices[0].message)}`
      );
    }
    return {
      completions,
      prompt_tokens,
      completion_tokens,
      total_tokens,
    };
  }

  /**
   * Extract the text content from a chat completion message, handling reasoning
   * models that may return content in non-standard fields.
   *
   * Different providers use different field names for the model's output when
   * chain-of-thought reasoning is involved:
   *
   *  - Standard OpenAI:           message.content  (string)
   *  - Inline think tags (vLLM):  message.content  ("<think>...</think>answer")
   *  - DeepSeek-R1 / some GLM:   message.reasoning_content  (content may be null)
   *  - GLM-5.2 via OpenRouter:    message.reasoning  (content is null,
   *                                reasoning_details[] holds the same text)
   *
   * Strategy (in priority order):
   *  1. Use message.content if non-empty, after stripping <think> blocks.
   *  2. Fall back to message.reasoning_content if non-empty.
   *  3. Fall back to message.reasoning if non-empty.
   *  4. Fall back to the concatenated text of message.reasoning_details[].text.
   *  5. Return null — caller will log a warning.
   */
  private static extractContent(message: any): string | null {
    // Helper: return s if it's a non-empty string, otherwise null
    const nonEmpty = (s: any): string | null =>
      typeof s === "string" && s.trim().length > 0 ? s.trim() : null;

    // 1. Standard content field — strip any embedded <think> blocks first
    const rawContent: string | null | undefined = message?.content;
    if (rawContent != null && rawContent.length > 0) {
      const stripped = rawContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (stripped.length > 0) {
        return stripped;
      }
      // content existed but was only <think> — fall through
    }

    // 2. DeepSeek-R1 / some GLM variants
    const result2 = nonEmpty(message?.reasoning_content);
    if (result2 !== null) return result2;

    // 3. GLM-5.2 (via OpenRouter) and similar
    const result3 = nonEmpty(message?.reasoning);
    if (result3 !== null) return result3;

    // 4. reasoning_details array (GLM-5.2 mirrors reasoning here)
    const details: any[] | undefined = message?.reasoning_details;
    if (Array.isArray(details) && details.length > 0) {
      const combined = details
        .map((d: any) => (typeof d?.text === "string" ? d.text : ""))
        .join("\n")
        .trim();
      if (combined.length > 0) return combined;
    }

    return null;
  }

  public getFailureCounter(): IModelFailureCounter {
    return this.counter;
  }
}
