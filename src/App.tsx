import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Text } from "@react-three/drei";
import { useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import { LevaPanel, useControls, useCreateStore } from "leva";

const minTemp = -20;
const maxTemp = 50;

interface Dimensions {
  height: number;
  width: number;
}

const AmbientTempInput = ({
  indoorTemp,
  outdoorTemp,
  onIndoorChange,
  onOutdoorChange,
}: {
  indoorTemp: number;
  outdoorTemp: number;
  onIndoorChange: (newValue: number) => void;
  onOutdoorChange: (newValue: number) => void;
}) => (
  <div className="flex flex-col">
    <hr className="my-2 opacity-10" />
    <h3 className="font-semibold text-center">Ambient Temperature</h3>
    <div className="space-x-2">
      <label>
        Indoor
        <input
          className="w-12 rounded-sm ml-1"
          type="number"
          value={indoorTemp}
          onChange={(e) => onIndoorChange(parseFloat(e.target.value))}
        />
      </label>
      <label>
        Outdoor
        <input
          className="w-12 rounded-sm ml-1"
          type="number"
          value={outdoorTemp}
          onChange={(e) => onOutdoorChange(parseFloat(e.target.value))}
        />
      </label>
    </div>
  </div>
);

const FloorDimensionsInput = ({
  dimensions,
  onDimensionsChange,
}: {
  dimensions: Dimensions;
  onDimensionsChange: (newDimensions: Dimensions) => void;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onDimensionsChange({ ...dimensions, [name]: parseInt(value, 10) });
  };

  return (
    <div className="flex flex-col">
      <h3 className="font-semibold text-center">Floor Dimensions</h3>
      <div className="space-x-2">
        <label>
          Height
          <input
            className="w-12 rounded-sm ml-1"
            type="number"
            name="height"
            value={dimensions.height}
            onChange={handleChange}
          />
        </label>
        <label>
          Width
          <input
            className="w-12 rounded-sm ml-1"
            type="number"
            name="width"
            value={dimensions.width}
            onChange={handleChange}
          />
        </label>
      </div>
    </div>
  );
};

const ThermalZone = ({
  id,
  position,
  size,
  temperature,
  isSelected,
  onClick,
}: {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  temperature: number;
  isSelected?: boolean;
  onClick?: (id: string) => void;
}) => {
  // Map temperature (minTemp to maxTemp) to a color from blue to red.
  const getColor = (temp: number) => {
    const clamped = Math.max(minTemp, Math.min(maxTemp, temp));
    const norm = (clamped - minTemp) / (maxTemp - minTemp);
    return new THREE.Color(norm, 0, 1 - norm);
  };

  return (
    <mesh
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "default";
      }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={isSelected ? getColor(temperature).multiplyScalar(0.5) : getColor(temperature)}
        transparent
        emissive={isSelected ? new THREE.Color(0xffff00) : new THREE.Color(0x000000)}
        opacity={0.9}
      />
      {isSelected && (
        <Html position={[0, 1.5, 0]} distanceFactor={40} center>
          <div
            style={{
              background: "rgba(0,0,0,0.6)",
              color: "white",
              padding: "4px 8px",
              borderRadius: "3px",
              fontSize: "14px",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {id}
          </div>
        </Html>
      )}
    </mesh>
  );
};

function AxisLabels({ dimensions }: { dimensions: Dimensions }) {
  const margin = 2;
  const labels = [];

  for (let col = 0; col < dimensions.width; col++) {
    const x = (col - dimensions.width / 2) * 2;
    const z = (-dimensions.height / 2) * 2 - margin;
    labels.push(
      <Text
        key={`col-${col}`}
        position={[x, 0.1, z]}
        fontSize={0.5}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {`X: ${col}`}
      </Text>
    );
  }

  for (let row = 0; row < dimensions.height; row++) {
    const z = (row - dimensions.height / 2) * 2;
    const x = (-dimensions.width / 2) * 2 - margin;
    labels.push(
      <Text
        key={`row-${row}`}
        position={[x, 0.1, z]}
        fontSize={0.5}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {`Y: ${row}`}
      </Text>
    );
  }

  return <>{labels}</>;
}

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

  // Pass the store to useControls so that updates from the simulation can be reflected.
  const controls = useControls(controlsConfig, { store });
  useEffect(() => {
    onControlsUpdate(controls);
  }, [controls, onControlsUpdate]);

  return null;
}

/**
 * HeatSimulation updates the grid temperatures each frame using a discrete Laplacian.
 * It also uses the provided store to update the Leva controls in real time.
 */
function HeatSimulation({
  gridTemps,
  setGridTemps,
  dimensions,
  isSimulating,
  setIsSimulating,
  store,
}: {
  gridTemps: number[];
  setGridTemps: (temps: number[]) => void;
  dimensions: Dimensions;
  isSimulating: boolean;
  setIsSimulating: (sim: boolean) => void;
  store: any;
}) {
  useFrame((state, delta) => {
    if (!isSimulating || gridTemps.length === 0) return;
    const { width, height } = dimensions;
    const newTemps = [...gridTemps];
    let maxDiff = 0;
    const diffusionRate = 0.51; // lower rate for longer simulation

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const index = row * width + col;
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

export default function ThermalModel() {
  const [dimensions, setDimensions] = useState<Dimensions>({ height: 10, width: 10 });
  const [ambientTemp, setAmbientTemp] = useState({ indoor: 22, outdoor: 22 });
  const [controlsValues, setControlsValues] = useState<Record<string, number>>({});
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [gridTemps, setGridTemps] = useState<number[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);

  // Create a Leva store so we can update it programmatically.
  const levaStore = useCreateStore();

  // When controls, dimensions, or ambient temperature change, reset the simulation.
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
        <AmbientTempInput
          indoorTemp={ambientTemp.indoor}
          outdoorTemp={ambientTemp.outdoor}
          onIndoorChange={(newValue) =>
            setAmbientTemp({ ...ambientTemp, indoor: newValue })
          }
          onOutdoorChange={(newValue) =>
            setAmbientTemp({ ...ambientTemp, outdoor: newValue })
          }
        />
      </div>

      <ControlsWrapper
        key={`${dimensions.width}-${dimensions.height}`}
        dimensions={dimensions}
        onControlsUpdate={(newControls) => setControlsValues(newControls)}
        store={levaStore}
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
        />

        <AxisLabels dimensions={dimensions} />

        <OrbitControls />
      </Canvas>
    </div>
  );
}