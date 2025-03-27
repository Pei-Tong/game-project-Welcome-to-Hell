import Matter from 'matter-js';
import RenderEntity from '../RenderEntity';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const createPlatform = (world, posX, posY) => {
  const platform = Matter.Bodies.rectangle(
    posX, 
    posY, 
    100, 
    20, 
    { 
      isStatic: true,
      friction: 1,  // Increase friction to prevent player sliding
      restitution: 0,  // Completely remove elasticity
      slop: 0,  // Set collision threshold to 0 for precise contact
      label: 'platform'  // Ensure platform has the correct label
    }
  );

  Matter.World.add(world, platform);

  return {
    body: platform,
    size: [100, 20],
    color: 'grey',
    renderer: RenderEntity,
    label: 'platform'  // Ensure entity object also has label
  };
};

export default createPlatform;