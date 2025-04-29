'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SpinGrid from '../components/SpinGrid';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white text-black">
      <div style={{ width: '100vw', height: '100vh' }}>
        <Canvas camera={{ position: [0, 0, 12], fov: 50 }}>
          <color attach="background" args={['white']} />
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <SpinGrid gridSize={20} />
          <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
        </Canvas>
      </div>
    </main>
  );
}
