import React, { useEffect, useState } from "react";
import {
  Canvas,
  MeshProps,
  useFrame,
  extend,
  useThree,
} from "@react-three/fiber";
import range from "lodash/range";
import _, { flattenDeep } from "lodash";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const cellSize = 0.5;
const spacingFactor = 1.1;
const cellCount = 30;
const updateInterval = 1000;

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

extend({ OrbitControls });

const CameraControls = () => {
  // Get a reference to the Three.js Camera, and the canvas html element.
  // We need these to setup the OrbitControls component.
  // https://threejs.org/docs/#examples/en/controls/OrbitControls
  const {
    camera,
    gl: { domElement },
  } = useThree();
  // Ref to the controls, so that we can update them on every frame using useFrame
  const controls = React.useRef();
  //@ts-ignore
  useFrame((state) => controls.current.update());
  useEffect(() => {
    // camera.position.x = 20;
    // camera.position.y = 20;
    camera.position.z = 50;
  }, []);
  //@ts-ignore
  return <orbitControls ref={controls} args={[camera, domElement]} />;
};

function Cell(
  props: MeshProps & {
    size: number;
    alive: boolean;
    coordinate: { x: number; y: number; z: number };
  }
) {
  const {
    size,
    alive,
    coordinate: { x, y, z },
  } = props;
  const ref = React.useRef<any>();

  const distanceFromOrigin = Math.abs(Math.sqrt(x ** 2 + y ** 2 + z ** 2));
  const layer =
    distanceFromOrigin <= 5
      ? "blue"
      : distanceFromOrigin > 5 && distanceFromOrigin <= 10
      ? "purple"
      : "orange";

  const [on, turn] = useState(false);

  return (
    <mesh {...props} ref={ref} onClick={() => turn(!on)}>
      <boxGeometry args={[size, size, size]} />
      <meshLambertMaterial
        color={on ? "purple" : "red"}
        opacity={alive ? 1 : 0}
        transparent
      />
    </mesh>
  );
}

const shouldLive = ({
  currentlyAlive,
  aliveNeighbours,
}: {
  currentlyAlive: boolean;
  aliveNeighbours: number;
}) => {
  const alive = currentlyAlive;
  const dead = !currentlyAlive;

  // let newLiveState: boolean = alive;
  // if (alive) {
  //   if (aliveNeighbours < 2) newLiveState = false;
  //   else if (aliveNeighbours === 2 || aliveNeighbours === 3)
  //     newLiveState = true;
  //   else if (aliveNeighbours > 3) newLiveState = false;
  // } else {
  //   if (aliveNeighbours === 3) newLiveState = true;
  // }
  // return newLiveState;

  return alive
    ? aliveNeighbours >= 2 && aliveNeighbours <= 3
    : dead
    ? aliveNeighbours == 3
    : false;
};

type CellState = {
  id: string;
  coordinate: { x: number; y: number; z: number };
  alive: boolean;
};
const App = () => {
  const [cells, setCells] = React.useState(
    flattenDeep<CellState>(
      range(0, cellCount).map((x) =>
        range(0, cellCount).map((y) =>
          range(0, 1).map((z): CellState => {
            const xCoord = x - cellCount / 2;
            const yCoord = y - cellCount / 2;
            const zCoord = z - 1 / 2;
            return {
              id: `(${xCoord})-(${yCoord})-(${zCoord})`,
              coordinate: { x: xCoord, y: yCoord, z: zCoord },
              // alive: Math.sqrt(xCoord ** 2 + yCoord ** 2 + zCoord ** 2) < 10,
              alive: Math.random() < 0.5,
            };
          })
        )
      )
    )
  );

  useEffect(() => {
    setInterval(() => {
      const indexedCells = cells.reduce((acc, c) => {
        acc.set(c.id, c);
        return acc;
      }, new Map<string, CellState>());
      const updatedCells = cells.map((c) => {
        const neighbours = neighborTable
          .map(([xOffset, yOffset, zOffset]) => ({
            x: c.coordinate.x + xOffset,
            y: c.coordinate.y + yOffset,
            z: c.coordinate.z + zOffset,
          }))
          .map(({ x, y, z }) => indexedCells.get(`(${x})-(${y})-(${z})`));
        const aliveSurroundingCells = neighbours.filter((c) => c?.alive).length;
        const newLiveState = shouldLive({
          aliveNeighbours: aliveSurroundingCells,
          currentlyAlive: c.alive,
        });
        return {
          ...c,
          alive: newLiveState,
        };
      });
      setCells(updatedCells);
    }, updateInterval);
  }, []);

  return (
    <>
      {cells.map(({ coordinate: { x, y, z }, alive }) => {
        const positioning = cellSize * spacingFactor;
        return alive ? (
          <Cell
            alive
            key={`(${x})-(${y})-(${z})`}
            coordinate={{ x, y, z }}
            size={cellSize}
            position={[x * positioning, y * positioning, z * positioning]}
          />
        ) : null;
      })}
    </>
  );
};

export default () => {
  return (
    <div style={{ height: "100%" }}>
      <Canvas style={{ height: "100%" }}>
        <color attach="background" args={["black"]} />
        <ambientLight />
        <pointLight castShadow={true} position={[10, 10, 10]} />
        <pointLight castShadow={true} position={[20, 30, 10]} />
        <CameraControls />
        <App />
      </Canvas>
    </div>
  );
};
