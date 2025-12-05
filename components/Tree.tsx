
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Vector3, Color, MathUtils, BufferGeometry, Float32BufferAttribute, ShaderMaterial, AdditiveBlending, InstancedMesh, Object3D, Shape, ExtrudeGeometry, DoubleSide } from 'three';
import { TreeState } from '../types';

// --- SHADERS FOR FOLIAGE (NEEDLES) ---
// Now supports a 5-color gradient
const foliageVertexShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform vec3 uColors[5]; // Array of 5 colors from top to bottom
  uniform float uColorChangeTime; // Timestamp of last color change for ripple
  
  attribute vec3 aChaosPos;
  attribute vec3 aTargetPos;
  attribute float aRandom;
  attribute float aSize;
  
  varying vec3 vColor;
  varying float vAlpha;

  // Function to mix 5 colors based on height t (0.0 to 1.0)
  vec3 getGradientColor(float t) {
    float scaledT = clamp(t, 0.0, 1.0) * 4.0; // 0 to 4
    int index = int(floor(scaledT));
    float mixT = fract(scaledT);
    
    // Safety clamp
    if (index >= 4) return uColors[4];
    
    // Unrolled for safety
    if (index == 0) return mix(uColors[0], uColors[1], mixT);
    if (index == 1) return mix(uColors[1], uColors[2], mixT);
    if (index == 2) return mix(uColors[2], uColors[3], mixT);
    return mix(uColors[3], uColors[4], mixT);
  }

  void main() {
    float t = uProgress;
    float ease = 1.0 - pow(1.0 - t, 3.0);
    vec3 pos = mix(aChaosPos, aTargetPos, ease);
    
    // Wind Effect
    if (uProgress > 0.8) {
      float wind = sin(uTime * 2.0 + pos.y * 0.5 + pos.x) * 0.08;
      pos.x += wind;
      pos.z += wind * 0.5;
    }
    
    if (uProgress < 0.2) {
      pos.y += sin(uTime + aRandom * 10.0) * 0.1;
    }

    // Ripple effect on color change
    float timeSinceChange = uTime - uColorChangeTime;
    float ripple = 0.0;
    
    // Ripple travels from top (y=10) to bottom (y=-2) roughly
    // Speed = 20.0 units/sec
    float wavePos = 10.0 - timeSinceChange * 20.0;
    float rippleDist = abs(pos.y - wavePos);
    
    if (timeSinceChange > 0.0 && timeSinceChange < 2.0) {
       // Gaussian bump
       ripple = exp(-rippleDist * rippleDist * 0.5) * 0.8;
       pos += normalize(pos) * ripple * 0.3; // Slight expansion
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    gl_PointSize = aSize * (400.0 / -mvPosition.z);
    
    // Height calculation for gradient (approx -3 to 10 range)
    float h = (aTargetPos.y + 4.0) / 14.0; 
    float gradientT = 1.0 - clamp(h, 0.0, 1.0); 

    vec3 baseColor = getGradientColor(gradientT);
    
    float sparkle = sin(uTime * 4.0 + aRandom * 50.0);
    float sparkleIntensity = smoothstep(0.8, 1.0, sparkle);
    
    // Add ripple brightness
    vColor = baseColor + vec3(ripple);
    // Add sparkle
    vColor += vec3(sparkleIntensity * 0.5);
    
    vAlpha = 0.8 + 0.2 * sparkle;
  }
`;

const foliageFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;
    
    float glow = 1.0 - (dist * 2.0);
    glow = pow(glow, 1.5);
    
    gl_FragColor = vec4(vColor * 1.5, vAlpha * glow);
  }
`;

// --- SHADER FOR LOGO LIGHT ---
const logoFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;

  void main() {
    vec2 uv = vUv - 0.5;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    
    vec3 cBlue = vec3(0.0, 0.53, 0.81); 
    vec3 cRed = vec3(0.85, 0.1, 0.15);  
    vec3 cWhite = vec3(1.0, 1.0, 1.0);
    
    vec3 color = vec3(0.0);
    float alpha = 1.0;

    if (dist > 0.35 && dist < 0.48) {
      color = cBlue;
      float ringNoise = sin(angle * 60.0) * 0.1;
      if (dist > 0.4 && dist < 0.45 && ringNoise > 0.05) color += vec3(0.2);
    } 
    else if (dist <= 0.35) {
      color = cWhite;
      vec2 suv = uv * 3.5; 
      suv.y += 0.1; 
      float ax = abs(suv.x);
      float ay = suv.y;
      if (ax < 0.6 && ay > -0.5 && ay < 0.5) {
        bool t1 = ay > -0.5 && ay < -0.25 && ax < 0.5 - (ay + 0.5)*0.5;
        bool t2 = ay > -0.2 && ay < 0.05 && ax < 0.5 - (ay + 0.2)*0.4;
        bool t3 = ay > 0.1 && ay < 0.35 && ax < 0.5 - (ay - 0.1)*0.3;
        if (t1 || t2 || t3) {
            if (ax > 0.05) {
                if (suv.x < 0.0) color = cRed; 
                else color = cBlue; 
            }
        }
      }
      if (uv.y < -0.2 && uv.y > -0.28 && abs(uv.x) < 0.15) color = cBlue; 
    }
    else discard;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

const logoVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

interface TreeProps {
  treeState: TreeState;
}

const COUNT_NEEDLES = 6000;
const COUNT_ITEMS = 250; 

type OrnamentType = 'GIFT' | 'FISH' | 'SPHERE';

// --- UTILS ---
const randomSpherePoint = (r: number) => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const rad = r * Math.cbrt(Math.random()); 
  return new Vector3(
    rad * Math.sin(phi) * Math.cos(theta),
    rad * Math.sin(phi) * Math.sin(theta),
    rad * Math.cos(phi)
  );
};

const randomConePoint = (height: number, baseRadius: number) => {
  const h = Math.random() * height;
  const r = (baseRadius * (1 - h / height)) * Math.sqrt(Math.random());
  const theta = Math.random() * Math.PI * 2;
  return new Vector3(
    r * Math.cos(theta),
    h - height / 2,
    r * Math.sin(theta)
  );
};

const getColorFromGradient = (y: number, colors: Color[]) => {
  // Map Y (-3 to 10 approx) to 0-1
  const h = (y + 4.0) / 14.0;
  // High Y = Top (Index 0). Low Y = Bottom (Index 4).
  const t = Math.max(0, Math.min(1, 1.0 - h));
  
  const scaledT = t * 4.0;
  const index = Math.floor(scaledT);
  const mixT = scaledT - index;
  
  if (index >= 4) return colors[4];
  
  const c1 = colors[index];
  const c2 = colors[index + 1];
  return c1.clone().lerp(c2, mixT);
};

export const Tree: React.FC<TreeProps> = ({ treeState }) => {
  const { clock } = useThree();
  const groupRef = useRef<Group>(null);
  const foliageMaterialRef = useRef<ShaderMaterial>(null);
  const logoMaterialRef = useRef<ShaderMaterial>(null);

  // Instanced Meshes Refs
  const giftsRef = useRef<InstancedMesh>(null);
  const fishesRef = useRef<InstancedMesh>(null);
  const spheresRef = useRef<InstancedMesh>(null);

  const dummy = useMemo(() => new Object3D(), []);
  
  // Track last color change time for ripple effect
  const lastColorChangeTime = useRef(-100);

  // Update timestamp when colors change
  useEffect(() => {
    lastColorChangeTime.current = clock.elapsedTime;
  }, [treeState.gradientColors, clock]);
  
  // Convert hex strings to THREE.Color objects for Shader
  const gradientColorsObj = useMemo(() => {
    return treeState.gradientColors.map(c => new Color(c));
  }, [treeState.gradientColors]);

  // Physics / Swipe State
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const velocity = useRef(0);
  const rotationY = useRef(0);

  const currentProgress = useRef(treeState.isFormed ? 1 : 0);

  // --- GEOMETRIES ---
  const foliageGeo = useMemo(() => {
    const geo = new BufferGeometry();
    const chaosPos = [], targetPos = [], randoms = [], sizes = [];
    for (let i = 0; i < COUNT_NEEDLES; i++) {
      const c = randomSpherePoint(12); 
      chaosPos.push(c.x, c.y, c.z);
      const t = randomConePoint(14, 5.0); 
      t.y -= 3; 
      targetPos.push(t.x, t.y, t.z);
      randoms.push(Math.random());
      sizes.push(Math.random() * 0.5 + 0.5);
    }
    geo.setAttribute('position', new Float32BufferAttribute(chaosPos, 3)); 
    geo.setAttribute('aChaosPos', new Float32BufferAttribute(chaosPos, 3));
    geo.setAttribute('aTargetPos', new Float32BufferAttribute(targetPos, 3));
    geo.setAttribute('aRandom', new Float32BufferAttribute(randoms, 1));
    geo.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
    return geo;
  }, []);

  const fishGeometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.4, 0.3, 0.8, 0); 
    shape.quadraticCurveTo(0.4, -0.3, 0, 0);  
    shape.moveTo(0, 0);
    shape.lineTo(-0.3, 0.2);
    shape.lineTo(-0.3, -0.2);
    shape.lineTo(0, 0);
    const extrudeSettings = { depth: 0.05, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.02, bevelThickness: 0.02 };
    return new ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // --- ORNAMENT DATA ---
  const { ornamentData, counts } = useMemo(() => {
    const data = [];
    const counts = { GIFT: 0, FISH: 0, SPHERE: 0 };

    for (let i = 0; i < COUNT_ITEMS; i++) {
      const cPos = randomSpherePoint(16);
      const h = Math.random() * 12;
      const maxR = 4.5 * (1 - h / 13);
      const theta = Math.random() * Math.PI * 2;
      const r = maxR + 0.3; 
      
      const tPos = new Vector3(
        r * Math.cos(theta),
        h - 9, 
        r * Math.sin(theta)
      );

      let type: OrnamentType = 'SPHERE';
      const rand = Math.random();
      if (rand < 0.45) type = 'GIFT';        
      else if (rand < 0.90) type = 'FISH';   
      else type = 'SPHERE';                  
      
      counts[type]++;

      data.push({
        cPos, tPos,
        color: new Color(),
        scale: 0.4 + Math.random() * 0.4,
        weight: 0.02 + Math.random() * 0.1,
        currentPos: cPos.clone(), 
        type
      });
    }
    return { ornamentData: data, counts };
  }, []);


  // --- DYNAMIC COLOR UPDATES ---
  useEffect(() => {
    let idxGift = 0, idxFish = 0, idxSphere = 0;
    
    ornamentData.forEach((orn) => {
      const col = getColorFromGradient(orn.tPos.y, gradientColorsObj);
      orn.color.copy(col); 

      if (orn.type === 'GIFT' && giftsRef.current) {
        giftsRef.current.setColorAt(idxGift++, col);
      } else if (orn.type === 'FISH' && fishesRef.current) {
        fishesRef.current.setColorAt(idxFish++, col);
      } else if (orn.type === 'SPHERE' && spheresRef.current) {
        spheresRef.current.setColorAt(idxSphere++, col);
      }
    });

    if (giftsRef.current?.instanceColor) giftsRef.current.instanceColor.needsUpdate = true;
    if (fishesRef.current?.instanceColor) fishesRef.current.instanceColor.needsUpdate = true;
    if (spheresRef.current?.instanceColor) spheresRef.current.instanceColor.needsUpdate = true;

  }, [gradientColorsObj, ornamentData]);


  // --- HANDLERS ---
  const handlePointerDown = (e: any) => { e.stopPropagation(); isDragging.current = true; lastX.current = e.clientX; };
  const handlePointerMove = (e: any) => {
    if (!isDragging.current) return;
    e.stopPropagation();
    const delta = e.clientX - lastX.current;
    lastX.current = e.clientX;
    velocity.current += delta * 0.003;
  };
  const handlePointerUp = () => { isDragging.current = false; };

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);


  // --- ANIMATION LOOP ---
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const target = treeState.isFormed ? 1 : 0;
    currentProgress.current = MathUtils.lerp(currentProgress.current, target, delta * 1.5);

    if (foliageMaterialRef.current) {
      foliageMaterialRef.current.uniforms.uTime.value = time;
      foliageMaterialRef.current.uniforms.uProgress.value = currentProgress.current;
      foliageMaterialRef.current.uniforms.uColors.value = gradientColorsObj;
      foliageMaterialRef.current.uniforms.uColorChangeTime.value = lastColorChangeTime.current;
    }
    
    if (logoMaterialRef.current) {
      logoMaterialRef.current.uniforms.uTime.value = time;
    }

    let idxGift = 0, idxFish = 0, idxSphere = 0;

    ornamentData.forEach((orn) => {
      const dest = treeState.isFormed ? orn.tPos : orn.cPos;
      const speed = orn.weight * 60 * delta; 
      orn.currentPos.lerp(dest, MathUtils.clamp(speed, 0, 1));

      dummy.position.copy(orn.currentPos);
      dummy.position.y += Math.sin(time * 2 + orn.cPos.x) * 0.1;
      
      const scale = orn.scale * (0.5 + 0.5 * currentProgress.current); 
      dummy.scale.setScalar(scale);
      
      if (orn.type === 'FISH') {
        dummy.lookAt(0, dummy.position.y, 0); 
        dummy.rotateY(-Math.PI / 2);
        dummy.rotateZ(Math.sin(time * 4 + orn.cPos.y) * 0.1);
      } else if (orn.type === 'GIFT') {
         dummy.rotation.set(0, time * 0.5 + orn.cPos.z, 0);
      } else {
         dummy.rotation.set(time, time, 0);
      }

      dummy.updateMatrix();

      if (orn.type === 'GIFT' && giftsRef.current) {
        giftsRef.current.setMatrixAt(idxGift++, dummy.matrix);
      } else if (orn.type === 'FISH' && fishesRef.current) {
        fishesRef.current.setMatrixAt(idxFish++, dummy.matrix);
      } else if (orn.type === 'SPHERE' && spheresRef.current) {
        spheresRef.current.setMatrixAt(idxSphere++, dummy.matrix);
      }
    });

    if (giftsRef.current) giftsRef.current.instanceMatrix.needsUpdate = true;
    if (fishesRef.current) fishesRef.current.instanceMatrix.needsUpdate = true;
    if (spheresRef.current) spheresRef.current.instanceMatrix.needsUpdate = true;

    if (groupRef.current) {
        velocity.current *= 0.96;
        const autoRot = treeState.isFormed ? treeState.rotationSpeed * delta * 0.5 : 0;
        rotationY.current += velocity.current - autoRot;
        groupRef.current.rotation.y = rotationY.current;
    }
  });

  return (
    <group 
      ref={groupRef} 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerUp}
      rotation={[0, 0, 0]}
    >
        <mesh visible={false}>
            <cylinderGeometry args={[6, 6, 18, 12]} />
            <meshBasicMaterial transparent opacity={0} />
        </mesh>

        {/* FOLIAGE */}
        <points geometry={foliageGeo}>
            <shaderMaterial
                ref={foliageMaterialRef}
                vertexShader={foliageVertexShader}
                fragmentShader={foliageFragmentShader}
                uniforms={{ 
                    uTime: { value: 0 }, 
                    uProgress: { value: 0 },
                    uColors: { value: gradientColorsObj },
                    uColorChangeTime: { value: -100.0 } 
                }}
                transparent depthWrite={false} blending={AdditiveBlending}
            />
        </points>

        {/* ORNAMENTS */}
        <instancedMesh ref={giftsRef} args={[undefined, undefined, counts.GIFT]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshStandardMaterial metalness={0.8} roughness={0.3} emissiveIntensity={0.2} />
        </instancedMesh>

        <instancedMesh ref={fishesRef} args={[undefined, undefined, counts.FISH]} castShadow receiveShadow>
            <primitive object={fishGeometry} attach="geometry" />
            <meshStandardMaterial metalness={0.9} roughness={0.1} emissiveIntensity={0.4} side={DoubleSide} />
        </instancedMesh>

        <instancedMesh ref={spheresRef} args={[undefined, undefined, counts.SPHERE]} castShadow receiveShadow>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshStandardMaterial metalness={1.0} roughness={0.1} emissiveIntensity={0.1} />
        </instancedMesh>
        
        {/* LOGO LIGHT */}
        <group position={[0, 5, 0]} scale={currentProgress.current}>
            <mesh>
                <circleGeometry args={[1.5, 64]} />
                <shaderMaterial 
                  ref={logoMaterialRef}
                  vertexShader={logoVertexShader}
                  fragmentShader={logoFragmentShader}
                  uniforms={{ uTime: { value: 0 } }}
                  transparent
                  side={DoubleSide}
                />
            </mesh>
            <mesh rotation={[0, Math.PI, 0]}>
                 <circleGeometry args={[1.5, 64]} />
                 <shaderMaterial 
                  vertexShader={logoVertexShader}
                  fragmentShader={logoFragmentShader}
                  uniforms={{ uTime: { value: 0 } }}
                  transparent
                  side={DoubleSide}
                />
            </mesh>
            <pointLight distance={10} intensity={3} color="#00aaff" />
            <pointLight distance={5} intensity={2} color="#ffffff" />
        </group>
    </group>
  );
};
