import React, { useCallback, useEffect, useRef, useState } from "react";
import { MeshProps, useFrame, extend, useThree } from "@react-three/fiber";
import range from "lodash/range";
import { flattenDeep } from "lodash";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Signal } from "signal-ts";
import { softShadows } from "@react-three/drei";
import { VRCanvas } from "@react-three/xr";
import { CellState } from "./utils";

const cellSize = 0.5;
const spacingFactor = 1;
const sceneDimentions = {
  x: 30,
  y: 30,
  z: 30,
};

softShadows({
  frustum: 3.75,
  size: 0.005,
  near: 9.5,
  samples: 17,
  rings: 11, // Rings (default: 11) must be a int
});
extend({ OrbitControls });

const CameraControls = () => {
  const {
    camera,
    gl: { domElement },
  } = useThree();
  const controls = React.useRef();
  //@ts-ignore
  useFrame((state) => controls.current.update());
  useEffect(() => {
    camera.position.x = 10;
    camera.position.y = 10;
    camera.position.z = 10;
  }, [camera]);
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
  const { size } = props;
  const ref = React.useRef<any>();

  const [on, turn] = useState(false);

  return (
    <mesh
      castShadow
      receiveShadow
      {...props}
      ref={ref}
      onClick={() => turn(!on)}
    >
      <boxGeometry args={[size, size, size]} />
      <meshLambertMaterial color={"orange"} transparent />
    </mesh>
  );
}

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
              Math.sqrt(xCoord ** 2 + yCoord ** 2 + zCoord ** 2) < 5 &&
              Math.random() < 0.01,
          };
        })
      )
    )
  );

const Container = () => {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry
        args={[
          cellSize * sceneDimentions.x + cellSize,
          cellSize * sceneDimentions.y + cellSize,
          cellSize * sceneDimentions.z + cellSize,
        ]}
      />
      <meshStandardMaterial
        depthWrite={false}
        color={"white"}
        opacity={0.2}
        transparent
      />
    </mesh>
  );
};

const App = (props: { resetSignal: Signal<any> }) => {
  const [cells, setCells] = React.useState(getRandomState);
  // const worker = useWorker(createWorker);

  const [worker] = React.useState(
    new Worker(new URL("./worker", import.meta.url))
  );
  const workerRequestId = useRef<number>();
  const update = useCallback(
    (cells: CellState[]) => {
      // const newState = await worker.computeNextState(cells);
      workerRequestId.current = Math.random();
      worker.postMessage({
        payload: cells,
        requestId: workerRequestId.current,
      });
    },
    [worker]
  );

  React.useEffect(() => {
    const handler = ({
      data,
    }: {
      data: {
        requestId: typeof workerRequestId.current;
        result: CellState[];
      };
    }) => {
      if (data.requestId === workerRequestId.current) {
        setCells(data.result);
      }
    };
    worker.addEventListener("message", handler);
    return () => worker.removeEventListener("message", handler);
  }, [worker]);

  const renderCycle = useRef(0);
  useFrame(() => {
    renderCycle.current++;
    if (renderCycle.current === 10) {
      renderCycle.current = 0;
      update(cells);
    }
  });

  const reset = () => {
    workerRequestId.current = undefined;
    renderCycle.current = 0;
    setCells(getRandomState());
  };

  useEffect(() => {
    props.resetSignal.add(reset);
  }, [props.resetSignal]);

  useEffect(() => {
    if (cells.every((cell) => !cell.alive)) {
      setTimeout(() => {
        reset();
      }, 0);
    }
  }, [cells]);

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

const WebApp = () => {
  const [signal] = useState(new Signal<boolean>());
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <VRCanvas>
        <color attach="background" args={["black"]} />
        <ambientLight castShadow />
        <directionalLight castShadow position={[10, 10, 10]} />
        <directionalLight castShadow position={[-20, 30, 10]} />
        <CameraControls />
        <App resetSignal={signal} />
        <Container />
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

export default WebApp;
