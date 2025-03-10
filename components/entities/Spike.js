import Matter from 'matter-js';
import RenderEntity from '../RenderEntity';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const createSpike = (world, x, y) => {
  const spike = Matter.Bodies.rectangle(
    x, 
    y, 
    100,
    20,
    { isStatic: true, label: 'spike' }
  );

  Matter.World.add(world, spike);

  return {
    body: spike,
    size: [100, 20],
    color: 'red',
    renderer: RenderEntity,
  };
};

export default createSpike;