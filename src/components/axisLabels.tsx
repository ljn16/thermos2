/**
 * AxisLabels renders 3D text labels along the grid edges.
 */
import { Text } from '@react-three/drei';


export default function AxisLabels({ dimensions }: { dimensions: Dimensions }) {
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