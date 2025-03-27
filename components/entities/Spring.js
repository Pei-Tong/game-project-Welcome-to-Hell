import Matter from 'matter-js';
import RenderEntity from '../RenderEntity';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const createSpring = (world, x, y) => {
  const spring = Matter.Bodies.rectangle(
    x,
    y,
    100,
    20,
    { 
      isStatic: true, 
      label: 'spring',
      restitution: 1.5,  // High restitution for spring effect
      friction: 0.1,     // Low friction
      density: 0.1,      // Light density
      springStrength: 0.05, // Custom property for spring strength
      chamfer: { radius: 0 }, // Ensure sharp corners
      collisionFilter: {
        category: 0x0002,
        mask: 0xFFFFFFFF
      }
    }
  );

  Matter.World.add(world, spring);

  console.log(`Creating spring at position (${x}, ${y}), with high bounce effect`);

  return {
    body: spring,
    size: [100, 20],
    color: 'green',
    renderer: RenderEntity,
    label: 'spring'   // Ensure label is properly set
  };
};

export default createSpring;