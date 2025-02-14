import { Canvas } from "@react-three/fiber"; // 3D rendering canvas.
import { OrbitControls } from "@react-three/drei"; // For orbiting, panning, zooming.
import { useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Leva, useControls } from "leva";

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
}) => {
  return (
    <div>
      <label>
        Indoor Ambient Temperature:
        <input
          type="number"
          value={indoorTemp}
          onChange={(e) => onIndoorChange(parseFloat(e.target.value))}
        />
      </label>
      <label>
        Outdoor Ambient Temperature:
        <input
          type="number"
          value={outdoorTemp}
          onChange={(e) => onOutdoorChange(parseFloat(e.target.value))}
        />
      </label>
    </div>
  );
};

const FloorDimensionsInput = ({
  dimensions,
  onDimensionsChange,
}: {
  dimensions: Dimensions;
  onDimensionsChange: (newDimensions: Dimensions) => void;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newDimensions = { ...dimensions, [name]: parseInt(value, 10) };
    onDimensionsChange(newDimensions);
  };

  return (
    <div>
      <label>
        Height:
        <input
          type="number"
          name="height"
          value={dimensions.height}
          onChange={handleChange}
        />
      </label>
      <label>
        Width:
        <input
          type="number"
          name="width"
          value={dimensions.width}
          onChange={handleChange}
        />
      </label>
    </div>
  );
};

/**
 * ThermalZone now accepts an `id`, an `isSelected` flag, and an `onClick` handler.
 * When clicked, it calls the provided onClick callback with its id.
 * If selected, the emissive property is set to yellow.
 */
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
  // Map temperature to a color.
  const getColor = (temp: number) => {
    const clampedTemp = Math.max(minTemp, Math.min(maxTemp, temp));
    const normalized = (clampedTemp - minTemp) / (maxTemp - minTemp);
    const red = normalized;
    const blue = 1 - normalized;
    // THREE.Color takes values in the 0–1 range.
    return new THREE.Color(red, 0, blue);
  };

  return (
    <mesh
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick(id);
      }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={isSelected ? getColor(temperature).multiplyScalar(0.5) : getColor(temperature)}
        transparent
        emissive={isSelected ? new THREE.Color(0xffff00) : new THREE.Color(0x000000)}
        opacity={0.9}
      />
    </mesh>
  );
};

/**
 * This component sets up Leva controls using the current grid dimensions.
 * It uses useMemo to generate a config for the controls, then calls useControls.
 * Because we key this component by the dimensions, it remounts when the grid size changes.
 * We then pass the latest control values up to the parent via onControlsUpdate.
 */
interface ControlsWrapperProps {
  dimensions: Dimensions;
  onControlsUpdate: (controls: Record<string, number>) => void;
}

function ControlsWrapper({ dimensions, onControlsUpdate }: ControlsWrapperProps) {
  const controlsConfig = useMemo(() => {
    const config: Record<string, { value: number; min: number; max: number; step: number }> = {};
    const totalZones = dimensions.width * dimensions.height;
    for (let i = 0; i < totalZones; i++) {
      config[`temp${i + 1}`] = {
        value: Math.floor(Math.random() * (maxTemp - minTemp + 1)) + minTemp,
        min: minTemp,
        max: maxTemp,
        step: 1,
      };
    }
    return config;
  }, [dimensions]);

  // This hook is re-run on mount (and thus when dimensions change).
  const controls = useControls(controlsConfig);

  // Whenever controls change, notify the parent.
  useEffect(() => {
    onControlsUpdate(controls);
  }, [controls, onControlsUpdate]);

  return null;
}

export default function ThermalModel() {
  const [dimensions, setDimensions] = useState<Dimensions>({ height: 10, width: 10 });
  const [ambientTemp, setAmbientTemp] = useState({ indoor: 22, outdoor: 22 });
  const [controlsValues, setControlsValues] = useState<Record<string, number>>({});
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  return (
    <div className="h-screen w-screen">
      {/* Remount the Leva panel if needed by keying it on dimensions */}
      <Leva collapsed={false} />
      <div className="fixed top-1 left-1 p-4 space-x-4 z-10 bg-white bg-opacity-5 backdrop-filter backdrop-blur-sm rounded">
        <FloorDimensionsInput dimensions={dimensions} onDimensionsChange={setDimensions} />
        <AmbientTempInput
          indoorTemp={ambientTemp.indoor}
          outdoorTemp={ambientTemp.outdoor}
          onIndoorChange={(newValue) => setAmbientTemp({ ...ambientTemp, indoor: newValue })}
          onOutdoorChange={(newValue) => setAmbientTemp({ ...ambientTemp, outdoor: newValue })}
        />
      </div>

      {/* Remount ControlsWrapper based on dimensions */}
      <ControlsWrapper
        key={`${dimensions.width}-${dimensions.height}`}
        dimensions={dimensions}
        onControlsUpdate={(newControls) => setControlsValues(newControls)}
      />
      <Canvas className="border border-red-700" camera={{ position: [5, 5, 10], fov: 50 }}>
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        {/* Render a grid of ThermalZones */}
        {Array.from({ length: dimensions.height }).map((_, rowIndex) =>
  Array.from({ length: dimensions.width }).map((_, colIndex) => {
    const controlKey = `temp${rowIndex * dimensions.width + colIndex + 1}`;
    const zoneId = `${rowIndex}-${colIndex}`;
    return (
      <ThermalZone
        key={zoneId}
        id={zoneId}
        position={[
          (colIndex - dimensions.width / 2) * 2,
          0,
          (rowIndex - dimensions.height / 2) * 2,
        ]}
        size={[2, 2, 2]}
        temperature={controlsValues[controlKey] ?? 22}
        isSelected={selectedZone === zoneId}
        onClick={(id) => setSelectedZone(id)}
      />
    );
  })
)}
        <OrbitControls />
      </Canvas>
    </div>
  );
}