/**
 * Meta information about the process used to generate the mutants
 */

export interface MetaInfo {
  modelName: string;
  template: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  maxNrPrompts: number;
  nrAttempts: number;
  rateLimit: number;
  mutate: string;
  ignore: string;
  benchmark: boolean;
}
