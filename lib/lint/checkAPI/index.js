/* eslint-disable no-multi-assign */
const glob = require('glob');
const { getProjectPath } = require('../../utils/projectHelper');
const { wrapFile, findFileTypeDefinition } = require('./utils');

// const FILE = `/Users/jilin/projects/antd/rc-antd/components/affix/index.tsx`;
// const FILE = `/Users/jilin/projects/antd/rc-antd/components/tree-select/index.tsx`;
const FILE = `/Users/jilin/projects/antd/rc-antd/components/anchor/index.tsx`;

function parseFile(filePath) {
  // ==================== Parse File to Node
  const sourceFile = wrapFile(filePath);
  const propNameList = findFileTypeDefinition(sourceFile, {
    filePath,
  });
  console.log(filePath, '\n', propNameList);
}

// ================================ Export Processor ===============================
module.exports = function(done) {
  let returnCode;

  try {
    const componentPathList = getProjectPath('components/*/index.ts*');
    const globConfig = {};
    const tsFiles = glob.sync(componentPathList, globConfig);

    // ============== Read Files ==============
    // tsFiles.forEach((filePath, index) => {
    //   if (index > 5) return;

    //   parseFile(filePath);
    // });
    parseFile(FILE);
  } catch (err) {
    console.error('OPS >>>', err);
  }

  done(returnCode);
};
