import React from 'react';
import { View, Image } from 'react-native';
import Matter from 'matter-js';

const Player = (world, x, y, selectedPlayer) => {
  const playerWidth = 60;
  const playerHeight = 80;
  const playerBody = Matter.Bodies.rectangle(x, y, playerWidth, playerHeight, {
    frictionAir: 0.01, // 降低空氣阻力
    label: 'player',
    inertia: Infinity, // 防止旋轉
    friction: 0.1, // 降低摩擦力
  });

  // 固定大小
  Matter.Body.setMass(playerBody, 5); // 設置固定質量
  
  Matter.World.add(world, playerBody);

  return {
    body: playerBody,
    renderer: (props) => PlayerRenderer(props, selectedPlayer),
  };
};

const PlayerRenderer = (props, selectedPlayer) => {
  const width = 60; // 使用固定寬度
  const height = 80; // 使用固定高度
  const x = props.body.position.x - width / 2;
  const y = props.body.position.y - height / 2;

  // Determine the image based on selectedPlayer
  let playerImageSource;
  switch (selectedPlayer) {
    case 'Player':
      playerImageSource = require('../../assets/img/Player.png');
      break;
    case 'Player2':
      playerImageSource = require('../../assets/img/Player2.png');
      break;
    default:
      playerImageSource = require('../../assets/img/Player.png'); // Default fallback
  }

  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: width,
        height: height,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        source={playerImageSource}
        style={{
          width: width,
          height: height,
          resizeMode: 'contain', // Adjust as needed (contain, cover, stretch)
        }}
      />
    </View>
  );
};

export default Player;