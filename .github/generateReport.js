const fs = require('fs');

function generateReport(title, dirName, mutantsDirName){
  if (!mutantsDirName) {
    generateStandardReport(title, dirName);
  } else {
    generateLLMorpheusReport(title, dirName, mutantsDirName);
  }
}

function generateLLMorpheusReport(title, dirName, mutantsDirName){
  let report = `# ${title}\n`
  report += '| Project | #Prompts | #Mutants | #Killed | #Survived | #Timeout | MutationScore | LLMorpheus Time | Stryker Time | #Prompt Tokens | #Completion Tokens | #Total Tokens  |\n';
  report += '|:--------|:---------|:---------|:--------|:----------|----------|---------------|-----------------|--------------|----------------|--------------------|----------------|\n';
  const files = fs.readdirSync(dirName);
  let totalMutants = 0;
  let totalKilled = 0;
  let totalSurvived = 0;
  let totalTimedOut = 0;
  let totalPrompts = 0;
  let totalLLMorpheusTime = 0;
  let totalStrykerTime = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTotalTokens = 0;
  for (const benchmark of files) {  
    const data = fs.readFileSync(`${dirName}/${benchmark}/StrykerInfo.json`, 'utf8');
    const jsonObj = JSON.parse(data);
    const nrKilled = parseInt(jsonObj.nrKilled);
    totalKilled += nrKilled;
    const nrSurvived = parseInt(jsonObj.nrSurvived);
    totalSurvived += nrSurvived;
    const nrTimedOut = parseInt(jsonObj.nrTimedOut);
    totalTimedOut += nrTimedOut;
    const nrTotal = nrKilled + nrSurvived + nrTimedOut;
    totalMutants += nrTotal;
    const mutationScore = parseFloat(jsonObj.mutationScore);
    const strykerTime = timeInSeconds(jsonObj.time);
    totalStrykerTime += strykerTime;
    
    const llmData = fs.readFileSync(`${mutantsDirName}/${benchmark}/summary.json`, 'utf8');
    const llmJsonObj = JSON.parse(llmData);
    const nrPrompts = parseInt(llmJsonObj.nrPrompts);
    totalPrompts += nrPrompts;
      
    // real time appears at the second to last line of the output
    const llmOutput = fs.readFileSync(`${mutantsDirName}/${benchmark}/LLMorpheusOutput.txt`, 'utf8');
    const lines = llmOutput.split('\n');
    const llmorpheusTime = timeInSeconds(lines[lines.length-4].substring(5).trim());
    totalLLMorpheusTime += llmorpheusTime;
    const nrPromptTokens = llmJsonObj.totalPromptTokens;
    totalPromptTokens += nrPromptTokens;
    const nrCompletionTokens = llmJsonObj.totalCompletionTokens;
    totalCompletionTokens += nrCompletionTokens;
    const nrTotalTokens = llmJsonObj.totalTokens;
    totalTotalTokens += nrTotalTokens;
    report += `| ${benchmark} | ${nrPrompts} | ${nrTotal} | ${nrKilled} | ${nrSurvived} | ${nrTimedOut} | ${mutationScore} | ${llmorpheusTime} | ${strykerTime} | ${nrPromptTokens} | ${nrCompletionTokens} | ${nrTotalTokens} |\n`;
  } 
  report += `| Total | ${totalPrompts} | ${totalMutants} | ${totalKilled} | ${totalSurvived} | ${totalTimedOut} | - | ${totalLLMorpheusTime.toFixed(2)} | ${totalStrykerTime.toFixed(2)} | ${totalPromptTokens} | ${totalCompletionTokens} | ${totalTotalTokens} |\n`;

  const metaData = retrieveMetaData(mutantsDirName);
  
  report += "## Experimental Parameters\n";
  report += `  - Model: ${metaData.modelName}\n`;
  report += `  - Temperature: ${metaData.temperature}\n`;
  report += `  - Max Tokens: ${metaData.maxTokens}\n`;
  report += `  - Max Nr of Prompts: ${metaData.maxNrPrompts}\n`;
  report += `  - Template: ${metaData.template.substring(metaData.template.lastIndexOf('/')+1)}\n`;
  report += `  - System Prompt: ${metaData.systemPrompt.substring(metaData.systemPrompt.lastIndexOf('/')+1)}\n`;  
  report += `  - Rate Limit: ${metaData.benchmark ? "benchmark mode" : metaData.rateLimit}\n`;
  report += `  - Number of Attempts: ${metaData.nrAttempts}\n`;
  report += "\n";
  console.log(report);
}  

function generateStandardReport(title, dirName){
  let report = `# ${title}\n`
  report += '| Project | #Mutants | #Killed | #Survived | #Timeout | MutationScore | Time |\n';
  report += '|:--------|:---------|:--------|:----------|----------|---------------|------|\n';
  const files = fs.readdirSync(dirName);
  let totalKilled = 0;
  let totalSurvived = 0;
  let totalTimedOut = 0;
  let totalMutants = 0;
  let totalTime = 0;
  for (const benchmark of files) {
    const data = fs.readFileSync(`${dirName}/${benchmark}/StrykerInfo.json`, 'utf8');
    const jsonObj = JSON.parse(data);
    const nrKilled = parseInt(jsonObj.nrKilled);
    totalKilled += nrKilled;
    const nrSurvived = parseInt(jsonObj.nrSurvived);
    totalSurvived += nrSurvived;
    const nrTimedOut = parseInt(jsonObj.nrTimedOut);
    totalTimedOut += nrTimedOut;
    const nrTotal = nrKilled + nrSurvived + nrTimedOut;
    totalMutants += nrTotal;
    const mutationScore = parseFloat(jsonObj.mutationScore);
    const strykerTime = timeInSeconds(jsonObj.time);
    totalTime += strykerTime;
    report += `| ${benchmark} | ${nrTotal} | ${nrKilled} | ${nrSurvived} | ${nrTimedOut} | ${mutationScore} | ${strykerTime} |\n`;
  }
  if (files.length > 1){
    report += `| Total | ${totalMutants} | ${totalKilled} | ${totalSurvived} | ${totalTimedOut} | - | ${totalTime.toFixed(2)} |\n`;
  }
  console.log(report);
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
generateReport(title, dirName, mutantsDirName);