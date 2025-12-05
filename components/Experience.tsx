import React from 'react';
import { OrbitControls, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { Tree } from './Tree';
import { FloatingCandles } from './FloatingCandles';
import { MagicParticles } from './MagicParticles';
import { TreeState } from '../types';

interface ExperienceProps {
  treeState: TreeState;
}

export const Experience: React.FC<ExperienceProps> = ({ treeState }) => {
  return (
    <>
      {/* Camera & Controls */}
      <OrbitControls 
        minPolarAngle={Math.PI / 3} 
        maxPolarAngle={Math.PI / 1.8} 
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
        enablePan={false}
        enableZoom={true}
        maxDistance={25}
        minDistance={8}
        rotateSpeed={0.5}
      />

      {/* Cinematic Lighting & Environment */}
      <Environment preset="lobby" background={false} environmentIntensity={0.8} />
      
      {/* Reduced Ambient for better contrast */}
      <ambientLight intensity={0.2} color="#002b1f" />
      
      {/* Key Light (Warm Gold) - Balanced */}
      <spotLight 
        position={[10, 15, 10]} 
        angle={0.3} 
        penumbra={0.5} 
        intensity={2} 
        color="#ffeaa7" 
        castShadow 
      />
      
      {/* Rim Light (Cool Blue/Moonlight) - Subtle edge definition */}
      <spotLight 
        position={[-10, 10, -5]} 
        angle={0.5} 
        penumbra={1} 
        intensity={2} 
        color="#a5b4fc" 
      />
      
      {/* Interactive Magic Dust */}
      {treeState.magicDust && (
        <MagicParticles count={400} color={treeState.themeColor} />
      )}

      {/* Scene Content */}
      <group position={[0, -2, 0]}>
        <Tree treeState={treeState} />
        
        {/* Floating Candles - Only show when formed */}
        {treeState.lightsOn && treeState.isFormed && <FloatingCandles count={30} />}
      </group>

      {/* Post Processing - Cinematic Glow (Toned Down) */}
      <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.6} // Only very bright things glow
          mipmapBlur 
          intensity={1.0} // Reduced intensity
          radius={0.6}
          levels={9}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
        <Noise opacity={0.02} />
      </EffectComposer>
    </>
  );
};