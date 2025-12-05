
import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface MagicParticlesProps {
  count?: number;
  color?: string;
}

export const MagicParticles: React.FC<MagicParticlesProps> = ({ 
  count = 200, 
  color = '#ffd700' 
}) => {
  const mesh = useRef<THREE.Points>(null);
  const { viewport } = useThree();

  // Generate particle data
  const [positions, velocities, accelerations] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const accelerations = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      
      accelerations[i * 3] = (Math.random() - 0.5) * 0.005;
      accelerations[i * 3 + 1] = (Math.random() - 0.5) * 0.005; 
      accelerations[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
    }
    return [positions, velocities, accelerations];
  }, [count]);

  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((state) => {
    if (!mesh.current) return;

    // "3D Cursor" position approximation
    const targetX = (state.pointer.x * viewport.width) / 2;
    const targetY = (state.pointer.y * viewport.height) / 2;
    
    const posAttr = mesh.current.geometry.attributes.position as THREE.BufferAttribute;
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      // 1. Natural Drift
      velocities[idx] += accelerations[idx];
      velocities[idx+1] += accelerations[idx+1];
      velocities[idx+2] += accelerations[idx+2];

      // 2. Magnetic Attraction to Cursor
      const px = posAttr.array[idx];
      const py = posAttr.array[idx+1];
      const pz = posAttr.array[idx+2];
      
      const dx = targetX - px;
      const dy = targetY - py;
      const dz = -pz; 
      
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      // Interaction Radius
      if (dist < 8) {
        // Stronger pull when closer
        const force = 0.06 * (1 - dist / 8);
        velocities[idx] += dx * force;
        velocities[idx+1] += dy * force;
        velocities[idx+2] += dz * force;
      }

      // 3. Friction
      velocities[idx] *= 0.95;
      velocities[idx+1] *= 0.95;
      velocities[idx+2] *= 0.95;

      // 4. Update
      posAttr.array[idx] += velocities[idx];
      posAttr.array[idx+1] += velocities[idx+1];
      posAttr.array[idx+2] += velocities[idx+2];

      // 5. Reset if lost
      if (Math.abs(px) > 15 || Math.abs(py) > 15) {
          posAttr.array[idx] = (Math.random() - 0.5) * 5;
          posAttr.array[idx+1] = (Math.random() - 0.5) * 5 + 5;
          velocities[idx] = 0;
          velocities[idx+1] = 0;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        size={0.25} // Increased size
        color={color}
        transparent
        opacity={0.9} // Increased opacity
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
