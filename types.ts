
export interface TreeState {
  lightsOn: boolean;
  rotationSpeed: number;
  magicDust: boolean;
  themeColor: string;
  isFormed: boolean;
  gradientColors: string[];
}

export enum OrnamentType {
  NEEDLE = 'NEEDLE',
  SPHERE = 'SPHERE',
  SPIRIT = 'SPIRIT' // Represents the "Owls/Feathers" abstractly
}

export interface FloatingCandleProps {
  position: [number, number, number];
  speed: number;
  offset: number;
}
