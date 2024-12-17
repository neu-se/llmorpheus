import * as fs from "fs";
import traverse, { NodePath } from "@babel/traverse";
import * as parser from "@babel/parser";
import { SourceLocation } from "../util/SourceLocation";
import { getText } from "../util/code-utils";

/**
 * A PromptSpec specifies all information associated with code fragments that are included in prompts.
 *   file: the file name
 *   feature: the type of the language construct (if/switch/while/do-while/for/for-in/for-of/call)
 *   component: the part of the language construct that is to be changed (e.g., test/discriminant/update/left/right)
 *   location: the location of the component in the source code
 *   orig: the original contents of the placeholder
 *   references: the set of identifiers referenced in the expression that is to be changed
 */
export class PromptSpec {
  public readonly references: Set<string> = new Set<string>();

  constructor(
    public file: string,
    public readonly feature: string,
    public readonly component: string,
    public readonly location: SourceLocation,
    public readonly orig: string,
    public readonly parentLocation?: SourceLocation
  ) {
    this.findReferences();
  }

  /**
   * Returns the code with a placeholder inserted at the appropriate location.
   */
  public getCodeWithPlaceholder() {
    const code = fs.readFileSync(this.file, "utf8");
    const lines = code.split("\n");
    const lastLine = lines.length;
    const endColumnOfLastLine = lines[lastLine - 1].length;
    const codeWithPlaceHolder =
      getText(code, 1, 0, this.location.startLine, this.location.startColumn) +
      "<PLACEHOLDER>" +
      getText(
        code,
        this.location.endLine,
        this.location.endColumn,
        lastLine,
        endColumnOfLastLine
      );
    return codeWithPlaceHolder;
  }

  /**
   * Finds the set of identifiers that are referenced in the expression that is to be changed.
   */
  private findReferences() {
    const code = fs.readFileSync(this.file, "utf8");
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["typescript"],
    });
    const outerThis = this;
    traverse(ast, {
      enter(path) {
        if (path.isIdentifier()) {
          const loc = new SourceLocation(
            outerThis.file,
            path.node.loc!.start.line,
            path.node.loc!.start.column,
            path.node.loc!.end.line,
            path.node.loc!.end.column
          );
          if (loc.containedIn(outerThis.location)) {
            outerThis.references.add(path.node.name);
          }
        }
      },
    });
  }

  public addOriginalCodeAsCommentAtEndOfLineContainingPlaceholder(
    codeWithPlaceHolder: string
  ): string {
    const lines = codeWithPlaceHolder.split("\n");
    const lineNr = this.location.startLine - 1;
    const line = lines[lineNr];
    const newLine = line + " // original code was: " + this.orig;
    lines[lineNr] = newLine;
    return lines.join("\n");
  }

  public isExpressionPlaceholder(): boolean {
    return (
      (this.feature === "if" && this.component === "test") ||
      (this.feature === "switch" && this.component === "discriminant") ||
      (this.feature === "while" && this.component === "test") ||
      (this.feature === "do-while" && this.component === "test") ||
      (this.feature === "for" && this.component === "test") ||
      (this.feature === "for-in" && this.component === "right") ||
      (this.feature === "for-of" && this.component === "right") ||
      (this.feature === "call" && this.component.startsWith("arg")) ||
      (this.feature === "call" && this.component === "callee")
    );
  }

  public isArgListPlaceHolder(): boolean {
    return this.feature === "call" && this.component === "allArgs";
  }

  public isForInitializerPlaceHolder(): boolean {
    return this.feature === "for" && this.component === "init";
  }

  public isForLoopHeaderPlaceHolder(): boolean {
    return this.feature === "for" && this.component === "header";
  }

  public isForInInitializerPlaceHolder(): boolean {
    return this.feature === "for-in" && this.component === "left";
  }

  public isForInLoopHeaderPlaceHolder(): boolean {
    return this.feature === "for-in" && this.component === "header";
  }

  public isForInRightPlaceHolder(): boolean {
    return this.feature === "for-in" && this.component === "right";
  }

  public isForOfInitializerPlaceHolder(): boolean {
    return this.feature === "for-of" && this.component === "left";
  }

  public isForOfLoopHeaderPlaceHolder(): boolean {
    return this.feature === "for-of" && this.component === "header";
  }

  public isCalleePlaceHolder(): boolean {
    return this.feature === "call" && this.component === "callee";
  }
}
