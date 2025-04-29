'use client';

import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SpinGrid from '../components/SpinGrid';

// Import shadcn components
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

// Initial Parameter Values (matches SpinGrid defaults)
const INITIAL_PARAMS = {
  gamma: 5e5,
  alpha: 0.3,
  exchangeStrength: 1.5e-10,
  externalFieldStrength: 2e5,
  timeStepScale: 5e-10,
};

export default function Home() {
  const [isFieldInverted, setIsFieldInverted] = useState(false);

  // State for simulation parameters
  const [params, setParams] = useState(INITIAL_PARAMS);

  const handleCanvasClick = () => {
    setIsFieldInverted(prev => !prev);
  };

  // Updated handler for shadcn Slider (takes array value)
  const handleSliderChange = (name: keyof typeof INITIAL_PARAMS) => (value: number[]) => {
    setParams(prev => ({ ...prev, [name]: value[0] }));
  };

  return (
    <main className="relative h-screen bg-white text-black flex flex-row">
      
      {/* Sidebar for Controls */}
      <div 
        className="z-10 h-full w-64 bg-gray-100 p-4 shadow-lg text-sm border-r border-gray-300"
        // Prevent clicks on sidebar from toggling field
        onPointerDown={(e) => e.stopPropagation()} 
      >
        <h2 className="text-lg font-bold mb-4">Parameters</h2>
        
        {/* Gamma Slider */}
        <div className="mb-4 space-y-2">
          <Label htmlFor="gamma">Gamma (γ): {params.gamma.toExponential(1)}</Label>
          <Slider
            id="gamma"
            name="gamma"
            min={1e5} max={1e6} step={1e4}
            value={[params.gamma]}
            onValueChange={handleSliderChange('gamma')} 
          />
        </div>

        {/* Alpha Slider */}
        <div className="mb-4 space-y-2">
          <Label htmlFor="alpha">Alpha (α): {params.alpha.toFixed(2)}</Label>
          <Slider
            id="alpha"
            name="alpha"
            min={0.01} max={1.5} step={0.01}
            value={[params.alpha]}
            onValueChange={handleSliderChange('alpha')} 
          />
        </div>

        {/* Exchange Strength Slider */}
        <div className="mb-4 space-y-2">
          <Label htmlFor="exchangeStrength">Exchange (J): {params.exchangeStrength.toExponential(1)}</Label>
          <Slider
            id="exchangeStrength"
            name="exchangeStrength"
            min={1e-11} max={5e-10} step={1e-11} 
            value={[params.exchangeStrength]}
            onValueChange={handleSliderChange('exchangeStrength')} 
          />
        </div>

        {/* External Field Slider */}
        <div className="mb-4 space-y-2">
          <Label htmlFor="externalFieldStrength">Field (H_ext): {params.externalFieldStrength.toExponential(1)}</Label>
          <Slider
            id="externalFieldStrength"
            name="externalFieldStrength"
            min={1e4} max={1e6} step={1e4}
            value={[params.externalFieldStrength]}
            onValueChange={handleSliderChange('externalFieldStrength')} 
          />
        </div>

        {/* Time Step Scale Slider */}
        <div className="mb-4 space-y-2">
          <Label htmlFor="timeStepScale">Time Scale (Δt scale): {params.timeStepScale.toExponential(1)}</Label>
          <Slider
            id="timeStepScale"
            name="timeStepScale"
            min={1e-10} max={2e-9} step={1e-10} 
            value={[params.timeStepScale]}
            onValueChange={handleSliderChange('timeStepScale')} 
          />
        </div>

        {/* Invert Field Button */}
        <div className="mt-6">
          <Button 
            onClick={handleCanvasClick} 
            variant="outline"
            className="w-full"
          >
            Invert Field ({isFieldInverted ? 'Repulsive' : 'Attractive'})
          </Button>
        </div>
      </div>

      {/* Canvas Container: Make it absolute, covering full screen */}
      <div className="inset-0 w-full h-full py-5" onPointerDown={handleCanvasClick}> 
        <Canvas camera={{ position: [0, 0, 11], fov: 50 }}>
          <color attach="background" args={['white']} />
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          {/* Pass all params down */}
          <SpinGrid 
            gridSize={20} 
            isFieldInverted={isFieldInverted} 
            {...params} // Spread parameter state as props
          />
          <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
        </Canvas>
      </div>
    </main>
  );
}