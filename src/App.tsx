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
// import { useState } from "react";
import * as THREE from "three";            // main 3D library used under the hood.
import { Leva, useControls } from "leva";  // live parameter controls in a UI panel.

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
      const minTemp = -20;
      const maxTemp = 50;
      const clampedTemp = Math.max(minTemp, Math.min(maxTemp, temp));
  
      // Normalize temperature to a 0-1 range
      const normalized = (clampedTemp - minTemp) / (maxTemp - minTemp);
  
      // Map normalized value to an RGB scale where only red and blue are used
      const red = normalized;
      const blue = 1 - normalized;

      // // Convert RGB to HSL color string
      // const hslColor = `hsl(${240 * (1 - normalized)}, 100%, 50%)`;

      // Return HSL or THREE.js color
      return new THREE.Color(`rgb(${Math.round(red * 255)}, 0, ${Math.round(blue * 255)})`);
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

// Define the main component ThermalModel, which uses the above ThermalZone component and sets up the scene.
export default function ThermalModel() {
  const minTemp = -20;
  const maxTemp = 50;

  // We initialize Leva controls outside of useEffect to avoid potential sandbox issues.
  // let controls;
  // try {
    // If there's an error, it will be caught below.
    const controls = useControls({
      temp1: { value: -20, min: minTemp, max: maxTemp, step: 1 },
      temp2: { value: 30, min: minTemp, max: maxTemp, step: 1 },
      temp3: { value: 50, min: minTemp, max: maxTemp, step: 1 },
    });
  // } catch (error) {
  //   console.error("Error initializing Leva controls:", error);
  //   // If user expects something else, we can discuss.
  //   return null;
  // }

  if (!controls) {
    // If useControls returned nothing, we skip rendering.
    return null;
  }

  return (
    <>
      {/* Render the Leva panel for adjusting controls. */}
      <Leva />
      <Canvas camera={{ position: [5, 5, 10], fov: 50 }}> {/* 3D Canvas with a camera at [5,5,10]. */}
        <ambientLight intensity={0.5} /> {/* Overall illumination. */}
        <directionalLight position={[5, 5, 5]} intensity={1} /> {/* Directional sunlight. */}

        {/* Three ThermalZones at different positions. */}
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
        />

        <OrbitControls /> {/* Allows orbiting and zooming with the mouse. */}
      </Canvas>
    </>
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

