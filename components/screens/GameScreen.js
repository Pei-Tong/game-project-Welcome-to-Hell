import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  ImageBackground, 
  TouchableOpacity,
  Dimensions,
  View,
  Alert
} from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import Matter from 'matter-js';
import createBoundaries from '../entities/Boundaries';
import createPlatform from '../entities/Platform';
import createSpike from '../entities/Spike';
import createSpring from '../entities/Spring';
import createTreadmill from '../entities/Treadmill';
import createPlayer from '../entities/Player';

const { width, height } = Dimensions.get('window');

// Game constants
const SCROLL_SPEED = -1.8;        // Increased scroll speed from -1.0 to -1.8
const PLATFORM_GAP_MIN = 70;      // Minimum vertical gap between platforms
const PLATFORM_GAP_MAX = 170;     // Maximum vertical gap between platforms
const PLATFORM_WIDTH = 100;       // Platform width
const INITIAL_PLATFORMS = 8;      // Initial number of platforms
const PLATFORM_TYPES = ['platform', 'treadmill', 'spring', 'spike']; // Platform types
const PLATFORM_WEIGHTS = [40, 25, 20, 15]; // Generation weights for each platform type, ensuring more balanced distribution

export default function GameScreen({ route, navigation }) {
  const selectedPlayer = route?.params?.selectedPlayer || 'DefaultPlayer';
  const [lives, setLives] = useState(10);
  const [entities, setEntities] = useState(null);
  const [isHoldingLeft, setIsHoldingLeft] = useState(false);
  const [isHoldingRight, setIsHoldingRight] = useState(false);
  const [lastDamageTime, setLastDamageTime] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);  // Add pause state
  const [isOnSpike, setIsOnSpike] = useState(false); // Add isOnSpike state
  
  const engineRef = useRef(null);
  const gameEngineRef = useRef(null);
  const platformsRef = useRef({});
  const scrollPositionRef = useRef(0);
  const lowestPlatformRef = useRef(0);  // Changed from highest platform to lowest platform
  const lastScoreUpdateRef = useRef(Date.now());  // Time reference for calculating score
  let treadmillContacted = false;
  let currentTreadmillSpeed = 0;

  // Handle pause/resume game
  const togglePause = () => {
    setIsPaused(!isPaused);
    console.log('Game status:', isPaused ? 'Resume' : 'Pause');
  };

  useEffect(() => {
    console.log('GameScreen route.params:', route?.params);
    console.log('Selected Player:', selectedPlayer);
  }, [route?.params, selectedPlayer]);

  // Generate random platform type
  const getRandomPlatformType = () => {
    const totalWeight = PLATFORM_WEIGHTS.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < PLATFORM_WEIGHTS.length; i++) {
      if (random < PLATFORM_WEIGHTS[i]) {
        return PLATFORM_TYPES[i];
      }
      random -= PLATFORM_WEIGHTS[i];
    }
    return 'platform';  // Default platform type
  };
  
  // Create a new platform
  const createRandomPlatform = (world, y, isInitial = false) => {
    // Initial platforms should be more stable, not including spikes
    const platformType = isInitial 
      ? (Math.random() < 0.7 ? 'platform' : (Math.random() < 0.5 ? 'treadmill' : 'spring'))
      : getRandomPlatformType();
    
    const x = Math.random() * (width - PLATFORM_WIDTH) + PLATFORM_WIDTH / 2;
    
    let platform;
    switch (platformType) {
      case 'treadmill':
        const direction = Math.random() < 0.5 ? -4 : 4;  // Increase speed magnitude from ±2 to ±4
        platform = createTreadmill(world, x, y, direction);
        // Ensure treadmill has correct label
        platform.body.label = 'treadmill';
        console.log("Created treadmill, speed:", direction, "color:", platform.color);
        break;
      case 'spring':
        platform = createSpring(world, x, y);
        // Ensure spring has correct label
        platform.body.label = 'spring';
        console.log("Created spring, color:", platform.color);
        break;
      case 'spike':
        platform = createSpike(world, x, y);
        // Ensure spike has correct label
        platform.body.label = 'spike';
        console.log("Created spike");
        break;
      default:  // 'platform'
        platform = createPlatform(world, x, y);
        // Ensure normal platform has correct label
        platform.body.label = 'platform';
        console.log("Created normal platform, color:", platform.color);
    }
    
    const platformId = `platform_${Date.now()}_${Math.random()}`;
    
    // Store platform reference for later management
    platformsRef.current[platformId] = platform;
    
    // Update lowest platform position
    if (y > lowestPlatformRef.current) {
      lowestPlatformRef.current = y;
    }
    
    return { [platformId]: platform };
  };
  
  // Main physics system
  const Physics = (entities, { time }) => {
    const engine = entities.physics?.engine;
    if (!engine) {
      console.error('Physics system: Engine is undefined!');
      return entities;
    }
    
    const delta = Math.min(time.delta, 16.667);
    
    // Handle game over
    if (gameOver) {
      return entities;
    }

    // Update score - changed to increase score every second
    const currentTime = Date.now();
    const elapsedTime = currentTime - lastScoreUpdateRef.current;
    
    // Add 1 point every second
    if (elapsedTime >= 1000) {
      setScore(prev => prev + 1);
      lastScoreUpdateRef.current = currentTime;
    }

    // Handle screen scrolling
    scrollPositionRef.current += SCROLL_SPEED;
    
    // Scroll all entities
    Object.keys(entities).forEach(key => {
      const entity = entities[key];
      if (entity.body && key !== 'player1' && key !== 'physics' && 
          key !== 'leftBoundary' && key !== 'rightBoundary' && 
          key !== 'topBoundary' && key !== 'bottomBoundary' &&
          key !== 'leftHead' && key !== 'rightHead' && key !== 'fireball') {
        Matter.Body.translate(entity.body, { x: 0, y: SCROLL_SPEED });
        
        // If platform moves off the top of the screen, delete it
        if (entity.body.position.y < -100) {
          delete platformsRef.current[key];
          Matter.World.remove(engine.world, entity.body);
          delete entities[key];
        }
      }
    });
    
    // Ensure player doesn't scroll
    if (entities.player1) {
      const playerBody = entities.player1.body;
      
      // Check if player has gone beyond the bottom edge of the screen
      const playerHeight = playerBody.bounds.max.y - playerBody.bounds.min.y;
      const playerBottom = playerBody.bounds.max.y;
      
      // If player's lower half has gone beyond the bottom of the screen, trigger game over
      if (playerBottom > height) {
        // Calculate overlap ratio
        const overlapRatio = (playerBottom - height) / playerHeight;
        console.log(`Player's overlap ratio with bottom boundary: ${overlapRatio}`);
        
        // If more than half the player is beyond the boundary, instant death
        if (overlapRatio > 0.5) {
          console.log("Player's lower half beyond bottom boundary, instant death");
          setGameOver(true);
          Alert.alert(
            "Game Over",
            `Your lower body fell out of screen!\nYour score is: ${score}`,
            [
              { text: "Return to Main Menu", onPress: () => navigation.navigate('MainScreen') }
            ]
          );
          return entities;
        }
      }
      
      // Completely beyond screen by a lot, also trigger game over
      if (playerBody.position.y > height + 100) {
        setGameOver(true);
        Alert.alert(
          "Game Over",
          `You fell out of screen!\nYour score is: ${score}`,
          [
            { text: "Return to Main Menu", onPress: () => navigation.navigate('MainScreen') }
          ]
        );
        return entities;
      }
      
      // Handle long press movement
      const runningSpeed = 2;

      // Check platform contact
      const checkPlatformContact = () => {
        const playerBody = entities.player1.body;
        const playerPosition = playerBody.position;
        const playerWidth = playerBody.bounds.max.x - playerBody.bounds.min.x;
        const playerHeight = playerBody.bounds.max.y - playerBody.bounds.min.y;
        const playerBottom = playerPosition.y + playerHeight / 2;
        const currentPlatforms = Object.values(platformsRef.current);
        
        let onPlatformNow = false;
        let onSpringNow = false;
        let onSpikesNow = false;
        let onTreadmillNow = false;
        let treadmillSpeed = 0;
        
        // Reset treadmill contact flag and speed
        treadmillContacted = false;
        currentTreadmillSpeed = 0;
        
        for (const platform of currentPlatforms) {
          if (!platform || !platform.body) continue;
          
          const platformBody = platform.body;
          const platformTop = platformBody.bounds.min.y;
          const platformBottom = platformBody.bounds.max.y;
          const platformLeft = platformBody.bounds.min.x;
          const platformRight = platformBody.bounds.max.x;
          const platformWidth = platformRight - platformLeft;
          
          // Calculate horizontal overlap between player and platform
          const overlapLeft = Math.max(playerPosition.x - playerWidth / 2, platformLeft);
          const overlapRight = Math.min(playerPosition.x + playerWidth / 2, platformRight);
          const horizontalOverlap = Math.max(0, overlapRight - overlapLeft);
          const overlapRatio = horizontalOverlap / playerWidth;
          
          // If player's bottom is close to platform's top and there is sufficient overlap
          const verticalDistance = Math.abs(playerBottom - platformTop);
          if (verticalDistance <= 5 && overlapRatio >= 0.3) {
            // Check platform type
            if (platformBody.label === 'platform') {
              onPlatformNow = true;
            } else if (platformBody.label === 'spring') {
              onSpringNow = true;
            } else if (platformBody.label === 'spike') {
              onSpikesNow = true;
            } else if (platformBody.label === 'treadmill') {
              onTreadmillNow = true;
              treadmillSpeed = platformBody.treadmillSpeed || 4; // Use default value 4
              treadmillContacted = true;
              currentTreadmillSpeed = treadmillSpeed;
              
              console.log(`Player contacted treadmill! Speed: ${treadmillSpeed}`);
            }
          }
        }
        
        const isOnPlatform = onPlatformNow || onSpringNow || onSpikesNow || onTreadmillNow;
        const currentPlatformType = onPlatformNow ? 'platform' :
                                    onSpringNow ? 'spring' :
                                    onSpikesNow ? 'spike' :
                                    onTreadmillNow ? 'treadmill' : 'none';
        
        // Handle treadmill effect
        if (onTreadmillNow && treadmillSpeed !== 0) {
          handleTreadmillEffect(treadmillSpeed);
        }
        
        return { isOnPlatform, currentPlatformType };
      };

      const { isOnPlatform, currentPlatformType } = checkPlatformContact();

      // Allow movement on any platform, including spike
      if (isOnPlatform) {
        if (isHoldingLeft) {
          Matter.Body.setVelocity(playerBody, {
            x: -runningSpeed,
            y: playerBody.velocity.y
          });
        } else if (isHoldingRight) {
          Matter.Body.setVelocity(playerBody, {
            x: runningSpeed,
            y: playerBody.velocity.y
          });
        } else {
          // When no keys are pressed, handle based on platform type
          if (currentPlatformType === 'platform') {
            // On normal platforms, completely stop horizontal and vertical movement
            Matter.Body.setVelocity(playerBody, {
              x: 0,
              y: 0  // Also set vertical velocity to 0 to prevent bouncing
            });
          } else if (!playerBody.isTouchingSpike) {
            // On other non-spike platforms apply friction
            const friction = 0.4;  // Increase friction for more natural stopping
            Matter.Body.setVelocity(playerBody, {
              x: playerBody.velocity.x * (1 - friction),
              y: playerBody.velocity.y
            });
          }
        }
      }
      
      // Dynamically add new platforms - now adding at the bottom
      const screenBottomY = -scrollPositionRef.current + height;
      const visibleBottomEdge = screenBottomY + 200;  // Add platforms slightly beyond visible area at bottom
      
      if (lowestPlatformRef.current < visibleBottomEdge) {
        const newPlatformY = lowestPlatformRef.current + (PLATFORM_GAP_MIN + Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN));
        const newPlatform = createRandomPlatform(engine.world, newPlatformY);
        Object.assign(entities, newPlatform);
      }
    }

    Matter.Engine.update(engine, delta);
    return entities;
  };

  useEffect(() => {
    const engine = Matter.Engine.create({ 
      enableSleeping: false
    });
    
    // Set physics world parameters - increase gravity to make player feel heavier
    engine.gravity.scale = 0.01;  // Increased gravity scale from 0.005 to 0.01
    engine.gravity.y = 1;          // Keep gravity pointing downward
    
    engineRef.current = engine;
    
    if (!engine) {
      console.error('Engine creation failed!');
      return;
    }
    
    const world = engine.world;
    
    // Initialize platforms and player
    platformsRef.current = {};
    scrollPositionRef.current = 0;
    
    // Create boundaries
    const boundaries = createBoundaries(world);
    
    // Create initial platforms, from top to bottom
    const initialEntities = { 
      physics: { engine, world },
      ...boundaries
    };
    
    // Ensure first platform is above player and wide enough
    const firstPlatformY = height * 0.3;
    const firstPlatform = createPlatform(world, width / 2, firstPlatformY);
    const firstPlatformId = 'platform_initial';
    platformsRef.current[firstPlatformId] = firstPlatform;
    initialEntities[firstPlatformId] = firstPlatform;
    
    // Create more initial platforms, ensuring all four types are present
    let lastY = firstPlatformY;
    lowestPlatformRef.current = lastY;
    
    // Force creation of four different platform types in initial stage
    const forcedTypes = ['platform', 'treadmill', 'spring', 'spike'];
    
    // First ensure at least one of each type
    for (let i = 0; i < forcedTypes.length; i++) {
      lastY += (PLATFORM_GAP_MIN + Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN));
      
      let platform;
      const x = Math.random() * (width - PLATFORM_WIDTH) + PLATFORM_WIDTH / 2;
      
      switch (forcedTypes[i]) {
        case 'treadmill':
          const direction = Math.random() < 0.5 ? -4 : 4;  // Increased speed magnitude from ±2 to ±4
          platform = createTreadmill(world, x, lastY, direction);
          break;
        case 'spring':
          platform = createSpring(world, x, lastY);
          break;
        case 'spike':
          platform = createSpike(world, x, lastY);
          break;
        default: // 'platform'
          platform = createPlatform(world, x, lastY);
      }
      
      const platformId = `platform_${forcedTypes[i]}_${i}`;
      platformsRef.current[platformId] = platform;
      initialEntities[platformId] = platform;
      lowestPlatformRef.current = lastY;
      
      console.log(`Created forced platform type: ${forcedTypes[i]}, color:`, platform.color || 'using image');
    }
    
    // Then create some more random platforms
    for (let i = 0; i < INITIAL_PLATFORMS - forcedTypes.length; i++) {
      lastY += (PLATFORM_GAP_MIN + Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN));
      const platformEntities = createRandomPlatform(world, lastY, true);
      Object.assign(initialEntities, platformEntities);
      lowestPlatformRef.current = lastY;
    }
    
    // Create player above first platform, increase mass for more weight feel
    const player = createPlayer(world, width / 2, firstPlatformY - 50, selectedPlayer);
    player.body.mass = player.body.mass * 3;  // Greatly increase player mass, from 1.5x to 3x
    initialEntities.player1 = player;

    setEntities(initialEntities);
    
    return () => {
      Matter.World.clear(world);
      Matter.Engine.clear(engine);
    };
  }, [selectedPlayer]);

  // Add collision handling logic
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) {
      console.error('Collision setup: Engine is undefined!');
      return;
    }
    
    const collisionStartHandler = (event) => {
      if (!event || !event.pairs) {
        console.error('Event or event.pairs is undefined!');
        return;
      }
      
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        
        // Handle collision with treadmill
        if ((bodyA.label === 'player' && bodyB.label === 'treadmill') ||
            (bodyA.label === 'treadmill' && bodyB.label === 'player')) {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          const treadmillBody = bodyA.label === 'treadmill' ? bodyA : bodyB;
          
          console.log('Player collision with treadmill started!');
          
          // Mark player as touching treadmill
          playerBody.isTouchingTreadmill = true;
          playerBody.currentTreadmill = treadmillBody;
          playerBody.lastTreadmillContactTime = Date.now();
          
          // Set position and velocity on first contact
          if (!playerBody.hasSetInitialTreadmillPosition) {
            const treadmillTop = treadmillBody.bounds.min.y;
            Matter.Body.setPosition(playerBody, {
              x: playerBody.position.x,
              y: treadmillTop - (playerBody.bounds.max.y - playerBody.bounds.min.y) / 2 - 2  // Move up slightly to prevent penetration
            });
            playerBody.hasSetInitialTreadmillPosition = true;
            
            // Reset this flag after short time to allow future adjustments
            setTimeout(() => {
              if (playerBody) playerBody.hasSetInitialTreadmillPosition = false;
            }, 500);
          }
          
          // Stop player vertical velocity, completely eliminate rebound possibility
          Matter.Body.setVelocity(playerBody, {
            x: playerBody.velocity.x, // Maintain current horizontal speed, handle treadmill effect in Physics system
            y: 0
          });
          
          // Set player restitution coefficient to 0
          playerBody.restitution = 0;
        }
        
        // Handle collision with spike
        if ((bodyA.label === 'player' && bodyB.label === 'spike') ||
            (bodyA.label === 'spike' && bodyB.label === 'player')) {
          if (isOnSpike) return;
          
          setIsOnSpike(true);
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          const spikeBody = bodyA.label === 'spike' ? bodyA : bodyB;
          
          // Check if in cooldown period
          const currentTime = Date.now();
          if (currentTime - lastDamageTime < 1000) {
            return;
          }
          
          // Update last damage time
          setLastDamageTime(currentTime);
          
          // Reduce lives
          setLives((prev) => {
            const newLives = Math.max(0, prev - 2);
            if (newLives <= 0 && !gameOver) {
              setGameOver(true);
              Alert.alert(
                "Game Over",
                `You lost all your lives!\nYour score is: ${score}`,
                [
                  { text: "Return to Main Menu", onPress: () => navigation.navigate('MainScreen') }
                ]
              );
            }
            return newLives;
          });
          
          // Completely stop player movement and force position on spike
          Matter.Body.setVelocity(playerBody, { x: 0, y: 0 });
          Matter.Body.setAngularVelocity(playerBody, 0);
          
          // Precisely place player on spike
          Matter.Body.setPosition(playerBody, {
            x: playerBody.position.x,
            y: spikeBody.position.y - (spikeBody.bounds.max.y - spikeBody.bounds.min.y) / 2 - 
               (playerBody.bounds.max.y - playerBody.bounds.min.y) / 2 + 5
          });
          
          // Increase player mass for more stability, and reduce elasticity
          const originalMass = playerBody.mass;
          Matter.Body.setMass(playerBody, originalMass * 5);
          playerBody.restitution = 0;  // Remove elasticity
          
          // Set a flag to prevent continuous damage
          playerBody.isTouchingSpike = true;
          
          // Set appropriate friction to prevent abnormally slow falling
          Matter.Body.set(playerBody, 'friction', 0);  // Completely remove friction
          Matter.Body.set(playerBody, 'frictionAir', 0); // Ensure no air resistance
          Matter.Body.set(playerBody, 'density', 1);  // Set larger density for faster falling
          
          // Add special handling function to prevent bouncing
          const preventBounce = () => {
            if (playerBody && playerBody.isTouchingSpike) {
              Matter.Body.setVelocity(playerBody, { x: 0, y: 0 });
            }
          };
          
          // Establish bounce detection interval
          const bounceInterval = setInterval(preventBounce, 16);
          
          // Reset state after 5 seconds
          setTimeout(() => {
            if (playerBody) {
              // Stop bounce detection
              clearInterval(bounceInterval);
              
              // Restore original mass and physical properties
              Matter.Body.setMass(playerBody, originalMass);
              playerBody.restitution = 0;  // Keep zero elasticity
              setIsOnSpike(false);
              playerBody.isTouchingSpike = false;
              
              // Ensure player can fall normally - reset all properties that might affect falling
              Matter.Body.set(playerBody, 'frictionAir', 0);
              Matter.Body.set(playerBody, 'friction', 0); // Completely remove friction
              Matter.Body.set(playerBody, 'density', 1); // Increase density to ensure fast falling
              
              // Give initial downward velocity
              Matter.Body.setVelocity(playerBody, {
                x: playerBody.velocity.x,
                y: 5 // Increase initial downward speed
              });
            }
          }, 5000);
        }
        
        // Handle boundary collisions
        if (bodyA.label === 'player' || bodyB.label === 'player') {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          const otherBody = bodyA.label === 'player' ? bodyB : bodyA;
          
          // Handle top boundary collision
          if (otherBody.label === 'topBoundary') {
            // Check if in cooldown period
            const currentTime = Date.now();
            if (currentTime - lastDamageTime < 1000) {
              return;
            }
            
            // Update last damage time
            setLastDamageTime(currentTime);
            
            // Calculate how much player has gone beyond top boundary
            const playerHeight = playerBody.bounds.max.y - playerBody.bounds.min.y;
            const playerTop = playerBody.bounds.min.y;
            const boundaryBottom = otherBody.bounds.max.y;
            
            // Calculate overlap ratio (overlap portion/player height)
            const overlapRatio = (boundaryBottom - playerTop) / playerHeight;
            console.log(`Player's overlap ratio with top boundary: ${overlapRatio}`);
            
            // If more than half the player is beyond the boundary, instant death
            if (overlapRatio > 0.5) {
              console.log("Player's upper body beyond boundary, instant death");
              setLives(0);
              if (!gameOver) {
                setGameOver(true);
                Alert.alert(
                  "Game Over",
                  `Your upper body went beyond top boundary!\nYour score is: ${score}`,
                  [
                    { text: "Return to Main Menu", onPress: () => navigation.navigate('MainScreen') }
                  ]
                );
              }
              return;
            }
            
            // Otherwise just reduce lives
            setLives((prev) => {
              const newLives = Math.max(0, prev - 1);
              if (newLives <= 0 && !gameOver) {
                setGameOver(true);
                Alert.alert(
                  "Game Over",
                  `You lost all your lives!\nYour score is: ${score}`,
                  [
                    { text: "Return to Main Menu", onPress: () => navigation.navigate('MainScreen') }
                  ]
                );
              }
              return newLives;
            });
            
            // Bounce player downward, but not too strongly
            Matter.Body.setVelocity(playerBody, {
              x: playerBody.velocity.x,
              y: 5 // Slight downward bounce
            });
          }
          
          // Handle left/right boundary collisions
          if (otherBody.label === 'leftBoundary' || otherBody.label === 'rightBoundary') {
            // Force player back into safe area
            const { width } = Dimensions.get('window');
            const safeX = otherBody.label === 'leftBoundary' ? 
                         playerBody.bounds.max.x - playerBody.bounds.min.x : 
                         width - (playerBody.bounds.max.x - playerBody.bounds.min.x);
            
            Matter.Body.setPosition(playerBody, {
              x: safeX,
              y: playerBody.position.y
            });
            
            // Stop horizontal movement to prevent continued boundary pushing
            Matter.Body.setVelocity(playerBody, {
              x: 0,
              y: playerBody.velocity.y
            });
            
            // Add small reverse force for slight rebound
            const pushDirection = otherBody.label === 'leftBoundary' ? 1 : -1;
            Matter.Body.applyForce(playerBody, playerBody.position, {
              x: pushDirection * 0.001,
              y: 0
            });
            
            console.log(`Player collision with ${otherBody.label === 'leftBoundary' ? 'left' : 'right'} boundary, forced safe position`);
          }
        }
      });
    };
    
    const collisionEndHandler = (event) => {
      if (!event || !event.pairs) return;
      
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        
        // Handle end of treadmill collision
        if ((bodyA.label === 'player' && bodyB.label === 'treadmill') ||
            (bodyA.label === 'treadmill' && bodyB.label === 'player')) {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          
          console.log('Player collision with treadmill ended!');
          
          // Clear treadmill flags
          playerBody.isTouchingTreadmill = false;
          playerBody.currentTreadmill = null;
        }
        
        if ((bodyA.label === 'player' && bodyB.label === 'spike') ||
            (bodyA.label === 'spike' && bodyB.label === 'player')) {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          
          // Check if player has truly left the spike
          if (playerBody.velocity.y < 0 || Math.abs(playerBody.velocity.x) > 1) {
            setIsOnSpike(false);
            playerBody.isTouchingSpike = false;
          }
        }
      });
    };
    
    Matter.Events.on(engine, 'collisionStart', collisionStartHandler);
    Matter.Events.on(engine, 'collisionEnd', collisionEndHandler);
    
    return () => {
      Matter.Events.off(engine, 'collisionStart', collisionStartHandler);
      Matter.Events.off(engine, 'collisionEnd', collisionEndHandler);
    };
  }, [lastDamageTime, gameOver, score]);

  useEffect(() => {
    if (lives <= 0 && !gameOver) {
      setGameOver(true);
    }
  }, [lives, gameOver]);

  // Move player
  const movePlayer = (direction) => {
    if (!entities || !entities.player1 || !entities.player1.body || gameOver || isPaused) return;
    
    const playerBody = entities.player1.body;
    const stepSize = 15;
    
    if (!isOnSpike) {
      // Check current horizontal speed
      const currentVelX = playerBody.velocity.x;
      // Calculate target speed, if speed direction is consistent with key direction, increase speed
      let targetVelX;
      
      if (Math.sign(currentVelX) === Math.sign(direction)) {
        // Same direction, increase speed, but set upper limit
        targetVelX = Math.min(Math.abs(currentVelX) + 2, 10) * direction;
      } else {
        // Different direction, set initial speed
        targetVelX = direction * 4;
      }
      
      Matter.Body.setPosition(playerBody, {
        x: playerBody.position.x + (direction * stepSize),
        y: playerBody.position.y
      });
      
      Matter.Body.setVelocity(playerBody, {
        x: targetVelX,
        y: playerBody.velocity.y
      });
    }
  };

  // Completely independent head decoration processing logic
  useEffect(() => {
    if (!entities || !entities.physics) return;
    
    // Remove existing head entity (if any)
    if (entities.leftHead && entities.leftHead.body) {
      Matter.World.remove(entities.physics.world, entities.leftHead.body);
    }
    if (entities.rightHead && entities.rightHead.body) {
      Matter.World.remove(entities.physics.world, entities.rightHead.body);
    }
    
    const world = entities.physics.world;
    const headRadius = 20;
    const headOffset = 40;  // Distance from head to boundary
    
    // Create fixed head at screen coordinates rather than game world
    const createFixedHead = (x, y, label) => {
      const head = Matter.Bodies.circle(
        x, y, headRadius, 
        { 
          isStatic: true,
          label: label,
          isSensor: true,
          collisionFilter: { 
            group: -1,  // Negative value means no collision with any object
            category: 0x0002,
            mask: 0x0000  // No collision with any object
          }
        }
      );
      
      // Special setting, ensure completely stationary
      head.ignoreGravity = true;
      head.isFixed = true;  // Custom flag
      
      Matter.World.add(world, head);
      return head;
    };
    
    // Create left and right heads
    const leftHead = createFixedHead(headOffset, height / 2, 'leftHead');
    const rightHead = createFixedHead(width - headOffset, height / 2, 'rightHead');
    
    // Update entity reference
    setEntities(prev => ({
      ...prev,
      leftHead: { 
        body: leftHead, 
        size: [headRadius*2, headRadius*2], 
        color: 'red', 
        renderer: 'circle',
        isStatic: true,
        isFixed: true,
        position: { x: headOffset, y: height / 2 }
      },
      rightHead: { 
        body: rightHead, 
        size: [headRadius*2, headRadius*2], 
        color: 'red', 
        renderer: 'circle',
        isStatic: true,
        isFixed: true,
        position: { x: width - headOffset, y: height / 2 }
      }
    }));
    
    return () => {
      if (leftHead) Matter.World.remove(world, leftHead);
      if (rightHead) Matter.World.remove(world, rightHead);
    };
  }, []);  // Empty dependency array, only executed on component first render
  
  // Add fireball
  useEffect(() => {
    if (!entities || !entities.physics) return;
    
    const world = entities.physics.world;
    const fireballRadius = 15;
    const fireballY = 60;  // Place at top of screen
    
    // Create fireball
    const fireball = Matter.Bodies.circle(
      width / 2, 
      fireballY, 
      fireballRadius, 
      { 
        isStatic: true, 
        isSensor: true,
        label: 'fireball',
        render: { fillStyle: '#ff4500' }
      }
    );
    
    Matter.World.add(world, [fireball]);
    
    // Update entities
    setEntities(prevEntities => ({
      ...prevEntities,
      fireball: { body: fireball, size: [fireballRadius*2, fireballRadius*2], color: 'orange', renderer: 'circle' }
    }));
    
  }, [entities?.physics]);

  // Add continuous monitoring mechanism to prevent player from penetrating treadmills
  useEffect(() => {
    if (!entities || !entities.player1 || !entities.player1.body) return;
    
    const playerBody = entities.player1.body;
    const checkInterval = setInterval(() => {
      // Check if player is standing on a treadmill
      if (playerBody.isTouchingTreadmill && playerBody.currentTreadmill) {
        const treadmill = playerBody.currentTreadmill;
        if (treadmill) {
          // Calculate player's position relative to treadmill
          const treadmillTop = treadmill.bounds.min.y;
          const playerBottom = playerBody.bounds.max.y;
          const relativePosition = playerBottom - treadmillTop;
          
          // If relative position indicates possible penetration or sliding down, correct position
          if (relativePosition > 5 || playerBody.velocity.y > 0) {
            console.log("Preventing penetration: repositioning player on treadmill");
            
            Matter.Body.setPosition(playerBody, {
              x: playerBody.position.x,
              y: treadmillTop - (playerBody.bounds.max.y - playerBody.bounds.min.y) / 2 - 2
            });
            
            Matter.Body.setVelocity(playerBody, {
              x: playerBody.velocity.x,
              y: 0
            });
          }
        }
      }
    }, 50); // Check every 50ms
    
    return () => clearInterval(checkInterval);
  }, [entities]);

  // Handle treadmill effect
  const handleTreadmillEffect = (speed) => {
    if (!entities || !entities.player1) return;
    
    const playerBody = entities.player1.body;
    
    if (playerBody) {
      // Set horizontal velocity directly
      let targetVelocityX = 0;
      
      // Only handle horizontal movement, don't affect vertical movement
      if (playerBody.velocity.x !== 0) {
        // Player is moving, give stronger push effect
        const pushEffect = speed * 0.3; // Increased to 0.3 for stronger effect
        Matter.Body.applyForce(playerBody, playerBody.position, {
          x: pushEffect * 0.0005, // Increased to 0.0005
          y: 0
        });
      } else {
        // Player is stationary, set initial velocity
        targetVelocityX = speed * 1; // Increased to 1.0 for stronger effect
        
        Matter.Body.setVelocity(playerBody, {
          x: targetVelocityX,
          y: playerBody.velocity.y
        });
      }
    }
  };

  if (!entities) return null;

  return (
    <ImageBackground 
      source={require('../../assets/img/Bg2.png')}
      style={styles.background}
    >
      <GameEngine 
        ref={gameEngineRef}
        style={styles.gameContainer}
        systems={[Physics]}
        entities={entities}
        running={!gameOver && !isPaused}
      >
        <View style={styles.statsContainer}>
          <View style={styles.statsLeft}>
            <Text style={styles.livesText}>Lives: {lives}</Text>
            <Text style={styles.scoreText}>Score: {score}</Text>
          </View>
          <TouchableOpacity style={styles.pauseButton} onPress={togglePause}>
            <Text style={styles.pauseButtonText}>{isPaused ? '▶' : '❚❚'}</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.backArrow} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrowText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => movePlayer(-1)}
            onPressIn={() => setIsHoldingLeft(true)}
            onPressOut={() => setIsHoldingLeft(false)}
          >
            <Text style={styles.controlText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => movePlayer(1)}
            onPressIn={() => setIsHoldingRight(true)}
            onPressOut={() => setIsHoldingRight(false)}
          >
            <Text style={styles.controlText}>→</Text>
          </TouchableOpacity>
        </View>
      </GameEngine>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  gameContainer: {
    flex: 1,
    zIndex: 1,
  },
  statsContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width - 40, // Subtract padding of 20 on each side
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  livesText: {
    fontSize: 20,
    color: '#ffff00',
    marginRight: 20,
  },
  scoreText: {
    fontSize: 20,
    color: '#ffff00',
  },
  playerText: {
    position: 'absolute',
    top: 50,
    left: 20,
    fontSize: 20,
    color: '#ffff00',
  },
  backArrow: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    padding: 10,
  },
  backArrowText: {
    fontSize: 28,
    color: '#ffff00',
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
  },
  controlButton: {
    backgroundColor: '#930606',
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 5,
  },
  controlText: {
    fontSize: 24,
    color: '#ffff00',
  },
  pauseButton: {
    padding: 8,
    backgroundColor: 'transparent',
  },
  pauseButtonText: {
    fontSize: 24,
    color: '#ffff00',
  },
});