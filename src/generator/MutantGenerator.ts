import * as parser from "@babel/parser";
import fg from "fast-glob";
import fs from "fs";
import path from "path";

import { Mutant } from "./Mutant";
import { PromptSpecGenerator } from "./PromptSpecGenerator";
import { IModel } from "../model/IModel";
import { Completion } from "../prompt/Completion";
import { Prompt } from "../prompt/Prompt";
import { hasUnbalancedParens, isDeclaration } from "../util/code-utils";
import { MetaInfo } from "./MetaInfo";

/**
 * This class generates mutants by querying an LLM for completions for each prompt.
 */
export class MutantGenerator {
  private promptCnt = 0;
  private mutationStats = {
    nrSyntacticallyValid: 0,
    nrSyntacticallyInvalid: 0,
    nrIdentical: 0,
    nrDuplicate: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
  };
  constructor(
    private model: IModel,
    private outputDir: string,
    private packagePath: string,
    private metaInfo: MetaInfo
  ) {
    this.createOutputFilesDirectory();
  }

  /**
   * Delete old output old output files from previous runs, if they exist
   * and create the output directory and subdirectories for the current run.
   */
  private createOutputFilesDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir);
    }
    if (!fs.existsSync(path.join(this.outputDir, this.getSubDirName()))) {
      fs.mkdirSync(path.join(this.outputDir, this.getSubDirName()));
    }
    if (
      fs.existsSync(
        path.join(this.outputDir, this.getSubDirName(), "/mutants.json")
      )
    ) {
      fs.unlinkSync(
        path.join(this.outputDir, this.getSubDirName(), "/mutants.json")
      );
    }
    if (
      fs.existsSync(path.join(this.outputDir, this.getSubDirName(), "/log.txt"))
    ) {
      fs.unlinkSync(
        path.join(this.outputDir, this.getSubDirName(), "/log.txt")
      );
    }
    if (
      fs.existsSync(path.join(this.outputDir, this.getSubDirName(), "/prompts"))
    ) {
      fs.rmdirSync(
        path.join(this.outputDir, this.getSubDirName(), "/prompts"),
        { recursive: true }
      );
    }
    fs.writeFileSync(
      path.join(this.outputDir, this.getSubDirName(), "/log.txt"),
      ""
    );
    fs.mkdirSync(path.join(this.outputDir, this.getSubDirName(), "prompts"));
  }

  public getSubDirName(): string {
    const shortFileName = this.metaInfo.template.substring(
      this.metaInfo.template.lastIndexOf("/") + 1
    );
    const shortTemplateFileName = shortFileName.substring(
      0,
      shortFileName.lastIndexOf(".")
    );
    const tempAsString =
      this.metaInfo.temperature === 0
        ? "0.0"
        : this.metaInfo.temperature === 1
        ? "1.0"
        : this.metaInfo.temperature.toString();
    const subDirName =
      shortTemplateFileName +
      "_" +
      this.model.getModelName() +
      "_" +
      tempAsString;
    return subDirName;
  }

  public getProjectPath(): string {
    return this.packagePath;
  }

  private log(msg: string): void {
    fs.appendFileSync(
      path.join(this.outputDir, this.getSubDirName(), "/log.txt"),
      msg
    );
  }

  private printAndLog(msg: string): void {
    console.log(msg);
    this.log(msg);
  }

  /**
   * Find the files to mutate
   * @param path to the path to the project to mutate
   */
  public async findSourceFilesToMutate(): Promise<string[]> {
    const files: string[] = await this.expandGlob(
      this.packagePath,
      this.metaInfo.mutate,
      this.metaInfo.ignore
    );
    console.log(`found ${files.length} files to mutate`);
    return files;
  }

  private async expandGlob(
    dirName: string,
    glob: string,
    ignore: string | undefined
  ): Promise<string[]> {
    dirName = dirName.trim();
    if (dirName.endsWith("/")) {
      dirName = dirName.substring(0, dirName.length - 1);
    }
    glob = path.join(dirName, glob.trim());
    const ignorePatterns = ignore ? [(ignore as string).trim()] : [];

    let files: string[] = await fg([glob], { ignore: ignorePatterns });
    return files.map((file) => file.substring(dirName.length + 1));
  }

  /**
   * Determine various situations where a candidate mutant is likely to be invalid.
   */
  private isInvalidSubstitution(prompt: Prompt, substitution: string): boolean {
    return (
      hasUnbalancedParens(substitution) ||
      this.isObjectLiteralContainingOctalLiteral(substitution) ||
      this.isInvalidRegExpLiteral(substitution) ||
      this.isReplaceNonRegExpWithRegExp(prompt.getOrig(), substitution) ||
      this.isAssignToArguments(substitution) ||
      substitution.includes("yield") ||
      substitution.includes("delete") ||
      substitution.includes("process") ||
      substitution.includes("require") ||
      substitution.includes("setImmediate") ||
      substitution.includes("setTimeout") ||
      substitution.includes("static") ||
      substitution.includes("public") ||
      substitution.includes("private") ||
      substitution.includes("protected") ||
      substitution.includes("default") ||
      substitution.includes("async") ||
      substitution.includes("await") ||
      substitution.includes("let") ||
      substitution.includes("//") ||
      prompt.getOrig().includes("...") ||
      prompt.getOrig().includes("process") ||
      (substitution.includes(";") && prompt.spec.component === "allArgs") ||
      (!isDeclaration(substitution) &&
        prompt.spec.feature === "for-of" &&
        (prompt.spec.component === "left" ||
          prompt.spec.component === "header")) ||
      (prompt.spec.feature === "call" &&
        prompt.spec.component === "callee" &&
        substitution.includes("("))
    );
  }

  private isObjectLiteralContainingOctalLiteral(substitution: string): boolean {
    // use regexp to check it it is an object literal containing a number like 0666
    return substitution.match(/({[^}]*:0\d+[^}]*})/g) !== null;
  }

  private isRegExpLiteral(str: string): boolean {
    return str.startsWith("/") && str.endsWith("/");
  }

  private isReplaceNonRegExpWithRegExp(
    original: string,
    substitution: string
  ): boolean {
    return (
      !this.isRegExpLiteral(original) && this.isRegExpLiteral(substitution)
    );
  }

  private isInvalidRegExpLiteral(str: string): boolean {
    try {
      new RegExp(str);
      return false;
    } catch (e) {
      return true;
    }
  }

  private isAssignToArguments(str: string): boolean {
    return str.startsWith("arguments =");
  }

  private createCandidateMutant(prompt: Prompt, substitution: string): string {
    return prompt.spec
      .getCodeWithPlaceholder()
      .replace("<PLACEHOLDER>", substitution);
  }

  /**
   * Check if a mutant is a duplicate of another mutant. Note that we also need to check
   * the case where the mutants's original code is contained in another mutants's original code,
   * and where the replacements are similarly contained in each other.
   */
  private isDuplicate(mutant: Mutant, mutants: Mutant[]): boolean {
    for (const m of mutants) {
      if (
        m.startLine === mutant.startLine &&
        m.startColumn === mutant.startColumn &&
        m.endLine === mutant.endLine &&
        m.endColumn === mutant.endColumn &&
        m.file === mutant.file &&
        m.replacement === mutant.replacement
      ) {
        return true;
      }

      // check containment case
      if (
        m.startLine <= mutant.startLine &&
        m.endLine >= mutant.endLine &&
        m.startColumn <= mutant.startColumn &&
        m.endColumn >= mutant.endColumn &&
        m.file === mutant.file &&
        m.replacement.includes(mutant.replacement)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate mutants.
   */
  public async generateMutants(): Promise<void> {
    this.printAndLog(
      `Starting generation of mutants on: ${new Date().toUTCString()}\n\n`
    );
    const files = await this.findSourceFilesToMutate();

    const filesWithoutProjectPath = files.map((file) =>
      file.replace(this.packagePath, "")
    );
    this.printAndLog(
      `generating mutants for the following files: ${filesWithoutProjectPath.join(
        ","
      )}\n`
    );

    const generator = new PromptSpecGenerator(
      files,
      this.metaInfo.template,
      this.packagePath,
      this.outputDir,
      this.getSubDirName()
    );
    generator.writePromptFiles();

    const mutants = new Array<Mutant>();
    for (const prompt of generator.getPrompts()) {
      this.printAndLog(
        `processing prompt ${prompt.getId()}/${generator.getPrompts().length}\n`
      );
      await this.generateMutantsFromPrompt(prompt, mutants);
      if (++this.promptCnt >= this.metaInfo.maxNrPrompts) {
        break;
      }
    }
    this.reportAndWriteResults(mutants);
  }

  /**
   * Generate mutants from a specific prompt.
   */
  private async generateMutantsFromPrompt(prompt: Prompt, mutants: Mutant[]) {
    try {
      const completions = await this.getCompletionsForPrompt(prompt);
      for (const completion of completions) {
        fs.writeFileSync(
          `${path.join(
            this.outputDir,
            this.getSubDirName()
          )}/prompts/prompt${prompt.getId()}_completion_${completion.getId()}.txt`,
          completion.text
        );
        // const regExp = /```\n((?:.(?!```))*)\n```/gs;
        const regExp = /```[^\n\r]*\n((?:.(?!```))*)\n```/gs;
        let match;

        while ((match = regExp.exec(completion.text)) !== null) {
          const substitution = match[1];
          if (substitution === prompt.getOrig()) {
            this.mutationStats.nrIdentical++;
          } else if (
            prompt.getOrig().includes("Object.") ||
            this.isInvalidSubstitution(prompt, substitution) ||
            (isDeclaration(prompt.getOrig()) && !isDeclaration(substitution))
          ) {
            this.mutationStats.nrSyntacticallyInvalid++;
          } else {
            const candidateMutant = this.createCandidateMutant(
              prompt,
              substitution
            );
            if (prompt.spec.isExpressionPlaceholder()) {
              this.handleExpression(substitution, prompt, completion, mutants);
            } else if (
              prompt.spec.isArgListPlaceHolder() ||
              prompt.spec.isForInitializerPlaceHolder() ||
              prompt.spec.isForLoopHeaderPlaceHolder() ||
              prompt.spec.isForInInitializerPlaceHolder() ||
              prompt.spec.isForInLoopHeaderPlaceHolder() ||
              prompt.spec.isForInRightPlaceHolder() ||
              prompt.spec.isForOfInitializerPlaceHolder() ||
              prompt.spec.isForOfLoopHeaderPlaceHolder() ||
              prompt.spec.isCalleePlaceHolder()
            ) {
              // if the placeholder corresponds to something that is not an entire AST node, expand the original code and the substitution to the parent node
              this.handleIncompleteFragment(
                prompt,
                substitution,
                completion,
                mutants
              );
            } else {
              // statement placeholder
              this.handleStatement(
                candidateMutant,
                prompt,
                substitution,
                completion,
                mutants
              );
            }
          }
        }
      }
    } catch (e) {
      console.log(`Error while processing prompt ${prompt.getId()}: ${e}`);
    }
  }

  /**
   * Report results and write results of the mutation generation to files in the output directory.
   */
  private reportAndWriteResults(mutants: Mutant[]) {
    const nrCandidates =
      this.mutationStats.nrSyntacticallyValid +
      this.mutationStats.nrSyntacticallyInvalid +
      this.mutationStats.nrIdentical;
    this.printAndLog(`found ${nrCandidates} mutant candidates\n`);

    const locations = new Array<string>();
    for (const mutant of mutants) {
      const fileName = mutant.file.substring(this.packagePath.length);
      mutant.file = fileName;
      const location = `${fileName}:<${mutant.startLine},${mutant.startColumn}>-${mutant.endLine},${mutant.endColumn}`;
      if (!locations.includes(location)) {
        locations.push(location);
      }
    }
    const nrLocations = locations.length;

    this.printAndLog(
      `discarding ${this.mutationStats.nrSyntacticallyInvalid} syntactically invalid mutants\n`
    );
    this.printAndLog(
      `discarding ${this.mutationStats.nrIdentical} mutant candidates that are identical to the original code\n`
    );
    this.printAndLog(
      `discarding ${this.mutationStats.nrDuplicate} duplicate mutants\n`
    );

    const mutantsFileName = path.join(
      this.outputDir,
      this.getSubDirName(),
      "mutants.json"
    );
    fs.writeFileSync(mutantsFileName, JSON.stringify(mutants, null, 2));

    // write summary of results to "summary.json"
    const resultsFileName = path.join(
      this.outputDir,
      this.getSubDirName(),
      "summary.json"
    );
    const nrPrompts = this.promptCnt;
    const nrSyntacticallyValid = this.mutationStats.nrSyntacticallyValid;
    const nrSyntacticallyInvalid = this.mutationStats.nrSyntacticallyInvalid;
    const nrIdentical = this.mutationStats.nrIdentical;
    const nrDuplicate = this.mutationStats.nrDuplicate;
    fs.writeFileSync(
      resultsFileName,
      JSON.stringify(
        {
          nrPrompts,
          nrCandidates,
          nrSyntacticallyValid,
          nrSyntacticallyInvalid,
          nrIdentical,
          nrDuplicate,
          nrLocations,
          totalPromptTokens: this.mutationStats.totalPromptTokens,
          totalCompletionTokens: this.mutationStats.totalCompletionTokens,
          totalTokens: this.mutationStats.totalTokens,
          metaInfo: this.metaInfo,
        },
        null,
        2
      )
    );
    console.log(`summary written to  ${resultsFileName}\n`);

    this.printAndLog(
      `wrote ${nrSyntacticallyValid} mutants in ${nrLocations} locations to ${mutantsFileName}\n`
    );
  }

  /**
   * Handle the case where the mutated code fragment is an expression.
   */
  private handleExpression(
    substitution: string,
    prompt: Prompt,
    completion: Completion,
    mutants: Mutant[]
  ) {
    try {
      parser.parseExpression(substitution);
      const mutant = new Mutant(
        prompt.spec.file,
        prompt.spec.location.startLine,
        prompt.spec.location.startColumn,
        prompt.spec.location.endLine,
        prompt.spec.location.endColumn,
        prompt.getOrig(),
        substitution,
        prompt.getId(),
        completion.getId(),
        prompt.spec.feature + "/" + prompt.spec.component
      );

      if (!this.isDuplicate(mutant, mutants)) {
        mutants.push(mutant);
        this.mutationStats.nrSyntacticallyValid++;
      } else {
        this.mutationStats.nrDuplicate++;
      }
    } catch (e) {
      // console.log(`*** invalid mutant: ${substitution} replacing ${prompt.getOrig()}\n`);
      this.mutationStats.nrSyntacticallyInvalid++;
    }
  }

  /**
   * Handle the case where the mutated code fragment is incomplete and does not correspond
   * to a complete statement or expression. In such cases, we need to expand the original
   * code fragment and the substitution to the parent node, to ensure syntactic completeness
   * of the code fragment. This is the case for replacing a list of call arguments or the
   * header or left side (var declaration) of a for-of loop.
   */
  private handleIncompleteFragment(
    prompt: Prompt,
    substitution: string,
    completion: Completion,
    mutants: Mutant[]
  ) {
    try {
      const expandedOrig = prompt.spec.parentLocation!.getText();
      const expandedSubstitution = expandedOrig.replace(
        prompt.getOrig(),
        substitution
      );
      parser.parse(expandedSubstitution, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });

      const mutant = new Mutant(
        prompt.spec.file,
        prompt.spec.parentLocation!.startLine,
        prompt.spec.parentLocation!.startColumn,
        prompt.spec.parentLocation!.endLine,
        prompt.spec.parentLocation!.endColumn,
        expandedOrig,
        expandedSubstitution,
        prompt.getId(),
        completion.getId(),
        prompt.spec.feature + "/" + prompt.spec.component
      );
      if (!this.isDuplicate(mutant, mutants)) {
        mutants.push(mutant);
        this.mutationStats.nrSyntacticallyValid++;
      } else {
        this.mutationStats.nrDuplicate++;
      }
    } catch (e) {
      this.mutationStats.nrSyntacticallyInvalid++;
    }
  }

  /**
   * Handle the case where the mutated code fragment is a statement.
   */
  private handleStatement(
    candidateMutant: string,
    prompt: Prompt,
    substitution: string,
    completion: Completion,
    mutants: Mutant[]
  ) {
    try {
      parser.parse(candidateMutant, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });

      const mutant = new Mutant(
        prompt.spec.file,
        prompt.spec.location.startLine,
        prompt.spec.location.startColumn,
        prompt.spec.location.endLine,
        prompt.spec.location.endColumn,
        prompt.getOrig(),
        substitution,
        prompt.getId(),
        completion.getId(),
        prompt.spec.feature + "/" + prompt.spec.component
      );
      if (!this.isDuplicate(mutant, mutants)) {
        mutants.push(mutant);
        this.mutationStats.nrSyntacticallyValid++;
      } else {
        this.mutationStats.nrDuplicate++;
      }
    } catch (e) {
      // console.log(`*** invalid mutant: ${substitution} replacing ${prompt.getOrig()}\n`);
      this.mutationStats.nrSyntacticallyInvalid++;
    }
  }

  public async getCompletionsForPrompt(prompt: Prompt): Promise<Completion[]> {
    const query = this.model.query(prompt.getText());
    const queryResult = await query;
    const completions = [...queryResult.completions];
    this.mutationStats.totalPromptTokens += queryResult.prompt_tokens;
    this.mutationStats.totalCompletionTokens += queryResult.completion_tokens;
    this.mutationStats.totalTokens += queryResult.total_tokens;
    return completions.map(
      (completionText) => new Completion(completionText, prompt.getId())
    );
  }
}
