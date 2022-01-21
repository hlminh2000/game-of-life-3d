import React, { useEffect, useRef, useState } from "react";
import {
  MeshProps,
  useFrame,
  extend,
  useThree,
} from "@react-three/fiber";
import range from "lodash/range";
import _, { flattenDeep } from "lodash";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Signal } from "signal-ts";
import { softShadows } from "@react-three/drei";
import { VRCanvas } from "@react-three/xr";

const cellSize = 0.5;
const spacingFactor = 1;
const sceneDimentions = {
  x: 50,
  y: 50,
  z: 50,
};
const rules = {
  lower: 2,
  upper: 3,

  // lower: 5,
  // upper: 7,

  // lower: 3,
  // upper: 6,

  // lower: 4,
  // upper: 9,
};

softShadows({
  frustum: 3.75,
  size: 0.005,
  near: 9.5,
  samples: 17,
  rings: 11, // Rings (default: 11) must be a int
});
extend({ OrbitControls });

const shouldLive = ({
  currentlyAlive,
  aliveNeighbours,
}: {
  currentlyAlive: boolean;
  aliveNeighbours: number;
}) => {
  if (currentlyAlive) {
    return aliveNeighbours >= rules.lower && aliveNeighbours <= rules.upper;
  }
  return aliveNeighbours == rules.upper;
};

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
    camera.position.z = 20;
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
    // alive,
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
        color={"orange"}
        opacity={1}
        // opacity={alive ? 1 : 0}
        transparent
      />
    </mesh>
  );
}

type CellState = {
  id: string;
  coordinate: { x: number; y: number; z: number };
  alive: boolean;
};

const getRandomState = () =>
  flattenDeep<CellState>(
    range(0, sceneDimentions.x).map((x) =>
      range(0, sceneDimentions.y).map((y) =>
        range(0, sceneDimentions.z).map((z): CellState => {
          const xCoord = x - sceneDimentions.x / 2;
          const yCoord = y - sceneDimentions.y / 2;
          const zCoord = z - sceneDimentions.z / 2;
          return {
            id: `(${xCoord})-(${yCoord})-(${zCoord})`,
            coordinate: { x: xCoord, y: yCoord, z: zCoord },
            alive:
              Math.sqrt(xCoord ** 2 + yCoord ** 2 + zCoord ** 2) < 10 &&
              Math.random() < 0.01,
            // alive: [
            //   Math.abs(xCoord),
            //   Math.abs(yCoord),
            //   Math.abs(zCoord),
            // ].every((c) => c < 10),
            // alive: Math.random() < 0.1,
          };
        })
      )
    )
  );

const App = (props: { resetSignal: Signal<any> }) => {
  const [cells, setCells] = React.useState(getRandomState);

  const update = (cells: CellState[]) => {
    console.log("============");
    console.time("compute");
    console.time("index");
    const indexedCells = cells.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {} as { [k: string]: CellState });
    console.timeEnd("index");
    console.time("update");
    const updatedCells = cells.map((c) => {
      const neighbours = neighborTable
        .map(([xOffset, yOffset, zOffset]) => ({
          x: c.coordinate.x + xOffset,
          y: c.coordinate.y + yOffset,
          z: c.coordinate.z + zOffset,
        }))
        .map(({ x, y, z }) => indexedCells[`(${x})-(${y})-(${z})`]);
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
    console.timeEnd("update");
    console.timeEnd("compute");
    setCells(updatedCells);
  };

  const renderCycle = useRef(0);
  useFrame(() => {
    renderCycle.current++;
    if (renderCycle.current === 100) {
      renderCycle.current = 0;
      update(cells);
    }
  });

  useEffect(() => {
    props.resetSignal.add(() => {
      console.log("yooo!!!!");
      renderCycle.current = 0;
      setCells(getRandomState());
    });
  }, []);

  return (
    <>
      {cells.map(({ coordinate: { x, y, z }, alive }) => {
        const positioning = cellSize * spacingFactor;
        return alive ? (
          <Cell
            alive={alive}
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
  const [signal] = useState(new Signal<boolean>());
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <VRCanvas>
        {/* <Canvas style={{ height: "100%" }}> */}
        <color attach="background" args={["black"]} />
        <ambientLight />
        <pointLight castShadow={true} position={[10, 10, 10]} />
        <pointLight castShadow={true} position={[20, 30, 10]} />
        <CameraControls />
        <App resetSignal={signal} />
        {/* </Canvas> */}
      </VRCanvas>
      <button
        onClick={() => signal.emit(true)}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        reset
      </button>
    </div>
  );
};
