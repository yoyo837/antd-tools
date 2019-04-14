const chalk = require('chalk');
const { createSourceFile, ScriptTarget, SyntaxKind, forEachChild } = require('typescript');
const wrapNode = require('./wrapNode');

// Get AST node kind
function getKind(node) {
  return SyntaxKind[node.kind];
}

function getRoot(node) {
  let root = node;
  while (root.parent) {
    root = root.parent;
  }
  return root;
}

function debugNode(node, title, type) {
  const clone = { ...node };
  delete clone.parent;

  const args = [ chalk.cyan('[DEBUG]'), chalk.green(getKind(node)), title ];

  switch (type) {
    case 'code':
      const { text } = getRoot(node);
      args.push(chalk.yellow(`\n${text.slice(node.pos, node.end).trim()}`));
      args.push(chalk.gray(text.substr(node.end, 15)));
      break;
    case 'node':
      args.push(clone);
      break;
  }

  console.log(...args);
}

function subNodeToArray(node) {
  const nodeList = [];
  forEachChild(node, (subNode) => {
    nodeList.push(subNode);
  });
  return nodeList;
}

// =============================== Find Default ===============================
// class My extends Component;
// export default My;
function findExportDefine(wrappedSourceFile) {
  const exportNode = wrappedSourceFile.queryMatch([
    { direction: 'child', kind: SyntaxKind.ExportAssignment },
  ]);

  if (exportNode) {
    // Get name of export like `My`:
    const identifierName = exportNode.node.expression.escapedText;

    // Find class definition
    const classNode = wrappedSourceFile.child(
      (node) =>
        node.kind === SyntaxKind.ClassDeclaration && node.name.escapedText === identifierName,
    );

    if (classNode) {
      return classNode.queryMatch([
        { direction: 'child', kind: SyntaxKind.HeritageClause },
        { direction: 'child', kind: SyntaxKind.ExpressionWithTypeArguments },
        { direction: 'child', kind: SyntaxKind.TypeReference },
      ]);
    }
  }

  return null;
}

// export default class My extends Component;
function findExportDirectly(wrappedSourceFile) {
  return wrappedSourceFile.queryMatch([
    { direction: 'child', kind: SyntaxKind.ExportKeyword },
    { direction: 'next', kind: SyntaxKind.DefaultKeyword },
    { direction: 'next', kind: SyntaxKind.Identifier },

    { direction: 'next', kind: SyntaxKind.HeritageClause },
    { direction: 'child', kind: SyntaxKind.ExpressionWithTypeArguments },
    { direction: 'child', kind: SyntaxKind.TypeReference },
  ]);
}

function findExport(sourceFile) {
  const wrappedSourceFile = wrapNode(sourceFile);
  const typeRefNode = findExportDefine(wrappedSourceFile) || findExportDirectly(wrappedSourceFile);

  if (typeRefNode) {
    console.log(chalk.green('Find Type definition!!!!'));
    debugNode(typeRefNode.node, 'TypeRefDef', 'node');

    const propsNode = wrappedSourceFile.queryMatch([
      {
        direction: 'child',
        kind: SyntaxKind.InterfaceDeclaration,
      },
      {
        direction: 'child',
        kind: SyntaxKind.Identifier,
        condition: (node) => node.escapedText === typeRefNode.node.typeName.escapedText,
      },
      {
        direction: 'next',
        kind: SyntaxKind.PropertySignature,
      },
    ]);

    let currentPropNode = propsNode;
    while (currentPropNode) {
      debugNode(currentPropNode.node, 'Prop', 'code');
      currentPropNode = currentPropNode.next();
    }

    // BFS(sourceFile, (node, { level }) => {
    //   if (
    //     node.kind === SyntaxKind.Identifier &&
    //     node.escapedText === typeRefNode.typeName.escapedText
    //   ) {
    //     if (level === 2) {
    //       // debugNode(node, '->' + level, 'code');
    //       // debugNode(node, '---->' + level, 'node');

    //       const nextNode = findNext(node);
    //       debugNode(nextNode, '======>', 'code');

    //       return false;
    //     }
    //   }
    // });
  }
}

module.exports = {
  findExport,
};
