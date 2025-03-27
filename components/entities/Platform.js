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
      friction: 1,  // 增加摩擦力，防止玩家滑動
      restitution: 0,  // 完全去除彈性
      slop: 0,  // 減少物體重疊的處理閾值，設為0以獲得更精確的碰撞
      label: 'platform'  // 確保平台有正確的標籤
    }
  );

  Matter.World.add(world, platform);

  return {
    body: platform,
    size: [100, 20],
    color: 'grey',
    renderer: RenderEntity,
    label: 'platform'  // 確保實體對象也有標籤
  };
};

export default createPlatform;