import * as fs from "fs";
import path from "path";
import { generateMutantsTable, getTemperature, getTemplate } from "./generateMutantsTable";
import { generateCostsTable } from "./generateCostsTable";
import { generateVariabilityTable } from "./generateVariabilityTable";  
 

const dataDir = process.argv[2]; // read dataDir from command line
const outputDir = process.argv[3]; // read outputDir from command line

// check if both directories exist
if (!fs.existsSync(dataDir)) {
  throw new Error(`Directory ${dataDir} does not exist`);
}
if (!fs.existsSync(outputDir)) {
  console.log(`Directory ${outputDir} does not exist, creating it`);
  fs.mkdirSync(outputDir);
}

console.log(`Generating tables from data in ${dataDir} and saving them in ${outputDir}`);

for (const modelName of ['codellama-34b-instruct', 'codellama-13b-instruct', 'mixtral-8x7b-instruct']) {
  const modelNameDir = `${dataDir}/${modelName}`;
  const configurations = fs.readdirSync(modelNameDir);
  // console.log(`configurations for ${modelName} = ${configurations}`);
  for (const configuration of configurations) {
    // console.log(`*** configuration = ${configuration}`);
    const configurationDir = `${modelNameDir}/${configuration}`;
    console.log(`generating tables for ${modelName} with ${configuration}`);
    for (const run of fs.readdirSync(configurationDir)) {
      if (!run.startsWith('run')) continue;
      const runDir = `${configurationDir}/${run}`;
      const runNr = parseInt(run.substring(3));
      const mutantsTable: string = generateMutantsTable(`${runDir}/zip`, runNr);
      const costsTable: string = generateCostsTable(`${runDir}/zip`, runNr);
      
      // write table to the appropriate file in the output directory
      const subDir = `${configuration}`;
      
      const mutantsTableFileName = `${run}-mutants-table.tex`;
      const mutantsTablePath = path.join(outputDir, modelName, subDir, run, mutantsTableFileName);
      
      const costsTableFileName = `${run}-costs-table.tex`;
      const costsTablePath = path.join(outputDir, modelName, subDir, run, costsTableFileName);

      // check if the directory exists, create if necessary
      if (!fs.existsSync(path.join(outputDir, modelName))) {
        fs.mkdirSync(path.join(outputDir, modelName));
      }
      if (!fs.existsSync(path.join(outputDir, modelName, subDir))) {
        fs.mkdirSync(path.join(outputDir, modelName, subDir));
      }
      if (!fs.existsSync(path.join(outputDir, modelName, subDir, run))) {
        fs.mkdirSync(path.join(outputDir, modelName, subDir, run));
      }
      console.log(`  -- writing mutants table for run #${runNr} of ${modelName} with configuration ${configuration} to ${mutantsTablePath}`);
      fs.writeFileSync(mutantsTablePath, mutantsTable);
      console.log(`  -- writing costs table for run #${runNr} of ${modelName} with configuration ${configuration} to ${costsTablePath}`);
      fs.writeFileSync(costsTablePath, costsTable);
    }
    // generate the variability table
    const runs = fs.readdirSync(configurationDir).filter((run) => run.startsWith('run'));
    const variabilityTable = generateVariabilityTable(configurationDir, runs);
    const temperature = getTemperature(`${configurationDir}/${runs[0]}/zip`);
    const tableFileName = `table-variability-${modelName}-${configuration}.tex`;
    const variabilityTablePath = path.join(outputDir, 'variability', tableFileName);
    // console.log(`variability table for ${modelName} with ${configuration} = ${variabilityTable}`);
    if (!fs.existsSync(path.join(outputDir, 'variability'))) {
      fs.mkdirSync(path.join(outputDir, 'variability'));
    }
    console.log(`  -- writing variability table for runs# ${runs} of ${modelName} with ${configuration} to ${variabilityTablePath}`);
    fs.writeFileSync(variabilityTablePath, variabilityTable);
  }
}
