import * as fs from "fs";
import * as path from "path";

/**
 * Find the start column of a code fragmenton a given line in a file.
 */

export function getStartColumn(
  projectPath: string,
  fileName: string,
  lineNr: number,
  originalCode: string
): number {
  const lines = fs
    .readFileSync(path.join(projectPath, fileName))
    .toString()
    .split("\n");
  const line = lines[lineNr - 1];
  return line.indexOf(originalCode);
}
/**
 * Find the end column of a code fragment on a given line in a file.
 */

export function getEndColumn(
  projectPath: string,
  fileName: string,
  lineNr: number,
  originalCode: string
): number {
  const lines = fs
    .readFileSync(path.join(projectPath, fileName))
    .toString()
    .split("\n");
  const line = lines[lineNr - 1];
  return line.indexOf(originalCode) + originalCode.length;
}

export function isObjectLiteral(code: string): boolean {
  return code.startsWith("{") && code.endsWith("}");
}

export function hasUnbalancedParens(code: string): boolean {
  let nrOpen = 0;
  let nrClose = 0;
  for (const c of code) {
    if (c === "(") {
      nrOpen++;
    } else if (c === ")") {
      nrClose++;
    }
  }
  return nrOpen !== nrClose;
}

export function insertCommentOnLineWithPlaceholder(
  code: string,
  comment: string
) {
  const lines = code.split("\n");
  const lineWithPlaceholder = lines.findIndex((line) =>
    line.includes("<PLACEHOLDER>")
  );
  if (lineWithPlaceholder === -1) {
    throw new Error("No line with placeholder found");
  } else {
    const line = lines[lineWithPlaceholder];
    const lineWithComment = line + " // " + comment;
    lines[lineWithPlaceholder] = lineWithComment;
    return lines.join("\n");
  }
}
/**
 * Convert [line,col] to index.
 * @param code the code
 * @param line the line
 * @param column the column
 * @returns the index
 */

export function toIndex(code: string, line: number, column: number) {
  let index = 0;
  let lineCount = 1;
  let columnCount = 0;
  for (let i = 0; i <= code.length; i++) {
    if (lineCount === line && columnCount === column) {
      index = i;
      break;
    }
    if (code[i] === "\n") {
      lineCount++;
      columnCount = 0;
    } else {
      columnCount++;
    }
  }
  return index;
}
/**
 * Retrieve the code fragment from [startLine, startColumn] to [endLine, endColumn].
 * @param code the code
 * @param startLine the start line
 * @param startColumn the start column
 * @param endLine the end line
 * @param endColumn the end column
 * @returns the code fragment
 */

export function getText(
  code: string,
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number
) {
  const startIndex = toIndex(code, startLine, startColumn);
  const endIndex = toIndex(code, endLine, endColumn);
  return code.substring(startIndex, endIndex);
}

export function charAtPosition(code: string, line: number, column: number) {
  const lines = code.split("\n");
  return lines[line - 1].charAt(column - 1);
}

export function nextPosition(code: string, line: number, column: number) {
  const lines = code.split("\n");
  if (column < lines[line - 1].length) {
    return { line, column: column + 1 };
  } else {
    return { line: line + 1, column: 1 };
  }
}

export function prevPosition(code: string, line: number, column: number) {
  if (column > 1) {
    return { line, column: column - 1 };
  } else {
    // find the last position on the previous line
    return { line: line - 1, column: code.split("\n")[line - 2].length };
  }
}

export function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Please set the ${name} environment variable.`);
    process.exit(1);
  }
  return value;
}

export function isDeclaration(compl: string): boolean {
  return (
    compl.startsWith("const") ||
    compl.startsWith("let") ||
    compl.startsWith("var")
  );
}
