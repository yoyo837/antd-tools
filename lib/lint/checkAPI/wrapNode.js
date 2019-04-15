const chalk = require('chalk');
const { createSourceFile, ScriptTarget, SyntaxKind, forEachChild } = require('typescript');

function debugNode(node, title, type) {
  if (!node) {
    console.log(
      chalk.cyan('[DEBUG]'),
      chalk.red('Not a validate node!'),
      chalk.gray(`(${type})`),
    );
    return;
  }

  const clone = { ...node };
  delete clone.parent;

  const args = [ chalk.cyan('[DEBUG]'), chalk.green(getKind(node)), title ];

  switch (type) {
    case 'code':
      const { text } = getRoot(node);
      args.push(chalk.yellow(`\n${text.slice(node.pos, node.end).trim()}`));
      args.push(chalk.gray(text.substr(node.end, 30)));
      break;
    case 'node':
      args.push(clone);
      break;
  }

  console.log(...args);
}

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

function matchNode(node, { kind, condition }) {
  if (kind && node.kind !== kind) return false;
  if (condition && !condition(node)) return false;
  return true;
}

// Breadth-First Search
function BFS(nodes, callback, options = {}) {
  // Skip if max level match
  const { level = 0, maxLevel = Number.MAX_SAFE_INTEGER } = options;
  if (level > maxLevel) return;

  const nodeList = Array.isArray(nodes) ? nodes : [ nodes ];
  let subNodes = [];

  // Loop current level nodes
  nodeList.some((node) => {
    if (callback(node, { ...options, level }) === false) {
      subNodes = [];
      return true;
    }

    forEachChild(node, (subNode) => {
      subNodes.push(subNode);
    });
    return false;
  });

  if (subNodes.length) {
    BFS(subNodes, callback, { ...options, level: level + 1 });
  }
}

function subNodeToArray(node) {
  const nodeList = [];
  forEachChild(node, (subNode) => {
    nodeList.push(subNode);
  });
  return nodeList;
}

function wrapNode(node, meta) {
  if (node && node.isWrappedNode) {
    return node;
  }

  const wrappedNode = {
    node,
    meta,
    isWrappedNode: true,
    traverse(callback, options) {
      BFS(node, callback, options);
      return wrappedNode;
    },
    next() {
      const list = subNodeToArray(node.parent);
      const nextNode = list[list.indexOf(node) + 1];
      if (!nextNode) return null;
      return wrapNode(nextNode, meta);
    },
    child(conditionFunc, options) {
      let matchNode = null;
      BFS(node, (current) => {
        if (conditionFunc(current)) {
          matchNode = current;
          return false;
        }
      }, options);
      return wrapNode(matchNode, meta);
    },
    parent(conditionFunc) {
      let parent = node.parent;

      if (conditionFunc) {
        while (parent) {
          if (conditionFunc(parent)) {
            break;
          }
          parent = parent.parent;
        }
      }

      return wrapNode(parent, meta);
    },
    /**
     * @param {*} pathList { kind, direction: 'child'(default) | 'next', condition: () => boolean }[]
     */
    queryMatch(pathList) {
      if (pathList.length === 0) return wrappedNode;

      const [path, ...restList] = pathList;
      if (path.direction === 'next') {
        const nextWrappedNode = wrappedNode.next();
        if (!matchNode(nextWrappedNode.node, path)) {
          return null;
        }
        return nextWrappedNode.queryMatch(restList);
      } else {
        let matchWrappedNode = null;
        BFS(node, (current) => {
          if (!matchNode(current, path)) return;

          const wrappedCurrent = wrapNode(current, meta);

          matchWrappedNode = wrappedCurrent.queryMatch(restList);
          return !matchWrappedNode;
        });

        return matchWrappedNode;
      }
    },
  };

  return wrappedNode;
};

wrapNode.BFS = BFS;
wrapNode.debugNode = debugNode;

module.exports = wrapNode;