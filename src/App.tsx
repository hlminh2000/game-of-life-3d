import React, { ReactElement, useEffect, useRef, useState } from "react";
import { useFrame, extend, useThree } from "@react-three/fiber";
import range from "lodash/range";
import { flattenDeep } from "lodash";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Signal } from "signal-ts";
import { softShadows } from "@react-three/drei";
import { VRCanvas, DefaultXRControllers, RayGrab } from "@react-three/xr";
import { CellState } from "./utils";
import { BoxGeometry, Mesh, MeshLambertMaterial } from "three";
//@ts-ignore
import getWorker from "./worker/compute.worker";

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
    // camera.position.x = 10;
    // camera.position.y = 10;
    camera.position.z = 20;
  }, [camera]);
  //@ts-ignore
  return <orbitControls ref={controls} args={[camera, domElement]} />;
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
              Math.sqrt(xCoord ** 2 + yCoord ** 2 + zCoord ** 2) < 3 &&
              Math.random() < 0.05,
            // Math.random() < 0.01,
            aliveNeighbourCount: 0,
          };
        })
      )
    )
  );

const Container = ({ children }: { children: ReactElement }) => {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry
        args={[
          cellSize * sceneDimentions.x * spacingFactor,
          cellSize * sceneDimentions.y * spacingFactor,
          cellSize * sceneDimentions.z * spacingFactor,
        ]}
      />
      <meshStandardMaterial
        depthWrite={false}
        color={"white"}
        opacity={0.1}
        transparent
      />
      {children}
    </mesh>
  );
};

const boxGeometry = new BoxGeometry(cellSize, cellSize, cellSize);
const material = new MeshLambertMaterial({ color: "orange" });
material.transparent = true;
const meshes = getRandomState()
  .map(({ coordinate: { x, y, z }, id }) => {
    const positioning = cellSize * spacingFactor;
    const mesh = new Mesh(boxGeometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.x = x * positioning;
    mesh.position.y = y * positioning;
    mesh.position.z = z * positioning;
    return { id, mesh };
  })
  .reduce((acc, { id, mesh }) => {
    acc[id] = mesh;
    return acc;
  }, {} as { [k: string]: Mesh });

const App = (props: { resetSignal: Signal<any> }) => {
  const [cells, setCells] = React.useState(getRandomState());
  const [worker] = React.useState(getWorker());

  const workerRequestId = useRef<number>();
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

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (cells.every((cell) => !cell.alive)) {
        reset();
      } else {
        workerRequestId.current = Math.random();
        worker.postMessage({
          payload: { cells, universeSize: sceneDimentions },
          requestId: workerRequestId.current,
        });
      }
    }, 1000 / 60);
    return () => clearTimeout(timeout);
  }, [cells, worker]);

  const reset = () => {
    workerRequestId.current = undefined;
    setCells(getRandomState());
  };

  useEffect(() => {
    props.resetSignal.add(reset);
  }, [props.resetSignal]);

  const containerMesh = useRef<Mesh>();
  useFrame(() => {
    cells.forEach((c) => {
      const mesh = meshes[c.id];
      if (c.alive) {
        if (!mesh.parent) {
          containerMesh.current?.add(meshes[c.id]);
        }
      } else {
        if (mesh.parent) {
          containerMesh.current?.remove(meshes[c.id]);
        }
      }
    });
  });

  return (
    <RayGrab>
      <Container>
        <mesh ref={containerMesh}></mesh>
      </Container>
    </RayGrab>
  );
};

const WebApp = () => {
  const [signal] = useState(new Signal<boolean>());
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <VRCanvas>
        <color attach="background" args={["black"]} />
        <DefaultXRControllers />
        <ambientLight castShadow />
        <directionalLight castShadow position={[10, 10, 10]} />
        <directionalLight castShadow position={[-20, 30, 10]} />
        <CameraControls />
        <App resetSignal={signal} />
      </VRCanvas>
      <button
        onClick={() => signal.emit(true)}
        style={{
          margin: 10,
          padding: "5px 10px",
          borderRadius: 10,
          color: 'white',
          background: 'blue',

          position: "absolute",
          top: 0,
          left: 0 
        }}
      >
        reset
      </button>
    </div>
  );
};

export default WebApp;
