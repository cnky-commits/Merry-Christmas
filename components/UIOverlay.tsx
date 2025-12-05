
import React from 'react';
import { TreeState } from '../types';

interface UIOverlayProps {
  treeState: TreeState;
  onToggleLights: () => void;
  onToggleMagic: () => void;
  onToggleFormation: () => void;
  onSetSpeed: (speed: number) => void;
  onUpdateGradient: (index: number, color: string) => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ 
  treeState, 
  onToggleLights, 
  onToggleMagic,
  onToggleFormation,
  onSetSpeed,
  onUpdateGradient
}) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-6 md:p-12 z-10">
      
      {/* Header */}
      <header className="flex flex-col items-center pointer-events-auto transition-opacity duration-1000">
        <h1 className="text-4xl md:text-6xl font-serif text-gold-400 tracking-widest uppercase text-shadow-glow drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] text-center">
          Lumina Arbor
        </h1>
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-gold-500 to-transparent mt-4 opacity-70"></div>
        <p className="mt-2 text-emerald-100/60 font-serif italic text-sm md:text-base">
          Interactive Magic Experience
        </p>
      </header>

      {/* Controls */}
      <div className="pointer-events-auto self-center md:self-end bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl shadow-emerald-900/50 transform transition-all hover:scale-105 max-h-[60vh] overflow-y-auto custom-scrollbar">
        <h2 className="text-gold-500 font-serif text-xl mb-4 border-b border-white/10 pb-2">
          Spellbook
        </h2>
        
        <div className="space-y-4">
          {/* Main State Toggle: Chaos vs Formed */}
          <button 
            onClick={onToggleFormation}
            className="w-full py-2 mb-2 rounded-lg border border-gold-500/50 bg-gold-500/10 text-gold-200 font-serif hover:bg-gold-500/20 transition-all uppercase tracking-widest text-sm"
          >
            {treeState.isFormed ? 'Disperse into Chaos' : 'Summon Tree'}
          </button>

          {/* Color Gradient Palette */}
          <div className="space-y-2 pt-2 pb-2 border-b border-white/5">
            <span className="text-gray-300 font-serif text-sm">Chromatic Tuning (Top - Bottom)</span>
            <div className="flex justify-between items-center gap-1">
              {treeState.gradientColors.map((color, index) => (
                <div key={index} className="flex flex-col items-center group relative">
                  <div 
                    className="w-8 h-8 rounded-full border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)] overflow-hidden transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                  >
                    <input 
                      type="color" 
                      value={color}
                      onChange={(e) => onUpdateGradient(index, e.target.value)}
                      className="opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  <div className="absolute -bottom-4 text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {index === 0 ? 'Top' : index === 4 ? 'Bot' : index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Light Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-gray-300 font-serif">Candles</span>
            <button 
              onClick={onToggleLights}
              className={`px-4 py-1 rounded-full border transition-all duration-300 font-serif text-sm ${
                treeState.lightsOn 
                  ? 'bg-gold-500/20 border-gold-400 text-gold-300' 
                  : 'bg-transparent border-gray-600 text-gray-500'
              }`}
            >
              {treeState.lightsOn ? 'Ignited' : 'Snuffed'}
            </button>
          </div>

          {/* Magic Dust Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-gray-300 font-serif">Pixie Dust</span>
            <button 
              onClick={onToggleMagic}
              className={`px-4 py-1 rounded-full border transition-all duration-300 font-serif text-sm ${
                treeState.magicDust 
                  ? 'bg-purple-500/20 border-purple-400 text-purple-300' 
                  : 'bg-transparent border-gray-600 text-gray-500'
              }`}
            >
              {treeState.magicDust ? 'Active' : 'Inactive'}
            </button>
          </div>

          {/* Rotation Speed */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex justify-between text-xs text-gray-400 font-serif">
              <span>Still</span>
              <span>Spin</span>
              <span>Fast</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="2.0" 
              step="0.1" 
              value={treeState.rotationSpeed}
              onChange={(e) => onSetSpeed(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gold-500"
            />
          </div>
        </div>
      </div>
      
      {/* Footer Instructions */}
      <div className="text-center text-white/30 text-xs font-serif mt-4 pointer-events-none">
        <p>Swipe tree to spin &bull; Move cursor for magic dust &bull; Change colors to cast spells</p>
      </div>
    </div>
  );
};
