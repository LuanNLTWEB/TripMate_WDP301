import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Preload, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import VietnamStoryMap from './VietnamStoryMap';

const MODELS = {
  globe: '/models/intro/globe.glb',
  airplane: '/models/intro/airplane.glb',
  mainKarst: '/models/intro/halong-main.glb',
  pillars: '/models/intro/halong-pillars.glb',
  boat: '/models/intro/vietnamese-boat.glb'
};

const CAMERA_FRAMES = [
  [0, [0, 3.4, 13.5], [2.5, 2.6, 4]],
  [0.08, [0.45, 3.2, 10.8], [2.55, 2.62, 4]],
  [0.135, [0.95, 3.04, 8.9], [1.62, 2.76, 5.5]],
  [0.17, [1.32, 2.9, 8.05], [1.65, 2.82, 5.58]],
  [0.195, [1.46, 3.02, 7.88], [1.65, 2.82, 5.58]],
  [0.215, [1.95, 6.5, 3.8], [2.45, 0.9, -1]],
  [0.245, [1.7, 10.6, 1.7], [2.45, 0.1, -4]],
  [0.26, [1.6, 11.5, 1.35], [2.05, 0.05, -4.05]],
  [0.31, [1.6, 11.5, 1.35], [2.05, 0.05, -4.05]],
  [0.35, [2, 9, -0.4], [2.4, 0.08, -5.1]],
  [0.39, [2.55, 7.2, -2.1], [1.65, 0.12, -6.15]],
  [0.42, [2.85, 5.1, -3.9], [1.5, 0.16, -6.68]],
  [0.438, [-1.35, 2.45, -8.3], [1.15, 1.82, -16.8]],
  [0.47, [-2.6, 2.2, -10.5], [2.6, 1.9, -19]],
  [0.67, [2.2, 1.82, -20], [5.1, 1.15, -31]],
  [0.84, [3.6, 1.66, -30], [4.8, 1.75, -45]],
  [1, [5.2, 1.62, -40], [5, 1.28, -56]]
];

const MAP_REVEAL_END = new THREE.Vector3(2.45, 0.04, -4);

const BOAT_CURVE_POINTS = [
  new THREE.Vector3(14, -0.1, -24),
  new THREE.Vector3(10.2, -0.11, -31),
  new THREE.Vector3(5.8, -0.12, -40),
  new THREE.Vector3(11, -0.11, -55)
];

const KARST_FORMATIONS = [
  ['near-left', MODELS.pillars, 9.5, [-10.5, -0.52, -13], 0.18],
  ['mid-right', MODELS.pillars, 8.4, [15.2, -0.48, -39], -0.72],
  ['mid-left', MODELS.pillars, 10.2, [-17.2, -0.55, -30], 1.14],
  ['deep-left-main', MODELS.mainKarst, 12.8, [-12.5, -0.62, -44], 0.18],
  ['far-left', MODELS.pillars, 7, [-16, -0.58, -62], -0.28],
  ['far-center', MODELS.pillars, 7.4, [2, -0.58, -67], 0.86],
  ['far-right', MODELS.pillars, 6.8, [22.5, -0.58, -62], 1.48],
  ['outer-left-near', MODELS.mainKarst, 6.2, [-24.5, -0.61, -22], -0.52],
  ['outer-right-near', MODELS.pillars, 5.2, [24.5, -0.57, -25.5], 0.54],
  ['channel-left', MODELS.pillars, 4.7, [-4.5, -0.59, -38], -1.08],
  ['outer-right-mid', MODELS.pillars, 5.1, [29, -0.59, -47], 1.2],
  ['outer-left-far', MODELS.mainKarst, 5.5, [-28, -0.62, -53], 0.62],
  ['horizon-left', MODELS.pillars, 4.6, [-7.5, -0.59, -72], -0.46]
];

const WATER_START = new THREE.Color('#082f39');
const WATER_END = new THREE.Color('#185660');
const HORIZON_NIGHT = new THREE.Color().setRGB(0.04, 0.13, 0.15);
const HORIZON_DUSK = new THREE.Color().setRGB(0.78, 0.66, 0.64);
const FOG_COOL = new THREE.Color('#6f7373');
const FOG_WARM = new THREE.Color('#c1a3a0');

function smoothRange(value, start, end) {
  return THREE.MathUtils.smoothstep(value, start, end);
}

function sampleFrames(frames, progress, target, valueIndex) {
  if (progress <= frames[0][0]) return target.fromArray(frames[0][valueIndex]);
  const last = frames[frames.length - 1];
  if (progress >= last[0]) return target.fromArray(last[valueIndex]);

  for (let index = 0; index < frames.length - 1; index += 1) {
    const current = frames[index];
    const next = frames[index + 1];
    if (progress < current[0] || progress > next[0]) continue;
    const local = THREE.MathUtils.smoothstep(
      (progress - current[0]) / Math.max(next[0] - current[0], 0.0001),
      0,
      1
    );
    return target.lerpVectors(
      new THREE.Vector3().fromArray(current[valueIndex]),
      new THREE.Vector3().fromArray(next[valueIndex]),
      local
    );
  }

  return target;
}

function ModelAsset({
  url,
  fit = 1,
  fitAxis = 'max',
  anchor = 'center',
  shadows = false,
  envMapIntensity = 0.75,
  ...props
}) {
  const { scene } = useGLTF(url);
  const normalized = useMemo(() => {
    const object = scene.clone(true);
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const dimension = fitAxis === 'height' ? size.y : Math.max(size.x, size.y, size.z);
    const scale = fit / Math.max(dimension, 0.0001);
    const origin = anchor === 'bottom'
      ? new THREE.Vector3(center.x, box.min.y, center.z)
      : center;

    object.position.set(-origin.x, -origin.y, -origin.z);
    object.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = shadows;
      node.receiveShadow = shadows;
      node.material = node.material.clone();
      node.material.envMapIntensity = envMapIntensity;
      node.material.needsUpdate = true;
    });

    return { object, scale };
  }, [anchor, envMapIntensity, fit, fitAxis, scene, shadows]);

  return (
    <group scale={normalized.scale} {...props}>
      <primitive object={normalized.object} />
    </group>
  );
}

function SkyDome({ progressRef, skyRef }) {
  const materialRef = useRef(null);
  const uniforms = useMemo(() => ({
    uProgress: { value: 0 },
    uTime: { value: 0 }
  }), []);

  useFrame((state) => {
    if (skyRef.current) skyRef.current.position.copy(state.camera.position);
    if (!materialRef.current) return;
    materialRef.current.uniforms.uProgress.value = progressRef.current || 0;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh ref={skyRef} scale={950} renderOrder={-10}>
      <sphereGeometry args={[1, 48, 24]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite
        vertexShader={`
          varying vec3 vDirection;
          void main() {
            vDirection = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uProgress;
          uniform float uTime;
          varying vec3 vDirection;

          float hash21(vec2 point) {
            point = fract(point * vec2(123.34, 456.21));
            point += dot(point, point + 45.32);
            return fract(point.x * point.y);
          }

          float noise21(vec2 point) {
            vec2 cell = floor(point);
            vec2 local = fract(point);
            local = local * local * (3.0 - 2.0 * local);
            float a = hash21(cell);
            float b = hash21(cell + vec2(1.0, 0.0));
            float c = hash21(cell + vec2(0.0, 1.0));
            float d = hash21(cell + vec2(1.0, 1.0));
            return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
          }

          float fbm(vec2 point) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int octave = 0; octave < 5; octave++) {
              value += noise21(point) * amplitude;
              point = point * 2.03 + vec2(11.7, 7.9);
              amplitude *= 0.5;
            }
            return value;
          }

          void main() {
            float vertical = smoothstep(-0.14, 0.72, vDirection.y);
            float sunset = smoothstep(0.3, 0.76, uProgress);
            vec3 nightLow = vec3(0.035, 0.115, 0.135);
            vec3 nightHigh = vec3(0.012, 0.035, 0.055);
            vec3 sunsetLow = vec3(0.98, 0.53, 0.31);
            vec3 sunsetMid = vec3(0.5, 0.34, 0.5);
            vec3 sunsetHigh = vec3(0.085, 0.19, 0.29);
            vec3 dusk = mix(sunsetLow, sunsetMid, smoothstep(-0.05, 0.24, vDirection.y));
            dusk = mix(dusk, sunsetHigh, smoothstep(0.18, 0.78, vDirection.y));
            vec3 night = mix(nightLow, nightHigh, vertical);
            vec3 color = mix(night, dusk, sunset);

            vec2 cloudUv = vec2(
              atan(vDirection.x, -vDirection.z) * 1.7,
              vDirection.y * 3.8
            );
            cloudUv.x += uTime * 0.006;
            float cloudNoise = fbm(cloudUv * 1.45) * 0.68 + fbm(cloudUv * 3.2 + 4.2) * 0.32;
            float cloudBand = smoothstep(-0.1, 0.12, vDirection.y) * (1.0 - smoothstep(0.58, 0.84, vDirection.y));
            float clouds = smoothstep(0.43, 0.64, cloudNoise) * cloudBand * sunset;
            vec3 cloudShadow = mix(vec3(0.2, 0.13, 0.24), vec3(0.58, 0.3, 0.38), smoothstep(-0.02, 0.34, vDirection.y));
            color = mix(color, cloudShadow, clouds * 0.64);

            float ribbonNoise = fbm(vec2(cloudUv.x * 0.62 - uTime * 0.004, cloudUv.y * 4.8 + 9.0));
            float ribbons = smoothstep(0.52, 0.67, ribbonNoise)
              * smoothstep(-0.04, 0.08, vDirection.y)
              * (1.0 - smoothstep(0.32, 0.5, vDirection.y))
              * sunset;
            color = mix(color, vec3(0.72, 0.39, 0.46), ribbons * 0.38);

            float streakNoise = fbm(vec2(
              cloudUv.x * 0.72 + uTime * 0.003,
              vDirection.y * 18.0 - uTime * 0.006
            ));
            float streakMask = smoothstep(0.45, 0.63, streakNoise)
              * smoothstep(-0.08, 0.06, vDirection.y)
              * (1.0 - smoothstep(0.52, 0.72, vDirection.y))
              * sunset;
            color = mix(color, vec3(0.82, 0.48, 0.5), streakMask * 0.3);

            vec3 sunDirection = normalize(vec3(0.24, 0.105, -1.0));
            float sunAlignment = max(dot(normalize(vDirection), sunDirection), 0.0);
            float sunDisc = smoothstep(0.99915, 0.99972, sunAlignment);
            float sunHalo = pow(sunAlignment, 78.0) * 0.54 + pow(sunAlignment, 16.0) * 0.1;
            float sunVisibility = smoothstep(0.37, 0.62, uProgress);
            color += vec3(1.0, 0.48, 0.16) * sunHalo * sunVisibility;
            color = mix(color, vec3(1.0, 0.92, 0.62), sunDisc * sunVisibility);

            float haze = pow(1.0 - abs(vDirection.y), 9.0);
            color += vec3(0.3, 0.16, 0.08) * haze * sunset * 0.36;

            float horizonBlend = 1.0 - smoothstep(0.012, 0.16, abs(vDirection.y));
            vec3 horizonNight = vec3(0.04, 0.13, 0.15);
            vec3 horizonDusk = vec3(0.78, 0.66, 0.64);
            vec3 horizonColor = mix(
              horizonNight,
              horizonDusk,
              smoothstep(0.22, 0.5, uProgress)
            );
            color = mix(color, horizonColor, horizonBlend * 0.92);
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function WaterSurface({ progressRef }) {
  const waterNormalSource = useTexture('/textures/intro/waternormals.jpg');
  const waterRef = useRef(null);
  const waterColorRef = useRef(new THREE.Color());
  const horizonColorRef = useRef(new THREE.Color());
  const water = useMemo(() => {
    const waterNormals = waterNormalSource.clone();
    waterNormals.wrapS = THREE.RepeatWrapping;
    waterNormals.wrapT = THREE.RepeatWrapping;
    waterNormals.colorSpace = THREE.NoColorSpace;

    const surface = new Water(new THREE.PlaneGeometry(2200, 2200), {
      textureWidth: 1024,
      textureHeight: 1024,
      waterNormals,
      sunDirection: new THREE.Vector3(0.24, 0.105, -1).normalize(),
      sunColor: '#ffc978',
      waterColor: WATER_START,
      distortionScale: 0.12,
      size: 1.25,
      fog: true
    });
    surface.material.uniforms.horizonColor = { value: HORIZON_NIGHT.clone() };
    surface.material.fragmentShader = surface.material.fragmentShader
      .replace(
        'uniform vec3 waterColor;',
        'uniform vec3 waterColor;\nuniform vec3 horizonColor;'
      )
      .replace(
        'noise.xzy * vec3( 1.5, 1.0, 1.5 )',
        'noise.xzy * vec3( 0.55, 1.0, 0.55 )'
      )
      .replace(
        'float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );',
        'float reflectance = min(rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 ), 0.68);'
      )
      .replace(
        'vec3 outgoingLight = albedo;',
        `float horizonFade = max(
          (1.0 - smoothstep(0.02, 0.15, theta)) * smoothstep(25.0, 180.0, distance),
          smoothstep(55.0, 170.0, distance)
        );
        vec3 outgoingLight = mix(albedo, horizonColor, horizonFade);`
      );
    surface.material.needsUpdate = true;
    surface.rotation.x = -Math.PI / 2;
    surface.position.set(0, -0.13, -400);
    return surface;
  }, [waterNormalSource]);

  useFrame((_, delta) => {
    const surface = waterRef.current;
    if (!surface) return;
    const progress = progressRef.current || 0;
    surface.visible = progress > 0.431;
    surface.material.uniforms.time.value += delta * 0.09;
    waterColorRef.current.lerpColors(WATER_START, WATER_END, smoothRange(progress, 0.28, 0.94));
    surface.material.uniforms.waterColor.value.copy(waterColorRef.current);
    horizonColorRef.current.lerpColors(
      HORIZON_NIGHT,
      HORIZON_DUSK,
      smoothRange(progress, 0.22, 0.5)
    );
    surface.material.uniforms.horizonColor.value.copy(horizonColorRef.current);
  });

  return <primitive ref={waterRef} object={water} />;
}

function OriginSequence({ globeRef, orbitRef, routesRef }) {
  return (
    <>
      <group ref={globeRef} position={[2.6, 2.75, 4]}>
        <ModelAsset url={MODELS.globe} fit={4.45} rotation={[0.02, -0.42, 0]} />
        <group ref={routesRef}>
          <group ref={orbitRef} rotation={[0.22, 0, -0.18]}>
            <group position={[2.6, 0.1, 0]} rotation={[0.1, -1.25, 0.12]}>
              <ModelAsset url={MODELS.airplane} fit={1.05} />
            </group>
          </group>
          <mesh rotation={[Math.PI / 2.45, 0.12, 0.08]}>
            <torusGeometry args={[2.28, 0.012, 8, 160]} />
            <meshBasicMaterial color="#76eee2" transparent opacity={0.64} toneMapped={false} />
          </mesh>
          <mesh rotation={[0.28, Math.PI / 2.5, -0.36]}>
            <torusGeometry args={[2.16, 0.009, 8, 160]} />
            <meshBasicMaterial color="#f2c46c" transparent opacity={0.48} toneMapped={false} />
          </mesh>
        </group>
      </group>

    </>
  );
}

function VietnamFocusMarker({ progressRef }) {
  const groupRef = useRef(null);
  const ringRef = useRef(null);
  const pulseRef = useRef(null);
  const dotRef = useRef(null);

  useFrame((state) => {
    const progress = progressRef.current || 0;
    const visibility = smoothRange(progress, 0.118, 0.15)
      * (1 - smoothRange(progress, 0.184, 0.202));
    const marker = groupRef.current;
    if (!marker) return;

    marker.visible = visibility > 0.002;
    marker.quaternion.copy(state.camera.quaternion);
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 3.2) * 0.09;
    marker.scale.setScalar((0.54 + visibility * 0.08) * pulse);
    if (ringRef.current) ringRef.current.opacity = visibility * 0.9;
    if (pulseRef.current) pulseRef.current.opacity = visibility * 0.24;
    if (dotRef.current) dotRef.current.opacity = visibility;
  });

  return (
    <group ref={groupRef} position={[1.56, 2.96, 6.02]} visible={false} renderOrder={30}>
      <mesh>
        <ringGeometry args={[0.045, 0.07, 48]} />
        <meshBasicMaterial
          ref={ringRef}
          color="#6ff1e7"
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={1.62}>
        <ringGeometry args={[0.052, 0.068, 48]} />
        <meshBasicMaterial
          ref={pulseRef}
          color="#6ff1e7"
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <circleGeometry args={[0.022, 32]} />
        <meshBasicMaterial
          ref={dotRef}
          color="#f4c967"
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function KarstWorld({ worldRef }) {
  return (
    <group ref={worldRef} visible={false}>
      {KARST_FORMATIONS.map(([id, url, fit, position, rotationY]) => (
        <ModelAsset
          key={id}
          url={url}
          fit={fit}
          fitAxis="height"
          anchor="bottom"
          position={position}
          rotation={[0, rotationY, 0]}
        />
      ))}
    </group>
  );
}

function BoatWake({ wakeRef }) {
  const ripples = useMemo(() => [0.82, 1.42].map((radius) => {
    const points = [];
    for (let step = 0; step <= 28; step += 1) {
      const angle = THREE.MathUtils.lerp(-0.82, 0.82, step / 28);
      points.push([
        -0.45 - Math.cos(angle) * radius,
        0.034,
        Math.sin(angle) * radius * 0.72
      ]);
    }
    return points;
  }), []);

  return (
    <group ref={wakeRef} visible={false}>
      <Line
        points={[[ -0.45, 0.035, 0.18 ], [ -1.45, 0.035, 0.4 ], [ -2.45, 0.035, 0.72 ], [ -3.35, 0.035, 1.02 ]]}
        color="#d9ffff"
        lineWidth={1.25}
        transparent
        opacity={0.34}
        depthWrite={false}
        depthTest={false}
      />
      <Line
        points={[[ -0.45, 0.035, -0.18 ], [ -1.45, 0.035, -0.4 ], [ -2.45, 0.035, -0.72 ], [ -3.35, 0.035, -1.02 ]]}
        color="#d9ffff"
        lineWidth={1.25}
        transparent
        opacity={0.34}
        depthWrite={false}
        depthTest={false}
      />
      <Line
        points={[[ -0.65, 0.037, 0 ], [ -1.55, 0.037, 0.04 ], [ -2.8, 0.037, -0.05 ]]}
        color="#f4ffff"
        lineWidth={2.2}
        transparent
        opacity={0.22}
        depthWrite={false}
        depthTest={false}
      />
      {ripples.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#c8f4ef"
          lineWidth={0.7}
          transparent
          opacity={0.16 - index * 0.045}
          depthWrite={false}
          depthTest={false}
        />
      ))}
    </group>
  );
}

function Boat({ boatRef, wakeRef }) {
  return (
    <group ref={boatRef}>
      <ModelAsset url={MODELS.boat} fit={2.45} anchor="bottom" shadows envMapIntensity={0.78} />
      <mesh position={[-0.1, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 36]} />
        <meshBasicMaterial color="#02191f" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <BoatWake wakeRef={wakeRef} />
    </group>
  );
}

function IntroScene({ progressRef, reducedMotion = false }) {
  const globeRef = useRef(null);
  const orbitRef = useRef(null);
  const routesRef = useRef(null);
  const mapRef = useRef(null);
  const worldRef = useRef(null);
  const boatRef = useRef(null);
  const wakeRef = useRef(null);
  const skyRef = useRef(null);
  const fogRef = useRef(null);
  const warmLightRef = useRef(null);
  const cameraGoalRef = useRef(new THREE.Vector3());
  const lookGoalRef = useRef(new THREE.Vector3());
  const lookCurrentRef = useRef(new THREE.Vector3(2.5, 2.6, 4));
  const boatPositionRef = useRef(new THREE.Vector3());
  const boatTangentRef = useRef(new THREE.Vector3());
  const boatCurve = useMemo(
    () => new THREE.CatmullRomCurve3(BOAT_CURVE_POINTS, false, 'catmullrom', 0.45),
    []
  );

  useFrame((state, delta) => {
    const progress = THREE.MathUtils.clamp(progressRef.current || 0, 0, 1);
    const globeExit = smoothRange(progress, 0.172, 0.205);
    const globeApproach = smoothRange(progress, 0.07, 0.18);
    const globeFocus = smoothRange(progress, 0.075, 0.175);
    const routeExit = smoothRange(progress, 0.09, 0.145);
    const mapReveal = smoothRange(progress, 0.198, 0.252);
    const pointerX = reducedMotion ? 0 : state.pointer.x;
    const pointerY = reducedMotion ? 0 : state.pointer.y;
    const cameraGoal = cameraGoalRef.current;
    const lookGoal = lookGoalRef.current;
    const lookCurrent = lookCurrentRef.current;
    const boatPosition = boatPositionRef.current;
    const boatTangent = boatTangentRef.current;

    if (globeRef.current) {
      globeRef.current.visible = progress < 0.208;
      globeRef.current.scale.setScalar(Math.max((1 + globeApproach * 0.06) * (1 - globeExit), 0.001));
      globeRef.current.rotation.y = THREE.MathUtils.lerp(0, -1.47, globeFocus);
    }
    if (orbitRef.current && !reducedMotion) orbitRef.current.rotation.y += delta * 0.42;
    if (routesRef.current) {
      routesRef.current.visible = progress < 0.148;
      routesRef.current.scale.setScalar(Math.max(1 - routeExit, 0.001));
    }

    if (mapRef.current) {
      mapRef.current.visible = progress > 0.197 && progress < 0.439;
      mapRef.current.position.copy(MAP_REVEAL_END);
      mapRef.current.scale.setScalar(THREE.MathUtils.lerp(0.12, 1, mapReveal));
      mapRef.current.rotation.x = 0;
      mapRef.current.rotation.y = THREE.MathUtils.lerp(0, -0.09, mapReveal)
        + Math.sin(state.clock.elapsedTime * 0.22) * 0.008 * mapReveal;
    }

    if (worldRef.current) worldRef.current.visible = progress > 0.431;

    if (boatRef.current) {
      boatRef.current.visible = progress > 0.447;
      const boatProgress = THREE.MathUtils.clamp((progress - 0.455) / 0.545, 0, 1);
      boatCurve.getPointAt(boatProgress, boatPosition);
      boatCurve.getTangentAt(Math.min(boatProgress + 0.002, 1), boatTangent);
      boatRef.current.position.copy(boatPosition);
      boatRef.current.position.y += reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 1.08) * 0.022;
      boatRef.current.rotation.y = Math.atan2(-boatTangent.z, boatTangent.x);
      boatRef.current.rotation.z = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.8) * 0.012;
    }
    if (wakeRef.current) {
      wakeRef.current.visible = progress > 0.465;
      wakeRef.current.position.x = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.72) * 0.035;
    }

    sampleFrames(CAMERA_FRAMES, progress, cameraGoal, 1);
    sampleFrames(CAMERA_FRAMES, progress, lookGoal, 2);
    cameraGoal.x += pointerX * 0.28;
    cameraGoal.y += pointerY * 0.11;
    lookGoal.x += pointerX * 0.18;
    lookGoal.y += pointerY * 0.08;

    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, cameraGoal.x, 5.2, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, cameraGoal.y, 5.2, delta);
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, cameraGoal.z, 5.2, delta);
    lookCurrent.x = THREE.MathUtils.damp(lookCurrent.x, lookGoal.x, 5.6, delta);
    lookCurrent.y = THREE.MathUtils.damp(lookCurrent.y, lookGoal.y, 5.6, delta);
    lookCurrent.z = THREE.MathUtils.damp(lookCurrent.z, lookGoal.z, 5.6, delta);
    state.camera.lookAt(lookCurrent);

    if (fogRef.current) {
      const worldFog = smoothRange(progress, 0.43, 0.52);
      const transitionFog = smoothRange(progress, 0.412, 0.434)
        * (1 - smoothRange(progress, 0.448, 0.5));
      const lateClarity = 1 - smoothRange(progress, 0.72, 1);
      fogRef.current.density = worldFog * (0.0048 + lateClarity * 0.0022)
        + transitionFog * 0.021;
      fogRef.current.color.lerpColors(
        FOG_COOL,
        FOG_WARM,
        smoothRange(progress, 0.405, 0.48)
      );
    }

    if (warmLightRef.current) {
      warmLightRef.current.intensity = THREE.MathUtils.lerp(0.9, 3.8, smoothRange(progress, 0.34, 0.92));
    }
  });

  return (
    <>
      <fogExp2 ref={fogRef} attach="fog" args={['#314b51', 0]} />
      <SkyDome progressRef={progressRef} skyRef={skyRef} />
      <WaterSurface progressRef={progressRef} />

      <hemisphereLight color="#c6e0df" groundColor="#04242b" intensity={1.7} />
      <ambientLight intensity={0.32} color="#bbd4d5" />
      <directionalLight
        ref={warmLightRef}
        color="#ffe0a5"
        intensity={1.2}
        position={[-18, 24, 12]}
      />
      <directionalLight color="#75bfc2" intensity={1.05} position={[12, 8, 8]} />

      <OriginSequence globeRef={globeRef} orbitRef={orbitRef} routesRef={routesRef} />
      <VietnamFocusMarker progressRef={progressRef} />
      <VietnamStoryMap groupRef={mapRef} progressRef={progressRef} />
      <KarstWorld worldRef={worldRef} />
      <Boat boatRef={boatRef} wakeRef={wakeRef} />
      <Preload all />
    </>
  );
}

Object.values(MODELS).forEach((url) => useGLTF.preload(url));

export default IntroScene;
