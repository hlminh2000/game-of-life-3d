const neighborTable = [
  [-1, -1, -1],
  [-1, -1, 0],
  [-1, -1, 1],
  [-1, 0, -1],
  [-1, 0, 0],
  [-1, 0, 1],
  [-1, 1, -1],
  [-1, 1, 0],
  [-1, 1, 1],

  [0, -1, -1],
  [0, -1, 0],
  [0, -1, 1],
  [0, 0, -1],
  [0, 0, 1],
  [0, 1, -1],
  [0, 1, 0],
  [0, 1, 1],

  [1, -1, -1],
  [1, -1, 0],
  [1, -1, 1],
  [1, 0, -1],
  [1, 0, 0],
  [1, 0, 1],
  [1, 1, -1],
  [1, 1, 0],
  [1, 1, 1],
];

const rules = {
  lower: 2,
  upper: 3,
};

const shouldLive = ({ currentlyAlive, aliveNeighbours }) => {
  if (currentlyAlive) {
    return aliveNeighbours >= rules.lower && aliveNeighbours <= rules.upper;
  }
  return aliveNeighbours === rules.upper;
};

const cellId = (x, y, z) => `(${x})-(${y})-(${z})`;
const computeNextState = (cells) => {
  const cellsIndex = cells.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  const updatedCells = cells.map((c) => {
    const neighbours = neighborTable
      .map(([xOffset, yOffset, zOffset]) => ({
        x: c.coordinate.x + xOffset,
        y: c.coordinate.y + yOffset,
        z: c.coordinate.z + zOffset,
      }))
      .map(({ x, y, z }) => cellsIndex[cellId(x, y, z)]);
    const aliveSurroundingCells = neighbours.filter((c) => c?.alive).length;
    const newLiveState = shouldLive({
      aliveNeighbours: aliveSurroundingCells,
      currentlyAlive: c.alive,
    });

    return {
      ...c,
      alive: newLiveState,
      aliveNeighbourCount: aliveSurroundingCells,
    };
  });

  return updatedCells;
};

onmessage = (event) => {
  const { payload, requestId } = event.data;

  postMessage({
    requestId,
    result: computeNextState(payload),
  });
};
