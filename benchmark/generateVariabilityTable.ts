import fs from "fs";
import path from "path";

function numberWithCommas(x: number): string {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

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
const runToMutants = new Map<string, Set<string>>();

function getMutantInfo(mutant: any): string {
  return JSON.stringify({
    fileName: mutant.fileName,
    lineNr: mutant.lineNr,
    startLine: mutant.startLine,
    startColumn: mutant.startColumn,
    endLine: mutant.endLine,
    endColumn: mutant.endColumn,
    originalCode: mutant.originalCode,
    replacement: mutant.replacement,
  });
}

/**
 * Retrieve the mutants generated for a project.
 */
function retrieveMutantsForProject(
  baseDir: string,
  run: string,
  projectName: string
): Set<string> {
  const data = fs.readFileSync(
    path.join(baseDir, run, projectName, "mutants.json"),
    "utf8"
  );
  return new Set(JSON.parse(data).map((x: any) => getMutantInfo(x)));
}

/**
 * Find all mutants for a project across all runs.
 */
function findAllMutants(
  baseDir: string,
  runs: string[],
  projectName: string
): Set<string> {
  const allMutants = new Set<string>();
  for (const run of runs) {
    runToMutants.set(run, retrieveMutantsForProject(baseDir, run, projectName));
    for (const mutant of runToMutants.get(run)!) {
      allMutants.add(mutant);
    }
  }
  return allMutants;
}

function findCommonMutants(
  baseDir: string,
  runs: string[],
  projectName: string
): Set<string> {
  const allMutants = findAllMutants(baseDir, runs, projectName);
  let commonMutants = new Set<string>();
  for (const mutant of allMutants) {
    let isCommon = true;
    for (const fileName of runs) {
      if (!runToMutants.get(fileName)!.has(mutant)) {
        isCommon = false;
        break;
      }
    }
    if (isCommon) {
      commonMutants.add(mutant);
    }
  }
  return commonMutants;
}

function getModelName(baseDir: string, run: string): string {
  const file = fs.readFileSync(
    path.join(path.join(baseDir, run, projectNames[0], "summary.json")),
    "utf8"
  );
  const json = JSON.parse(file);
  return json.metaInfo.modelName;
}

function getTemperature(baseDir: string, run: string): string {
  const file = fs.readFileSync(
    path.join(path.join(baseDir, run, "zip", projectNames[0], "summary.json")),
    "utf8"
  );
  const json = JSON.parse(file);
  const temperature = json.metaInfo.temperature;
  if (temperature === 0.25) {
    return parseFloat(json.metaInfo.temperature).toFixed(2);
  }
  return parseFloat(json.metaInfo.temperature).toFixed(1);
}

/**
 * Generate a LaTeX table that shows the variability of mutants across runs.
 */
export function generateVariabilityTable(
  baseDir: string,
  runs: string[]
): string {
  let latexTable = `
% table generated using command: "node benchmark/generateVariabilityTable.js ${baseDir} ${runs.join(
    " "
  )}"
\\begin{table}[hbt!]
\\centering
{\\scriptsize
\\begin{tabular}{l|r|r|r|r}\n
{\\bf application}  & {\\bf \\#min} &  {\\bf \\#max} &  {\\bf \\#distinct} & {\\bf \\#common}\\\\
\\hline\n`;
  for (const projectName of projectNames) {
    const allMutants = findAllMutants(baseDir, runs, projectName);
    const allMutantsSize = allMutants.size;
    const minMutants = Math.min(
      ...runs.map((run) => runToMutants.get(run)!.size)
    );
    const maxMutants = Math.max(
      ...runs.map((run) => runToMutants.get(run)!.size)
    );
    const commonMutants = findCommonMutants(baseDir, runs, projectName);
    const percentage = commonMutants.size / allMutantsSize;
    latexTable += `\\\hline\n\\textit{${projectName}} & ${numberWithCommas(
      minMutants
    )} & ${numberWithCommas(maxMutants)} & ${numberWithCommas(
      allMutantsSize
    )} & ${numberWithCommas(commonMutants.size)} (${(percentage * 100).toFixed(
      2
    )}\\%) \\\\ \n`;
  }
  const modelName = getModelName(baseDir, runs[0]);
  const temperature = getTemperature(baseDir, runs[0]);
  latexTable +=
    "\\end{tabular}\n}\n" +
    "\\vspace*{2mm}\n\\caption{\n" +
    `  Variability of the mutants generated in 5 runs of \\ToolName using the \\textit{${modelName}} LLM
       at temperature ${temperature} \\ChangedText{(run ${runs.map((s) =>
      s.replace("run", "\\#")
    )})}. The columns of the table show, from left to right:\n` +
    "    (i) the minimum number of mutants observed in any of the runs,\n" +
    "    (ii) the maximum number of mutants observed in any of the runs,\n" +
    "    (iii) the total number of distinct mutants observed in all runs, and\n" +
    "    (iv) the number (percentage) of mutants are observed in all runs.\n" +
    "}\n" +
    `\\label{table:Variability_${modelName}_${temperature}}\n` +
    "\\end{table}";
  return latexTable;
}

// to be executed from the command line only
// usage: node benchmark/computeVariability.js <baseDir> <list of subdirs>
if (require.main === module) {
  const baseDir = process.argv[2];
  const runs = process.argv.slice(3);
  const table = generateVariabilityTable(baseDir, runs);
  console.log(table);
}
