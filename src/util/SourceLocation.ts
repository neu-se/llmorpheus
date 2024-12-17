import * as fs from "fs";
import { toIndex } from "./code-utils";

/**
 * This class captures all information associated with a source location:
 * file, start line, start column, end line, and end column.
 */
export class SourceLocation {
  constructor(
    public readonly file: string,
    public readonly startLine: number,
    public readonly startColumn: number,
    public readonly endLine: number,
    public readonly endColumn: number
  ) {}
  public getText() {
    const code = fs.readFileSync(this.file, "utf8");
    const startIndex = toIndex(code, this.startLine, this.startColumn);
    const endIndex = toIndex(code, this.endLine, this.endColumn);
    return code.substring(startIndex, endIndex);
  }

  public containedIn(other: SourceLocation): boolean {
    if (this.file !== other.file) {
      return false;
    } else if (this.startLine < other.startLine) {
      return false;
    } else if (
      this.startLine === other.startLine &&
      this.startColumn < other.startColumn
    ) {
      return false;
    } else if (this.endLine > other.endLine) {
      return false;
    } else if (
      this.endLine === other.endLine &&
      this.endColumn > other.endColumn
    ) {
      return false;
    } else {
      return true;
    }
  }

  public toString(): string {
    return `${this.file}:<${this.startLine},${this.startColumn}>-<${this.endLine},${this.endColumn}>`;
  }
}
