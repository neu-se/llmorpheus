import * as fs from "fs";

/**
 * Create header of latex table as shown above.
 */
function createTableHeader(dirName: string, runNr: number): string {
  return `
% table generated using command: "node benchmark/generateMutantsTable.js ${dirName} ${runNr}"
\\begin{table*}[hbt!]
\\centering
{\\scriptsize
\\begin{tabular}{l||r|r|r|r|r|r|r|r|r|r}
  {\\bf application} & {\\bf \\#prompts} & \\multicolumn{4}{|c|}{\\bf \\ChangedText{mutant candidates}} & {\\bf \\#mutants} & {\\bf \\#killed} & {\\bf \\#survived} & {\\bf \\#timeout} & {\\bf mut.} \\\\
  & &  {\\bf \\ChangedText{total}} & {\\bf \\ChangedText{invalid}} & {\\bf \\ChangedText{identical}} & {\\bf \\ChangedText{duplicate}}  &  & & & & {\\bf score} \\\\
  \\hline
  `;
}

export function getTemperature(dirName: string) {
  const firstBenchmarkName = "delta";
  const firstBenchmarkFile = fs.readFileSync(
    `${dirName}/${firstBenchmarkName}/summary.json`,
    "utf8"
  );
  const firstSummary = JSON.parse(firstBenchmarkFile);
  let temperature = firstSummary.metaInfo.temperature;
  if (temperature === "0" || temperature === 0) {
    temperature = "0.0";
  }
  if (temperature === "1" || temperature === 1) {
    temperature = "1.0";
  }
  return temperature;
}

export function getTemplate(dirName: string) {
  // const results = fs.readdirSync(dirName);
  const firstBenchmarkName = "delta";
  const firstBenchmarkFile = fs.readFileSync(
    `${dirName}/${firstBenchmarkName}/summary.json`,
    "utf8"
  );
  const firstSummary = JSON.parse(firstBenchmarkFile);
  let template = firstSummary.metaInfo.template;
  template = template.substring(template.indexOf("/") + 1);
  // remove ".hb" at the end
  template = template.substring(0, template.length - 3);
  return template;
}

function createTableFooter(dirName: string, runNr: number): string {
  // get meta-info from first benchmark
  const firstBenchmarkName = "delta";
  const firstBenchmarkFile = fs.readFileSync(
    `${dirName}/${firstBenchmarkName}/summary.json`,
    "utf8"
  );
  const firstSummary = JSON.parse(firstBenchmarkFile);
  const modelName = firstSummary.metaInfo.modelName;
  let temperature = firstSummary.metaInfo.temperature;
  if (temperature === "0" || temperature === 0) {
    temperature = "0.0";
  }
  if (temperature === "1" || temperature === 1) {
    temperature = "1.0";
  }
  const maxTokens = firstSummary.metaInfo.maxTokens;
  const maxNrPrompts = firstSummary.metaInfo.maxNrPrompts;
  let template = firstSummary.metaInfo.template;
  template = template.substring(template.indexOf("/") + 1);
  const systemPrompt = firstSummary.metaInfo.systemPrompt;
  const rateLimit = firstSummary.metaInfo.rateLimit;
  const nrAttempts = firstSummary.metaInfo.nrAttempts;

  return `\\end{tabular}
  }
  \\\\[2mm]
  \\caption{Results from LLMorpheus experiment \\ChangedText{(run \\#${runNr})}.
    Model: \\textit{${modelName}}, 
    temperature: ${temperature}, 
    maxTokens: ${maxTokens}, 
    template: \\textit{${template}}, 
    systemPrompt: \\textit{${systemPrompt}}. 
  }
  \\label{table:Mutants:run${runNr}:${modelName}:${template}:${temperature}}
\\end{table*}`;
}

/**
 * Use commas to separate thousands.
 */
function numberWithCommas(x: number): string {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function unzipDirIfNeccessary(dirName: string) {
  const results = fs.readdirSync(dirName);
  if (!results.includes("delta")) {
    // unzip "mutants.zip" and "results.zip" in dirName
    for (const zipFile of ["mutants.zip", "results.zip"]) {
      // execute shell command to unzip
      const execSync = require("child_process").execSync;
      execSync(`unzip ${dirName}/${zipFile} -d ${dirName}`, {
        stdio: "inherit",
      });
    }
  }
}

export function generateMutantsTable(dirName: string, runNr: number): string {
  unzipDirIfNeccessary(dirName);
  let result = createTableHeader(dirName, runNr);
  const results = fs.readdirSync(dirName);
  let totalNrPrompts = 0;
  let totalNrCandidates = 0;
  let totalNrSyntacticallyInvalid = 0;
  let totalNrIdentical = 0;
  let totalNrDuplicate = 0;
  let totalNrMutants = 0;
  let totalNrKilled = 0;
  let totalNrSurvived = 0;
  let totalNrTimedOut = 0;

  for (const projectName of results) {
    // skip directories and zip files
    if (projectName.endsWith(".zip")) continue;
    if (!fs.lstatSync(`${dirName}/${projectName}`).isDirectory()) continue;
    result += `\\hline\n`;
    if (!fs.existsSync(`${dirName}/${projectName}/summary.json`)) {
      throw new Error(
        `summary.json file not found in ${dirName}/${projectName}`
      );
    }
    if (!fs.existsSync(`${dirName}/${projectName}/StrykerInfo.json`)) {
      throw new Error(
        `StrykerInfo.json file not found in ${dirName}/${projectName}`
      );
    }

    const jsonLLMorpheusObj = JSON.parse(
      fs.readFileSync(`${dirName}/${projectName}/summary.json`, "utf8")
    );
    const nrPrompts = parseInt(jsonLLMorpheusObj.nrPrompts);
    const nrCandidates = parseInt(
      jsonLLMorpheusObj.nrCandidates + jsonLLMorpheusObj.nrDuplicate
    );
    const nrSyntacticallyInvalid = parseInt(
      jsonLLMorpheusObj.nrSyntacticallyInvalid
    );
    const nrIdentical = parseInt(jsonLLMorpheusObj.nrIdentical);
    const nrDuplicate = parseInt(jsonLLMorpheusObj.nrDuplicate);

    const jsonStrykerObj = JSON.parse(
      fs.readFileSync(`${dirName}/${projectName}/StrykerInfo.json`, "utf8")
    );

    const nrKilled = parseInt(jsonStrykerObj.nrKilled);
    const nrSurvived = parseInt(jsonStrykerObj.nrSurvived);
    const nrTimedOut = parseInt(jsonStrykerObj.nrTimedOut);
    const nrMutants = nrKilled + nrSurvived + nrTimedOut;
    const mutScore = jsonStrykerObj.mutationScore;

    result += `\\textit{${projectName}} & ${nrPrompts} & \\ChangedText\{${numberWithCommas(nrCandidates)}\} & \\ChangedText\{${numberWithCommas(nrSyntacticallyInvalid)}\} & \\ChangedText\{${numberWithCommas(nrIdentical)}\} & \\ChangedText\{${numberWithCommas(nrDuplicate)}\} & ${numberWithCommas(nrMutants)} & ${numberWithCommas(nrKilled)} & ${numberWithCommas(nrSurvived)} & ${numberWithCommas(nrTimedOut)} & ${parseFloat(
      mutScore
    ).toFixed(2)} \\\\ \n`;

    totalNrPrompts += nrPrompts;
    totalNrCandidates += nrCandidates;
    totalNrSyntacticallyInvalid += nrSyntacticallyInvalid;
    totalNrIdentical += nrIdentical;
    totalNrDuplicate += nrDuplicate;
    totalNrMutants += nrMutants;
    totalNrKilled += nrKilled;
    totalNrSurvived += nrSurvived;
    totalNrTimedOut += nrTimedOut;
  }
  result += `\\hline\n`;
  result += `\\textit{Total} & ${numberWithCommas(totalNrPrompts)} & \\ChangedText\{${numberWithCommas(totalNrCandidates)}\} & \\ChangedText\{${numberWithCommas(totalNrSyntacticallyInvalid)}\} & \\ChangedText\{${numberWithCommas(totalNrIdentical)}\} & \\ChangedText\{${numberWithCommas(totalNrDuplicate)}\} & ${numberWithCommas(totalNrMutants)} & ${numberWithCommas(totalNrKilled)} & ${numberWithCommas(totalNrSurvived)} & ${numberWithCommas(totalNrTimedOut)} & --- \\\\ \n`;
  result += createTableFooter(dirName, runNr);
  return result;
}

// to be executed from the command line only
if (require.main === module) {
  let dirName = process.argv[2]; // read dirName from command line
  // remove trailing slash
  if (dirName.endsWith("/")) {
    dirName = dirName.substring(0, dirName.length - 1);
  }
  const pathEntries = dirName.split("/");
  const lastEntry = pathEntries[pathEntries.length - 1];
  if (!lastEntry.startsWith("run")) {
    throw new Error(
      "Usage: node <path-to-llmorpheus>/benchmark/generateMutantsTable.js <path-to-run>"
    );
  }
  const runNr = parseInt(lastEntry.substring(3));
  const table = generateMutantsTable(dirName + "/zip", runNr);

  console.log(table);
}
