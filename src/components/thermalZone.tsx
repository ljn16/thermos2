import * as THREE from 'three';
import { Html } from '@react-three/drei';

/**
 * ThermalZone renders a box for a zone.
 * It now accepts an additional prop `isHeatSource` to indicate a constant heat source.
 * When a zone is a heat source, a wireframe border is rendered.
 */
type ThermalZoneProps = {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  temperature: number;
  isSelected?: boolean;
  isHeatSource?: boolean;
  onClick?: (id: string) => void;
};

export default function ThermalZone({
  id,
  position,
  size,
  temperature,
  isSelected,
  isHeatSource,
  onClick,
}: ThermalZoneProps) {
  const minTemp = -20; // Define the minimum temperature
  const maxTemp = 50; // Define the maximum temperature

  // Map temperature (minTemp to maxTemp) to a color from blue (cold) to red (hot).
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
      {isHeatSource && (
        // Render a slightly larger wireframe box to indicate constant heat source.
        <mesh>
          <boxGeometry args={[2.2, 2.2, 2.2]} />
          <meshBasicMaterial color="yellow" wireframe />
        </mesh>
      )}
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
}