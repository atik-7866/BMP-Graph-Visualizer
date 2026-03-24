class DSU {
  constructor(nodes) {
    this.parent = {};
    this.rank = {};
    nodes.forEach((node) => {
      this.parent[node] = node;
      this.rank[node] = 0;
    });
  }

  find(node) {
    if (this.parent[node] !== node) {
      this.parent[node] = this.find(this.parent[node]);
    }
    return this.parent[node];
  }

  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);

    if (rootA === rootB) return false;

    if (this.rank[rootA] < this.rank[rootB]) {
      this.parent[rootA] = rootB;
    } else if (this.rank[rootA] > this.rank[rootB]) {
      this.parent[rootB] = rootA;
    } else {
      this.parent[rootB] = rootA;
      this.rank[rootA] += 1;
    }

    return true;
  }
}

function buildUndirectedEdges(adjacencyList) {
  const edgeMap = new Map();

  Object.entries(adjacencyList).forEach(([from, neighbors]) => {
    neighbors.forEach(({ node: to, weight }) => {
      if (from === to) return;
      const w = Number(weight);
      if (!Number.isFinite(w)) return;

      const [a, b] = from < to ? [from, to] : [to, from];
      const key = `${a}|${b}`;
      const existing = edgeMap.get(key);

      if (!existing || w < existing.weight) {
        edgeMap.set(key, { from: a, to: b, weight: w });
      }
    });
  });

  return Array.from(edgeMap.values());
}

function isConnected(nodes, edges) {
  if (nodes.length <= 1) return true;
  if (edges.length === 0) return false;

  const adj = {};
  nodes.forEach((node) => {
    adj[node] = [];
  });

  edges.forEach(({ from, to }) => {
    adj[from].push(to);
    adj[to].push(from);
  });

  const visited = new Set();
  const queue = [nodes[0]];
  visited.add(nodes[0]);

  while (queue.length) {
    const node = queue.shift();
    for (const next of adj[node]) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return visited.size === nodes.length;
}

function determinantBareiss(matrix) {
  const n = matrix.length;
  if (n === 0) return 1n;
  if (n === 1) return matrix[0][0];

  const a = matrix.map((row) => row.map((value) => BigInt(value)));
  let sign = 1n;
  let prevPivot = 1n;

  for (let k = 0; k < n - 1; k++) {
    let pivotRow = k;
    while (pivotRow < n && a[pivotRow][k] === 0n) {
      pivotRow += 1;
    }

    if (pivotRow === n) {
      return 0n;
    }

    if (pivotRow !== k) {
      [a[k], a[pivotRow]] = [a[pivotRow], a[k]];
      sign *= -1n;
    }

    const pivot = a[k][k];

    for (let i = k + 1; i < n; i++) {
      for (let j = k + 1; j < n; j++) {
        const numerator = a[i][j] * pivot - a[i][k] * a[k][j];
        a[i][j] = numerator / prevPivot;
      }
    }

    prevPivot = pivot;
  }

  return sign * a[n - 1][n - 1];
}

function countSpanningTreesOfMultigraph(vertices, edges) {
  if (vertices.length <= 1) return 1n;

  const index = new Map();
  vertices.forEach((v, i) => index.set(v, i));

  const n = vertices.length;
  const laplacian = Array.from({ length: n }, () => Array(n).fill(0n));

  edges.forEach(({ u, v, multiplicity }) => {
    const i = index.get(u);
    const j = index.get(v);
    const m = BigInt(multiplicity);

    laplacian[i][i] += m;
    laplacian[j][j] += m;
    laplacian[i][j] -= m;
    laplacian[j][i] -= m;
  });

  const cofactor = [];
  for (let i = 1; i < n; i++) {
    const row = [];
    for (let j = 1; j < n; j++) {
      row.push(laplacian[i][j]);
    }
    cofactor.push(row);
  }

  const trees = determinantBareiss(cofactor);
  return trees >= 0n ? trees : -trees;
}

function connectedComponents(vertices, edgePairs) {
  const adj = new Map();
  vertices.forEach((v) => adj.set(v, []));

  edgePairs.forEach(({ u, v }) => {
    adj.get(u).push(v);
    adj.get(v).push(u);
  });

  const visited = new Set();
  const components = [];

  for (const start of vertices) {
    if (visited.has(start)) continue;

    const stack = [start];
    visited.add(start);
    const component = [];

    while (stack.length) {
      const node = stack.pop();
      component.push(node);

      for (const next of adj.get(node)) {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }

    components.push(component);
  }

  return components;
}

export function countMSTs(adjacencyList) {
  const nodes = Object.keys(adjacencyList);

  if (nodes.length === 0) {
    return { count: 0n, isConnected: false, message: "Graph is empty." };
  }

  const edges = buildUndirectedEdges(adjacencyList);
  if (!isConnected(nodes, edges)) {
    return { count: 0n, isConnected: false, message: "Graph is disconnected, so MST does not exist." };
  }

  const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
  const dsu = new DSU(nodes);
  let ways = 1n;

  let index = 0;
  while (index < sortedEdges.length) {
    const groupWeight = sortedEdges[index].weight;
    const group = [];

    while (index < sortedEdges.length && sortedEdges[index].weight === groupWeight) {
      group.push(sortedEdges[index]);
      index += 1;
    }

    const multiplicityMap = new Map();
    const componentVertices = new Set();

    group.forEach(({ from, to }) => {
      const rootU = dsu.find(from);
      const rootV = dsu.find(to);
      if (rootU === rootV) return;

      const [a, b] = rootU < rootV ? [rootU, rootV] : [rootV, rootU];
      const key = `${a}|${b}`;
      multiplicityMap.set(key, (multiplicityMap.get(key) || 0) + 1);
      componentVertices.add(a);
      componentVertices.add(b);
    });

    const compressedEdges = Array.from(multiplicityMap.entries()).map(([key, multiplicity]) => {
      const [u, v] = key.split("|");
      return { u, v, multiplicity };
    });

    if (compressedEdges.length > 0) {
      const components = connectedComponents(Array.from(componentVertices), compressedEdges);

      components.forEach((compVertices) => {
        const vertexSet = new Set(compVertices);
        const subEdges = compressedEdges.filter(({ u, v }) => vertexSet.has(u) && vertexSet.has(v));
        const trees = countSpanningTreesOfMultigraph(compVertices, subEdges);
        ways *= trees;
      });
    }

    group.forEach(({ from, to }) => {
      dsu.union(from, to);
    });
  }

  const root = dsu.find(nodes[0]);
  const fullyConnected = nodes.every((node) => dsu.find(node) === root);
  if (!fullyConnected) {
    return { count: 0n, isConnected: false, message: "Graph is disconnected, so MST does not exist." };
  }

  return {
    count: ways,
    isConnected: true,
    message: "Total number of MSTs computed successfully.",
  };
}

export default countMSTs;
