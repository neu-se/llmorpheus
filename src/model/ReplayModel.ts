import fs from "fs";
import path from "path";
import { IModel } from "./IModel";
import { IQueryResult } from "./IQueryResult";
import { MetaInfo } from "../generator/MetaInfo";

/**
 * A model that reflects the prompts and completions observed during
 * a previous execution.
 */
export class ReplayModel implements IModel {
  private metaInfo: MetaInfo;
  private promptToCompletionMap = new Map<string, string>();

  public constructor(private dirName: string) {
    const summaryFileName = path.join(this.dirName, "summary.json");
    const summaryInfo = JSON.parse(fs.readFileSync(summaryFileName, "utf8"));
    this.metaInfo = summaryInfo.metaInfo;
    console.log(`*** replaying execution from directory ${this.dirName}`);
    console.log(`*** metaInfo: ${JSON.stringify(summaryInfo.metaInfo)}`);
    this.initializeMap();
  }

  /**
   * Initialize a map from prompts to completions by inspecting the contents
   * of the "prompts" subdirectory
   */
  private initializeMap() {
    let nrPrompts = 0;
    let nrCompletions = 0;
    const promptDir = path.join(this.dirName, "prompts");
    const files = fs.readdirSync(promptDir);
    for (const file of files) {
      const match = /prompt(\d+)\.txt/.exec(file);
      if (match) {
        // if prompt file was found
        nrPrompts++;
        for (const file2 of files) {
          const match2 = /prompt(\d+)_completion_(\d+)\.txt/.exec(file2);
          if (match2) {
            // if completion file was found for the prompt
            if (match2[1] === match[1]) {
              const prompt = fs.readFileSync(
                path.join(this.dirName, "prompts", file),
                "utf8"
              );
              const completion = fs.readFileSync(
                path.join(this.dirName, "prompts", file2),
                "utf8"
              );
              this.promptToCompletionMap.set(prompt, completion);
              nrCompletions++;
            }
          }
        }
      }
    }
    console.log(
      `*** retrieved ${nrPrompts} prompts and ${nrCompletions} completions`
    );
  }

  public query(
    prompt: string,
    requestPostOptions?:
      | Partial<{ max_tokens: number; temperature: number; top_p: number }>
      | undefined
  ): Promise<IQueryResult> {
    const completion = this.promptToCompletionMap.get(prompt);
    const result: IQueryResult = {
      completions: new Set([completion!]),
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };
    return Promise.resolve(result);
  }

  public getMetaInfo(): MetaInfo {
    return this.metaInfo;
  }

  public getModelName(): string {
    return this.metaInfo.modelName;
  }
  public getTemperature(): number {
    return this.metaInfo.temperature;
  }
  public getMaxTokens(): number {
    return this.metaInfo.maxTokens;
  }
}
