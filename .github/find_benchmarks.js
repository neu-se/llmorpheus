const { readFileSync } = require("fs");
const { join } = require("path");

function parsePackage(packageURL) {
  // console.log(`packageURL = ${packageURL}`);
  let pkg = new URL(packageURL);

  // pathname is /<owner>/<repo>/tree/<sha>/<path>
  // gitlab urls sometimes have an extra entry e.g., https://gitlab.com/nerd-vision/opensource/gitlab-js/tree/c2c9ef54b1ea0fc82b284bc72dc2ff0935983f4c
  const components = pkg.pathname.split("/");
  if (
    components.length < 5 ||
    (components[3] !== "tree" && components[4] !== "tree")
  ) {
    throw new Error(`Invalid package URL: ${packageURL}`);
  }

  var sliceIndex = 5;
  var owner = components[1];
  var repo = components[2];
  var sha = components[4];

  if (pkg.host === "gitlab.com") {
    if (components.length > 5) {
      owner = components[1].concat("/", components[2]);
      repo = components[3];
      sha = components[5];
      sliceIndex = 6;
    }
  }

  return {
    host: pkg.host,
    owner: owner,
    repo: repo,
    sha: sha,
    path: components.slice(sliceIndex).join("/"),
  };
}

const packages = [];
const jsonFileName = process.argv[2].trim();
const json = JSON.parse(readFileSync(jsonFileName));
for (const benchmark of json) {
  const parsedPackage = parsePackage(benchmark.url);
  parsedPackage.name = benchmark.name;
  parsedPackage.files = benchmark.files;
  parsedPackage.ignore = benchmark.ignore;
  parsedPackage.edits = benchmark.edits;
  packages.push(parsedPackage);
}
console.log(JSON.stringify(packages));