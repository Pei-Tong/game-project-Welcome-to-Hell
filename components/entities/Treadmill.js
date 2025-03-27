import Matter from 'matter-js';
import RenderEntity from '../RenderEntity';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const createTreadmill = (world, posX, posY, speed = 4) => {
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
      treadmillSpeed: speed, // Set speed directly in object properties
      frictionAir: 0     // Set to 0 to prevent air resistance
    }
  );
  
  console.log(`Creating treadmill: Position(${posX}, ${posY}), Speed: ${speed}, Size: 100x20`);
  
  Matter.World.add(world, treadmill);
  
  return {
    body: treadmill,
    size: [100, 20],
    color: 'yellow',      // Treadmill is yellow
    renderer: RenderEntity,
    label: 'treadmill',   // Ensure the entity object also has a label
    treadmillSpeed: speed // Also store speed in the entity
  };
};

export default createTreadmill;