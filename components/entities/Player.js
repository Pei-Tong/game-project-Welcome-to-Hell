import Matter from 'matter-js';
import RenderEntity from '../RenderEntity';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const createPlayer = (world, x, y) => {
  const player = Matter.Bodies.rectangle(
    x,
    y,
    40,
    40,
    { isStatic: false, label: 'player' }
  );

  Matter.World.add(world, player);

  return {
    body: player,
    size: [40, 40],
    color: 'blue',
    renderer: RenderEntity,
  };
};

export default createPlayer;