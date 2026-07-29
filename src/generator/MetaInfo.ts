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
  timeout: number;
  mutate: string;
  ignore: string;
  mutateOnly: string | undefined;
  mutateOnlyLines: number[] | undefined;
  maxLinesInPlaceHolder: number;
}
