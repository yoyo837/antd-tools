const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createSourceFile, ScriptTarget, SyntaxKind, forEachChild } = require('typescript');
const wrapNode = require('./wrapNode');
const { BFS, debugNode } = wrapNode;

const EXTENSIONS = [ '.ts', '.tsx' ];
const fileCache = {};

function wrapFile(originFilePath) {
  let filePath = originFilePath;

  // TODO: also need consider xxx/index.tsx
  EXTENSIONS.some((extension) => {
    const connectedPath = `${originFilePath}${extension}`;
    if (fs.existsSync(connectedPath)) {
      filePath = connectedPath;
      return true;
    }
  });

  if (!fileCache[filePath]) {
    fileCache[filePath] = wrapNode(
      createSourceFile(
        filePath,
        fs.readFileSync(filePath).toString(),
        ScriptTarget.ES2015,
        /*setParentNodes */ true,
      ),
      {
        filePath,
      },
    );
  }

  return fileCache[filePath];
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

// =========================== Find Type Reference ============================
function findInlineDefinition(wrappedSourceFile, typeName) {
  // TODO: interface A extends B ...
  const declarationNode = wrappedSourceFile.queryMatch([
    {
      direction: 'child',
      kind: SyntaxKind.InterfaceDeclaration,
    },
    {
      direction: 'child',
      kind: SyntaxKind.Identifier,
      condition: (node) => node.escapedText === typeName,
    },
    // {
    //   direction: 'next',
    //   kind: SyntaxKind.PropertySignature,
    // },
  ]);

  if (!declarationNode) return null;

  // Find extends
  const isHeritageClause = ({ kind }) => kind === SyntaxKind.HeritageClause;
  let extendNode = declarationNode.next(isHeritageClause);
  while (extendNode) {
    const extendName = extendNode.queryMatch([
      { direction: 'child', kind: SyntaxKind.ExpressionWithTypeArguments },
      { direction: 'child', kind: SyntaxKind.Identifier },
    ]).node.text;
    console.log('>>>', extendName);
    extendNode = extendNode.next(isHeritageClause);
  }

  // Get prop list
  let currentPropNode = declarationNode.closest(({ kind }) => kind === SyntaxKind.PropertySignature);
  const propNameList = [];
  while (currentPropNode) {
    const propName = currentPropNode.child(({ kind }) => kind === SyntaxKind.Identifier).node
      .escapedText;
    propNameList.push(propName);
    currentPropNode = currentPropNode.next();
  }

  return propNameList;
}

function findRelatedDefinition(wrappedSourceFile, typeName) {
  const defineNode = wrappedSourceFile.queryMatch([
    { direction: 'child', kind: SyntaxKind.NamedImports },
    { direction: 'child', kind: SyntaxKind.ImportSpecifier },
    {
      direction: 'child',
      kind: SyntaxKind.Identifier,
      condition: ({ escapedText }) => escapedText === typeName,
    },
  ]);

  if (!defineNode) return null;

  const importPathNode = defineNode
    .parent(({ kind }) => kind === SyntaxKind.ImportDeclaration)
    .child(({ kind }) => kind === SyntaxKind.StringLiteral);
  const relativePath = importPathNode.node.text;

  // Find definition from relative file
  const importFilePath = path.join(path.dirname(importPathNode.meta.filePath), relativePath);
  const linkedFile = wrapFile(importFilePath);
  return findInlineDefinition(linkedFile, typeName);
}

function findTypeDefinition(sourceFile) {
  const wrappedSourceFile = wrapNode(sourceFile);
  const typeRefNode = findExportDefine(wrappedSourceFile) || findExportDirectly(wrappedSourceFile);

  // Find type definition node
  const typeDefinitionName = typeRefNode.node.typeName.escapedText;
  let typeDefinition = findInlineDefinition(wrappedSourceFile, typeDefinitionName);

  if (!typeDefinition) {
    typeDefinition = findRelatedDefinition(wrappedSourceFile, typeDefinitionName);
  }

  return typeDefinition;
}

module.exports = {
  findTypeDefinition,
  wrapFile,
};
