import * as fs from "fs";

/** 
 * Converts a string that was produced by the Unix time command (e.g, "2m0.390s")
 * to seconds. Output the number using up to two decimal places (e.g., 0.2342 -> 0.23)
 * @param {string} time - the time string
 * @returns {number} - the time in seconds
 */
function timeInSeconds(time: string) : number {
  const minutes = parseInt(time.substring(0, time.indexOf('m')));
  const seconds = parseFloat(time.substring(time.indexOf('m')+1, time.indexOf('s')));
  return parseFloat((minutes*60 + seconds).toFixed(2));
}

/**
 * Use commas to separate thousands.
 */
function numberWithCommas(x: number | string): string {
  const y = (typeof x === "number") ? x.toString() : x;
  return y.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function generateStrykerTable(dirName: string) : string {
  let report = `
% Table generated using the commmand "node benchmark/generateStrykerTable.js ${dirName}"
\\begin{table*}[htb!]
  \\centering
  {\scriptsize
  \\begin{tabular}{l||r|r|r|r|r|r}
    {\\bf application} & {\\bf \\#mutants} & {\\bf \\#killed} & {\\bf \\#survived} & {\\bf \\#timeout} & {\\bf mut. score} & {\\bf time} \\\\
    \\hline`;
  const projectNames = fs.readdirSync(dirName);
  let totalMutants = 0;
  let totalKilled = 0;
  let totalSurvived = 0;
  let totalTimedOut = 0;
  let totalTime = 0;
  for (const projectName of projectNames) {
    const resultFile = fs.readFileSync(`${dirName}/${projectName}/StrykerInfo.json`, "utf8");
    const resultJson = JSON.parse(resultFile);
    const nrKilled = parseInt(resultJson.nrKilled);
    const nrSurvived = parseInt(resultJson.nrSurvived);
    const nrTimedOut = parseInt(resultJson.nrTimedOut);
    const nrMutants = nrKilled + nrSurvived + nrTimedOut;
    const time = timeInSeconds(resultJson.time).toFixed(2);
    const mutScore = resultJson.mutationScore;
    report += `
  {\\it ${projectName}} & ${numberWithCommas(nrMutants)} & ${numberWithCommas(nrKilled)} & ${numberWithCommas(nrSurvived)} & ${numberWithCommas(nrTimedOut)} & ${mutScore} & ${numberWithCommas(time)} \\\\
  \\hline`;
    totalMutants += nrMutants;
    totalKilled += nrKilled;
    totalSurvived += nrSurvived;
    totalTimedOut += nrTimedOut;
    totalTime += parseFloat(time);
  }
  report += `
  {\\it Total} & ${numberWithCommas(totalMutants)} & ${numberWithCommas(totalKilled)} & ${numberWithCommas(totalSurvived)} & ${numberWithCommas(totalTimedOut)} & --- & ${numberWithCommas(totalTime.toFixed(2))} \\\\
  \\end{tabular}
  }
  \\caption{Results of applying the standard mutation operators of \StrykerJS.}
  \\label{table:StrykerJSResults}
\\end{table*}
  `;
  return report;
}

// to be executed from the command line only
if (require.main === module) {
  let dirName = process.argv[2]; // read dirName from command line
  // remove trailing slash
  if (dirName.endsWith("/")) {
    dirName = dirName.substring(0, dirName.length - 1);
  }
  const table = generateStrykerTable(dirName);
  console.log(table);
}