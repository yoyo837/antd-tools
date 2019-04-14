/* eslint-disable no-multi-assign */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');
const { createSourceFile, ScriptTarget, SyntaxKind, forEachChild } = require('typescript');
const argv = require('minimist')(process.argv.slice(2));
const babel = require('@babel/core');
const ProgressBar = require('progress');
const getBabelCommonConfig = require('../../getBabelCommonConfig');
const { getProjectPath } = require('../../utils/projectHelper');
const { findExport } = require('./utils');

// const FILE = `/Users/jilin/projects/antd/rc-antd/components/affix/index.tsx`;
const FILE = `/Users/jilin/projects/antd/rc-antd/components/tree-select/index.tsx`;

function getKind(node) {
  return SyntaxKind[node.kind];
}

function parseFile(filePath) {
  // ==================== Parse File to Node
  const sourceFile = createSourceFile(
    filePath,
    fs.readFileSync(filePath).toString(),
    ScriptTarget.ES2015,
    /*setParentNodes */ true,
  );

  findExport(sourceFile);
}

// ================================ Export Processor ===============================
module.exports = function(done) {
  let returnCode;

  try {
    const componentPathList = getProjectPath('components/*/index.ts*');
    const tsConfig = require(getProjectPath('tsconfig.json'));
    const globConfig = {};
    const tsFiles = glob.sync(componentPathList, globConfig);

    // ============== Read Files ==============
    parseFile(FILE);
  } catch (err) {
    console.error('OPS >>>', err);
  }

  done(returnCode);
};
