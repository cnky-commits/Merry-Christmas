import React, { useMemo, useState } from 'react';
import { Color } from 'three';

// Helper to generate random positions on a cone surface roughly
const generateOrnamentData = (count: number) => {
  const data = [];
  const colors = ['#e63946', '#ffd700', '#f1faee', '#a8dadc'];
  
  for (let i = 0; i < count; i++) {
    // Height from 0.5 to 4.5
    const y = 0.5 + Math.random() * 4.0;
    // Approximate radius at height y (linear interpolation for cone stack)
    // Base radius roughly 2.0 at y=0, decreasing to 0 at y=5.5
    const maxRadius = 1.8 * (1 - y / 5.5); 
    const radius = maxRadius + 0.1; // Slightly offset
    const angle = Math.random() * Math.PI * 2;
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    data.push({ 
      position: [x, y, z] as [number, number, number], 
      color: colors[Math.floor(Math.random() * colors.length)],
      scale: 0.1 + Math.random() * 0.08
    });
  }
  return data;
};

export const Ornaments: React.FC = () => {
  const ornaments = useMemo(() => generateOrnamentData(40), []);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <group>
      {ornaments.map((data, i) => (
        <mesh 
          key={i} 
          position={data.position} 
          scale={hovered === i ? data.scale * 1.5 : data.scale}
          onPointerOver={() => setHovered(i)}
          onPointerOut={() => setHovered(null)}
          castShadow
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial 
            color={data.color} 
            metalness={0.9} 
            roughness={0.1} 
            emissive={hovered === i ? data.color : '#000'}
            emissiveIntensity={hovered === i ? 2 : 0}
          />
        </mesh>
      ))}
    </group>
  );
};