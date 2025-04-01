import { Canvas, useFrame, extend } from "@react-three/fiber";
import { OrbitControls, Html, Text } from "@react-three/drei";
import { useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import { LevaPanel, useControls, useCreateStore } from "leva";

import FloorDimensionsInput from "./components/floorDimensions";
import ThermalZone from "./components/thermalZone";
import AxisLabels from "./components/axisLabels";

// Extend THREE so that ArrowHelper can be used as a JSX element if needed.
import { ArrowHelper } from "three";
extend({ ArrowHelper });

const minTemp = -20;
const maxTemp = 50;

interface Dimensions {
  height: number;
  width: number;
}

// const AmbientTempInput = ({
//   indoorTemp,
//   outdoorTemp,
//   onIndoorChange,
//   onOutdoorChange,
// }: {
//   indoorTemp: number;
//   outdoorTemp: number;
//   onIndoorChange: (newValue: number) => void;
//   onOutdoorChange: (newValue: number) => void;
// }) => (
//   <div className="flex flex-col">
//     <hr className="my-2 opacity-10" />
//     <h3 className="font-semibold text-center">Ambient Temperature</h3>
//     <div className="space-x-2">
//       <label>
//         Indoor
//         <input
//           className="w-12 rounded-sm ml-1"
//           type="number"
//           value={indoorTemp}
//           onChange={(e) => onIndoorChange(parseFloat(e.target.value))}
//         />
//       </label>
//       <label>
//         Outdoor
//         <input
//           className="w-12 rounded-sm ml-1"
//           type="number"
//           value={outdoorTemp}
//           onChange={(e) => onOutdoorChange(parseFloat(e.target.value))}
//         />
//       </label>
//     </div>
//   </div>
// );



interface ControlsWrapperProps {
  dimensions: Dimensions;
  onControlsUpdate: (controls: Record<string, number>) => void;
  store: any;
}

function ControlsWrapper({ dimensions, onControlsUpdate, store }: ControlsWrapperProps) {
  const controlsConfig = useMemo(() => {
    const config: Record<
      string,
      { value: number; min: number; max: number; step: number; label: string }
    > = {};
    for (let row = 0; row < dimensions.height; row++) {
      for (let col = 0; col < dimensions.width; col++) {
        const key = `temp-${row}-${col}`;
        config[key] = {
          value: Math.floor(Math.random() * (maxTemp - minTemp + 1)) + minTemp,
          min: minTemp,
          max: maxTemp,
          step: 1,
          label: `(${row}, ${col})`,
        };
      }
    }
    return config;
  }, [dimensions]);

  const controls = useControls(controlsConfig, { store });
  useEffect(() => {
    onControlsUpdate(controls);
  }, [controls, onControlsUpdate]);

  return null;
}

/**
 * HeatSimulation updates grid temperatures each frame.
 * If a cell is designated as a heat source (provided in heatSources),
 * its temperature remains constant.
 */
function HeatSimulation({
  gridTemps,
  setGridTemps,
  dimensions,
  isSimulating,
  setIsSimulating,
  store,
  heatSources,
}: {
  gridTemps: number[];
  setGridTemps: (temps: number[]) => void;
  dimensions: Dimensions;
  isSimulating: boolean;
  setIsSimulating: (sim: boolean) => void;
  store: any;
  heatSources: Record<string, number>;
}) {
  useFrame((state, delta) => {
    if (!isSimulating || gridTemps.length === 0) return;
    const { width, height } = dimensions;
    const newTemps = [...gridTemps];
    let maxDiff = 0;
    const diffusionRate = 0.1; // lower rate for longer simulation

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const index = row * width + col;
        const cellId = `${row}-${col}`;
        // If this cell is a heat source, force its temperature and skip update.
        if (heatSources[cellId] !== undefined) {
          newTemps[index] = heatSources[cellId];
          continue;
        }
        const T = gridTemps[index];
        const T_left = col > 0 ? gridTemps[row * width + (col - 1)] : T;
        const T_right = col < width - 1 ? gridTemps[row * width + (col + 1)] : T;
        const T_up = row > 0 ? gridTemps[(row - 1) * width + col] : T;
        const T_down = row < height - 1 ? gridTemps[(row + 1) * width + col] : T;
        const laplacian = T_left + T_right + T_up + T_down - 4 * T;
        const dT = diffusionRate * delta * laplacian;
        newTemps[index] = T + dT;
        maxDiff = Math.max(maxDiff, Math.abs(dT));
      }
    }

    // Update the Leva controls via the store.
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const key = `temp-${row}-${col}`;
        store.set({ [key]: newTemps[row * width + col] });
      }
    }
    setGridTemps(newTemps);
    if (maxDiff < 0.001) {
      setIsSimulating(false);
    }
  });
  return null;
}

/**
 * HeatFlowArrows computes temperature gradients and renders arrows showing heat flow.
 */
function HeatFlowArrows({
  gridTemps,
  dimensions,
}: {
  gridTemps: number[];
  dimensions: Dimensions;
}) {
  const arrows = [];
  const { width, height } = dimensions;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const index = row * width + col;
      const T = gridTemps[index];
      const T_left = col > 0 ? gridTemps[row * width + (col - 1)] : T;
      const T_right = col < width - 1 ? gridTemps[row * width + (col + 1)] : T;
      const T_up = row > 0 ? gridTemps[(row - 1) * width + col] : T;
      const T_down = row < height - 1 ? gridTemps[(row + 1) * width + col] : T;
      const gradientX = (T_right - T_left) / 2;
      const gradientZ = (T_down - T_up) / 2;
      const flow = new THREE.Vector3(-gradientX, 0, -gradientZ);
      const magnitude = flow.length();
      if (magnitude < 0.01) continue;
      flow.normalize();
      const arrowLength = magnitude * 2;
      const arrowColor = 0x00ff00; // green
      const origin = new THREE.Vector3((col - width / 2) * 2, 0.5, (row - height / 2) * 2);
      arrows.push(
        <arrowHelper
          key={`arrow-${row}-${col}`}
          args={[flow, origin, arrowLength, arrowColor, arrowLength * 0.3, arrowLength * 0.2]}
        />
      );
    }
  }
  return <group>{arrows}</group>;
}

/**
 * HeatSourceControl renders a UI panel to toggle a cell as a constant heat source.
 */
function HeatSourceControl({
  selectedZone,
  heatSources,
  setHeatSources,
  dimensions,
  gridTemps,
}: {
  selectedZone: string | null;
  heatSources: Record<string, number>;
  setHeatSources: (hs: Record<string, number>) => void;
  dimensions: Dimensions;
  gridTemps: number[];
}) {
  if (!selectedZone) return null;
  // Parse the selected zone id "row-col"
  const [rowStr, colStr] = selectedZone.split("-");
  const row = parseInt(rowStr);
  const col = parseInt(colStr);
  const index = row * dimensions.width + col;
  const currentTemp = gridTemps[index] ?? 22;
  const isHeatSource = heatSources[selectedZone] !== undefined;
  return (
    <div
      className="fixed bottom-4 right-4 p-4 bg-white bg-opacity-80 rounded shadow"
      style={{ zIndex: 1000 }}
    >
      <h3 className="font-semibold">Heat Source Control</h3>
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={isHeatSource}
          onChange={(e) => {
            if (e.target.checked) {
              // Set the current cell as a heat source with its current temperature.
              setHeatSources((prev) => ({ ...prev, [selectedZone]: currentTemp }));
            } else {
              // Remove the heat source.
              setHeatSources((prev) => {
                const copy = { ...prev };
                delete copy[selectedZone];
                return copy;
              });
            }
          }}
        />
        <span className="ml-2">Set as Constant Temperature Source</span>
      </label>
      {isHeatSource && (
        <div className="mt-2">
          <label>
            Constant Temperature:
            <input
              type="number"
              value={heatSources[selectedZone]}
              onChange={(e) => {
                const newVal = parseFloat(e.target.value);
                setHeatSources((prev) => ({ ...prev, [selectedZone]: newVal }));
              }}
              className="w-16 ml-2 rounded-sm"
            />
          </label>
        </div>
      )}
    </div>
  );
}

export default function ThermalModel() {
  const [dimensions, setDimensions] = useState<Dimensions>({ height: 10, width: 10 });
  const [ambientTemp, setAmbientTemp] = useState({ indoor: 22, outdoor: 22 });
  const [controlsValues, setControlsValues] = useState<Record<string, number>>({});
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [gridTemps, setGridTemps] = useState<number[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [heatSources, setHeatSources] = useState<Record<string, number>>({});

  // Create a Leva store so we can update it programmatically.
  const levaStore = useCreateStore();

  // Reset simulation state when controls, dimensions, or ambient temperature change.
  useEffect(() => {
    const newTemps: number[] = [];
    for (let row = 0; row < dimensions.height; row++) {
      for (let col = 0; col < dimensions.width; col++) {
        const key = `temp-${row}-${col}`;
        newTemps.push(
          controlsValues[key] !== undefined ? controlsValues[key] : ambientTemp.indoor
        );
      }
    }
    setGridTemps(newTemps);
    setIsSimulating(true);
  }, [controlsValues, dimensions, ambientTemp.indoor]);

  return (
    <div className="h-screen w-screen">
      <LevaPanel store={levaStore} collapsed={false} />
      <div className="fixed top-1 left-1 p-4 z-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-sm rounded space-y-2">
        <FloorDimensionsInput dimensions={dimensions} onDimensionsChange={setDimensions} />
        {/* <AmbientTempInput
          indoorTemp={ambientTemp.indoor}
          outdoorTemp={ambientTemp.outdoor}
          onIndoorChange={(newValue) =>
            setAmbientTemp({ ...ambientTemp, indoor: newValue })
          }
          onOutdoorChange={(newValue) =>
            setAmbientTemp({ ...ambientTemp, outdoor: newValue })
          }
        /> */}
      </div>

      <ControlsWrapper
        key={`${dimensions.width}-${dimensions.height}`}
        dimensions={dimensions}
        onControlsUpdate={(newControls) => setControlsValues(newControls)}
        store={levaStore}
      />

      {/* Heat source control overlay */}
      <HeatSourceControl
        selectedZone={selectedZone}
        heatSources={heatSources}
        setHeatSources={setHeatSources}
        dimensions={dimensions}
        gridTemps={gridTemps}
      />

      <Canvas camera={{ position: [5, 5, 10], fov: 50 }}>
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={1} />

        {Array.from({ length: dimensions.height }).map((_, row) =>
          Array.from({ length: dimensions.width }).map((_, col) => {
            const index = row * dimensions.width + col;
            const zoneId = `${row}-${col}`;
            return (
              <ThermalZone
                key={zoneId}
                id={zoneId}
                position={[
                  (col - dimensions.width / 2) * 2,
                  0,
                  (row - dimensions.height / 2) * 2,
                ]}
                size={[2, 2, 2]}
                temperature={gridTemps[index] ?? 22}
                isSelected={selectedZone === zoneId}
                isHeatSource={heatSources[zoneId] !== undefined}
                onClick={(id) => setSelectedZone(id)}
              />
            );
          })
        )}

        <HeatSimulation
          gridTemps={gridTemps}
          setGridTemps={setGridTemps}
          dimensions={dimensions}
          isSimulating={isSimulating}
          setIsSimulating={setIsSimulating}
          store={levaStore}
          heatSources={heatSources}
        />

        {/* <HeatFlowArrows gridTemps={gridTemps} dimensions={dimensions} /> */}

        <AxisLabels dimensions={dimensions} />

        <OrbitControls />
      </Canvas>
    </div>
  );
}
