import React from 'react';
import { View, Image } from 'react-native';
import Matter from 'matter-js';

const Spike = (world, x, y, options) => {
  const spikeWidth = 100;
  const spikeHeight = 50;
  const spikeBody = Matter.Bodies.rectangle(x, y, spikeWidth, spikeHeight, {
    isStatic: true,
    label: 'spike',
    restitution: 0,      // No bounce at all
    friction: 1.0,       // Maximum friction to stop sliding
    slop: 0,             // No slop for precise contact
    density: 1000,       // Very high density to feel solid
    collisionFilter: {
      category: 0x0002,
      mask: 0xFFFFFFFF
    },
    ...options,
  });

  Matter.World.add(world, spikeBody);

  console.log(`Creating spike at position (${x}, ${y})`);

  return {
    body: spikeBody,
    renderer: SpikeRenderer,
  };
};

// Spike renderer component using image
const SpikeRenderer = ({ body }) => {
  const { position } = body;
  // Adjust style based on body position
  return (
    <View
      style={{
        position: "absolute",
        left: position.x - 50, // Center horizontally
        top: position.y - 25,  // Center vertically
        width: 100,
        height: 50,
        backgroundColor: 'transparent',
        overflow: 'hidden',
      }}
    >
      <Image
        source={require('../../assets/img/Spikes.png')}
        style={{ width: 100, height: 50, resizeMode: 'contain' }}
      />
    </View>
  );
};

export default Spike;