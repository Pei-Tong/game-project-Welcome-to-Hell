import Matter from 'matter-js';
import React from 'react';
import { View, Image } from 'react-native';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Custom renderer for Spring with image
const SpringRenderer = ({ body, size }) => {
  const { position } = body;
  const width = size[0];
  const height = size[1];
  const x = body.position.x - width / 2;
  const y = body.position.y - height / 2;

  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: width,
        height: height,
        backgroundColor: 'transparent',
        overflow: 'hidden',
      }}
    >
      <Image
        source={require('../../assets/img/spring.png')}
        style={{ width: width, height: height, resizeMode: 'stretch' }}
      />
    </View>
  );
};

const createSpring = (world, x, y) => {
  const spring = Matter.Bodies.rectangle(
    x,
    y,
    100,
    20,
    { 
      isStatic: true, 
      label: 'spring',
      restitution: 1.0,  // Reduced from 1.5 to 1.0 for smoother effect
      friction: 0.05,    // Reduced from 0.1 to 0.05 for smoother landing
      density: 0.05,     // Reduced from 0.1 to 0.05 for lighter feel
      springStrength: 0.03, // Reduced from 0.05 to 0.03 for gentler effect
      chamfer: { radius: 0 }, // Ensure sharp corners
      collisionFilter: {
        category: 0x0002,
        mask: 0xFFFFFFFF
      }
    }
  );

  Matter.World.add(world, spring);

  console.log(`Creating spring at position (${x}, ${y}), with smoother bounce effect`);

  return {
    body: spring,
    size: [100, 20],
    renderer: SpringRenderer,  // Now using custom renderer with image
    label: 'spring'   // Ensure label is properly set
  };
};

export default createSpring;