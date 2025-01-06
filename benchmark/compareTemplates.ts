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
const templates = [
  "full",
  "onemutation",
  "noexplanation",
  "noinstructions",
  "gen.system prompt",
  "basic",
];

function findProjectData(baseDir: string, run: string, projectName: string) {
  const data = fs.readFileSync(
    path.join(baseDir, run, "projects", projectName, "StrykerInfo.json"),
    "utf8"
  );
  const info = JSON.parse(data);
  const nrKilled = parseInt(info.nrKilled);
  const nrSurvived = parseInt(info.nrSurvived);
  const nrTimedout = parseInt(info.nrTimedOut);
  const total = nrKilled + nrSurvived + nrTimedout;
  return { total, nrKilled, nrSurvived, nrTimedout };
}

function computeTotals(baseDir: string, run: string) {
  let totalMutants = 0;
  let totalKilled = 0;
  let totalSurvived = 0;
  let totalTimedout = 0;
  for (const projectName of projectNames) {
    const { total, nrKilled, nrSurvived, nrTimedout } = findProjectData(
      baseDir,
      run,
      projectName
    );
    totalMutants += total;
    totalKilled += nrKilled;
    totalSurvived += nrSurvived;
    totalTimedout += nrTimedout;
  }
  return { totalMutants, totalKilled, totalSurvived, totalTimedout };
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
      execSync(`unzip ${dirName}/zip/${zipFile} -d ${dirName}`, {
        stdio: "inherit",
      });
    }
  }
}

/**
 * Generate a LaTeX table that shows the number of mutants generated
 * using different templates.
 */
function generateTable(baseDir: string, runs: string[]): void {
  for (const run of runs) {
    unzipDirIfNeccessary(path.join(baseDir, run));
  }

  let latexTable = `
% This table was generated using the following command:
% node benchmark/compareTemplates.js ${baseDir.substring(baseDir.indexOf("mutation-testing-data"))} ${runs.join(" ")}
\\begin{table*}
\\centering
{\\scriptsize
\\begin{tabular}{l@{\\hspace*{0.5mm}}||r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}|%
  r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}|%
  r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}|%
  r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}|%
  r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}|%
   @{\\hspace*{1mm}}r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}r@{\\hspace*{1mm}}r%
}
  & \\multicolumn{4}{|c|}{\\bf full} &  \\multicolumn{4}{|c|}{\\bf onemutation} &   \\multicolumn{4}{|c|}{\\bf noexplanation} &  \\multicolumn{4}{|c}{\\bf noinstructions} &  \\multicolumn{4}{|c}{\\bf genericsystemprompt} &  \\multicolumn{4}{@{\\hspace*{-1.05mm}}|c}{\\bf basic} \\\\
  &  \\Total & \\Killed & \\Survived & \\Timeout
  &  \\Total & \\Killed & \\Survived & \\Timeout
  &  \\Total & \\Killed & \\Survived & \\Timeout
  &  \\Total & \\Killed & \\Survived & \\Timeout
  &  \\Total & \\Killed & \\Survived & \\Timeout
  &  \\Total & \\Killed & \\Survived & \\Timeout  \\\\
  \\hline
  \\hline`;
  for (const projectName of projectNames) {
    let row = `\\begin{minipage}[t]{1.2cm}${projectName}\\end{minipage}`;
    for (const run of runs) {
      const data = fs.readFileSync(
        path.join(baseDir, run, projectName, "StrykerInfo.json"),
        "utf8"
      );
      const info = JSON.parse(data);
      const nrKilled = info.nrKilled;
      const nrSurvived = info.nrSurvived;
      const nrTimedout = info.nrTimedOut;
      const total =
        parseInt(nrKilled) + parseInt(nrSurvived) + parseInt(nrTimedout);
      row +=
        " & " +
        numberWithCommas(total) +
        " & " +
        numberWithCommas(nrKilled) +
        " & " +
        numberWithCommas(nrSurvived) +
        " & " +
        numberWithCommas(nrTimedout);
    }
    row += " \\\\\n";
    latexTable += row;
  }
  // add a row with totals
  let row = "\\hline\\textit{Total}";
  for (const run of runs) {
    const { totalMutants, totalKilled, totalSurvived, totalTimedout } =
      computeTotals(baseDir, run);
    row +=
      " & " +
      numberWithCommas(totalMutants) +
      " & " +
      numberWithCommas(totalKilled) +
      " & " +
      numberWithCommas(totalSurvived) +
      " & " +
      numberWithCommas(totalTimedout);
  }
  row += " \\\\\n";
  latexTable += row;

  latexTable +=
    "\\end{tabular}\n" +
    "}\n" +
    "\\caption{Number of mutants generated using the \\CodeLlamaThirtyFour LLM at temperature 0.0" +
    ` using templates ${templates.join(", ")}.}\n` +
    "\\label{table:Templates}\n" +
    "\\end{table*}\n";
  console.log(latexTable);
}

// usage: node benchmark/compareTemplates.js <baseDir> <list of subdirs

const baseDir = process.argv[2];
const runs = process.argv.slice(3);
generateTable(baseDir, runs);
