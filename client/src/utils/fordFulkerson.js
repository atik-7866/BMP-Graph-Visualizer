export default class FordFulkersonExecutor {
  constructor(adjacencyList, source, sink) {
    this.adj = adjacencyList;
    this.nodes = Object.keys(adjacencyList);
    this.source = source;
    this.sink = sink;

    this.originalCapacity = this.createCapacityMatrix();
    this.residualCapacity = this.cloneMatrix(this.originalCapacity);
    this.residualAdj = this.buildResidualAdjacency();

    this.maxFlow = 0;
    this.iteration = 0;

    this.queue = [];
    this.visited = new Set();
    this.parent = {};
    this.pathFlow = {};

    this.currentNode = null;
    this.currentNeighbors = [];
    this.neighborIndex = 0;
    this.foundPathNodes = [];
    this.foundPathEdges = [];
    this.currentAugmentFlow = 0;
    this.lastAugmentedPathNodes = [];
    this.lastAugmentedFlow = 0;
    this.finalFlowEdges = [];

    this.log = [];
    this.done = false;
    this.mode = "start-bfs";

    this.log.push(`Starting Ford-Fulkerson (Edmonds-Karp BFS) from ${source} to ${sink}`);
    this.log.push("Flow labels use currentFlow/capacity on forward edges and -flow/0 on backward residual edges");
  }

  createCapacityMatrix() {
    const matrix = {};
    for (const node of this.nodes) {
      matrix[node] = {};
      for (const other of this.nodes) {
        matrix[node][other] = 0;
      }
    }

    for (const [from, neighbors] of Object.entries(this.adj)) {
      for (const { node: to, weight } of neighbors) {
        const capacity = Number.isFinite(weight) ? weight : 0;
        matrix[from][to] += Math.max(0, capacity);
      }
    }

    return matrix;
  }

  cloneMatrix(matrix) {
    const clone = {};
    for (const [row, values] of Object.entries(matrix)) {
      clone[row] = { ...values };
    }
    return clone;
  }

  buildResidualAdjacency() {
    const residualAdj = {};
    for (const node of this.nodes) {
      residualAdj[node] = new Set();
    }

    for (const [from, neighbors] of Object.entries(this.adj)) {
      for (const { node: to } of neighbors) {
        if (!residualAdj[from]) residualAdj[from] = new Set();
        if (!residualAdj[to]) residualAdj[to] = new Set();
        residualAdj[from].add(to);
        residualAdj[to].add(from);
      }
    }

    return residualAdj;
  }

  resetBfsState() {
    this.queue = [this.source];
    this.visited = new Set([this.source]);
    this.parent = {};
    this.pathFlow = {};

    for (const node of this.nodes) {
      this.parent[node] = null;
      this.pathFlow[node] = 0;
    }

    this.parent[this.source] = this.source;
    this.pathFlow[this.source] = Infinity;

    this.currentNode = null;
    this.currentNeighbors = [];
    this.neighborIndex = 0;
    this.foundPathNodes = [];
    this.foundPathEdges = [];
    this.currentAugmentFlow = 0;
  }

  computeFinalFlowEdges() {
    const result = [];

    for (const from of this.nodes) {
      for (const to of this.nodes) {
        const capacity = this.originalCapacity[from][to];
        if (capacity <= 0) continue;

        const residual = this.residualCapacity[from][to];
        const flow = capacity - residual;
        if (flow > 0) {
          result.push({ from, to, flow, capacity });
        }
      }
    }

    return result;
  }

  reconstructPath() {
    const pathNodes = [];
    let node = this.sink;

    while (node !== this.source && node !== null) {
      pathNodes.push(node);
      node = this.parent[node];
    }

    if (node !== this.source) {
      return { nodes: [], edges: [] };
    }

    pathNodes.push(this.source);
    pathNodes.reverse();

    const pathEdges = [];
    for (let i = 0; i < pathNodes.length - 1; i++) {
      pathEdges.push([pathNodes[i], pathNodes[i + 1]]);
    }

    return { nodes: pathNodes, edges: pathEdges };
  }

  formatParent() {
    return this.nodes.map((node) => `${node}:${this.parent[node] ?? "-"}`).join(", ");
  }

  formatQueue() {
    return this.queue.length ? this.queue.join(" -> ") : "empty";
  }

  step() {
    if (this.done) {
      return this.getState();
    }

    if (!this.source || !this.sink || !this.nodes.includes(this.source) || !this.nodes.includes(this.sink)) {
      this.done = true;
      this.mode = "finished";
      this.log.push("Cannot execute: invalid source or sink node.");
      return this.getState();
    }

    if (this.mode === "start-bfs") {
      this.iteration += 1;
      this.resetBfsState();
      this.mode = "dequeue";

      this.log.push(`\n=== BFS Round ${this.iteration} ===`);
      this.log.push(`Queue initialized: [${this.formatQueue()}]`);
      this.log.push(`Parent map: ${this.formatParent()}`);
      return this.getState();
    }

    if (this.mode === "dequeue") {
      if (this.queue.length === 0) {
        this.done = true;
        this.mode = "finished";
        this.currentNode = null;
        this.currentNeighbors = [];
        this.finalFlowEdges = this.computeFinalFlowEdges();
        this.log.push("No augmenting path found in residual graph.");
        this.log.push(`Algorithm Complete! Max Flow = ${this.maxFlow}`);
        if (this.lastAugmentedPathNodes.length) {
          this.log.push(
            `Final augmenting path used: ${this.lastAugmentedPathNodes.join(" -> ")} (flow ${this.lastAugmentedFlow})`
          );
        }
        return this.getState();
      }

      this.currentNode = this.queue.shift();
      this.currentNeighbors = Array.from(this.residualAdj[this.currentNode] || []).filter(
        (next) => this.residualCapacity[this.currentNode][next] > 0
      );
      this.neighborIndex = 0;
      this.mode = "explore-neighbors";

      this.log.push(`\nDequeued node ${this.currentNode}`);
      this.log.push(`Residual neighbors with capacity > 0: [${this.currentNeighbors.join(", ") || "none"}]`);
      this.log.push(`Queue now: [${this.formatQueue()}]`);
      return this.getState();
    }

    if (this.mode === "explore-neighbors") {
      if (this.neighborIndex >= this.currentNeighbors.length) {
        this.log.push(`Finished exploring ${this.currentNode}`);
        this.currentNode = null;
        this.currentNeighbors = [];
        this.mode = "dequeue";
        return this.getState();
      }

      const from = this.currentNode;
      const to = this.currentNeighbors[this.neighborIndex];
      this.neighborIndex += 1;

      const residualCap = this.residualCapacity[from][to];
      if (this.parent[to] !== null || residualCap <= 0) {
        this.log.push(`  Skipped edge ${from}->${to} (visited or zero residual)`);
        return this.getState();
      }

      this.parent[to] = from;
      this.pathFlow[to] = Math.min(this.pathFlow[from], residualCap);
      this.visited.add(to);
      this.queue.push(to);

      this.log.push(`  Exploring edge ${from}->${to} with residual ${residualCap}`);
      this.log.push(`  parent[${to}] = ${from}, pathFlow[${to}] = ${this.pathFlow[to]}`);
      this.log.push(`  Queue updated: [${this.formatQueue()}]`);

      if (to === this.sink) {
        const { nodes, edges } = this.reconstructPath();
        this.foundPathNodes = nodes;
        this.foundPathEdges = edges;
        this.currentAugmentFlow = this.pathFlow[this.sink];
        this.mode = "show-path";

        this.log.push(`  Sink ${this.sink} reached.`);
        this.log.push(`  Augmenting path: ${nodes.join(" -> ")}`);
        this.log.push(`  Bottleneck flow: ${this.currentAugmentFlow}`);
        this.log.push("  Full BFS path is now highlighted. Next step applies augmentation.");
      }

      return this.getState();
    }

    if (this.mode === "show-path") {
      this.currentNode = null;
      this.currentNeighbors = [];
      this.mode = "augment";
      return this.getState();
    }

    if (this.mode === "augment") {
      this.log.push("Applying augmentation on full path:");

      for (const [from, to] of this.foundPathEdges) {
        const beforeForward = this.residualCapacity[from][to];
        const beforeBackward = this.residualCapacity[to][from];

        this.residualCapacity[from][to] -= this.currentAugmentFlow;
        this.residualCapacity[to][from] += this.currentAugmentFlow;

        const afterForward = this.residualCapacity[from][to];
        const afterBackward = this.residualCapacity[to][from];

        this.log.push(
          `  Update ${from}->${to}: residual ${beforeForward} -> ${afterForward}, reverse ${beforeBackward} -> ${afterBackward}`
        );
      }

      this.maxFlow += this.currentAugmentFlow;
      this.lastAugmentedPathNodes = [...this.foundPathNodes];
      this.lastAugmentedFlow = this.currentAugmentFlow;
      this.log.push(`Augmented by ${this.currentAugmentFlow}. Max Flow = ${this.maxFlow}`);

      this.currentNode = null;
      this.currentNeighbors = [];
      this.mode = "start-bfs";
      return this.getState();
    }

    return this.getState();
  }

  getState() {
    return {
      nodes: [...this.nodes],
      source: this.source,
      sink: this.sink,
      maxFlow: this.maxFlow,
      iteration: this.iteration,
      queue: [...this.queue],
      visited: Array.from(this.visited),
      parent: { ...this.parent },
      pathFlow: { ...this.pathFlow },
      currentNode: this.currentNode,
      currentNeighbors: [...this.currentNeighbors],
      activePathNodes: [...this.foundPathNodes],
      activePathEdges: this.foundPathEdges.map(([from, to]) => ({ from, to })),
      currentAugmentFlow: this.currentAugmentFlow,
      lastAugmentedPathNodes: [...this.lastAugmentedPathNodes],
      lastAugmentedFlow: this.lastAugmentedFlow,
      finalFlowEdges: this.finalFlowEdges.map((edge) => ({ ...edge })),
      residualCapacity: this.cloneMatrix(this.residualCapacity),
      originalCapacity: this.cloneMatrix(this.originalCapacity),
      log: [...this.log],
      done: this.done,
      mode: this.mode,
    };
  }

  reset(source, sink) {
    const newExecutor = new FordFulkersonExecutor(this.adj, source, sink);
    Object.assign(this, newExecutor);
  }

  runAll() {
    while (!this.done) {
      this.step();
    }
    return this.getState();
  }
}
