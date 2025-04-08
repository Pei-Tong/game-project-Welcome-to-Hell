import React from 'react';
import { Image, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function createFireball(world, x, y) {
  // Basic fireball properties
  const size = 30;
  const halfSize = size / 2;
  
  // Simple position and velocity tracking
  const position = { x, y };
  const velocity = { x: 0, y: 5 }; // Move directly downward
  
  // Create a simple fireball object
  return {
    position,
    velocity,
    size,
    bounds: {
      min: { x: position.x - halfSize, y: position.y - halfSize },
      max: { x: position.x + halfSize, y: position.y + halfSize }
    },
    isFireball: true,
    
    // Custom update method
    update() {
      // Update position
      position.y += velocity.y;
      
      // Update collision boundaries
      this.bounds = {
        min: { x: position.x - halfSize, y: position.y - halfSize },
        max: { x: position.x + halfSize, y: position.y + halfSize }
      };
      
      return this;
    },
    
    // Detect collision with player
    collidesWith(playerEntity) {
      if (!playerEntity || !playerEntity.body) return false;
      
      const player = playerEntity.body;
      const playerBounds = {
        min: { x: player.position.x - (player.bounds.max.x - player.bounds.min.x) / 2,
               y: player.position.y - (player.bounds.max.y - player.bounds.min.y) / 2 },
        max: { x: player.position.x + (player.bounds.max.x - player.bounds.min.x) / 2,
               y: player.position.y + (player.bounds.max.y - player.bounds.min.y) / 2 }
      };
      
      // Simple AABB collision detection
      return !(
        this.bounds.max.x < playerBounds.min.x ||
        this.bounds.min.x > playerBounds.max.x ||
        this.bounds.max.y < playerBounds.min.y ||
        this.bounds.min.y > playerBounds.max.y
      );
    },
    
    // Detect collision with platform
    collidesWithPlatform(platform) {
      if (!platform || !platform.body) return false;
      
      const platformBounds = platform.body.bounds;
      
      // Simple AABB collision detection
      return !(
        this.bounds.max.x < platformBounds.min.x ||
        this.bounds.min.x > platformBounds.max.x ||
        this.bounds.max.y < platformBounds.min.y ||
        this.bounds.min.y > platformBounds.max.y
      );
    },
    
    // Render method
    renderer: () => {
      return (
        <Image
          source={require('../../assets/img/Fireball.png')}
          style={{
            position: 'absolute',
            left: position.x - halfSize,
            top: position.y - halfSize,
            width: size,
            height: size,
            zIndex: 90, // Ensure fireball displays at appropriate level
          }}
          resizeMode="cover"
        />
      );
    }
  };
} 