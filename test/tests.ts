import fs from "fs";
import path from "path";

import { FixtureModel } from "../src/model/FixtureModel";
// import { Model } from "../src/model/Model"; // uncomment when adding a new live-LLM test
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
      timeout: 10_000,
      mutateOnly: undefined,
      mutateOnlyLines: undefined,
      maxLinesInPlaceHolder: 1,
    };
    const files = [sorterSourceFileName];
    const outputDir = fs.mkdtempSync(path.join(".", "test-"));
    fs.mkdirSync(path.join(outputDir, subDirName));
    const promptSpecGenerator = new PromptSpecGenerator(
      files,
      sorterTestFilePath,
      outputDir,
      subDirName,
      metaInfo
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
    const metaInfo: MetaInfo = {
      modelName: modelName,
      template: promptTemplateFileName,
      systemPrompt: "",
      maxTokens: 250,
      temperature: 0,
      maxNrPrompts: 100,
      nrAttempts: 1,
      timeout: 10_000,
      mutate: "src/**/*.ts",
      ignore: "**/*.spec.ts",
      rateLimit: 1000,
      mutateOnly: undefined,
      mutateOnlyLines: undefined,
      maxLinesInPlaceHolder: 1,
    };
    const files = [sorterSourceFileName];
    const outputDir = fs.mkdtempSync(path.join(".", "test-"));
    fs.mkdirSync(path.join(outputDir, subDirName));
    const promptSpecGenerator = new PromptSpecGenerator(
      files,
      sorterTestFilePath,
      outputDir,
      subDirName,
      metaInfo
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
    const model = new FixtureModel(modelName, mockModelDir);
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
      timeout: 10_000,
      mutateOnly: undefined,
      mutateOnlyLines: undefined,
      maxLinesInPlaceHolder: 1,
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
    const model = new FixtureModel(modelName, mockModelDir);

    // use the same options that were used to record the fixtures
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
    const model = new FixtureModel(modelName, mockModelDir);
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
      timeout: 10_000,
      mutateOnly: undefined,
      mutateOnlyLines: undefined,
      maxLinesInPlaceHolder: 1,
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
    const model = new FixtureModel(modelName, mockModelDir);
    const outputDir = fs.mkdtempSync(path.join(".", "test-"));
    console.log(`outputDir = ${outputDir}`);
    const metaInfo: MetaInfo = {
      modelName: modelName,
      template: promptTemplateFileName,
      systemPrompt: "",
      maxTokens: 250,
      temperature: 0,
      maxNrPrompts: 100,
      nrAttempts: 1,
      timeout: 10_000,
      mutate: "src/**/TreeSorter.js",
      ignore: "src/**/*.spec.ts",
      rateLimit: 1000,
      mutateOnly: undefined,
      mutateOnlyLines: undefined,
      maxLinesInPlaceHolder: 1,
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
    const model = new FixtureModel(modelName, mockModelDir);
    const outputDir = fs.mkdtempSync(path.join(".", "test-"));
    const metaInfo: MetaInfo = {
      modelName: modelName,
      template: promptTemplateFileName,
      systemPrompt: "",
      maxTokens: 250,
      temperature: 0,
      maxNrPrompts: 100,
      nrAttempts: 1,
      timeout: 10_000,
      mutate: "src/**/TreeSorter.ts",
      ignore: "src/**/*.spec.ts",
      rateLimit: 1000,
      mutateOnly: undefined,
      mutateOnlyLines: [9],
      maxLinesInPlaceHolder: 1,
    };
    const mutantGenerator = new MutantGenerator(
      model,
      outputDir,
      sorterProjectPath,
      metaInfo
    );
    await mutantGenerator.generateMutants();
    const actualSummaryJson: any = JSON.parse(
      fs.readFileSync(
        path.join(outputDir, subDirName, "summary.json"),
        "utf8"
      )
    );
    const expectedSummaryJson: any = JSON.parse(
      fs.readFileSync("./test/input/recorded/sorters/summary-line-9-only.json", "utf8")
    );
    expect(actualSummaryJson.nrPrompts).to.equal(expectedSummaryJson.nrPrompts);
    expect(actualSummaryJson.nrCandidates).to.equal(expectedSummaryJson.nrCandidates);
    expect(actualSummaryJson.nrSyntacticallyValid).to.equal(expectedSummaryJson.nrSyntacticallyValid);
    expect(actualSummaryJson.nrSyntacticallyInvalid).to.equal(expectedSummaryJson.nrSyntacticallyInvalid);
    expect(actualSummaryJson.nrIdentical).to.equal(expectedSummaryJson.nrIdentical);
    expect(actualSummaryJson.nrDuplicate).to.equal(expectedSummaryJson.nrDuplicate);
    expect(actualSummaryJson.nrLocations).to.equal(expectedSummaryJson.nrLocations);
    fs.rmdirSync(outputDir, { recursive: true });
  });

  it('should apply mutations only to lines containing "<"', async () => {
    const model = new FixtureModel(modelName, mockModelDir);
    const outputDir = fs.mkdtempSync(path.join(".", "test-"));
    const metaInfo: MetaInfo = {
      modelName: modelName,
      template: promptTemplateFileName,
      systemPrompt: "",
      maxTokens: 250,
      temperature: 0,
      maxNrPrompts: 100,
      nrAttempts: 1,
      timeout: 10_000,
      mutate: "src/**/TreeSorter.ts",
      ignore: "src/**/*.spec.ts",
      rateLimit: 1000,
      mutateOnly: "<",
      mutateOnlyLines: undefined,
      maxLinesInPlaceHolder: 1,
    };
    const mutantGenerator = new MutantGenerator(
      model,
      outputDir,
      sorterProjectPath,
      metaInfo
    );
    await mutantGenerator.generateMutants();
    const actualSummaryJson: any = JSON.parse(
      fs.readFileSync(
        path.join(outputDir, subDirName, "summary.json"),
        "utf8"
      )
    );
    const expectedSummaryJson: any = JSON.parse(
      fs.readFileSync("./test/input/recorded/sorters/summary-lessthan-only.json", "utf8")
    );
    expect(actualSummaryJson.nrPrompts).to.equal(expectedSummaryJson.nrPrompts);
    expect(actualSummaryJson.nrCandidates).to.equal(expectedSummaryJson.nrCandidates);
    expect(actualSummaryJson.nrSyntacticallyValid).to.equal(expectedSummaryJson.nrSyntacticallyValid);
    expect(actualSummaryJson.nrSyntacticallyInvalid).to.equal(expectedSummaryJson.nrSyntacticallyInvalid);
    expect(actualSummaryJson.nrIdentical).to.equal(expectedSummaryJson.nrIdentical);
    expect(actualSummaryJson.nrDuplicate).to.equal(expectedSummaryJson.nrDuplicate);
    expect(actualSummaryJson.nrLocations).to.equal(expectedSummaryJson.nrLocations);
    fs.rmdirSync(outputDir, { recursive: true });
  });
});

/**
 * HOW TO ADD A NEW MODEL TEST
 * ============================
 * 1. Copy the describe block below and update the model name, fixture options
 *    (max_tokens etc.), and metaInfo to match the new model.
 *
 * 2. Switch FixtureModel to "incrementalRecord" mode and add the underlying Model:
 *
 *      import { Model } from "../src/model/Model"; // uncomment at top of file
 *
 *      const underlyingModel = new Model(
 *        modelName,
 *        { temperature: 0, max_tokens: maxTokens },
 *        metaInfo
 *      );
 *      const model = new FixtureModel(
 *        modelName,
 *        fixtureDir,
 *        { max_tokens: maxTokens, temperature: 0, top_p: 1 },
 *        "incrementalRecord",
 *        underlyingModel
 *      );
 *
 * 3. Make sure LLMORPHEUS_LLM_API_ENDPOINT, LLMORPHEUS_LLM_AUTH_HEADERS, etc.
 *    are set in your environment, then run the test:
 *      npm test -- --grep "<your test name>"
 *    Fixtures are saved to test/input/mockModel/{modelName}/ and
 *    test/expected/{modelName}/mutants.json is written on the first run.
 *
 * 4. Review test/expected/{modelName}/mutants.json and commit it along with
 *    the fixture files in test/input/mockModel/{modelName}/.
 *
 * 5. Switch FixtureModel back to "replay" mode and remove the underlyingModel:
 *      const model = new FixtureModel(modelName, fixtureDir, instanceOptions, "replay");
 *    Re-comment the Model import. The test now runs offline from fixtures.
 */
describe("test mutant generation with GPT-5.5", () => {
  const gpt55ModelName = "gpt-5.5";
  const gpt55FixtureDir = "test/input/mockModel";
  const gpt55SubDirName = `template-full_${gpt55ModelName}_0.0`;
  const gpt55MaxTokens = 4096;

  beforeEach(() => {
    Prompt.resetIdCounter();
    Completion.resetIdCounter();
  });

  it("should generate mutants for TreeSorter.ts using gpt-5.5", async function () {
    this.timeout(600_000); // 10 minutes — live LLM calls can be slow
    const metaInfo: MetaInfo = {
      modelName: gpt55ModelName,
      template: promptTemplateFileName,
      systemPrompt: "SystemPrompt-MutationTestingExpert.txt",
      maxTokens: gpt55MaxTokens,
      temperature: 0,
      maxNrPrompts: 100,
      nrAttempts: 3,
      mutate: "src/**/TreeSorter.ts",
      ignore: "src/**/*.spec.ts",
      rateLimit: 1000,
      timeout: 60_000,
      mutateOnly: undefined,
      mutateOnlyLines: undefined,
      maxLinesInPlaceHolder: 1,
    };

    // On first run (live LLM): use "incrementalRecord" to populate fixtures.
    // Once you have reviewed the results, change to "replay" and remove the
    // underlyingModel argument.
    const model = new FixtureModel(
      gpt55ModelName,
      gpt55FixtureDir,
      { max_tokens: gpt55MaxTokens, temperature: 0, top_p: 1 },
      "replay"
    );

    const outputDir = fs.mkdtempSync(path.join(".", "test-"));
    const mutantGenerator = new MutantGenerator(
      model,
      outputDir,
      sorterProjectPath,
      metaInfo
    );
    await mutantGenerator.generateMutants();

    const actualMutantsJson = fs.readFileSync(
      path.join(outputDir, gpt55SubDirName, "mutants.json"),
      "utf8"
    );

    // On first run, write the expected output so it can be reviewed and committed.
    const expectedMutantsPath = "./test/expected/gpt-5.5/mutants.json";
    if (!fs.existsSync(path.dirname(expectedMutantsPath))) {
      fs.mkdirSync(path.dirname(expectedMutantsPath), { recursive: true });
    }
    if (!fs.existsSync(expectedMutantsPath)) {
      fs.writeFileSync(expectedMutantsPath, actualMutantsJson, "utf8");
      console.log(`*** Wrote expected output to ${expectedMutantsPath} — review and commit it.`);
    } else {
      const expectedMutantsJson = fs.readFileSync(expectedMutantsPath, "utf8");
      expect(actualMutantsJson).to.equal(expectedMutantsJson);
    }

    fs.rmdirSync(outputDir, { recursive: true });
  });
});
