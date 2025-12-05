import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';

interface CandleData {
  position: [number, number, number];
  speed: number;
  offset: number;
}

const Candle: React.FC<CandleData> = ({ position, speed, offset }) => {
  const ref = useRef<Group>(null);
  
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.elapsedTime;
      // Gentle floating motion
      ref.current.position.y = position[1] + Math.sin(t * speed + offset) * 0.3;
    }
  });

  return (
    <group ref={ref} position={position}>
      {/* Candle Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
        <meshStandardMaterial color="#fffae0" />
      </mesh>
      {/* Flame */}
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#ffaa00" />
      </mesh>
      {/* Light Source */}
      <pointLight position={[0, 0.25, 0]} intensity={1} distance={3} color="#ffaa00" decay={2} />
    </group>
  );
};

export const FloatingCandles: React.FC<{ count: number }> = ({ count }) => {
  const candles = useMemo(() => {
    const arr: CandleData[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 2.5 + Math.random() * 2;
      const y = 1 + Math.random() * 4;
      arr.push({
        position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
        speed: 0.5 + Math.random() * 0.5,
        offset: Math.random() * 10
      });
    }
    return arr;
  }, [count]);

  return (
    <>
      {candles.map((c, i) => (
        <Candle key={i} {...c} />
      ))}
    </>
  );
};