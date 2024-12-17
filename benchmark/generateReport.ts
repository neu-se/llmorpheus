import * as fs from "fs";

/**
 * Print a report of the mutation testing results.
 */
function printReport(title: string) {
  const results = fs.readdirSync(dirName);
  const firstBenchmarkName = results[0];
  const firstBenchmarkFile = fs.readFileSync(
    `${dirName}/${firstBenchmarkName}/MUTATION_TESTING/summary.json`,
    "utf8"
  );
  const firstSummary = JSON.parse(firstBenchmarkFile);
  const modelName = firstSummary.metaInfo.modelName;
  const temperature = firstSummary.metaInfo.temperature;
  const maxTokens = firstSummary.metaInfo.maxTokens;
  const numCompletions = firstSummary.metaInfo.n;
  console.log(`
# ${title}
(model: ${modelName}, temperature: ${temperature}, maxTokens: ${maxTokens}, numCompletions: ${numCompletions})
| Project | # NrCandidates | # NrMutants | # NrLocations |
| :------ |  ------------: | ----------: | ------------: |`);

  // console.log(`dirName: ${dirName}, type: ${typeof dirName}`);
  for (const benchmarkName of results) {
    if (benchmarkName.startsWith(".")) continue;
    // console.log(`benchmarkName: ${benchmarkName}, type: ${typeof benchmarkName}`);
    // read summary.json file in benchmarkName/MUTATION_TESTING
    const file = fs.readFileSync(
      `${dirName}/${benchmarkName}/MUTATION_TESTING/summary.json`,
      "utf8"
    );
    const summary = JSON.parse(file);
    const nrCandidates = summary.nrCandidates;
    const nrSyntacticallyValid = summary.nrSyntacticallyValid;
    const nrLocations = summary.nrLocations;
    console.log(
      `${benchmarkName} | ${nrCandidates} | ${nrSyntacticallyValid} | ${nrLocations}`
    );
  }
}

const dirName = process.argv[2]; // read dirName from command line
printReport("Mutant Generation Report");
