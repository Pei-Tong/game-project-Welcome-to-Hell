// components/RenderEntity.js
import React from 'react';
import { View } from 'react-native';

const RenderEntity = ({ body, size, color }) => {
  const x = body.position.x - size[0] / 2;
  const y = body.position.y - size[1] / 2;

  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size[0],
        height: size[1],
        backgroundColor: color,
      }}
    />
  );
};

export default RenderEntity;