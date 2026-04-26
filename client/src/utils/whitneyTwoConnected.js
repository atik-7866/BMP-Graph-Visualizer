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

function bfsPath(undirected, source, sink, blocked, blockedEdges) {
  const queue = [source];
  const parent = {};
  parent[source] = source;

  while (queue.length) {
    const current = queue.shift();
    if (current === sink) break;

    for (const neighbor of undirected[current] || []) {
      if (blocked && blocked.has(neighbor)) continue;
      if (blockedEdges && blockedEdges.has(`${current}::${neighbor}`)) continue;
      if (blockedEdges && blockedEdges.has(`${neighbor}::${current}`)) continue;
      if (parent[neighbor] != null) continue;
      parent[neighbor] = current;
      queue.push(neighbor);
    }
  }

  if (parent[sink] == null) return null;

  const path = [];
  let node = sink;
  while (node !== source) {
    path.push(node);
    node = parent[node];
  }
  path.push(source);
  path.reverse();
  return path;
}

function buildBlockedEdgesForPath(path, edgeIndex) {
  if (!path || path.length < 2) return new Set();
  const from = path[edgeIndex];
  const to = path[edgeIndex + 1];
  if (!from || !to) return new Set();
  return new Set([`${from}::${to}`, `${to}::${from}`]);
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
    const blockedEdges = buildBlockedEdgesForPath(path1, i);
    path2 = bfsPath(normalizedInput.undirected, source, sink, blocked, blockedEdges);
    if (path2 && path2.join("::") !== path1.join("::")) {
      return { paths: [path1, path2], maxFlow: 2 };
    }
  }

  return { paths: [], maxFlow: 1 };
}

// Whitney's 2-Connected Graph Algorithm
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
        // Found a back edge - cycle detected
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

function edgeToKey(u, v) {
  return u < v ? `${u}::${v}` : `${v}::${u}`;
}

function findEar(undirected, constructedNodes, usedEdges, allEdges) {
  // Find a path between two vertices in constructedNodes
  // where all internal vertices are NOT in constructedNodes
  // and uses edges from allEdges not in usedEdges
  
  const constructedNodesSet = new Set(constructedNodes);
  
  for (const u of constructedNodes) {
    // BFS to find path from u to any other vertex in constructedNodes
    const queue = [[u, [u]]];
    const visited = new Set([u]);
    
    while (queue.length) {
      const [current, path] = queue.shift();
      
      for (const neighbor of undirected[current] || []) {
        const edgeKey = edgeToKey(current, neighbor);
        
        // Skip if edge already used
        if (usedEdges.has(edgeKey)) continue;
        
        // Skip if already visited in this search
        if (visited.has(neighbor)) continue;
        
        visited.add(neighbor);
        const newPath = [...path, neighbor];
        
        // If we reached another constructed node and path length > 2
        // (meaning internal vertices exist)
        if (
          constructedNodesSet.has(neighbor) &&
          newPath.length > 2 &&
          !path.includes(neighbor)
        ) {
          // Check that all internal vertices are NOT in constructed
          let isValidEar = true;
          for (let i = 1; i < newPath.length - 1; i++) {
            if (constructedNodesSet.has(newPath[i])) {
              isValidEar = false;
              break;
            }
          }
          if (isValidEar) {
            return newPath;
          }
        }
        
        // Continue BFS only if neighbor is not in constructed nodes
        // or if it's a constructed node and path is still short
        if (
          !constructedNodesSet.has(neighbor) ||
          (constructedNodesSet.has(neighbor) && newPath.length <= 2)
        ) {
          queue.push([neighbor, newPath]);
        }
      }
    }
  }
  
  return null;
}

function findPathBetweenVertices(undirected, u, v, constructedNodes, usedEdges) {
  // Find a path from u to v where:
  // - u and v are in constructedNodes  
  // - All internal vertices are NOT in constructedNodes
  // - Edges are not already used
  
  if (u === v || !undirected || !u || !v) return null;
  
  const constructedNodesSet = new Set(constructedNodes);
  const queue = [[u, [u]]];
  let iterations = 0;
  const maxIterations = 5000;
  
  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const [current, path] = queue.shift();
    
    // Limit path length to prevent exponential growth
    if (path.length > 40) continue;
    
    const neighbors = undirected[current];
    if (!neighbors) continue;
    
    for (const neighbor of neighbors) {
      // Check if edge is already used
      const edgeKey = edgeToKey(current, neighbor);
      if (usedEdges.has(edgeKey)) continue;
      
      // Skip if neighbor already in current path (cycle detection)
      if (path.includes(neighbor)) continue;
      
      const newPath = [...path, neighbor];
      
      // Check if we reached target
      if (neighbor === v && newPath.length > 2) {
        // Verify all internal vertices are new (not in constructed graph)
        let valid = true;
        for (let i = 1; i < newPath.length - 1; i++) {
          if (constructedNodesSet.has(newPath[i])) {
            valid = false;
            break;
          }
        }
        if (valid) return newPath;
        // If invalid, continue searching for other paths
        continue;
      }
      
      // Add to queue for further exploration
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
    
    // Find initial cycle (G0)
    this.initialCycle = findCycle(this.undirected, this.nodes);
    if (!this.initialCycle) {
      this.log.push("ERROR: No cycle found in graph");
      this.phase = "done";
    } else {
      // Initialize with cycle
      this.constructedNodes = new Set(this.initialCycle.slice(0, -1));
      
      // Mark cycle edges as used
      for (let i = 0; i < this.initialCycle.length - 1; i++) {
        const u = this.initialCycle[i];
        const v = this.initialCycle[i + 1];
        this.usedEdges.add(edgeToKey(u, v));
      }
      
      this.log.push(`G0 (Initial cycle): ${this.initialCycle.join(" -> ")}`);
      this.log.push(`Ready. Select two vertices u, v from RED graph to find a path.`);
      this.phase = "waiting_for_selection";
    }
  }
  
  step() {
    this.stepCount++;
    
    if (this.phase === "done") {
      return this.getState();
    }
    
    if (this.phase === "finding_cycle") {
      // Cycle was already found in constructor
      this.phase = "finding_ear";
      return this.getState();
    }
    
    if (this.phase === "interactive_selecting") {
      // In interactive mode, just return state (user must call selectVertices)
      return this.getState();
    }
    
    if (this.phase === "interactive_displaying_ear") {
      // Display the ear in BLUE
      if (this.pendingEar) {
        const ear = this.pendingEar;
        this.currentEar = ear;
        this.log.push(`Displaying ear (BLUE): ${ear.join(" -> ")}`);
        this.phase = "interactive_merging_ear";
      }
      return this.getState();
    }
    
    if (this.phase === "interactive_merging_ear") {
      // Merge the ear (convert BLUE to RED)
      if (this.pendingEar) {
        const ear = this.pendingEar;
        
        // Mark ear edges as used and add all vertices to constructed
        for (let i = 0; i < ear.length - 1; i++) {
          const u = ear[i];
          const v = ear[i + 1];
          this.usedEdges.add(edgeToKey(u, v));
          this.constructedNodes.add(u);
          this.constructedNodes.add(v);
        }
        
        this.log.push(`Merged ear: now have ${this.constructedNodes.size} vertices, ${this.usedEdges.size} edges used`);
        this.currentEar = null;
        this.selectedU = null;
        this.selectedV = null;
        this.pendingEar = null;
        
        // Check if done
        if (this.usedEdges.size === this.allEdges.size) {
          this.log.push(`✓ All edges included! Algorithm complete.`);
          this.phase = "done";
        } else {
          this.phase = "interactive_selecting";
        }
      }
      return this.getState();
    }
    
    if (this.phase === "finding_ear") {
      // Check if all edges are used
      if (this.usedEdges.size === this.allEdges.size) {
        this.log.push(`✓ All edges included! Algorithm complete.`);
        this.phase = "done";
        return this.getState();
      }
      
      // Find next ear
      const ear = findEar(this.undirected, Array.from(this.constructedNodes), this.usedEdges, this.allEdges);
      
      if (!ear) {
        this.log.push("ERROR: Could not find a valid ear. Graph may not be 2-connected.");
        this.phase = "done";
        return this.getState();
      }
      
      this.pendingEar = ear;
      this.phase = "displaying_ear";
      return this.getState();
    }
    
    if (this.phase === "displaying_ear") {
      // Display the ear in BLUE
      if (this.pendingEar) {
        const ear = this.pendingEar;
        this.currentEar = ear;
        this.selectedU = ear[0];
        this.selectedV = ear[ear.length - 1];
        this.log.push(`Ear found: ${ear.join(" -> ")} (from ${this.selectedU} to ${this.selectedV})`);
        this.phase = "merging_ear";
      }
      return this.getState();
    }
    
    if (this.phase === "merging_ear") {
      // Merge the ear (convert BLUE to RED)
      if (this.pendingEar) {
        const ear = this.pendingEar;
        
        // Mark ear edges as used and add all vertices to constructed
        for (let i = 0; i < ear.length - 1; i++) {
          const u = ear[i];
          const v = ear[i + 1];
          this.usedEdges.add(edgeToKey(u, v));
          this.constructedNodes.add(u);
          this.constructedNodes.add(v);
        }
        
        this.log.push(`Merged ear: now have ${this.constructedNodes.size} vertices, ${this.usedEdges.size} edges used`);
        this.currentEar = null;
        this.selectedU = null;
        this.selectedV = null;
        this.pendingEar = null;
        this.phase = "finding_ear";
      }
      return this.getState();
    }
    
    return this.getState();
  }
  
  getState() {
    return {
      constructedNodes: Array.from(this.constructedNodes),
      currentEar: this.currentEar,
      selectedU: this.selectedU,
      selectedV: this.selectedV,
      usedEdges: Array.from(this.usedEdges),
      unusedEdges: Array.from(this.allEdges).filter(e => !this.usedEdges.has(e)),
      log: this.log,
      done: this.phase === "done",
      phase: this.phase,
      stepCount: this.stepCount,
      initialCycle: this.initialCycle ? this.initialCycle.slice(0, -1) : [],
    };
  }
  
  // Interactive mode methods
  selectVertices(u, v) {
    const constructedNodesSet = new Set(this.constructedNodes);
    
    if (!constructedNodesSet.has(u) || !constructedNodesSet.has(v)) {
      this.log.push(`ERROR: Both u and v must be in the constructed graph`);
      return false;
    }
    
    if (u === v) {
      this.log.push(`ERROR: u and v must be different vertices`);
      return false;
    }
    
    // Try to find a path with new internal vertices
    const path = findPathBetweenVertices(this.undirected, u, v, Array.from(this.constructedNodes), this.usedEdges);
    
    if (!path) {
      this.log.push(`ERROR: No path from ${u} to ${v} with new internal vertices found`);
      return false;
    }
    
    this.selectedU = u;
    this.selectedV = v;
    this.pendingEar = path;
    this.log.push(`Path found: ${path.join(" -> ")}`);
    
    // Move to displaying phase
    this.phase = "interactive_displaying_ear";
    return true;
  }
  
  displaySelectedEar() {
    if (this.phase === "interactive_displaying_ear" && this.pendingEar) {
      const ear = this.pendingEar;
      this.currentEar = ear;
      this.log.push(`Displaying ear (BLUE): ${ear.join(" -> ")}`);
      this.phase = "interactive_merging_ear";
      return true;
    }
    return false;
  }
  
  mergeSelectedEar() {
    if ((this.phase === "interactive_merging_ear" || this.phase === "interactive_displaying_ear") && this.pendingEar) {
      const ear = this.pendingEar;
      
      // Mark ear edges as used and add all vertices to constructed
      for (let i = 0; i < ear.length - 1; i++) {
        const u = ear[i];
        const v = ear[i + 1];
        this.usedEdges.add(edgeToKey(u, v));
        this.constructedNodes.add(u);
        this.constructedNodes.add(v);
      }
      
      this.log.push(`Merged ear (converted to RED): now have ${this.constructedNodes.size} vertices, ${this.usedEdges.size} edges used`);
      this.currentEar = null;
      this.selectedU = null;
      this.selectedV = null;
      this.pendingEar = null;
      
      // Check if done
      if (this.usedEdges.size === this.allEdges.size) {
        this.log.push(`✓ All edges included! Algorithm complete.`);
        this.phase = "done";
      } else {
        this.phase = "interactive_selecting";
      }
      
      this.stepCount++;
      return true;
    }
    return false;
  }
  
  resetToInteractiveMode() {
    this.currentEar = null;
    this.selectedU = null;
    this.selectedV = null;
    this.pendingEar = null;
    this.phase = "interactive_selecting";
  }
}
