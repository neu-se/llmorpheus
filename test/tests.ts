import fs from "fs";
import path from "path";

import { MockModel } from "../src/model/MockModel";
import { ReplayModel } from "../src/model/ReplayModel";
import { PromptSpecGenerator } from "../src/generator/PromptSpecGenerator";
import { MutantGenerator } from "../src/generator/MutantGenerator";
import { expect } from "chai";
import { MetaInfo } from "../src/generator/MetaInfo";
import { Prompt } from "../src/prompt/Prompt";
import { Completion } from "../src/prompt/Completion";

const mockModelDir = "test/input/mockModel";
const sorterTestFilePath = "test/input/testProject/sorters/src/";
const sorterProjectPath = "test/input/testProject/sorters";
const promptTemplateFileName = "./templates/template-full.hb";
const sorterSourceFileName = "TreeSorter.ts";
const modelName = "codellama-34b-instruct";
const subDirName = "template-full_codellama-34b-instruct_0.0";

describe("test mutant generation", () => {
  beforeEach(() => {
    Prompt.resetIdCounter();
    Completion.resetIdCounter();
  });

  it("should generate the expected PromptSpecs for a given source file and prompt template", async () => {
    const files = [sorterSourceFileName];
    const outputDir = fs.mkdtempSync(path.join(".", "test-"));
    fs.mkdirSync(path.join(outputDir, subDirName));
    const promptSpecGenerator = new PromptSpecGenerator(
      files,
      promptTemplateFileName,
      sorterTestFilePath,
      outputDir,
      subDirName
    );
    const actualPromptSpecs = await promptSpecGenerator.getPromptSpecs();
    expect(actualPromptSpecs.length).to.equal(40);
    promptSpecGenerator.writePromptFiles();
    const actualPromptSpecsFilePath = path.join(
      outputDir,
      subDirName,
      "promptSpecs.json"
    );
    const actualPromptSpecsAsJson = fs.readFileSync(
      actualPromptSpecsFilePath,
      "utf8"
    );
    const expectedPromptSpecsAsJson = fs.readFileSync(
      "./test/expected/promptSpecs/promptSpecs.json",
      "utf8"
    );
    expect(actualPromptSpecsAsJson).to.equal(expectedPromptSpecsAsJson);
    fs.rmdirSync(outputDir, { recursive: true });
  });

  it("should generate the expected prompts for a given source file and prompt template", async () => {
    const files = [sorterSourceFileName];
    const outputDir = fs.mkdtempSync(path.join(".", "test-"));
    fs.mkdirSync(path.join(outputDir, subDirName));
    const promptSpecGenerator = new PromptSpecGenerator(
      files,
      promptTemplateFileName,
      sorterTestFilePath,
      outputDir,
      subDirName
    );
    promptSpecGenerator.writePromptFiles();
    // check that actual and expected directories contain the same files
    const actualPromptsDirName = path.join(outputDir, subDirName, "prompts");
    // console.log(`actualPromptsDirName: ${actualPromptsDirName}`);
    const actualPrompts = fs.readdirSync(actualPromptsDirName);
    const expectedPrompts = fs.readdirSync("./test/expected/prompts");
    expect(actualPrompts.length).to.equal(expectedPrompts.length);
    const inActualButNotInExpected = actualPrompts.filter(
      (fileName) => !expectedPrompts.includes(fileName)
    );
    expect(
      inActualButNotInExpected,
      `expected ${inActualButNotInExpected.join(",")} to be empty`
    ).to.be.empty;
    const inExpectedButNotInActual = expectedPrompts.filter(
      (fileName) => !actualPrompts.includes(fileName)
    );
    expect(
      inExpectedButNotInActual,
      `expected ${inExpectedButNotInActual.join(",")} to be empty`
    ).to.be.empty;

    // check that actual prompts match expected prompts
    for (const promptFileName of actualPrompts) {
      const actualPrompt = fs.readFileSync(
        path.join(outputDir, subDirName, "prompts", promptFileName),
        "utf8"
      );
      const expectedPrompt = fs.readFileSync(
        `./test/expected/prompts/${promptFileName}`,
        "utf8"
      );
      const actualLines = actualPrompt.split("\n");
      const expectedLines = expectedPrompt.split("\n");
      expect(actualLines.length).to.equal(expectedLines.length);
      for (let i = 0; i < actualLines.length; i++) {
        expect(actualLines[i]).to.equal(
          expectedLines[i],
          `expected line ${i} in ${promptFileName} to be\n\t${expectedLines[i]}\nbut was\n\t${actualLines[i]}`
        );
      }
    }
    fs.rmdirSync(outputDir, { recursive: true });
  });

  it("should find the source files to be mutated in a given source project", async () => {
    const model = new MockModel(modelName, mockModelDir);
    const outputDir = fs.mkdtempSync(path.join(".", "test-"));
    const metaInfo: MetaInfo = {
      modelName: modelName,
      template: promptTemplateFileName,
      systemPrompt: "",
      maxTokens: 250,
      temperature: 0,
      maxNrPrompts: 100,
      nrAttempts: 1,
      mutate: "src/**/*.ts",
      ignore: "**/*.spec.ts",
      rateLimit: 1000,
      benchmark: false,
    };
    const mutantGenerator = new MutantGenerator(
      model,
      path.join(outputDir, subDirName),
      sorterProjectPath,
      metaInfo
    );
    const actualSourceFiles = await mutantGenerator.findSourceFilesToMutate();
    // strip off the sorterProjectPath prefix from the actual source files
    const actualSourceFilesWithoutTestProjectPath = actualSourceFiles.map(
      (sourceFile) => sourceFile.replace(sorterProjectPath, "")
    );
    const actualSourceFilesJson = JSON.stringify(
      actualSourceFilesWithoutTestProjectPath,
      null,
      2
    );
    const actualSourceFilesPath = path.join(
      outputDir,
      subDirName,
      "sourceFiles.txt"
    );
    console.log(`actualSourceFilesPath: ${actualSourceFilesPath}`);
    fs.writeFileSync(actualSourceFilesPath, actualSourceFilesJson);
    // compare actual source files to expected source files
    const expectedSourceFiles = fs.readFileSync(
      "./test/expected/sourceFiles.txt",
      "utf8"
    );
    expect(actualSourceFilesJson).to.equal(expectedSourceFiles);
    fs.rmdirSync(outputDir, { recursive: true });
  });

  it("mock model should generate the expected completion for a prompt", async () => {
    const prompt1 = fs.readFileSync("test/input/prompts/prompt1.txt", "utf8");
    // console.log(`prompt1:\n${prompt1}\n`);
    const model = new MockModel(modelName, mockModelDir);

    // use the same options that were used to generate the MockModel
    const queryResult = await model.query(prompt1);
    const completions = queryResult.completions;
    expect(completions.size).to.equal(1);
    const expectedCompletion = fs.readFileSync(
      "test/expected/prompt1_completion_0.txt",
      "utf8"
    );
    const actualCompletion = [...completions][0];
    expect(actualCompletion).to.equal(expectedCompletion);
  });

  it("should generate the expected mutants for a project", async () => {
    const model = new MockModel(modelName, mockModelDir);
    const outputDir = fs.mkdtempSync(path.join(".", "test-"));
    const metaInfo: MetaInfo = {
      modelName: modelName,
      template: promptTemplateFileName,
      systemPrompt: "",
      maxTokens: 250,
      temperature: 0,
      maxNrPrompts: 100,
      nrAttempts: 1,
      mutate: "src/**/TreeSorter.ts",
      ignore: "src/**/*.spec.ts",
      rateLimit: 1000,
      benchmark: false,
    };
    const mutantGenerator = new MutantGenerator(
      model,
      outputDir,
      sorterProjectPath,
      metaInfo
    );
    await mutantGenerator.generateMutants();
    const actualMutantsJson = fs.readFileSync(
      path.join(outputDir, subDirName, "mutants.json"),
      "utf8"
    );
    const expectedMutantsJson = fs.readFileSync(
      "./test/expected/mutants.json",
      "utf8"
    );
    expect(actualMutantsJson).to.equal(expectedMutantsJson);
    fs.rmdirSync(outputDir, { recursive: true });
  });

  it("should produce a file summary.json containing a summary of the results", async () => {
    const model = new MockModel(modelName, mockModelDir);
    const outputDir = fs.mkdtempSync(path.join(".", "test-"));
    const metaInfo: MetaInfo = {
      modelName: modelName,
      template: promptTemplateFileName,
      systemPrompt: "",
      maxTokens: 250,
      temperature: 0,
      maxNrPrompts: 100,
      nrAttempts: 1,
      mutate: "src/**/TreeSorter.js",
      ignore: "src/**/*.spec.ts",
      rateLimit: 1000,
      benchmark: false,
    };
    const mutantGenerator = new MutantGenerator(
      model,
      outputDir,
      sorterProjectPath,
      metaInfo
    );
    await mutantGenerator.generateMutants();
    const actualSummaryJson = fs.readFileSync(
      path.join(outputDir, subDirName, "summary.json"),
      "utf8"
    );
    const expectedSummaryJson = fs.readFileSync(
      "./test/expected/summary.json",
      "utf8"
    );

    expect(actualSummaryJson).to.equal(expectedSummaryJson);
    fs.rmdirSync(outputDir, { recursive: true });
  });

  it("should replay a previously observed execution", async () => {
    const dirContainingRecording = "./test/input/recorded/sorters/";
    const model = new ReplayModel(dirContainingRecording);
    const outputDir = fs.mkdtempSync(path.join(".", "test-"));
    const metaInfo: MetaInfo = {
      modelName: "codellama-34b-instruct",
      template: "templates/template-full.hb",
      systemPrompt: "SystemPrompt-MutationTestingExpert.txt",
      maxTokens: 250,
      temperature: 0,
      maxNrPrompts: 1250,
      nrAttempts: 3,
      mutate: "src/**/TreeSorter.ts",
      ignore: "**/*.spec.ts",
      rateLimit: 0,
      benchmark: false,
    };
    const mutantGenerator = new MutantGenerator(
      model,
      outputDir,
      "test/input/testProject/sorters",
      metaInfo
    );
    await mutantGenerator.generateMutants();
    const filePath = path.join(
      outputDir,
      "template-full_codellama-34b-instruct_0.0",
      "summary.json"
    );
    const actualSummaryJson: any = JSON.parse(
      fs.readFileSync(path.join(filePath), "utf8")
    );
    const expectedSummaryJson: any = JSON.parse(
      fs.readFileSync("./test/input/recorded/sorters/summary.json", "utf8")
    );

    // check that the summary file contains the right information. Note that we don't know
    // the number of tokens used during replay, so we can't check that.
    expect(actualSummaryJson.nrPrompts).to.equal(expectedSummaryJson.nrPrompts);
    expect(actualSummaryJson.nrCandidates).to.equal(
      expectedSummaryJson.nrCandidates
    );
    expect(actualSummaryJson.nrSyntacticallyInvalid).to.equal(
      expectedSummaryJson.nrSyntacticallyInvalid
    );
    expect(actualSummaryJson.nrSemanticallyInvalid).to.equal(
      expectedSummaryJson.nrSemanticallyInvalid
    );
    expect(actualSummaryJson.nrIdentical).to.equal(
      expectedSummaryJson.nrIdentical
    );
    expect(actualSummaryJson.nrDuplicate).to.equal(
      expectedSummaryJson.nrDuplicate
    );
    expect(actualSummaryJson.nrLocations).to.equal(
      expectedSummaryJson.nrLocations
    );

    expect(actualSummaryJson.metaInfo.modelName).to.equal(
      expectedSummaryJson.metaInfo.modelName
    );
    expect(actualSummaryJson.metaInfo.temperature).to.equal(
      expectedSummaryJson.metaInfo.temperature
    );
    expect(actualSummaryJson.metaInfo.maxTokens).to.equal(
      expectedSummaryJson.metaInfo.maxTokens
    );
    expect(actualSummaryJson.metaInfo.maxNrPrompts).to.equal(
      expectedSummaryJson.metaInfo.maxNrPrompts
    );
    expect(actualSummaryJson.metaInfo.rateLimit).to.equal(
      expectedSummaryJson.metaInfo.rateLimit
    );
    expect(actualSummaryJson.metaInfo.nrAttempts).to.equal(
      expectedSummaryJson.metaInfo.nrAttempts
    );
    expect(actualSummaryJson.metaInfo.template).to.equal(
      expectedSummaryJson.metaInfo.template
    );
    expect(actualSummaryJson.metaInfo.systemPrompt).to.equal(
      expectedSummaryJson.metaInfo.systemPrompt
    );
    expect(actualSummaryJson.metaInfo.mutate).to.equal(
      expectedSummaryJson.metaInfo.mutate
    );
    expect(actualSummaryJson.metaInfo.ignore).to.equal(
      expectedSummaryJson.metaInfo.ignore
    );
    expect(actualSummaryJson.metaInfo.benchmark).to.equal(
      expectedSummaryJson.metaInfo.benchmark
    );

    // now check that the actual prompt and completion files are the same as the expected ones
    const actualFiles = fs.readdirSync(
      path.join(
        outputDir,
        "template-full_codellama-34b-instruct_0.0",
        "prompts"
      )
    );
    const expectedFiles = fs.readdirSync(
      path.join(dirContainingRecording, "prompts")
    );
    expect(actualFiles.length).to.equal(expectedFiles.length);

    // check that the same prompt and completion files are in both directories
    const inActualButNotInExpected = actualFiles.filter(
      (fileName) => !expectedFiles.includes(fileName)
    );
    expect(
      inActualButNotInExpected,
      `expected ${inActualButNotInExpected.join(",")} to be empty`
    ).to.be.empty;
    const inExpectedButNotInActual = expectedFiles.filter(
      (fileName) => !actualFiles.includes(fileName)
    );
    expect(
      inExpectedButNotInActual,
      `expected ${inExpectedButNotInActual.join(",")} to be empty`
    ).to.be.empty;

    // check that the file contents match
    for (const actualFileName of actualFiles) {
      const actualFileContents = fs.readFileSync(
        path.join(
          outputDir,
          "template-full_codellama-34b-instruct_0.0",
          "prompts",
          actualFileName
        ),
        "utf8"
      );
      const expectedFileContents = fs.readFileSync(
        path.join(dirContainingRecording, "prompts", actualFileName),
        "utf8"
      );
      expect(actualFileContents).to.equal(expectedFileContents);
    }

    fs.rmdirSync(outputDir, { recursive: true });
  });
});
