'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

// Removed constant parameter definitions

interface SpinGridProps {
  gridSize?: number;
  isFieldInverted?: boolean;
  // Add parameter props
  gamma?: number;
  alpha?: number;
  exchangeStrength?: number;
  externalFieldStrength?: number;
  timeStepScale?: number;
}

interface Spin {
  id: string;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  matrix: THREE.Matrix4;
  neighbors: number[];
}

// Default values if props aren't provided (fallback)
const DEFAULT_GAMMA = 5e5;
const DEFAULT_ALPHA = 0.3;
const DEFAULT_EXCHANGE_STRENGTH = 1.5e-10;
const DEFAULT_EXTERNAL_FIELD_STRENGTH = 2e5;
const DEFAULT_TIME_STEP_SCALE = 5e-10;

const GRID_SIZE = 20;
const SPACING = 0.5; // Grid spacing

// --- Fixed Arrow Dimensions ---
const FIXED_ARROW_LENGTH = 0.4;
const FIXED_ARROW_HEAD_LENGTH_RATIO = 0.3;
const FIXED_ARROW_HEAD_WIDTH_RATIO = 0.4;
const FIXED_ARROW_SHAFT_RADIUS_RATIO = 0.06;
const FIXED_ARROW_HEAD_LENGTH = FIXED_ARROW_LENGTH * FIXED_ARROW_HEAD_LENGTH_RATIO;
const FIXED_ARROW_HEAD_WIDTH = FIXED_ARROW_LENGTH * FIXED_ARROW_HEAD_WIDTH_RATIO;
const FIXED_ARROW_SHAFT_LENGTH = FIXED_ARROW_LENGTH - FIXED_ARROW_HEAD_LENGTH;
const FIXED_ARROW_SHAFT_RADIUS = FIXED_ARROW_LENGTH * FIXED_ARROW_SHAFT_RADIUS_RATIO;
const ARROW_RESOLUTION = 16;
// ---------------------------

// Create base geometries using FIXED dimensions, centered around origin, pointing +Y initially
const baseHeadGeometry = new THREE.ConeGeometry(FIXED_ARROW_HEAD_WIDTH / 2, FIXED_ARROW_HEAD_LENGTH, ARROW_RESOLUTION);
baseHeadGeometry.translate(0, FIXED_ARROW_SHAFT_LENGTH / 2, 0);

const baseShaftGeometry = new THREE.CylinderGeometry(FIXED_ARROW_SHAFT_RADIUS, FIXED_ARROW_SHAFT_RADIUS, FIXED_ARROW_SHAFT_LENGTH, ARROW_RESOLUTION);
baseShaftGeometry.translate(0, -FIXED_ARROW_HEAD_LENGTH / 2, 0);

// Combine and rotate so default arrow points along +Z
const baseArrowGroup = new THREE.Group();
baseArrowGroup.add(new THREE.Mesh(baseHeadGeometry));
baseArrowGroup.add(new THREE.Mesh(baseShaftGeometry));
baseArrowGroup.rotateX(Math.PI / 2);
baseArrowGroup.updateMatrixWorld();

const finalHeadGeometry = baseHeadGeometry.clone().applyMatrix4(baseArrowGroup.matrixWorld);
const finalShaftGeometry = baseShaftGeometry.clone().applyMatrix4(baseArrowGroup.matrixWorld);

const initialUpDirection = new THREE.Vector3(0, 0, 1);

// --- Helper Vectors for LLG Calculation ---
const m = new THREE.Vector3();
const H_eff = new THREE.Vector3();
const H_ext = new THREE.Vector3();
const H_exch = new THREE.Vector3();
const term1 = new THREE.Vector3();
const term2 = new THREE.Vector3();
const dmdt = new THREE.Vector3();
const q = new THREE.Quaternion();
const scale = new THREE.Vector3(1, 1, 1);
// -----------------------------------------

export default function SpinGrid({ 
  gridSize = GRID_SIZE,
  isFieldInverted = false,
  // Destructure parameters with defaults
  gamma = DEFAULT_GAMMA,
  alpha = DEFAULT_ALPHA,
  exchangeStrength = DEFAULT_EXCHANGE_STRENGTH,
  externalFieldStrength = DEFAULT_EXTERNAL_FIELD_STRENGTH,
  timeStepScale = DEFAULT_TIME_STEP_SCALE
}: SpinGridProps) {
  const headMeshRef = useRef<THREE.InstancedMesh>(null);
  const shaftMeshRef = useRef<THREE.InstancedMesh>(null);
  const { camera, raycaster, pointer } = useThree();
  const mousePosRef = useRef(new THREE.Vector3());
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const spinsRef = useRef<Spin[]>([]);

  useEffect(() => {
    const initialSpins: Spin[] = [];
    const offset = (gridSize - 1) * SPACING / 2;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const index = i * gridSize + j;
        const position = new THREE.Vector3(i * SPACING - offset, j * SPACING - offset, 0);
        const direction = new THREE.Vector3(0, 0, 1);
        const matrix = new THREE.Matrix4();

        const neighbors: number[] = [];
        if (i > 0) neighbors.push((i - 1) * gridSize + j);
        if (i < gridSize - 1) neighbors.push((i + 1) * gridSize + j);
        if (j > 0) neighbors.push(i * gridSize + (j - 1));
        if (j < gridSize - 1) neighbors.push(i * gridSize + (j + 1));

        q.setFromUnitVectors(initialUpDirection, direction);
        matrix.compose(position, q, scale);

        initialSpins.push({
          id: `${i}-${j}`,
          position,
          direction,
          matrix,
          neighbors,
        });
      }
    }
    spinsRef.current = initialSpins;

    if (headMeshRef.current && shaftMeshRef.current) {
      initialSpins.forEach((spin, index) => {
        headMeshRef.current!.setMatrixAt(index, spin.matrix);
        shaftMeshRef.current!.setMatrixAt(index, spin.matrix);
      });
      headMeshRef.current.instanceMatrix.needsUpdate = true;
      shaftMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [gridSize]);

  const prevDirectionsRef = useRef<THREE.Vector3[]>([]);
  useEffect(() => {
      prevDirectionsRef.current = spinsRef.current.map(s => s.direction.clone());
  }, [spinsRef.current]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.03) * timeStepScale;

    raycaster.setFromCamera(pointer, camera);
    const target = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, target)) {
      mousePosRef.current.copy(target);
    }

    if (!headMeshRef.current || !shaftMeshRef.current || spinsRef.current.length === 0) return;

    const currentDirections = spinsRef.current.map(s => s.direction.clone());
    prevDirectionsRef.current = currentDirections;

    spinsRef.current.forEach((spin, index) => {
      m.copy(spin.direction);

      H_ext.subVectors(spin.position, mousePosRef.current);
      const distSq = H_ext.lengthSq();
      let strength = externalFieldStrength / (1 + distSq * 5);
      
      if (isFieldInverted) {
        strength *= -1; 
      }

      H_ext.normalize().multiplyScalar(strength);

      H_exch.set(0, 0, 0);
      spin.neighbors.forEach(neighborIndex => {
        if (prevDirectionsRef.current[neighborIndex]) {
           H_exch.add(prevDirectionsRef.current[neighborIndex]);
        }
      });
      const exchangeScaling = exchangeStrength * 1e6;
      H_exch.multiplyScalar(exchangeScaling);

      H_eff.addVectors(H_ext, H_exch);

      const gamma_eff = gamma / (1 + alpha * alpha);
      term1.crossVectors(m, H_eff);
      term2.crossVectors(m, term1);
      term1.multiplyScalar(-gamma_eff);
      term2.multiplyScalar(-gamma_eff * alpha);
      dmdt.addVectors(term1, term2);

      spin.direction.addScaledVector(dmdt, dt);
      spin.direction.normalize();

      q.setFromUnitVectors(initialUpDirection, spin.direction);
      spin.matrix.compose(spin.position, q, scale);

      headMeshRef.current!.setMatrixAt(index, spin.matrix);
      shaftMeshRef.current!.setMatrixAt(index, spin.matrix);
    });

    headMeshRef.current.instanceMatrix.needsUpdate = true;
    shaftMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "black", side: THREE.DoubleSide }), []);

  return (
    <group>
      <instancedMesh
        ref={headMeshRef}
        args={[finalHeadGeometry, material, gridSize * gridSize]}
      />
      <instancedMesh
        ref={shaftMeshRef}
        args={[finalShaftGeometry, material, gridSize * gridSize]}
      />
    </group>
  );
} 