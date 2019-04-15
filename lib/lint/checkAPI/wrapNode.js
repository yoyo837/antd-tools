const chalk = require('chalk');
const { SyntaxKind, forEachChild } = require('typescript');

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
  if (!node) {
    console.log(chalk.cyan('[DEBUG]'), chalk.red('Not a validate node!'), chalk.gray(`(${type})`));
    return;
  }

  const clone = { ...node };
  delete clone.parent;

  const args = [chalk.cyan('[DEBUG]'), chalk.green(getKind(node)), title];

  switch (type) {
    case 'code': {
      const { text } = getRoot(node);
      args.push(chalk.yellow(`\n${text.slice(node.pos, node.end).trim()}`));
      args.push(chalk.gray(text.substr(node.end, 30)));
      break;
    }
    case 'simpleCode': {
      const { text } = getRoot(node);
      args.push(
        chalk.yellow(
          `\n${
            text
              .slice(node.pos, node.end)
              .trim()
              .split(/[\r\n]+/)[0]
          }`
        )
      );
      break;
    }
    default:
      args.push(clone);
      break;
  }

  console.log(...args);
}

function matchPathNode(node, { kind, condition }) {
  if (kind && node.kind !== kind) return false;
  if (condition && !condition(node)) return false;
  return true;
}

// Breadth-First Search
function BFS(nodes, callback, options = {}) {
  // Skip if max level match
  const { level = 0, maxLevel = Number.MAX_SAFE_INTEGER } = options;
  if (level > maxLevel) return;

  const nodeList = Array.isArray(nodes) ? nodes : [nodes];
  let subNodes = [];

  // Loop current level nodes
  nodeList.some(node => {
    if (callback(node, { ...options, level }) === false) {
      subNodes = [];
      return true;
    }

    forEachChild(node, subNode => {
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
  forEachChild(node, subNode => {
    nodeList.push(subNode);
  });
  return nodeList;
}

function wrapNode(node, meta) {
  if (!node || node.isWrappedNode) {
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
    next(conditionFunc) {
      const list = subNodeToArray(node.parent);
      const nextNode = list[list.indexOf(node) + 1];
      if (!nextNode) return null;
      if (conditionFunc && !conditionFunc(nextNode)) return null;

      return wrapNode(nextNode, meta);
    },
    closest(conditionFunc) {
      const list = subNodeToArray(node.parent);
      const subList = list.slice(list.indexOf(node) + 1);

      return wrapNode(subList.find(conditionFunc));
    },
    child(conditionFunc, options) {
      let matchNode = null;
      BFS(
        node,
        current => {
          if (conditionFunc(current)) {
            matchNode = current;
            return false;
          }
          return true;
        },
        options
      );
      return wrapNode(matchNode, meta);
    },
    parent(conditionFunc) {
      let { parent: parentNode } = node;

      if (conditionFunc) {
        while (parentNode) {
          if (conditionFunc(parentNode)) {
            break;
          }
          parentNode = parentNode.parent;
        }
      }

      return wrapNode(parentNode, meta);
    },
    /**
     * @param {*} pathList { kind, direction: 'child'(default) | 'directChild' | 'next', condition: () => boolean }[]
     */
    queryMatch(pathList) {
      if (pathList.length === 0) return wrappedNode;

      const [path, ...restList] = pathList;
      if (path.direction === 'next') {
        const nextWrappedNode = wrappedNode.next();
        if (!matchPathNode(nextWrappedNode.node, path)) {
          return null;
        }
        return nextWrappedNode.queryMatch(restList);
      }
      let matchWrappedNode = null;
      const bfsOptions = {};

      if (path.direction === 'directChild') {
        bfsOptions.maxLevel = 1;
      }

      BFS(
        node,
        current => {
          if (!matchPathNode(current, path)) return true;

          const wrappedCurrent = wrapNode(current, meta);

          matchWrappedNode = wrappedCurrent.queryMatch(restList);
          return !matchWrappedNode;
        },
        bfsOptions
      );

      return matchWrappedNode;
    },
  };

  return wrappedNode;
}

wrapNode.BFS = BFS;
wrapNode.debugNode = debugNode;

module.exports = wrapNode;
