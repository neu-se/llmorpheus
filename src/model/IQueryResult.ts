/**
 * Represents the result of a query to an LLM.
 */
export interface IQueryResult {
  completions: Set<string>;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
