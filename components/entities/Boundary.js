import React from 'react';
import { Image, View, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// 更純粹的渲染函數，直接從物理引擎的位置資訊渲染UI元素
export default function Boundary(props) {
  // 從物理引擎取得位置和尺寸
  const width = props.body.bounds.max.x - props.body.bounds.min.x;
  const height = props.body.bounds.max.y - props.body.bounds.min.y;
  
  // 使用精確的位置，避免任何可能的間隙
  const x = Math.round(props.body.position.x - width / 2);
  const y = Math.round(props.body.position.y - height / 2);

  // 頂部邊界 - 火球圖片
  if (props.type === 'top') {
    return (
      <Image
        source={require('../../assets/img/Fireball.png')}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: 20, // 確保與物理體大小相符
          height: 16, // 確保與物理體大小相符
          zIndex: 100, // 確保在頂層顯示
        }}
        resizeMode="stretch" // 使用stretch確保填充整個區域
      />
    );
  } 
  // 側邊邊界 - 魔鬼角圖片
  else if (props.type === 'side') {
    return (
      <Image
        source={require('../../assets/img/Head.png')}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: 18, // 確保與物理體大小相符
          height: 18, // 確保與物理體大小相符
          zIndex: 100, // 確保在頂層顯示
          margin: 0, // 確保沒有邊距
          padding: 0, // 確保沒有內邊距
        }}
        resizeMode="stretch" // 使用stretch確保填充整個區域
      />
    );
  }
  
  // 默認返回空視圖
  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: width,
        height: height,
        backgroundColor: 'transparent',
      }}
    />
  );
}