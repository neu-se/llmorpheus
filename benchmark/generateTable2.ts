import * as fs from "fs";

/**
 * Create header of latex table as shown above.
 */
function createTableHeader(dirName: string, runNr: number, strykerDirName: string): string {
  return `
% table generated using command: "node benchmark/generateTable2.js ${dirName} ${runNr} ${strykerDirName}"
\\begin{table*}[hbt!]
\\centering
{\\scriptsize
\\begin{tabular}{l||r|r|r|r|r|r|r|r|r|r|r|r|r|r|r}
  {\\bf application} & {\\bf \\#prompts} & \\multicolumn{9}{|c|}{\\ToolName} & \\multicolumn{4}{|c|}{\\ChangedText{\\StrykerJS}} \\\\
  & &  {\\bf \\ChangedText{\\Candidates}} & {\\bf \\ChangedText{\\Invalid}} & {\\bf \\ChangedText{\\Identical}} & {\\bf \\ChangedText{\\Duplicate}} & \\Total & \\Killed & \\Survived & \\Timeout & \\MutScore & \\ChangedText{\\Total} & \\ChangedText{\\Killed} & \\ChangedText{\\Survived} & \\ChangedText{\\Timeout} & \\ChangedText{\\MutScore} \\\\
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
  let template = firstSummary.metaInfo.template;
  template = template.substring(template.indexOf("/") + 1);
  const systemPrompt = firstSummary.metaInfo.systemPrompt;

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
  \\label{table:CodeLlama34Full0.0}
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

export function generateMutantsTable(dirName: string, runNr: number, strykerDirName: string): string {
  unzipDirIfNeccessary(dirName);
  let result = createTableHeader(dirName, runNr, strykerDirName);
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

  let totalStrykerNrMutants = 0;
  let totalStrykerNrKilled = 0;
  let totalStrykerNrSurvived = 0;
  let totalStrykerNrTimedOut = 0;
  
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

    totalNrPrompts += nrPrompts;
    totalNrCandidates += nrCandidates;
    totalNrSyntacticallyInvalid += nrSyntacticallyInvalid;
    totalNrIdentical += nrIdentical;
    totalNrDuplicate += nrDuplicate;
    totalNrMutants += nrMutants;
    totalNrKilled += nrKilled;
    totalNrSurvived += nrSurvived;
    totalNrTimedOut += nrTimedOut;

    const strykerResultsFileName = `${strykerDirName}/${projectName}/StrykerInfo.json`;
    if (!fs.existsSync(strykerResultsFileName)) {
      throw new Error(`File not found: ${strykerResultsFileName}`);
    }
    const strykerResultsJsobObj = JSON.parse(
      fs.readFileSync(strykerResultsFileName, "utf8")
    );
    const nrKilledStryker = parseInt(strykerResultsJsobObj.nrKilled);
    const nrSurvivedStryker = parseInt(strykerResultsJsobObj.nrSurvived);
    const nrTimedOutStryker = parseInt(strykerResultsJsobObj.nrTimedOut);
    const nrMutantsStryker = nrKilledStryker + nrSurvivedStryker + nrTimedOutStryker; 
    const mutationScoreStryker = strykerResultsJsobObj.mutationScore;

    totalStrykerNrMutants += nrMutantsStryker;
    totalStrykerNrKilled += nrKilledStryker;
    totalStrykerNrSurvived += nrSurvivedStryker;
    totalStrykerNrTimedOut += nrTimedOutStryker;

    result += `\\textit{${projectName}} 
      & ${numberWithCommas(nrPrompts)} 
      & \\ChangedText\{${numberWithCommas(nrCandidates)}\} 
      & \\ChangedText\{${numberWithCommas(nrSyntacticallyInvalid)}\} 
      & \\ChangedText\{${numberWithCommas(nrIdentical)}\} 
      & \\ChangedText\{${numberWithCommas(nrDuplicate)}\} 
      & ${numberWithCommas(nrMutants)} 
      & ${numberWithCommas(nrKilled)} 
      & ${numberWithCommas(nrSurvived)} 
      & ${numberWithCommas(nrTimedOut)} 
      & ${parseFloat(mutScore).toFixed(2)} 
      & \\ChangedText{${numberWithCommas(nrMutantsStryker)}}
      & \\ChangedText{${numberWithCommas(nrKilledStryker)}} 
      & \\ChangedText{${numberWithCommas(nrSurvivedStryker)}} 
      & \\ChangedText{${numberWithCommas(nrTimedOutStryker)}} 
      & \\ChangedText{${parseFloat(mutationScoreStryker).toFixed(2)}} 
      \\\\ \n`;    
  }
  result += `\\hline\n`;
  result += `\\textit{Total} & ${numberWithCommas(
    totalNrPrompts
  )} & \\ChangedText\{${numberWithCommas(
    totalNrCandidates
  )}\} & \\ChangedText\{${numberWithCommas(
    totalNrSyntacticallyInvalid
  )}\} & \\ChangedText\{${numberWithCommas(
    totalNrIdentical
  )}\} & \\ChangedText\{${numberWithCommas(
    totalNrDuplicate
  )}\} & ${numberWithCommas(totalNrMutants)} & ${numberWithCommas(
    totalNrKilled
  )} & ${numberWithCommas(totalNrSurvived)} & ${numberWithCommas(
    totalNrTimedOut
  )} & --- 
  & \\ChangedText{${numberWithCommas(totalStrykerNrMutants)}}
  & \\ChangedText{${numberWithCommas(totalStrykerNrKilled)}}
  & \\ChangedText{${numberWithCommas(totalStrykerNrSurvived)}}
  & \\ChangedText{${numberWithCommas(totalStrykerNrTimedOut)}}
  & --- \n`;
  result += createTableFooter(dirName, runNr);
  return result;
}

// to be executed from the command line only
if (require.main === module) {
  let llmorpheusDirName = process.argv[2]; // read dirName from command line
  // remove trailing slash
  if (llmorpheusDirName.endsWith("/")) {
    llmorpheusDirName = llmorpheusDirName.substring(0, llmorpheusDirName.length - 1);
  }
  let strykerDirName = process.argv[3]; // read dirName from command line
  // remove trailing slash
  if (strykerDirName.endsWith("/")) {
    strykerDirName = strykerDirName.substring(0, strykerDirName.length - 1);
  }
  const pathEntries = llmorpheusDirName.split("/");
  const lastEntry = pathEntries[pathEntries.length - 1];
  if (!lastEntry.startsWith("run")) {
    throw new Error(
      "Usage: node <path-to-llmorpheus>/benchmark/generateMutantsTable.js <LLMorpheusDir> <StrykerDir>"
    );
  }
  const runNr = parseInt(lastEntry.substring(3));
  const table = generateMutantsTable(llmorpheusDirName + "/zip", runNr, strykerDirName);

  console.log(table);
}
