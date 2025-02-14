import { Canvas } from "@react-three/fiber"; // 3D rendering canvas.
import { OrbitControls, Html, Text } from "@react-three/drei"; // For orbiting, zooming, HTML overlays, and 3D text.
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

/**
 * ThermalZone renders a box for a zone.
 * It shows a tooltip (via <Html>) displaying its grid coordinates (id)
 * when the zone is selected.
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
    return new THREE.Color(red, 0, blue);
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
        color={
          isSelected
            ? getColor(temperature).multiplyScalar(0.5)
            : getColor(temperature)
        }
        transparent
        emissive={
          isSelected ? new THREE.Color(0xffff00) : new THREE.Color(0x000000)
        }
        opacity={0.9}
      />
      {/* Tooltip: shows grid coordinates when this zone is selected */}
      {isSelected && (
        <Html position={[0, 1.5, 0]} distanceFactor={40} center>
          <div
            style={{
              background: "rgba(0, 0, 0, 0.6)",
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

/**
 * AxisLabels renders 3D text labels along the grid edges.
 * These labels are actual 3D objects and will be occluded by other objects.
 * They are positioned outside the floorplan using a margin.
 */
function AxisLabels({ dimensions }: { dimensions: Dimensions }) {
  const margin = 2; // Increase to push labels further outside
  const labels = [];

  // Horizontal (X) labels along the bottom edge.
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

  // Vertical (Y) labels along the left edge.
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

/**
 * ControlsWrapper sets up Leva controls for each zone.
 * Each control key is in the format "temp-<row>-<col>" with a label showing its coordinates.
 */
interface ControlsWrapperProps {
  dimensions: Dimensions;
  onControlsUpdate: (controls: Record<string, number>) => void;
}

function ControlsWrapper({ dimensions, onControlsUpdate }: ControlsWrapperProps) {
  const controlsConfig = useMemo(() => {
    const config: Record<
      string,
      { value: number; min: number; max: number; step: number; label: string }
    > = {};
    for (let rowIndex = 0; rowIndex < dimensions.height; rowIndex++) {
      for (let colIndex = 0; colIndex < dimensions.width; colIndex++) {
        const key = `temp-${rowIndex}-${colIndex}`;
        config[key] = {
          value: Math.floor(Math.random() * (maxTemp - minTemp + 1)) + minTemp,
          min: minTemp,
          max: maxTemp,
          step: 1,
          label: `(${rowIndex}, ${colIndex})`,
        };
      }
    }
    return config;
  }, [dimensions]);

  const controls = useControls(controlsConfig);

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

      {/* Remount ControlsWrapper based on dimensions */}
      <ControlsWrapper
        key={`${dimensions.width}-${dimensions.height}`}
        dimensions={dimensions}
        onControlsUpdate={(newControls) => setControlsValues(newControls)}
      />

      <Canvas camera={{ position: [5, 5, 10], fov: 50 }}>
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={1} />

        {/* Render grid thermal zones */}
        {Array.from({ length: dimensions.height }).map((_, rowIndex) =>
          Array.from({ length: dimensions.width }).map((_, colIndex) => {
            const controlKey = `temp-${rowIndex}-${colIndex}`;
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

        {/* Add axis labels rendered as 3D text (subject to scene depth) */}
        <AxisLabels dimensions={dimensions} />

        <OrbitControls />
      </Canvas>
    </div>
  );
}