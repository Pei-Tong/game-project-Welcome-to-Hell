import Matter from 'matter-js';
import React from 'react';
import { View, Image } from 'react-native';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Custom renderer for Treadmill with image
const TreadmillRenderer = ({ body, size }) => {
  const { position } = body;
  const width = size[0];
  const height = size[1];
  const x = body.position.x - width / 2;
  const y = body.position.y - height / 2;

  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: width,
        height: height,
        backgroundColor: 'transparent',
        overflow: 'hidden',
      }}
    >
      <Image
        source={require('../../assets/img/mill.png')}
        style={{ width: width, height: height, resizeMode: 'stretch' }}
      />
    </View>
  );
};

const createTreadmill = (world, posX, posY, speed = 4) => {
  // Ensure speed is a significant value
  const effectiveSpeed = speed >= 0 ? Math.max(speed, 4) : Math.min(speed, -4);
  
  const treadmill = Matter.Bodies.rectangle(
    posX, 
    posY, 
    100, 
    20, 
    { 
      isStatic: true,
      friction: 1,       // Maximum friction
      restitution: 0,    // Completely remove elasticity
      slop: 0,           // Completely remove object overlap processing threshold
      label: 'treadmill', 
      isSensor: false,   // Ensure it's not a sensor
      chamfer: { radius: 0 }, // Remove rounded corners
      collisionFilter: {
        category: 0x0002,
        mask: 0xFFFFFFFF,
        group: 1         // Ensure objects in the same group can collide
      },
      density: 1000,     // Increase density to make it more "solid"
      treadmillSpeed: effectiveSpeed, // Set speed directly in object properties
      frictionAir: 0     // Set to 0 to prevent air resistance
    }
  );
  
  console.log(`Creating treadmill: Position(${posX}, ${posY}), Speed: ${effectiveSpeed}, Size: 100x20`);
  
  Matter.World.add(world, treadmill);
  
  return {
    body: treadmill,
    size: [100, 20],
    renderer: TreadmillRenderer,  // Now using custom renderer with image
    label: 'treadmill',   // Ensure the entity object also has a label
    treadmillSpeed: effectiveSpeed // Also store speed in the entity
  };
};

export default createTreadmill;