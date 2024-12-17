# LLMorpheus

LLMorpheus is a tool for applying mutation testing to npm packages
written in JavaScript/TypeScript using a large language model (LLM).

Note that LLMorpheus represents an early exploration in the use of LLMs for
mutation testing, and has been made available in open source as a basis for
research and exploration.  

## Background

LLMorpheus generates mutants for a given package `p` by prompting the LLM with a
prompt that asks it to apply mutations to specific locations in the source code
of `p`. This prompt includes some background on mutation testing, a fragment
of `p`'s source code in which a code fragment is replaced with the word
`PLACEHOLDER`, and a request to suggest what code fragments should be 
substituted for the placeholder. The LLM is asked to produce output in a 
specific format in which the mutation suggestions occur as fenced code blocks.
The completion provided by the LLM is then analyzed to extract the suggested
mutants, and the resulting modified source code is checked for syntactic
validity. All syntactically valid mutants are written to a file `mutants.json`.

The resulting set of mutants is then provided to a modified version of the
popular [StrykerJS ](https://github.com/franktip/stryker-js), a state-of-the-art mutation testing tool. Running this version of StrykerJS produces an interactive web page that can be inspected to reveal which mutants are killed, survived, or timed out. 

Unlike other systems for mutation testing, LLMorpheus does not rely on a fixed
set of mutation operators, but instead relies on an LLM to suggest suitable code fragments.

## Requirements

In general, to be able to run LLMorpheus you need access to a OpenAI-style LLM
with chat API. Set the `LLMORPHEUS_LLM_API_ENDPOINT` environment variable to
the URL of the LLM API endpoint you want to use, and
`LLMORPHEUS_LLM_AUTH_HEADERS` to a JSON object containing the headers you need to
authenticate with the API.

Typical values for these variables might be:

- `LLMORPHEUS_LLM_API_ENDPOINT='https://text.octoai.run/v1/chat/completions'`
- `LLMORPHEUS_LLM_AUTH_HEADERS='{"Authorization": "Bearer <your API key>", "content-type": "application/json"}'`

## Installation

The `src/` directory contains the source code for LLMorpheus, which is written in
TypeScript and gets compiled into the `dist/` directory. Tests are in `test/`;
the `benchmark/` directory contains a benchmarking harness for running LLMorpheus
on multiple npm packages.

In the root directory of a checkout of this repository, run `npm build` to
install dependencies and build the package.

You can also use `npm run build:watch` to automatically build anytime you make
changes to the code. Note, however, that this will not automatically install
dependencies, and also will not build the benchmarking harness.

Use `npm run test` to run the tests. For convenience, this will also install
dependencies and run a build.

## Benchmarking

Basic usage is as follows:

```sh
node benchmark/createMutants.js --path <package-dir> --mutate <files-to-mutate>   --model <model-name>  --template <prompt-template>
```
Note that this assumes that package dependencies are installed and any build
steps have been run (e.g., using `npm i` and `npm run build`). 

This will generate a directory `<package_dir>/MUTATION_TESTING` in which you will  find the following:
  - a subdirectory ```prompts``` containing all generated prompts and completions. Prompts are saved in files named ```promptN.txt``` and completions are in files ```promptN_completionN.txt```
  - a file ```mutants.json``` containing information about the computed mutants (file, location, original source code, mutated source code, prompt ID, completion ID, and code pattern that was used to derive the mutant). This file is what our custom version of StrykerJS refers to when it performs its mutation analysis.
  - a file ```promptSpecs.json`` recording the locations that are candidates for mutation (file, location, pattern)
  - a file ```summary.json``` containing statistics gathered for the entire project (number of prompts, number of mutants, number of tokens used for prompts, number of tokens used for completions, meta-information about the model and LLMorpheus parameters used for the experiment)

For further details on available command-line options, please refer to the documentation.

## Running StrykerJS and Viewing Stryker's Report

To run our custom version of Stryker, perform the following steps:

1. Clone Stryker from ```https://github.com/neu-se/stryker-js``` into directory ```stryker-js```

2. ```cd stryker-js```

3. ```npm install```

4. ```npm run build```

5. Next you need to install Stryker in the subject project for which you generated mutants. The instructions below assume that the subject project is in directory ```ProjectDir``` and that Stryker was installed in ```stryker-js```
  - ```cd ProjectDir```
  - ```npm install install-local```
  - set ```STRYKER_FILES``` to a quoted comma-separated list of files that you want to be mutated.  LLMorpheus outputs this list, so you can copy and paste from there. Note: There should be no space characters in the list.
  - set the ```MUTANTS_FILE``` environment variable to point to the ```mutants.json``` file that was generated by LLMorpheus
  - ```npx stryker run --usePrecomputed  --mutate $STRYKER_FILES```   (if you leave out the ```---usePrecomputed``` option, Stryker's standard mutation operators will be applied). You may supply other options to StrykerJS, see the StrykerJS documentation.
  - the previous command will generate a directory ```reports```. You can view Stryker's report by opening ```reports/mutation/mutation.html``` in a browser.

### Running on Actions

The `experiment.yml` workflow runs an experiment on GitHub Actions,
producing the final report as an artifact you can download. The `mutants` artifact contains all mutants, prompts, and related information computed by LLMorpheus, and the `results` artifact contains the report produced by StrykerJS. 

The `StandardStryker.yml` workflow runs the standard StrykerJS mutators.

### Reproducing results

The results of LLMorpheus are non-deterministic, so even if you run it from the same package on the same machine multiple times, it is likely that you will get different results.

That said, LLMorpheus has an option `--replay <dirName>` for replaying an execution using prompts and completions observed during a previous execution. If you use this option, the model name, temperature, max number of tokens, and system prompt will be inferred from the previously observed execution. However, the `--mutate` and `--ignore` settings will be taken from command-line arguments, so as to enable replaying executions of LLMorpheus partially, on a subset of the files that it was previous run on.

For example, let's say that the zip-a-folder project is located in a directory `/Users/xxx/zip-a-folder/`, and that the results of a previous execution of LLMorpheus on zip-a-folder can be found in a directory `/Users/xxx/recording`. Further, let's assume that we want to mutate the files that match the pattern `"lib/*.ts"`. You can do that by running the following command:
```
node benchmark/createMutants.js --path /Users/xxx/zip-a-folder --mutate "lib/**.ts"  --replay /Users/xxx/recording
```

A collection of recorded executions of LLMorheus is made available at <https://github.com/neu-se/mutation-testing-data>. Here, you can find recorded executions that were made using the codellama-13b-instruct, codellama-34b-instruct, and mixtral-8x7b-instruct LLMs there, and using various templates and temperature settings. The data is organized in subdirectories that reflect the model, template, and temperature used, e.g. `codellama-13b-instruct/template-full-0.0` reflects a set of experiments using the `codellama-13b-instruct` model, the `full`  template, at temperature `0.0`. This directory contains 5 sets of experiments on 13 subject programs using these settings, contained in subdirectories named `run354`-`run359`. A file `zip/mutants.zip` within each of these subdirectories contains all data that is needed to replay these executions.


## License

This project is licensed under the terms of the MIT open source license. Please refer to [LICENSE](./LICENSE) for the full terms.

## Paper

A paper about LLMorpheus is available on [arXiv](https://arxiv.org/abs/2404.09952).

## Maintainers

- Frank Tip (@franktip)
- Jon Bell (@jon-bell)
- Max Schaefer (@max-schaefer)

## Support

LLMorpheus is a research prototype and is not officially supported. However, if
you have questions or feedback, please file an issue and we will do our best to
respond.
