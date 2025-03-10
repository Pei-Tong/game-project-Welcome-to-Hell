// components/entities/Boundaries.js
import Matter from 'matter-js';
import RenderEntity from '../RenderEntity';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const createBoundaries = (world) => {
  const options = { isStatic: true }; // 靜態物體，不受物理影響

  const boundaries = [
    // 上邊界
    Matter.Bodies.rectangle(width / 2, 0, width, 20, options),
    // 左邊界
    Matter.Bodies.rectangle(0, height / 2, 20, height, options),
    // 右邊界
    Matter.Bodies.rectangle(width, height / 2, 20, height, options),
  ];

  // 將邊界添加到 Matter.js 世界
  boundaries.forEach((boundary) => {
    Matter.World.add(world, boundary);
  });

  // 將邊界轉換為遊戲實體
  return boundaries.map((boundary, index) => ({
    body: boundary,
    size: index === 0 ? [width, 20] : [20, height], // 上邊界寬度為螢幕寬，左右邊界高度為螢幕高
    color: 'white', // 邊界顏色設為黑色
    renderer: RenderEntity,
  }));
};

export default createBoundaries;