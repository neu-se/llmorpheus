const fs = require('fs');

 

function generateLatexTable(title, dirName){
  console.log(`dirName: ${dirName}`);
  let report = `\\begin{table*}\n`;
  report += ` \\centering\n`;
  report += ` {\\scriptsize\n`;
  report += ` \\begin{tabular}{l||r|r|r|r|r|r}\n`;
  report += `   {\\bf application} & {\\bf \\#mutants} & {\\bf \\#killed} & {\\bf \\#survived} & {\\bf \\#timeout} & {\\bf mutation score} & {\\bf time (sec)}\\\\\n`;
  report += `   \\hline\n`;
  const files = fs.readdirSync(dirName);
  let totalKilled = 0;
  let totalSurvived = 0;
  let totalTimedOut = 0;
  let totalMutants = 0;
  let totalStrykerTime = 0;
  for (const benchmark of files) {
    const data = fs.readFileSync(`${dirName}/${benchmark}/StrykerInfo.json`, 'utf8');
    const jsonObj = JSON.parse(data);
    const nrMutants = parseInt(jsonObj.nrKilled) + parseInt(jsonObj.nrSurvived) + parseInt(jsonObj.nrTimedOut);
    const nrKilled = parseInt(jsonObj.nrKilled);
    const nrSurvived = parseInt(jsonObj.nrSurvived);
    const nrTimedOut = parseInt(jsonObj.nrTimedOut);
    const mutationScore = parseFloat(jsonObj.mutationScore);
    const strykerTime = timeInSeconds(jsonObj.time);
   
    // update totals
    totalKilled += nrKilled;
    totalSurvived += nrSurvived;
    totalTimedOut += nrTimedOut;
    totalMutants += nrMutants;
    totalStrykerTime += strykerTime;

    report += `   \\textit{${benchmark}} & ${nrMutants} & ${nrKilled} & ${nrSurvived} & ${nrTimedOut} & ${mutationScore.toFixed(2)} & ${formatNr(strykerTime,2)} \\\\ \n`;
    report += `   \\hline\n`;
  }
  if (files.length > 1){
    report += `   \\textit{Total} & ${totalMutants} & ${totalKilled} & ${totalSurvived} & ${formatNr(totalTimedOut)} & - & ${formatNr(totalStrykerTime,2)} \\\\ \n`;
  }
  report += ` \\end{tabular}\n`;
  report += ` }\n`;
  report += ` \\caption{Results of applying the standard mutation operators of \\StrykerJS.\n`;
  report += ` }\n`;
  report += `\\end{table*}\n`;
  console.log(report);
}

/** Format a number with commas to separate thousands and millions, limit to
 *  two decimal places. Example: 1234567.2345 -> 1,234,567.23
 **/
function formatNr(x, nrDecimals=0) {
  return x.toFixed(nrDecimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
    
function retrieveMetaData(mutantsDirName){
  const files = fs.readdirSync(mutantsDirName);
  const benchmark = files[0];
  const data = fs.readFileSync(`${mutantsDirName}/${benchmark}/summary.json`, 'utf8');
  const jsonObj = JSON.parse(data);
  return {
    modelName: jsonObj.metaInfo.modelName,
    temperature: jsonObj.metaInfo.temperature,
    maxTokens: jsonObj.metaInfo.maxTokens,
    maxNrPrompts: jsonObj.metaInfo.maxNrPrompts,
    template: jsonObj.metaInfo.template,
    systemPrompt: jsonObj.metaInfo.systemPrompt,
    rateLimit: jsonObj.metaInfo.rateLimit,
    nrAttempts: jsonObj.metaInfo.nrAttempts,
    benchmark: jsonObj.metaInfo.benchmark,
    mutate: jsonObj.metaInfo.mutate,
    ignore: jsonObj.metaInfo.ignore
  }
}

/** 
 * Converts a string that was produced by the Unix time command (e.g, "2m0.390s")
 * to seconds. Output the number using up to two decimal places (e.g., 0.2342 -> 0.23)
 * @param {string} time - the time string
 * @returns {number} - the time in seconds
 */
function timeInSeconds(time){
  const minutes = parseInt(time.substring(0, time.indexOf('m')));
  const seconds = parseFloat(time.substring(time.indexOf('m')+1, time.indexOf('s')));
  return parseFloat((minutes*60 + seconds).toFixed(2));
}

const title = process.argv[2];
const dirName = process.argv[3];
generateLatexTable(title, dirName);
