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
  getFailureCounter(): IModelFailureCounter;
}

export const defaultPostOptions = {
  max_tokens: 250,
  temperature: 0,
  top_p: 1, // no need to change this
};

export interface PostOptionsType {
  max_tokens: number;
  temperature: number;
  top_p: number;
  provider: {
    order: string[];
  };
}

export type PostOptions = Partial<PostOptionsType>;

export interface IModelFailureCounter {
  nrRetries: number;
  nrFailures: number;
}
