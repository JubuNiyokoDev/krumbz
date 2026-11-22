"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Box3, MathUtils, Vector3, type Group, type Material, type Mesh } from "three";
import type { StageControlRef } from "./control";

interface VariantsExtension {
  variants?: { name: string }[];
}
interface VariantMapping {
  material: number;
  variants: number[];
}

/** Exposes R3F's invalidate() to the DOM through the shared stage control. */
function Bridge({ controlRef }: { controlRef: StageControlRef }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const control = controlRef.current;
    control.invalidate = () => invalidate();
    invalidate();
    return () => {
      control.invalidate = () => {};
    };
  }, [controlRef, invalidate]);
  return null;
}

function Model({
  url,
  controlRef,
  variant,
  onVariants,
  onReady,
}: {
  url: string;
  controlRef: StageControlRef;
  variant: number | null;
  onVariants?: (names: string[]) => void;
  onReady?: () => void;
}) {
  // No Draco (never fetch a decoder from a CDN); Meshopt decoder is bundled.
  const gltf = useGLTF(url, false, true);
  const group = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);

  // Centre and scale the model to a ~2.3 unit box, whatever its source units.
  const fit = useMemo(() => {
    const box = new Box3().setFromObject(gltf.scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = 2.3 / Math.max(size.x, size.y, size.z || 1);
    return { scale, offset: center.multiplyScalar(-1), floor: -(size.y * scale) / 2 - 0.02 };
  }, [gltf.scene]);

  const variantNames = useMemo(() => {
    const ext = (gltf.userData?.gltfExtensions as Record<string, VariantsExtension> | undefined)?.KHR_materials_variants;
    return ext?.variants?.map((v) => v.name) ?? [];
  }, [gltf]);

  useEffect(() => onVariants?.(variantNames), [variantNames, onVariants]);

  // KHR_materials_variants: swap each primitive's material for the chosen variant.
  useEffect(() => {
    if (variant === null || variantNames.length === 0) return;
    let cancelled = false;
    const jobs: Promise<void>[] = [];
    gltf.scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const mappings = (mesh.userData.gltfExtensions as Record<string, { mappings?: VariantMapping[] }> | undefined)?.KHR_materials_variants?.mappings;
      if (!mappings) return;
      mesh.userData.originalMaterial ??= mesh.material;
      const mapping = mappings.find((m) => m.variants.includes(variant));
      if (!mapping) {
        mesh.material = mesh.userData.originalMaterial as Material;
        return;
      }
      jobs.push(
        gltf.parser.getDependency("material", mapping.material).then((material: Material) => {
          if (!cancelled) mesh.material = material;
        }),
      );
    });
    void Promise.all(jobs).then(() => !cancelled && invalidate());
    return () => {
      cancelled = true;
    };
  }, [variant, variantNames, gltf, invalidate]);

  useLayoutEffect(() => {
    gltf.scene.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh) mesh.frustumCulled = false;
    });
  }, [gltf.scene]);

  useEffect(() => {
    // Two frames: first upload of the textures, then the settled image.
    invalidate();
    const id = requestAnimationFrame(() => {
      invalidate();
      onReady?.();
    });
    return () => cancelAnimationFrame(id);
  }, [invalidate, onReady]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 20);
    if (controlRef.current.autoRotate) controlRef.current.yaw += dt * 0.35;
    const targetY = controlRef.current.yaw + controlRef.current.userYaw;
    const targetX = controlRef.current.pitch + controlRef.current.userPitch;
    g.rotation.y = MathUtils.damp(g.rotation.y, targetY, 5, dt);
    g.rotation.x = MathUtils.damp(g.rotation.x, targetX, 5, dt);
    g.position.y = MathUtils.damp(g.position.y, controlRef.current.lift, 4, dt);
    const s = MathUtils.damp(g.scale.x, controlRef.current.scale, 5, dt);
    g.scale.setScalar(s);
    const moving =
      controlRef.current.autoRotate ||
      Math.abs(g.rotation.y - targetY) > 1e-4 ||
      Math.abs(g.rotation.x - targetX) > 1e-4 ||
      Math.abs(g.position.y - controlRef.current.lift) > 1e-4 ||
      Math.abs(s - controlRef.current.scale) > 1e-4;
    if (moving) invalidate();
  });

  return (
    <>
      <group ref={group}>
        <group scale={fit.scale}>
          <primitive object={gltf.scene} position={fit.offset} />
        </group>
      </group>
      <ContactShadows position={[0, fit.floor, 0]} opacity={0.42} scale={5} blur={2.6} far={1.6} resolution={256} />
    </>
  );
}

/**
 * WebGL scene of the vitrine template (loaded lazily, never in the initial
 * bundle): one glTF product, studio lighting from local light formers (no HDR
 * download), soft contact shadow, renders on demand only.
 */
export default function ModelCanvas({
  url,
  controlRef,
  variant,
  maxDpr,
  active,
  accent,
  onVariants,
  onReady,
}: {
  url: string;
  controlRef: StageControlRef;
  variant: number | null;
  maxDpr: number;
  active: boolean;
  accent: string;
  onVariants?: (names: string[]) => void;
  onReady?: () => void;
}) {
  return (
    <Canvas
      frameloop={active ? "demand" : "never"}
      dpr={[1, maxDpr]}
      camera={{ fov: 28, position: [0, 0.55, 6.2], near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor(0x000000, 0);
        camera.lookAt(0, 0, 0);
      }}
    >
      <Bridge controlRef={controlRef} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <Suspense fallback={null}>
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 4, 2]} scale={[6, 2, 1]} rotation-x={Math.PI / 2.4} />
          <Lightformer form="rect" intensity={1.6} position={[-4, 1, 1]} scale={[3, 4, 1]} rotation-y={Math.PI / 2} />
          <Lightformer form="rect" intensity={1.2} position={[4, 0.5, -1]} scale={[3, 4, 1]} rotation-y={-Math.PI / 2} color={accent} />
          <Lightformer form="ring" intensity={0.8} position={[0, 1, -5]} scale={4} />
        </Environment>
        <Model url={url} controlRef={controlRef} variant={variant} onVariants={onVariants} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
