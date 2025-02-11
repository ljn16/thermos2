// import { useEffect, useState } from "react";
// import type { Schema } from "../amplify/data/resource";
// import { generateClient } from "aws-amplify/data";

// const client = generateClient<Schema>();

// function App() {
//   const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);

//   useEffect(() => {
//     client.models.Todo.observeQuery().subscribe({
//       next: (data) => setTodos([...data.items]),
//     });
//   }, []);

//   function createTodo() {
//     client.models.Todo.create({ content: window.prompt("Todo content") });
//   }

//   return (
//     <main>
//       <h1>My todos</h1>
//       <button onClick={createTodo}>+ new</button>
//       <ul>
//         {todos.map((todo) => (
//           <li key={todo.id}>{todo.content}</li>
//         ))}
//       </ul>
//       <div>
//         🥳 App successfully hosted. Try creating a new todo.
//         <br />
//         <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
//           Review next step of this tutorial.
//         </a>
//       </div>
//     </main>
//   );
// }

// export default App;

"use client";

import { Canvas } from "@react-three/fiber";       // creates a 3D rendering canvas.
import { OrbitControls } from "@react-three/drei"; // ability to rotate, pan, and zoom the scene.
import { useState/* , useEffect */ } from "react";
import * as THREE from "three";            // main 3D library used under the hood.
import { Leva, useControls } from "leva";  // live parameter controls in a UI panel.

const minTemp = -20;
const maxTemp = 50;

// Component to input floor dimensions
interface Dimensions {
  height: number;
  width: number;
}

const FloorDimensionsInput = ({ dimensions, onDimensionsChange }: { dimensions: Dimensions, onDimensionsChange: (newDimensions: Dimensions) => void }) => {

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newDimensions = { ...dimensions, [name]: parseInt(value, 10) };
    // setDimensions((prev) => ({ ...prev, [name]: parseInt(value, 10) }));
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
//!----------------------------------------------------------------
// Renders a single "zone" in 3D space.
const ThermalZone = ({ position, size, temperature }: { position: [number, number, number], size: [number, number, number], temperature: number }) => {

  // maps a temperature value to a specific color in HSL.
  const getColor = (temp: number) => {
    // const normalizedTemp = (temp + 20) / 70; // Normalize -20 to 50 range into 0 to 1
    // const red = Math.round(normalizedTemp * 255);
    // const blue = 255 - red;

    // return new THREE.Color(`rgb(${red}, 0, ${blue})`);

    // const t = Math.min(Math.max((temp - 15) / 20, 0), 1); // Normalize (15°C - 35°C range)
    // return new THREE.Color().setHSL(0.67 - t * 0.67, 1, 0.5); // hue from blue to red depending on temperature.
    // //
    // const normalizedTemp = (temp + 20) / 70; // Normalize -20 to 50 range into 0 to 1
    // const hue = (1 - normalizedTemp) * 240; // Map normalizedTemp to hue (240 = blue, 0 = red)
    // const saturation = 100; // Full saturation for vibrant colors
    // const lightness = 50; // 50% lightness for lighter colors

    // return new THREE.Color(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    // //
      // Clamp the temperature between -20 and 50 degrees C

      const clampedTemp = Math.max(minTemp, Math.min(maxTemp, temp));
  
      // Normalize temperature to a 0-1 range
      const normalized = (clampedTemp - minTemp) / (maxTemp - minTemp);
  
      // Map normalized value to an RGB scale where only red and blue are used
      const red = normalized;
      const blue = 1 - normalized;

      // // Convert RGB to HSL color string
      // const hslColor = `hsl(${240 * (1 - normalized)}, 100%, 50%)`;

      // Return HSL or THREE.js color
      // TODO: make translucent
      return new THREE.Color(`rgba(${Math.round(red * 255)}, 0, ${Math.round(blue * 255)}, 0.1)`);
  };

  return (
    <mesh position={position}>
      {/* Define box geometry using the passed-in size array. */}
      <boxGeometry args={size} />
      {/* Use the material's color property to set the computed temperature color. */}
      <meshStandardMaterial color={getColor(temperature)} />
    </mesh>
  );
};
//!----------------------------------------------------------------

// Define the main component ThermalModel, which uses the above ThermalZone component and sets up the scene.
export default function ThermalModel() {
  const minTemp = -20;
  const maxTemp = 50;
  const [dimensions, setDimensions] = useState({ height: 10, width: 10 });

  // We initialize Leva controls outside of useEffect to avoid potential sandbox issues.
  const tempControls: { [key: string]: { value: number; min: number; max: number; step: number } } = {};
  for (let i = 0; i < dimensions.width * dimensions.height; i++) {
    tempControls[`temp${i + 1}`] = { value: Math.floor(Math.random() * (maxTemp - minTemp + 1)) + minTemp, min: minTemp, max: maxTemp, step: 1 };
  }
  const controls = useControls(tempControls);

  if (!controls) {
    // If useControls returned nothing, we skip rendering.
    return null;
  }

  return (
    <div className="h-screen w-screen">
      {/* Render the Leva panel for adjusting controls. */}
      <Leva />
      <FloorDimensionsInput dimensions={dimensions} onDimensionsChange={setDimensions} />
      <Canvas className='border border-red-700' camera={{ position: [5, 5, 10], fov: 50 }}> {/* 3D Canvas with a camera at [5,5,10]. */}
        <ambientLight intensity={1} /> {/* Overall illumination. */}
        <directionalLight position={[5, 5, 5]} intensity={1} /> {/* Directional sunlight. */}

        {/* Three ThermalZones at different positions.
        <ThermalZone
          position={[-2, 0, 0]}
          size={[2, 2, 2]}
          temperature={controls.temp1 || 22}
        />
        <ThermalZone
          position={[0, 0, 0]}
          size={[2, 2, 2]}
          temperature={controls.temp2 || 30}
        />
        <ThermalZone
          position={[2, 0, 0]}
          size={[2, 2, 2]}
          temperature={controls.temp3 || 18}
        /> */}
        {/* Grid of ThermalZones */}
        {Array.from({ length: dimensions.width }).map((_, rowIndex) => // For each row, create a ThermalZone.
            Array.from({ length: dimensions.height }).map((_, colIndex) => (  // For each column in the row, create a ThermalZone.
              <ThermalZone
                key={`${rowIndex}-${colIndex}`}
                position={[colIndex * 2 - 4, 0, rowIndex * 2 - 2]}
                size={[2, 2, 2]}
                temperature={controls[`temp${rowIndex * dimensions.width + colIndex + 1}`] || 22}
              />
            ))
          )}

        <OrbitControls /> {/* Allows orbiting and zooming with the mouse. */}
      </Canvas>
    </div>
  );
}

// TEST CASES
// Existing test cases:
// 1) ThermalModel does not crash on client render.
// 2) ThermalZone color calculation logic.
//
// We'll add a new test that ensures we handle errors gracefully.
//
// import { render } from "@testing-library/react";
//
// test("ThermalModel does not crash on client render", () => {
//   if (typeof window !== "undefined") {
//     render(<ThermalModel />);
//   }
// });
//
// test("ThermalZone color calculation logic", () => {
//   if (typeof window !== "undefined") {
//     const temp = 25;
//     render(<ThermalZone position={[0,0,0]} size={[1,1,1]} temperature={temp} />);
//   }
// });
//
// test("Handles error from Leva initialization", () => {
//   // We can mock useControls to throw an error.
//   if (typeof window !== "undefined") {
//     jest.mock("leva", () => ({
//       useControls: () => { throw new Error("Simulated Leva error"); },
//       Leva: () => null,
//     }));
//     // If it errors, we expect the component to safely return null.
//     const { container } = render(<ThermalModel />);
//     expect(container.firstChild).toBeNull();
//   }
// });

