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

const FILE = `/Users/jilin/projects/antd/rc-antd/components/affix/index.tsx`;
// const FILE = `/Users/jilin/projects/antd/rc-antd/components/tree-select/index.tsx`;

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


  // function debugNode(level, title, node, all) {
  //   const { text } = sourceFile;
  //   const clone = { ...node };
  //   delete clone.parent;

  //   console.log(
  //     chalk.cyan(`[NODE - ${String(level).padStart(2, '0')}]`),
  //     getKind(node),
  //     title,
  //     all !== false ? chalk.yellow(
  //       `\n${text.slice(node.pos, node.end).trim()}`,
  //     ) : '',
  //     all !== false ? chalk.gray(
  //       text.substr(node.end, 15),
  //     ) : '',
  //     all === true ? '\n' : '',
  //     all === true ? clone : '',
  //   );
  // }

  // function loopNode(level, node, print = false) {
  //   let subPrint = print;

  //   debugNode(level, '', node, false);
  //   // switch (node.kind) {
  //   //   case SyntaxKind.ExportKeyword:
  //   //     debugNode(level, 'KIND', node);
  //   //     print = true;
  //   //     subPrint = true;
  //   //     break;
  //   //   case SyntaxKind.NamespaceExportDeclaration:
  //   //     debugNode(level, 'KIND', node);
  //   //     break;
  //   //   case SyntaxKind.ExportAssignment:
  //   //     debugNode(level, 'KIND', node, true);
  //   //     subPrint = true;
  //   //     break;
  //   //   case SyntaxKind.ExportDeclaration:
  //   //     debugNode(level, 'KIND', node);
  //   //     break;
  //   //   case SyntaxKind.NamedExports:
  //   //     debugNode(level, 'KIND', node);
  //   //     break;
  //   //   case SyntaxKind.ExportSpecifier:
  //   //     debugNode(level, 'KIND', node);
  //   //     break;
  //   // }

  //   if (print) {
  //     debugNode(level, 'SUB EXPORT', node, true);
  //   }

  //   forEachChild(node, (subNode) => {
  //     loopNode(level + 1, subNode, subPrint);
  //   });
  // }

  // loopNode(0, sourceFile);
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
