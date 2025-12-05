
import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from './components/Experience';
import { UIOverlay } from './components/UIOverlay';
import { TreeState } from './types';

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeState>({
    lightsOn: true,
    rotationSpeed: 0.2,
    magicDust: true,
    themeColor: '#ffd700', // Gold
    isFormed: true, // Start formed
    // Top (0) to Bottom (4) default gradient
    gradientColors: [
      '#ef4444', // Red (Top)
      '#fbbf24', // Gold
      '#10b981', // Emerald
      '#3b82f6', // Blue
      '#8b5cf6', // Purple (Bottom)
    ],
  });

  const toggleLights = () => setTreeState(prev => ({ ...prev, lightsOn: !prev.lightsOn }));
  const toggleMagic = () => setTreeState(prev => ({ ...prev, magicDust: !prev.magicDust }));
  const toggleFormation = () => setTreeState(prev => ({ ...prev, isFormed: !prev.isFormed }));
  const setSpeed = (speed: number) => setTreeState(prev => ({ ...prev, rotationSpeed: speed }));
  
  const updateGradientColor = (index: number, color: string) => {
    setTreeState(prev => {
      const newColors = [...prev.gradientColors];
      newColors[index] = color;
      return { ...prev, gradientColors: newColors };
    });
  };

  return (
    <div className="relative w-full h-full bg-black">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 2, 8], fov: 45 }}
        gl={{ antialias: false }} // Postprocessing handles AA
      >
        <Suspense fallback={null}>
          <Experience treeState={treeState} />
        </Suspense>
      </Canvas>
      
      <UIOverlay 
        treeState={treeState}
        onToggleLights={toggleLights}
        onToggleMagic={toggleMagic}
        onToggleFormation={toggleFormation}
        onSetSpeed={setSpeed}
        onUpdateGradient={updateGradientColor}
      />
    </div>
  );
};

export default App;
