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
const computeNextState = ({cells, universeSize}) => {
  console.log('====================')
  console.time('total')
  console.time('indexing')
  const cellsIndex = cells.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});
  console.timeEnd('indexing')
  console.time('compute')
  const updatedCells = cells.map((c) => {
    const aliveSurroundingCells = neighborTable
      .map(([ x, y, z ]) => cellsIndex[cellId(
        c.coordinate.x + x, 
        c.coordinate.y + y, 
        c.coordinate.z + z
      )])
      .filter((c) => c?.alive)
      .length;
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
  console.timeEnd('compute');
  console.timeEnd('total');
  console.log('alive %: ', updatedCells.filter((c) => c.alive).length / updatedCells.length)
  return updatedCells;
};

onmessage = (event) => {
  const { payload, requestId } = event.data;

  postMessage({
    requestId,
    result: computeNextState(payload),
  });
};
