import * as fs from "fs";

function createTableFooter(dirName: string, runNr: number) : string {
  // get meta-info from first benchmark
  const results = fs.readdirSync(dirName);  
  const firstBenchmarkName = results[0];
  const firstBenchmarkFile = fs.readFileSync(
    `${dirName}/${firstBenchmarkName}/summary.json`,
    "utf8"
  );
  const firstSummary = JSON.parse(firstBenchmarkFile);
  const modelName = firstSummary.metaInfo.modelName;
  let temperature = firstSummary.metaInfo.temperature;
  if (temperature === "0" || temperature === 0) {
    temperature = "0.0";
  }
  if (temperature === "1" || temperature === 1) {
    temperature = "1.0";
  }
  const maxTokens = firstSummary.metaInfo.maxTokens;
  const maxNrPrompts = firstSummary.metaInfo.maxNrPrompts;
  let template = firstSummary.metaInfo.template;  
  template = template.substring(template.indexOf('/') + 1);
  const systemPrompt = firstSummary.metaInfo.systemPrompt;
  const rateLimit = firstSummary.metaInfo.rateLimit;
  const nrAttempts = firstSummary.metaInfo.nrAttempts;

  return `\\end{tabular}
  }
  \\\\[2mm]
  \\caption{Results from LLMorpheus experiment \\ChangedText{(run \\#${runNr})}.
    Model: \\textit{${modelName}}, 
    temperature: ${temperature}, 
    maxTokens: ${maxTokens}, 
    maxNrPrompts: ${maxNrPrompts}, 
    template: \\textit{${template}}, 
    systemPrompt: \\textit{${systemPrompt}}, 
    rateLimit: ${rateLimit}, 
    nrAttempts: ${nrAttempts}.  
  }
  \\label{table:Cost:run${runNr}:${modelName}:${template}:${temperature}}
\\end{table*}`;
}

/**
 * Convert a string like "19m16.114s" to seconds.
 * Use commas to separate thousands.
 */
function convertToSeconds(time: string): number {
  const timeParts = time.split(/m|s/);
  const minutes = parseInt(timeParts[0]);
  const seconds = parseFloat(timeParts[1]);
  return (minutes * 60 + seconds);
}

function formatFixedNr(nr: number): string {
  const fixedString = nr.toFixed(2).toString();
  const dotIndex = fixedString.indexOf(".");
  const beforeDot = fixedString.slice(0, dotIndex);
  const afterDot = fixedString.slice(dotIndex);
  return `${numberWithCommas(parseInt(beforeDot))}${afterDot}`;
}

/**
 * Use commas to separate thousands.
 */
function numberWithCommas(x: number): string {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// create table with columns: time (LLMorpheus), time (Stryker), prompt tokens, completion tokens, total tokens
export function generateCostsTable(dirName: string, runNr: number) : string {
  const results = fs.readdirSync(dirName);
   
  let totalLLMorpheusTime = 0;
  let totalStrykerTime = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTotalTokens = 0;
  
  let result = `
% table generated using command: "node benchmark/generateCostsTable.js ${dirName} ${runNr}"
\\begin{table*}[hbt!]
\\centering
\{\\scriptsize
\\begin{tabular}{l||r|r|r|r|r}
\\multicolumn{1}{c|}{\\bf project} & \\multicolumn{2}{|c|}{\\bf time (sec)} & \\multicolumn{3}{|c|}{\\bf \\#tokens} \\\\
               & {\\it LLMorpheus} & {\\it StrykerJS} & {\\bf prompt} & {\\bf compl.} & {\\bf total} \\\\
\\hline
  `;
  for (const benchmarkName of results) {
    if (benchmarkName.startsWith(".")) continue;
    if (benchmarkName.endsWith(".zip")) continue;
    const file = fs.readFileSync(
      `${dirName}/${benchmarkName}/summary.json`,
      "utf8"
    );
    const summary = JSON.parse(file);
    const promptTokens = numberWithCommas(parseInt(summary.totalPromptTokens));
    const completionTokens = numberWithCommas(parseInt(summary.totalCompletionTokens));
    const totalTokens = numberWithCommas(parseInt(summary.totalTokens));
    const strykerInfo = JSON.parse(fs.readFileSync(
      `${dirName}/${benchmarkName}/StrykerInfo.json`,
      "utf8"
    ));
    const strykerTime: number = convertToSeconds(strykerInfo.time);

    // retrieve LLMorpheus time from the third to last line of file LLMorpheusOutput.txt after the word "real"
    const LLMorpheusOutput = fs.readFileSync(
      `${dirName}/${benchmarkName}/LLMorpheusOutput.txt`,
      "utf8"
    );
    const lines = LLMorpheusOutput.split("\n");
    const summaryLine = lines[lines.length - 4]; 
    const summaryLineParts = summaryLine.split("real");
    const summaryLineTime = summaryLineParts[1].trim();
    const LLMorpheusTime: number = convertToSeconds(summaryLineTime);

    result += `${benchmarkName} & ${formatFixedNr(LLMorpheusTime)} & ${formatFixedNr(strykerTime)} & ${promptTokens} & ${completionTokens} & ${totalTokens} \\\\ \n`;

    totalLLMorpheusTime += LLMorpheusTime;
    totalStrykerTime += strykerTime;
    totalPromptTokens += parseInt(summary.totalPromptTokens);
    totalCompletionTokens += parseInt(summary.totalCompletionTokens);
    totalTotalTokens += parseInt(summary.totalTokens);

  }
  result += `\\hline
  \\textit{Total} & ${formatFixedNr(totalLLMorpheusTime)} & ${formatFixedNr(totalStrykerTime)} & ${numberWithCommas(totalPromptTokens)} & ${numberWithCommas(totalCompletionTokens)} & ${numberWithCommas(totalTotalTokens)} \\\\
  `;
  result += createTableFooter(dirName, runNr);
  return result;
  }

// to be executed from the command line only
if (require.main === module) {  
  const dirName = process.argv[2]; // read dirName from command line
  const pathEntries = dirName.split('/');
  const lastEntry = pathEntries[pathEntries.length-1];
  if (!lastEntry.startsWith('run')){
    throw new Error("Usage: node <path-to-llmorpheus>/benchmark/generateCostsTable.js <path-to-run>");
  }
  const runNr = parseInt(lastEntry.substring(3));
  const table = generateCostsTable(dirName + '/zip', runNr);

  console.log(table);
}
