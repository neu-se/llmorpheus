const fg = require('fast-glob');
const path = require('path');

/**
 * Expand a glob into a comma-separated list of files.
 * @param {string} dirName - the directory name.
 * @param {string} glob - glob pattern specifying the files to include.
 * @param {string} ignore - optional ignore pattern specifying the files to exclude.
 */
async function expandGlob(dirName, glob, ignore) {
  dirName = dirName.trim();
  if (dirName.endsWith('/')) {
    dirName = dirName.substring(0, dirName.length-1);
  }
  glob = path.join(dirName, glob);
  let files = ignore ? await fg([glob], { ignore: [ignore] }) : await fg([glob]);
  files = files.map(file => file.substring(dirName.length+1));
  console.log(files.join(','));
}

const dirName = process.argv[2];
const glob = process.argv[3];
const ignore = process.argv[4];
expandGlob(dirName, glob, ignore);