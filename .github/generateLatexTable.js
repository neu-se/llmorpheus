const fs = require('fs');

function generateLatexTable(title, dirName, mutantsDirName){
  if (!mutantsDirName) {
    throw new Error("Mutants directory is required for this script");
  } else {
    generateLatexTableForLLMorpheusExperiment(title, dirName, mutantsDirName);
  }
}

function generateLatexTableForLLMorpheusExperiment(title, dirName, mutantsDirName){
  let report = `\\begin{table*}\n`;
  report += ` \\centering\n`;
  report += ` {\\scriptsize\n`;
  report += ` \\begin{tabular}{l||r|r|r|r|r|r||r|r||r|r|r}\n`;
  report += `   {\\bf application}                & {\\bf \\#prompts}   & {\\bf \\#mutants} & {\\bf \\#killed} & {\\bf \\#survived} & {\\bf \\#timeout} & \\multicolumn{1}{|c||}{\\bf mutation}   & \\multicolumn{2}{|c||}{\\bf time (sec)} & \\multicolumn{3}{|c}{\\bf \\\#tokens}\\\\\n`;
  report += `                                    &                   &                 &                &                  &                 & \\multicolumn{1}{|c||}{\\bf score}    & \\ToolName & {\\it StrykerJS}  & {\\bf prompt} & {\\bf completion} & {\\bf total}\\\\\n`;
  report += `   \\hline\n`;
  const files = fs.readdirSync(dirName);
  let totalPrompts = 0;
  let totalKilled = 0;
  let totalSurvived = 0;
  let totalTimedOut = 0;
  let totalMutants = 0;
  let totalLLMorpheusTime = 0;
  let totalStrykerTime = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTotalTokens = 0;
  for (const benchmark of files) {
    const data = fs.readFileSync(`${dirName}/${benchmark}/StrykerInfo.json`, 'utf8');
    const llmData = fs.readFileSync(`${mutantsDirName}/${benchmark}/summary.json`, 'utf8');
    const llmJsonObj = JSON.parse(llmData);
    const jsonObj = JSON.parse(data);
    const nrPrompts = parseInt(llmJsonObj.nrPrompts);
    const nrMutants = parseInt(jsonObj.nrKilled) + parseInt(jsonObj.nrSurvived) + parseInt(jsonObj.nrTimedOut);
    const nrKilled = parseInt(jsonObj.nrKilled);
    const nrSurvived = parseInt(jsonObj.nrSurvived);
    const nrTimedOut = parseInt(jsonObj.nrTimedOut);
    const mutationScore = parseFloat(jsonObj.mutationScore);
    const strykerTime = timeInSeconds(jsonObj.time);
    const llmOutput = fs.readFileSync(`${mutantsDirName}/${benchmark}/LLMorpheusOutput.txt`, 'utf8');
    const lines = llmOutput.split('\n');
    const llmorpheusTime = timeInSeconds(lines[lines.length-4].substring(5).trim());
    const nrTokensPrompt = llmJsonObj.totalPromptTokens;
    const nrTokensCompletion = llmJsonObj.totalCompletionTokens
    const nrTokensTotal = nrTokensPrompt + nrTokensCompletion;

    // update totals
    totalPrompts += nrPrompts;
    totalKilled += nrKilled;
    totalSurvived += nrSurvived;
    totalTimedOut += nrTimedOut;
    totalMutants += nrMutants;
    totalStrykerTime += strykerTime;
    totalLLMorpheusTime += llmorpheusTime;
    totalPromptTokens += nrTokensPrompt;
    totalCompletionTokens += nrTokensCompletion;
    totalTotalTokens += nrTokensTotal;

    report += `   \\textit{${benchmark}} & ${nrPrompts} & ${nrMutants} & ${nrKilled} & ${nrSurvived} & ${nrTimedOut} & ${mutationScore.toFixed(2)} & ${formatNr(llmorpheusTime,2)} & ${formatNr(strykerTime,2)} & ${formatNr(nrTokensPrompt)} & ${formatNr(nrTokensCompletion)} & ${formatNr(nrTokensTotal)} \\\\ \n`;
    report += `   \\hline\n`;
  }
  if (files.length > 1){
    report += `   \\textit{Total} & ${totalPrompts} & ${totalMutants} & ${totalKilled} & ${totalSurvived} & ${formatNr(totalTimedOut)} & - & ${formatNr(totalLLMorpheusTime,2)}  & ${formatNr(totalStrykerTime,2)} & ${formatNr(totalPromptTokens)} & ${formatNr(totalCompletionTokens)} & ${formatNr(totalTotalTokens)} \\\\ \n`;
  }
  report += ` \\end{tabular}\n`;
  report += ` }\n`;
  const metaData = retrieveMetaData(mutantsDirName);
  report += ` \\caption{Results obtained with LLMorpheus using the following parameters: \n`;
  report += `   model: \\textit{${metaData.modelName}}, \n`;
  report += `   temperature: ${metaData.temperature}, \n`;
  report += `   MaxTokens: ${metaData.maxTokens}, \n`;
  report += `   MaxNrPrompts: ${metaData.maxNrPrompts}, \n`;
  report += `   template: \\textit{${metaData.template.substring(metaData.template.lastIndexOf('/')+1)}}, \n`;
  report += `   systemPrompt: ${metaData.systemPrompt.substring(metaData.systemPrompt.lastIndexOf('/')+1)}, \n`;
  report += `   rateLimit: ${metaData.benchmark ? "benchmark mode" : metaData.rateLimit}, \n`;
  report += `   nrAttempts: ${metaData.nrAttempts}  \n`;
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
const mutantsDirName = process.argv[4];
generateLatexTable(title, dirName, mutantsDirName);
