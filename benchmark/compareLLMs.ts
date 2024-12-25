import fs from "fs";
import path from "path";

const projectNames = [
  "Complex.js",
  "countries-and-timezones",
  "crawler-url-parser",
  "delta",
  "image-downloader",
  "node-dirty",
  "node-geo-point",
  "node-jsonfile",
  "plural",
  "pull-stream",
  "q",
  "spacl-core",
  "zip-a-folder",
];

/** Format a number with commas to separate thousands and millions, limit to
 *  two decimal places. Example: 1234567.2345 -> 1,234,567.23
 **/
function formatNr(x: number, nrDecimals: number = 0) {
  return x.toFixed(nrDecimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function tableHeader(runs: string[]): string {
  const models = runs.map((path) => path.substring(0, path.indexOf("/")));
  const runNrs = runs.map((path) =>
    path
      .substring(path.lastIndexOf("run"), path.length - 1)
      .replace("run", "run \\#")
  );
  return `
{\\scriptsize
\\begin{tabular}{l||rrrrrrrr|rrrrrrrr}
 & \\multicolumn{8}{|c|}{\\it ${models[0]} (${runNrs[0]})} &   \\multicolumn{8}{|c}{\\it ${models[1]} (${runNrs[1]})} \\\\
 & \\Candidates & \\Invalid & \\Identical & \\Duplicate & \\Total & \\Killed & \\Survived & \\Timeout 
 & \\Candidates & \\Invalid & \\Identical & \\Duplicate & \\Total & \\Killed & \\Survived & \\Timeout \\\\
\\hline`;
}

function generateDataBlock(baseDir: string, runs: string[]): string {
  let latexTable = tableHeader(runs);
  for (const projectName of projectNames) {
    let row = "\\textit{" + projectName + "}";
    for (const run of runs) {
      const strykerInfo = JSON.parse(
        fs.readFileSync(
          path.join(baseDir, run, "projects", projectName, "StrykerInfo.json"),
          "utf8"
        )
      );
      const llmorpheusInfo = JSON.parse(
        fs.readFileSync(
          path.join(baseDir, run, "projects", projectName, "summary.json"),
          "utf8"
        )
      );
      const nrCandidates = llmorpheusInfo.nrCandidates;
      const nrSyntacticallyInvalid = llmorpheusInfo.nrSyntacticallyInvalid;
      const nrIdentical = llmorpheusInfo.nrIdentical;
      const nrDuplicate = llmorpheusInfo.nrDuplicate;
      const nrKilled = parseInt(strykerInfo.nrKilled);
      const nrSurvived = parseInt(strykerInfo.nrSurvived);
      const nrTimedout = parseInt(strykerInfo.nrTimedOut);
      const nrMutants: number = nrKilled + nrSurvived + nrTimedout;

      row +=
        " & " +
        formatNr(nrCandidates) +
        " & " +
        formatNr(nrSyntacticallyInvalid) +
        " & " +
        formatNr(nrIdentical) +
        " & " +
        formatNr(nrDuplicate) +
        " & " +
        formatNr(nrMutants) +
        " & " +
        formatNr(nrKilled) +
        " & " +
        formatNr(nrSurvived) +
        " & " +
        formatNr(nrTimedout);
    }
    row += " \\\\\n";
    latexTable += row;
  }
  let totalRow: string = "\\hline\\textit{Total}";
  let totalCandidates;
  let totalInvalid;
  let totalIdentical;
  let totalDuplicate;
  let totalMutants;
  let totalKilled;
  let totalSurvived;
  let totalTimedout;
  for (const run of runs) {
    totalCandidates = 0;
    totalInvalid = 0;
    totalIdentical = 0;
    totalDuplicate = 0;
    totalMutants = 0;
    totalKilled = 0;
    totalSurvived = 0;
    totalTimedout = 0;
    for (const projectName of projectNames) {
      const strykerInfo = JSON.parse(
        fs.readFileSync(
          path.join(baseDir, run, "projects", projectName, "StrykerInfo.json"),
          "utf8"
        )
      );
      const llmorpheusInfo = JSON.parse(
        fs.readFileSync(
          path.join(baseDir, run, "projects", projectName, "summary.json"),
          "utf8"
        )
      );
      totalCandidates += parseInt(llmorpheusInfo.nrCandidates);
      totalInvalid += parseInt(llmorpheusInfo.nrSyntacticallyInvalid);
      totalIdentical += parseInt(llmorpheusInfo.nrIdentical);
      totalDuplicate += parseInt(llmorpheusInfo.nrDuplicate);
      totalKilled += parseInt(strykerInfo.nrKilled);
      totalSurvived += parseInt(strykerInfo.nrSurvived);
      totalTimedout += parseInt(strykerInfo.nrTimedOut);
    }
    totalMutants =
      totalCandidates - totalInvalid - totalIdentical - totalDuplicate;
    totalRow +=
      " & " +
      formatNr(totalCandidates) +
      " & " +
      formatNr(totalInvalid) +
      " & " +
      formatNr(totalIdentical) +
      " & " +
      formatNr(totalDuplicate) +
      " & " +
      formatNr(totalMutants) +
      " & " +
      formatNr(totalKilled) +
      " & " +
      formatNr(totalSurvived) +
      " & " +
      formatNr(totalTimedout);
  }
  latexTable += totalRow + " \\\\\n";
  latexTable += "\\end{tabular}\n" + "}\n";
  return latexTable;
}

/**
 * Generate a LaTeX table that shows the number of mutants generated
 * at different temperatures.
 */
function generateTable(baseDir: string, runs: string[]): string {
  let latexTable = `
% table generated using command: "node benchmark/compareLLMs.js ${baseDir.substring(
    baseDir.lastIndexOf("/") + 1
  )}${runs.join(" ")}
\\begin{table*}
\\centering`;

  latexTable += generateDataBlock(baseDir, runs.slice(0, 2));
  latexTable += "\\\\[5mm]";
  latexTable += generateDataBlock(baseDir, runs.slice(2, 4));

  latexTable += `
  \\vspace*{3mm}
  \\caption{Mutants generated with the \\CodeLlamaThirteen, \\Mixtral, \\LlamaThreeThree, and \\GPTFouroMini LLMs, using
  the following parameters:
   temperature: 0.0, 
    maxTokens: 250, 
    maxNrPrompts: 2000, 
    template: \\textit{template-full.hb}, 
    systemPrompt: \\textit{SystemPrompt-MutationTestingExpert.txt}, 
    rateLimit: 0, 
    nrAttempts: 3. 
  }
 \\label{table:CompareLLMs}
 \\end{table*}`;
  return latexTable;
}

// usage: node benchmark/compareLLMs.js <baseDir> <list of 4 subdirs>

const baseDir = process.argv[2];
const runs = process.argv.slice(3);
const table = generateTable(baseDir, runs);
console.log(table);
