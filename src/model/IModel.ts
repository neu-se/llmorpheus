import { IQueryResult } from "./IQueryResult";

/**
 * A model that can be queried to generate a set of completions for a given prompt.
 */
export interface IModel {
  query(
    prompt: string,
    requestPostOptions?: PostOptions
  ): Promise<IQueryResult>;
  getModelName(): string;
  getTemperature(): number;
  getMaxTokens(): number;
}

export const defaultPostOptions = {
  max_tokens: 250,
  temperature: 0,
  top_p: 1, // no need to change this
};

export const defaultOpenAIPostoptions = {
  ...defaultPostOptions,
  n: 5,
  stop: ["\n\n"], // list of tokens to stop at
};

export type PostOptions = Partial<typeof defaultPostOptions>;
export type OpenAIPostOptions = Partial<typeof defaultOpenAIPostoptions>;
