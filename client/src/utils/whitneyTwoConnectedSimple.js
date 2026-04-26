import parseAdjList from "./parseAdjList.js";

function normalizeUndirectedAdjacency(adjacencyList) {
  const undirected = {};

  Object.entries(adjacencyList || {}).forEach(([node, neighbors]) => {
    if (!undirected[node]) undirected[node] = new Set();
    (neighbors || []).forEach((neighbor) => {
      if (!neighbor || neighbor === node) return;
      if (!undirected[neighbor]) undirected[neighbor] = new Set();
      undirected[node].add(neighbor);
      undirected[neighbor].add(node);
    });
  });

  Object.keys(undirected).forEach((node) => {
    if (!undirected[node]) undirected[node] = new Set();
  });

  const displayAdj = {};
  Object.entries(undirected).forEach(([node, neighbors]) => {
    displayAdj[node] = Array.from(neighbors);
  });

  return {
    nodes: Object.keys(displayAdj),
    undirected,
    displayAdj,
  };
}

export function normalizeTwoConnectedInput(graphInput) {
  if (
    graphInput &&
    Array.isArray(graphInput.nodes) &&
    graphInput.undirected &&
    graphInput.displayAdj
  ) {
    return graphInput;
  }
  return normalizeUndirectedAdjacency(graphInput || {});
}

export function findArticulationPoints(nodes, undirected) {
  const disc = {};
  const low = {};
  const parent = {};
  const visited = new Set();
  const points = new Set();
  let time = 0;

  function dfs(u) {
    visited.add(u);
    time += 1;
    disc[u] = time;
    low[u] = time;

    let childCount = 0;

    for (const v of undirected[u] || []) {
      if (!visited.has(v)) {
        parent[v] = u;
        childCount += 1;
        dfs(v);
        low[u] = Math.min(low[u], low[v]);

        if (parent[u] == null && childCount > 1) {
          points.add(u);
        }
        if (parent[u] != null && low[v] >= disc[u]) {
          points.add(u);
        }
      } else if (v !== parent[u]) {
        low[u] = Math.min(low[u], disc[v]);
      }
    }
  }

  nodes.forEach((node) => {
    if (!visited.has(node)) {
      parent[node] = null;
      dfs(node);
    }
  });

  return Array.from(points);
}

export function isGraphConnected(nodes, undirected) {
  if (nodes.length <= 1) return true;

  const visited = new Set();
  const queue = [nodes[0]];
  visited.add(nodes[0]);

  while (queue.length) {
    const current = queue.shift();
    for (const neighbor of undirected[current] || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited.size === nodes.length;
}

function edgeToKey(u, v) {
  return u < v ? `${u}::${v}` : `${v}::${u}`;
}

function findCycle(undirected, nodes) {
  const visited = new Set();
  const parent = {};

  function dfs(node, p, path) {
    visited.add(node);
    path.push(node);

    for (const neighbor of undirected[node] || []) {
      if (!visited.has(neighbor)) {
        parent[neighbor] = node;
        const result = dfs(neighbor, node, path);
        if (result) return result;
      } else if (neighbor !== p) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          return path.slice(cycleStart).concat([neighbor]);
        }
      }
    }

    path.pop();
    return null;
  }

  for (const node of nodes) {
    if (!visited.has(node)) {
      visited.clear();
      parent[node] = null;
      const cycle = dfs(node, null, []);
      if (cycle) return cycle;
    }
  }

  return null;
}

function findPathBetweenVertices(undirected, u, v, constructedNodes, usedEdges) {
  if (u === v || !undirected || !u || !v) return null;

  const constructedNodesSet = new Set(constructedNodes);
  const queue = [[u, [u]]];
  let iterations = 0;
  const maxIterations = 5000;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const [current, path] = queue.shift();

    if (path.length > 40) continue;

    const neighbors = undirected[current];
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      const edgeKey = edgeToKey(current, neighbor);
      if (usedEdges.has(edgeKey)) continue;

      if (path.includes(neighbor)) continue;

      const newPath = [...path, neighbor];

      if (neighbor === v) {
        // Direct edge or path with only new internal vertices
        let valid = true;
        for (let i = 1; i < newPath.length - 1; i++) {
          if (constructedNodesSet.has(newPath[i])) {
            valid = false;
            break;
          }
        }
        if (valid) return newPath;
        continue;
      }

      queue.push([neighbor, newPath]);
    }
  }

  return null;
}

export class WhitneyTwoConnectedExecutor {
  constructor(normalized) {
    const input = normalizeTwoConnectedInput(normalized);
    this.nodes = input.nodes;
    this.undirected = input.undirected;
    this.displayAdj = input.displayAdj;

    this.usedEdges = new Set();
    this.constructedNodes = new Set();
    this.currentEar = null;
    this.selectedU = null;
    this.selectedV = null;
    this.log = [];
    this.stepCount = 0;
    this.phase = "waiting_for_selection";

    // Find initial cycle
    this.initialCycle = findCycle(this.undirected, this.nodes);
    if (!this.initialCycle) {
      this.log.push("ERROR: No cycle found");
      this.phase = "done";
    } else {
      this.constructedNodes = new Set(this.initialCycle.slice(0, -1));

      for (let i = 0; i < this.initialCycle.length - 1; i++) {
        const u = this.initialCycle[i];
        const v = this.initialCycle[i + 1];
        this.usedEdges.add(edgeToKey(u, v));
      }

      this.log.push(`✓ G0 (Initial cycle): ${this.initialCycle.join(" -> ")}`);
      this.log.push(`Select two vertices u, v from RED to find a path.`);
    }
  }

  getState() {
    return {
      constructedNodes: Array.from(this.constructedNodes),
      currentEar: this.currentEar,
      selectedU: this.selectedU,
      selectedV: this.selectedV,
      usedEdges: Array.from(this.usedEdges),
      log: this.log,
      done: this.phase === "done",
      phase: this.phase,
      stepCount: this.stepCount,
      initialCycle: this.initialCycle ? this.initialCycle.slice(0, -1) : [],
    };
  }

  // User selects u and v
  selectAndFindPath(u, v) {
    const constructedSet = new Set(this.constructedNodes);

    if (!constructedSet.has(u) || !constructedSet.has(v)) {
      this.log.push("✗ Both u and v must be in the RED graph");
      return false;
    }

    if (u === v) {
      this.log.push("✗ u and v must be different");
      return false;
    }

    const path = findPathBetweenVertices(
      this.undirected,
      u,
      v,
      Array.from(this.constructedNodes),
      this.usedEdges
    );

    if (!path) {
      this.log.push(`✗ No path from ${u} to ${v} with new internal vertices`);
      return false;
    }

    this.selectedU = u;
    this.selectedV = v;
    this.currentEar = path;
    this.log.push(`✓ Path found (BLUE): ${path.join(" -> ")}`);
    return true;
  }

  // User confirms merge
  mergeEar() {
    if (!this.currentEar) {
      this.log.push("✗ No path to merge");
      return false;
    }

    const ear = this.currentEar;

    for (let i = 0; i < ear.length - 1; i++) {
      const u = ear[i];
      const v = ear[i + 1];
      this.usedEdges.add(edgeToKey(u, v));
      this.constructedNodes.add(u);
      this.constructedNodes.add(v);
    }

    this.stepCount++;
    this.log.push(`✓ Merged to RED (Step ${this.stepCount}): ${ear.join(" -> ")}`);

    // Count total edges
    const allEdges = new Set();
    for (const [u, neighbors] of Object.entries(this.undirected)) {
      for (const v of neighbors) {
        allEdges.add(edgeToKey(u, v));
      }
    }

    if (this.usedEdges.size === allEdges.size) {
      this.log.push("✓ ALL EDGES INCLUDED - COMPLETE!");
      this.phase = "done";
    } else {
      this.log.push(`Select next u, v (${allEdges.size - this.usedEdges.size} edges remaining)`);
    }

    this.currentEar = null;
    this.selectedU = null;
    this.selectedV = null;
    return true;
  }
}

export function findTwoDisjointPaths(normalized, source, sink) {
  if (!normalized || !source || !sink || source === sink) {
    return { paths: [], maxFlow: 0 };
  }

  const normalizedInput = normalizeTwoConnectedInput(normalized);
  const nodes = normalizedInput.nodes || Object.keys(normalizedInput.displayAdj || {});
  if (!nodes.includes(source) || !nodes.includes(sink)) {
    return { paths: [], maxFlow: 0 };
  }

  function bfsPath(undirected, s, t, blocked, blockedEdges) {
    const queue = [s];
    const parent = {};
    parent[s] = s;

    while (queue.length) {
      const current = queue.shift();
      if (current === t) break;

      for (const neighbor of undirected[current] || []) {
        if (blocked && blocked.has(neighbor)) continue;
        if (blockedEdges && blockedEdges.has(`${current}::${neighbor}`)) continue;
        if (blockedEdges && blockedEdges.has(`${neighbor}::${current}`)) continue;
        if (parent[neighbor] != null) continue;
        parent[neighbor] = current;
        queue.push(neighbor);
      }
    }

    if (parent[t] == null) return null;

    const path = [];
    let node = t;
    while (node !== s) {
      path.push(node);
      node = parent[node];
    }
    path.push(s);
    path.reverse();
    return path;
  }

  const path1 = bfsPath(normalizedInput.undirected, source, sink);
  if (!path1) return { paths: [], maxFlow: 0 };

  const blocked = new Set(path1.slice(1, -1));
  blocked.delete(source);
  blocked.delete(sink);

  let path2 = bfsPath(normalizedInput.undirected, source, sink, blocked);
  if (path2 && path2.join("::") !== path1.join("::")) {
    return { paths: [path1, path2], maxFlow: 2 };
  }

  for (let i = 0; i < path1.length - 1; i += 1) {
    const from = path1[i];
    const to = path1[i + 1];
    const blockedEdges = new Set([`${from}::${to}`, `${to}::${from}`]);
    path2 = bfsPath(normalizedInput.undirected, source, sink, blocked, blockedEdges);
    if (path2 && path2.join("::") !== path1.join("::")) {
      return { paths: [path1, path2], maxFlow: 2 };
    }
  }

  return { paths: [], maxFlow: 1 };
}
