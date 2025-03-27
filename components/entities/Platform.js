import Matter from 'matter-js';
import RenderEntity from '../RenderEntity';
import { getRandomColor } from '../../utils/helpers';

const createPlatform = (world, x, y, width = 100, height = 20) => {
  const platform = Matter.Bodies.rectangle(
    x,
    y,
    width,
    height,
    { 
      isStatic: true,
      friction: 1.0,       // High friction for stability
      restitution: 0,      // No bounce at all
      label: 'platform',
      slop: 0,             // No slop for precise contact
      collisionFilter: {
        category: 0x0002,
        mask: 0xFFFFFFFF
      }
    }
  );

  Matter.World.add(world, platform);

  return {
    body: platform,
    size: [width, height],
    color: getRandomColor(),
    renderer: RenderEntity
  };
};

export default createPlatform;