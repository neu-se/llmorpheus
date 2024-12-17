const fs = require('fs');

 /* Extract the number of killed/surviving/timed-out mutants from a Stryker report.
 */
async function extractInfoFromStrykerReport(strykerReportFileName) {
  const strykerReport = fs.readFileSync(strykerReportFileName, 'utf8');
  
  // Print the summary. Starting from the end of the report, the summary begins 
  // on the line that starts with "All tests"
  const summaryIndex = strykerReport.lastIndexOf('All tests');
  const summary = strykerReport.slice(summaryIndex);
  // console.log(summary);

  // The overall statistics are on the line that starts with "All files"
  const allFilesLine = strykerReport.split('\n').find(line => line.startsWith('All files'));
 
  // the various statistics are separated by '|'
  const stats = allFilesLine.split('|');
  const mutationScore = stats[1].trim();
  const nrKilled = stats[2].trim();
  const nrTimedOut = stats[3].trim();
  const nrSurvived = stats[4].trim();

  // wallclock time is on the line that starts with "real"  
  const realTimeLine = summary.split('\n').find(line => line.startsWith('real'));
  const realTime = realTimeLine.substring(4).trim();
  console.log("Information extracted from Stryker report:");
  console.log(`  Mutation score: ${mutationScore} Killed: ${nrKilled}, TimedOut: ${nrTimedOut}, Survived: ${nrSurvived} Time: ${realTime}`);
  
  // write as JSON
  const result = {
    mutationScore: mutationScore,
    nrKilled: nrKilled,
    nrTimedOut: nrTimedOut,
    nrSurvived: nrSurvived,
    time: realTime
  };
  const json = JSON.stringify(result, null, 2);
  fs.writeFileSync('StrykerInfo.json', json);
}

const fileName = process.argv[2];
extractInfoFromStrykerReport(fileName);