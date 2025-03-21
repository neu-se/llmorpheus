import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Model } from "../src/model/Model";
import { CachingModel } from "../src/model/CachingModel";
import { ReplayModel } from "../src/model/ReplayModel";
import { MutantGenerator } from "../src/generator/MutantGenerator";
import { MetaInfo } from "../src/generator/MetaInfo";
import path from "path";
import { IModel } from "../src/model/IModel";

if (require.main === module) {
  (async () => {
    const parser = yargs(hideBin(process.argv))
      .strict()
      .options({
        path: {
          type: "string",
          demandOption: true,
          description: "path to file/directory containing the original code",
        },
        template: {
          type: "string",
          default: "template.hb",
          description:
            'name of file containing the prompt template (default: "template.hb")',
        },
        systemPrompt: {
          type: "string",
          default: "SystemPrompt-MutationTestingExpert.txt",
          description:
            'name of file containing the system prompt template (default: "SystemPrompt-MutationTestingExpert.txt")',
        },
        model: {
          type: "string",
          default: "codellama-34b-instruct",
          description:
            'name of the model to use (default: "codellama-34b-instruct")',
        },
        caching: {
          type: "boolean",
          default: true,
          description:
            "whether to cache the results of queries to the model (default: true)",
        },
        mutate: {
          type: "string",
          default: "**/*.{js,ts}",
          demandOption: false,
          description: "glob specifying files to mutate",
        },
        ignore: {
          type: "string",
          default: "",
          demandOption: false,
          description: "glob specifying files to ignore",
        },
        cacheDir: {
          type: "string",
          default: path.join(__dirname, "..", ".llm-cache"),
          demandOption: false,
          description: "path to directory where cache files are located",
        },
        temperature: {
          type: "number",
          default: 0.0,
          description:
            "temperature to use when generating completions (default: 0.0)",
        },
        rateLimit: {
          type: "number",
          default: 0,
          demandOption: false,
          description:
            "number of milliseconds between requests to the model (0 is no rate limit)",
        },
        nrAttempts: {
          type: "number",
          default: 3,
          demandOption: false,
          description: "number of attempts to generate a completion",
        },
        benchmark: {
          type: "boolean",
          default: false,
          demandOption: false,
          description:
            "use custom rate-limiting for benchmarking (if specified, this supercedes the rateLimit option)",
        },
        maxTokens: {
          type: "number",
          default: 250,
          demandOption: false,
          description: "maximum number of tokens in a completion",
        },
        maxNrPrompts: {
          type: "number",
          default: 1250,
          demandOption: false,
          description: "maximum number of prompts to generate",
        },
        replay: {
          type: "string",
          default: undefined,
          demandOption: false,
          description: "replay execution from specified directory",
        },
        mutateOnly: {
          type: "string",
          default: undefined,
          demandOption: false,
          description:
            "restrict mutation to code fragments containing this string",
        },
        mutateOnlyLines: {
          type: "string",
          default: undefined,
          demandOption: false,
          description:
            "restrict mutation to specific lines in the code (requires mutateOnly) (e.g., 1,3,5)",
        },
        maxLinesInPlaceHolder: {
          type: "number",
          default: 1,
          demandOption: false,
          description:
            "number of lines that can be covered by a placeholder (default: 1)",
        },
      });

    const argv = await parser.argv;
    const packagePath = argv.path.endsWith("/")
      ? argv.path
      : path.join(argv.path, "/");
    let model: IModel;
    let metaInfo: MetaInfo;
    if (argv.replay !== undefined) {
      model = new ReplayModel(argv.replay);
      metaInfo = (model as ReplayModel).getMetaInfo();
      metaInfo.mutate = argv.mutate;
      metaInfo.ignore = argv.ignore;
    } else {
      const lines: number[] | undefined =
        argv.mutateOnlyLines !== undefined
          ? argv.mutateOnlyLines.split(",").map((x) => parseInt(x))
          : undefined;
      metaInfo = {
        modelName: argv.model,
        temperature: argv.temperature,
        maxTokens: argv.maxTokens,
        maxNrPrompts: argv.maxNrPrompts,
        rateLimit: argv.rateLimit,
        nrAttempts: argv.nrAttempts,
        template: argv.template,
        systemPrompt: argv.systemPrompt,
        mutate: argv.mutate,
        ignore: argv.ignore,
        benchmark: argv.benchmark,
        mutateOnly: argv.mutateOnly,
        mutateOnlyLines: lines,
        maxLinesInPlaceHolder: argv.maxLinesInPlaceHolder,
      };

      const baseModel = new Model(
        argv.model,
        { temperature: argv.temperature, max_tokens: argv.maxTokens },
        metaInfo
      );
      model = argv.caching
        ? new CachingModel(baseModel, argv.cacheDir)
        : baseModel;
      console.log(
        `*** Generating mutants for ${argv.mutate} in ${packagePath}`
      );
    }

    const mutantGenerator = new MutantGenerator(
      model,
      path.join(argv.path, "MUTATION_TESTING"),
      packagePath,
      metaInfo
    );
    mutantGenerator.generateMutants();
  })();
}
