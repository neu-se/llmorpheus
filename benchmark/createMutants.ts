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
      const supportedModels = [
        "codellama-13b-instruct",
        "codellama-34b-instruct",
        "mistral-7b-instruct",
        "mixtral-8x7b-instruct",
        "mixtral-8x22b",
        "llama-2-13b-chat",
        "llama-2-70b-chat",
      ];

      if (!supportedModels.includes(argv.model)) {
        console.error(`Invalid model name: ${argv.model}`);
        console.error(`Supported models are: ${supportedModels.join(", ")}`);
        process.exit(1);
      }

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
      };

      if (!supportedModels.includes(argv.model)) {
        console.error(`Invalid model name: ${argv.model}`);
        console.error(`Supported models are: ${supportedModels.join(", ")}`);
        process.exit(1);
      }

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
