import Matter from 'matter-js';
import { Dimensions } from 'react-native';
import Boundary from './Boundary';

const { width, height } = Dimensions.get('window');

export default (world) => {
  const segments = [];

  // ---- Top Boundary (horizontal connected segments) ----
  const tileWidth = 20;       // 完全匹配火球圖像寬度
  const boundaryHeight = 16;  // 完全匹配火球圖像高度
  let currentX = tileWidth / 2;  // Center of first tile at half tileWidth
  
  while (currentX <= width - tileWidth / 2) {
    const segment = Matter.Bodies.rectangle(
      currentX, 
      10,  // Y position near the top edge
      tileWidth, 
      boundaryHeight, 
      { 
        isStatic: true,
        label: 'topBoundary',
      }
    );
    
    Matter.World.add(world, segment);
    segments.push({
      body: segment,
      renderer: (props) => <Boundary {...props} type="top" />,
      isScreenFixed: true,  // 標記為固定在螢幕上的元素
    });
    
    currentX += tileWidth; // 沒有間距，完全相連
  }

  // ---- Left Boundary (vertical connected segments) ----
  const tileHeight = 18;      // 完全匹配魔鬼角圖像高度
  const boundaryWidth = 16;   // 縮小魔鬼角寬度
  let currentY = tileHeight / 2;  // Center of first tile vertically
  
  while (currentY <= height - tileHeight / 2) {
    const leftSegment = Matter.Bodies.rectangle(
      10,   // X position near left edge
      currentY, 
      boundaryWidth, 
      tileHeight, 
      { 
        isStatic: true,
        label: 'leftBoundary',
      }
    );
    
    Matter.World.add(world, leftSegment);
    segments.push({
      body: leftSegment,
      renderer: (props) => <Boundary {...props} type="side" />,
      isScreenFixed: true,  // 標記為固定在螢幕上的元素
    });
    
    currentY += tileHeight; // 沒有間距，完全相連
  }

  // ---- Right Boundary (vertical connected segments) ----
  currentY = tileHeight / 2;
  
  while (currentY <= height - tileHeight / 2) {
    const rightSegment = Matter.Bodies.rectangle(
      width - 10,   // X position near right edge
      currentY, 
      boundaryWidth, 
      tileHeight, 
      { 
        isStatic: true,
        label: 'rightBoundary',
      }
    );
    
    Matter.World.add(world, rightSegment);
    segments.push({
      body: rightSegment,
      renderer: (props) => <Boundary {...props} type="side" />,
      isScreenFixed: true,  // 標記為固定在螢幕上的元素
    });
    
    currentY += tileHeight; // 沒有間距，完全相連
  }

  return segments;
};