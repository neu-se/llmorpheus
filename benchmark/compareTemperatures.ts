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

function numberWithCommas(x: number): string {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Generate a LaTeX table that shows the number of mutants generated
 * at different temperatures.
 */
function generateTable(baseDir: string, runs: string[]): void {
  // generate latex table that looks as follows:
  //   \begin{table*}
  //   \centering
  //   {\scriptsize
  //   \begin{tabular}{l||cccc|cccc|cccc|cccc}
  //           &     \multicolumn{4}{|c|}{\bf temp. 0.0}                     &  \multicolumn{4}{|c|}{\bf temp. 0.25} &   \multicolumn{4}{|c|}{\bf temp. 0.50} &  \multicolumn{4}{|c}{\bf temp. 1.0} \\
  //                         &  \Total & \Killed & \Survived & \Timeout
  //                         &  \Total & \Killed & \Survived & \Timeout
  //                         &  \Total & \Killed & \Survived & \Timeout
  //                         &  \Total & \Killed & \Survived & \Timeout  \\
  //     \hline
  //     \hline
  //     \textit{Complex.js} &  1 & 2 & 3 & 4 & 5 & 6 & 7 & 8 & 9 & 10 & 11 & 12 & 13 & 14 & 15 & 16 \\
  //    \hline
  //    \textit{countries-and-timezones} &  1 & 2 & 3 & 4 & 5 & 6 & 7 & 8 & 9 & 10 & 11 & 12 & 13 & 14 & 15 & 16 \\
  //   \end{tabular}
  //   }
  //   \caption{the table}
  // \end{table*}

  const runNrs = runs.map((path) =>
    path
      .substring(path.lastIndexOf("run"), path.length)
      .replace("run", "run \\#")
  );
  let latexTable = `
% This table was generated using command: "node benchmark/compareTemperatures.js ${baseDir} ${runs.join(
    " "
  )}
\\begin{table*}
\\centering
{\\scriptsize
\\begin{tabular}{l||rrrr|rrrr|rrrr|rrrr}
    & \\multicolumn{4}{|c|}{\\bf temp. 0.0 \\ChangedText{(${
      runNrs[0]
    })}} &  \\multicolumn{4}{|c|}{\\bf temp. 0.25 \\ChangedText{(${
    runNrs[1]
  })}} & \\multicolumn{4}{|c|}{\\bf temp. 0.50 \\ChangedText{(${
    runNrs[2]
  })}} &  \\multicolumn{4}{|c}{\\bf temp. 1.0 \\ChangedText{(${
    runNrs[3]
  })}} \\\\
    &  \\Total & \\Killed & \\Survived & \\Timeout
    &  \\Total & \\Killed & \\Survived & \\Timeout
    &  \\Total & \\Killed & \\Survived & \\Timeout
    &  \\Total & \\Killed & \\Survived & \\Timeout  \\\\
\\hline
\\hline`;
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
  latexTable +=
    "\\end{tabular}\n" +
    "}\n" +
    "\\caption{Number of mutants generated using the \\CodeLlamaThirtyFour LLM at temperatures 0.0, 0.25, 0.5, and 1.0}\n" +
    "\\label{table:Temperature}\n" +
    "\\end{table*}\n";
  console.log(latexTable);
}

// usage: node benchmark/compareTemperatures.js <baseDir> <list of subdirs

const baseDir = process.argv[2];
const runs = process.argv.slice(3);
generateTable(baseDir, runs);
