import { MetaInfo } from "../generator/MetaInfo";
import { PromptSpec } from "./PromptSpec";

/**
 * Represents a prompt that is passed to an LLM.
 */
export class Prompt {
  private static idCounter = 1;
  private id: number;
  constructor(private readonly text: string, public readonly spec: PromptSpec) {
    this.id = Prompt.idCounter++;
  }
  public getText(): string {
    return this.text;
  }
  public getId(): number {
    return this.id;
  }
  public getOrig(): string {
    return this.spec.orig;
  }
  public static resetIdCounter(): void {
    Prompt.idCounter = 1;
  }

  /**
   * Check if a prompt should be skipped based on the mutateOnly and mutateOnlyLines options.
   */
  public shouldBeSkipped(metaInfo: MetaInfo): boolean {
    if (!metaInfo.mutateOnly) {
      if (!metaInfo.mutateOnlyLines) {
        return false;
      } else {
        const origStartLine = this.spec.location.startLine;
        const origEndLine = this.spec.location.endLine;
        const isInRange = metaInfo.mutateOnlyLines.some(
          (line) => line >= origStartLine && line <= origEndLine
        );
        return !isInRange;
      }
    }
    if (this.getOrig().includes(metaInfo.mutateOnly)) {
      if (!metaInfo.mutateOnlyLines) {
        return false;
      } else {
        const origStartLine = this.spec.location.startLine;
        const origEndLine = this.spec.location.endLine;
        const isInRange = metaInfo.mutateOnlyLines.some(
          (line) => line >= origStartLine && line <= origEndLine
        );
        return !isInRange;
      }
    } else {
      return true;
    }
  }
}
