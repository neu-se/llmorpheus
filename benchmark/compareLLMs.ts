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

/**
 * Generate a LaTeX table that shows the number of mutants generated
 * at different temperatures.
 */
function generateTable(baseDir: string, runs: string[]): void {
  let latexTable =
    `% table generated using command: "node benchmark/computeVariability.js ${baseDir.substring(
      baseDir.lastIndexOf("/") + 1
    )}${runs.join(" ")}"\n` +
    "\\begin{table*}\n" +
    "\\centering\n" +
    "{\\scriptsize\n" +
    "\\begin{tabular}{l||cccc|cccc|cccc}\n" +
    "        & \\multicolumn{4}{|c|}{\\bf \\CodeLlamaThirtyFour} &  \\multicolumn{4}{|c|}{\\bf \\CodeLlamaThirteen} &   \\multicolumn{4}{|c}{\\bf \\Mixtral} \\\\\n" +
    "                      &  \\Total & \\Killed & \\Survived & \\Timeout \n" +
    "                      &  \\Total & \\Killed & \\Survived & \\Timeout  \n" +
    "                      &  \\Total & \\Killed & \\Survived & \\Timeout  \\\\\n" +
    "\\hline\n" +
    "\\hline\n";
  for (const projectName of projectNames) {
    let row = "\\textit{" + projectName + "}";
    for (const run of runs) {
      const data = fs.readFileSync(
        path.join(baseDir, run, "projects", projectName, "StrykerInfo.json"),
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
        total +
        " & " +
        nrKilled +
        " & " +
        nrSurvived +
        " & " +
        nrTimedout;
    }
    row += " \\\\\n";
    latexTable += row;
  }
  latexTable +=
    "\\end{tabular}\n" +
    "}\n" +
    "\\caption{Comparison of mutants generated using the \\CodeLlamaThirtyFour, \\CodeLlamaThirteen, and \\Mixtral LLMs at temperature 0.0}\n" +
    "\\label{table:CompareLLMs}\n" +
    "\\end{table*}\n";
  console.log(latexTable);
}

// usage: node benchmark/compareLLMs.js <baseDir> <list of subdirs>

const baseDir = process.argv[2];
const runs = process.argv.slice(3);
generateTable(baseDir, runs);
