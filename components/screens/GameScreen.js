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
const PLATFORM_WEIGHTS = [40, 25, 20, 15]; // Weights for each platform type generation, for more balanced distribution

export default function GameScreen({ route, navigation }) {
  const selectedPlayer = route?.params?.selectedPlayer || 'DefaultPlayer';
  const [lives, setLives] = useState(10);
  const [entities, setEntities] = useState(null);
  const [isHoldingLeft, setIsHoldingLeft] = useState(false);
  const [isHoldingRight, setIsHoldingRight] = useState(false);
  const [lastDamageTime, setLastDamageTime] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);  // Added pause state
  
  const engineRef = useRef(null);
  const gameEngineRef = useRef(null);
  const platformsRef = useRef({});
  const scrollPositionRef = useRef(0);
  const lowestPlatformRef = useRef(0);  // Changed from highest platform to lowest platform
  const lastScoreUpdateRef = useRef(Date.now());  // Used for score calculation time reference
  
  // Add refs for treadmill state
  const treadmillContactedRef = useRef(false);
  const currentTreadmillSpeedRef = useRef(0);
  const [treadmillContacted, setTreadmillContacted] = useState(false);
  const [currentTreadmillSpeed, setCurrentTreadmillSpeed] = useState(0);

  // Handle pause/resume game
  const togglePause = () => {
    setIsPaused(!isPaused);
    console.log('Game state:', isPaused ? 'Resume' : 'Pause');
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
    // Initial platforms should be more stable, not containing spike
    const platformType = isInitial 
      ? (Math.random() < 0.7 ? 'platform' : (Math.random() < 0.5 ? 'treadmill' : 'spring'))
      : getRandomPlatformType();
    
    const x = Math.random() * (width - PLATFORM_WIDTH) + PLATFORM_WIDTH / 2;
    
    let platform;
    switch (platformType) {
      case 'treadmill':
        const direction = Math.random() < 0.5 ? -2 : 2;  // Increased speed size, from ±1 to ±2
        platform = createTreadmill(world, x, y, direction);
        // Ensure treadmill has correct label
        platform.body.label = 'treadmill';
        console.log("Created treadmill, speed:", direction, "Color:", platform.color);
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

    // Update score - Changed to score increase per second
    const currentTime = Date.now();
    const elapsedTime = currentTime - lastScoreUpdateRef.current;
    
    // Increase score by 1 point per second
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
        
        // If platform moves out of top screen, remove it
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
      
      // Check if player is out of bottom screen boundary (trigger game over)
      if (playerBody.position.y > height + 100) {
        setGameOver(true);
        Alert.alert(
          "Game Over",
          `You lost, welcome to hell! Your score: ${score}`,
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
        let currentPlatformBody = null;
        
        // Reset treadmill contact flag and speed
        treadmillContactedRef.current = false;
        currentTreadmillSpeedRef.current = 0;
        
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
          const isPenetrating = playerBottom > platformTop && playerBottom < platformBottom;
          
          // Detect if player is on the platform - require minimum 50% overlap
          // This ensures player falls when half or more of their body is off the platform
          if ((verticalDistance <= 8 && overlapRatio >= 0.5) || (isPenetrating && overlapRatio >= 0.5)) {
            // If penetrating, correct position
            if (isPenetrating) {
              console.log("Correcting player position - platform penetration detected");
              Matter.Body.setPosition(playerBody, {
                x: playerBody.position.x,
                y: platformTop - playerHeight/2 - 1 // Position 1px above platform
              });
            }
            
            // Store current platform for reference
            currentPlatformBody = platformBody;
            
            // Check platform type
            if (platformBody.label === 'platform') {
              onPlatformNow = true;
              // Ensure zero bounce on platforms
              playerBody.restitution = 0;
            } else if (platformBody.label === 'spring') {
              onSpringNow = true;
            } else if (platformBody.label === 'spike') {
              onSpikesNow = true;
              playerBody.isTouchingSpike = true; // Ensure spike flag is set
            } else if (platformBody.label === 'treadmill') {
              onTreadmillNow = true;
              treadmillSpeed = platformBody.treadmillSpeed || 4; // Use default value 4
              treadmillContactedRef.current = true;
              currentTreadmillSpeedRef.current = treadmillSpeed;
              // Ensure zero bounce on treadmills
              playerBody.restitution = 0;
              
              console.log(`Player contacted treadmill! Speed: ${treadmillSpeed}`);
            }
          } else if (isPenetrating && overlapRatio < 0.5) {
            // Player is penetrating but not enough overlap to be supported
            // Allow them to fall by not setting any platform flags
            console.log(`Player has insufficient overlap (${overlapRatio.toFixed(2)}) to be supported by platform`);
            
            // No pushing force, just let physics handle it naturally
          }
        }
        
        const isOnPlatform = onPlatformNow || onSpringNow || onSpikesNow || onTreadmillNow;
        const currentPlatformType = onPlatformNow ? 'platform' :
                                    onSpringNow ? 'spring' :
                                    onSpikesNow ? 'spike' :
                                    onTreadmillNow ? 'treadmill' : 'none';
        
        // Cut vertical velocity to eliminate bouncing when on a platform
        if (isOnPlatform && currentPlatformType !== 'spring') {
          Matter.Body.setVelocity(playerBody, {
            x: playerBody.velocity.x,
            y: 0 // Zero vertical velocity to eliminate bounce
          });
        }
        
        // Handle treadmill effect if on treadmill
        if (onTreadmillNow && treadmillSpeed !== 0) {
          console.log(`Applying treadmill effect with speed: ${treadmillSpeed}`);
          handleTreadmillEffect(playerBody, currentPlatformBody, treadmillSpeed);
        }
        
        return { isOnPlatform, currentPlatformType, currentPlatformBody };
      };

      const { isOnPlatform, currentPlatformType, currentPlatformBody } = checkPlatformContact();

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
            // Completely stop horizontal and vertical movement on normal platform
            Matter.Body.setVelocity(playerBody, {
              x: 0,
              y: 0  // Set vertical velocity to 0 to prevent bounce
            });
          } else if (!playerBody.isTouchingSpike) {
            // Apply friction on non-spike platforms
            const friction = 0.4;  // Increased friction to make stopping more natural
            Matter.Body.setVelocity(playerBody, {
              x: playerBody.velocity.x * (1 - friction),
              y: playerBody.velocity.y
            });
          }
        }
      }
      
      // Dynamic new platform addition - Now added at bottom
      const screenBottomY = -scrollPositionRef.current + height;
      const visibleBottomEdge = screenBottomY + 200;  // Add platform slightly further below visible area
      
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
    
    // Set physics world parameters - Increased gravity to make player feel heavier
    engine.gravity.scale = 0.01;  // Increased gravity ratio, from 0.005 to 0.01
    engine.gravity.y = 1;          // Keep gravity downward
    
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
    
    // Create more initial platforms, ensure four types are present
    let lastY = firstPlatformY;
    lowestPlatformRef.current = lastY;
    
    // Force creating platforms of four different types in initial stage
    const forcedTypes = ['platform', 'treadmill', 'spring', 'spike'];
    
    // First ensure each type is present at least once
    for (let i = 0; i < forcedTypes.length; i++) {
      lastY += (PLATFORM_GAP_MIN + Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN));
      
      let platform;
      const x = Math.random() * (width - PLATFORM_WIDTH) + PLATFORM_WIDTH / 2;
      
      switch (forcedTypes[i]) {
        case 'treadmill':
          const direction = Math.random() < 0.5 ? -2 : 2;  // Increased speed size, from ±1 to ±2
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
      
      console.log(`Created forced type platform: ${forcedTypes[i]}, Color:`, platform.color || 'Using image');
    }
    
    // Create more random platforms
    for (let i = 0; i < INITIAL_PLATFORMS - forcedTypes.length; i++) {
      lastY += (PLATFORM_GAP_MIN + Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN));
      const platformEntities = createRandomPlatform(world, lastY, true);
      Object.assign(initialEntities, platformEntities);
      lowestPlatformRef.current = lastY;
    }
    
    // Create player above first platform, increase mass to make him heavier
    const player = createPlayer(world, width / 2, firstPlatformY - 50, selectedPlayer);
    player.body.mass = player.body.mass * 3;  // Significantly increase player mass, from 1.5x to 3x
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
        
        // Handle treadmill collision
        if ((bodyA.label === 'player' && bodyB.label === 'treadmill') ||
            (bodyA.label === 'treadmill' && bodyB.label === 'player')) {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          const treadmillBody = bodyA.label === 'treadmill' ? bodyA : bodyB;
          
          console.log('Player and treadmill collision started!');
          
          // Force player to stand on treadmill
          const treadmillTop = treadmillBody.bounds.min.y;
          Matter.Body.setPosition(playerBody, {
            x: playerBody.position.x,
            y: treadmillTop - (playerBody.bounds.max.y - playerBody.bounds.min.y) / 2 - 2  // Move slightly up to prevent penetration
          });
          
          // Stop player vertical speed
          Matter.Body.setVelocity(playerBody, {
            x: playerBody.velocity.x,
            y: 0
          });
          
          // Mark player touching treadmill
          playerBody.isTouchingTreadmill = true;
          playerBody.currentTreadmill = treadmillBody;
        }
        
        // Handle spike collision
        if ((bodyA.label === 'player' && bodyB.label === 'spike') ||
            (bodyA.label === 'spike' && bodyB.label === 'player')) {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          const spikeBody = bodyA.label === 'spike' ? bodyA : bodyB;
          
          // Check if within cooling time
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
                `You lost, welcome to hell! Your score: ${score}`,
                [
                  { text: "Return to Main Menu", onPress: () => navigation.navigate('MainScreen') }
                ]
              );
            }
            return newLives;
          });
          
          // Completely stop player movement and force set on spike
          Matter.Body.setVelocity(playerBody, { x: 0, y: 0 });
          Matter.Body.setAngularVelocity(playerBody, 0);
          
          // Precisely place player on spike
          Matter.Body.setPosition(playerBody, {
            x: playerBody.position.x,
            y: spikeBody.position.y - (spikeBody.bounds.max.y - spikeBody.bounds.min.y) / 2 - 
               (playerBody.bounds.max.y - playerBody.bounds.min.y) / 2 + 2 // More precise positioning
          });
          
          // Increase player mass to make him more stable and reduce elasticity
          const originalMass = playerBody.mass;
          Matter.Body.setMass(playerBody, originalMass * 5);
          playerBody.restitution = 0;  // Remove elasticity
          playerBody.friction = 1.0;   // Maximum friction
          
          // Set a flag to prevent continuous damage
          playerBody.isTouchingSpike = true;
          playerBody.currentSpike = spikeBody; // Record current spike
          
          // Add special handling function to prevent bounce
          const preventBounce = () => {
            if (playerBody && playerBody.isTouchingSpike) {
              Matter.Body.setVelocity(playerBody, { x: 0, y: 0 });
              
              // Ensure player stays on spike
              if (playerBody.currentSpike) {
                const spikeTop = playerBody.currentSpike.bounds.min.y;
                const playerHeight = playerBody.bounds.max.y - playerBody.bounds.min.y;
                
                Matter.Body.setPosition(playerBody, {
                  x: playerBody.position.x,
                  y: spikeTop - playerHeight/2
                });
              }
            }
          };
          
          // Create bounce detection interval
          const bounceInterval = setInterval(preventBounce, 16);
          
          // 3 seconds later restore physical properties but keep player on spike
          setTimeout(() => {
            if (playerBody) {
              // Stop bounce detection
              clearInterval(bounceInterval);
              
              // Restore original mass and physical properties but stay on spike
              Matter.Body.setMass(playerBody, originalMass);
              playerBody.restitution = 0;  // Keep non-elastic
              
              // Allow player to move slightly but initial speed still 0
              Matter.Body.setVelocity(playerBody, { x: 0, y: 0 });
            }
          }, 3000);
        }
        
        // Handle boundary collision
        if (bodyA.label === 'player' || bodyB.label === 'player') {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          const otherBody = bodyA.label === 'player' ? bodyB : bodyA;
          
          // Handle top boundary collision
          if (otherBody.label === 'topBoundary') {
            // Check if within cooling time
            const currentTime = Date.now();
            if (currentTime - lastDamageTime < 1000) {
              return;
            }
            
            // Update last damage time
            setLastDamageTime(currentTime);
            
            // Reduce lives (losing 1 life when hitting top boundary)
            setLives((prev) => {
              const newLives = Math.max(0, prev - 1);
              if (newLives <= 0 && !gameOver) {
                setGameOver(true);
                Alert.alert(
                  "Game Over",
                  `You lost, welcome to hell! Your score: ${score}`,
                  [
                    { text: "Return to Main Menu", onPress: () => navigation.navigate('MainScreen') }
                  ]
                );
              }
              return newLives;
            });
            
            // Push player down but not too strongly
            Matter.Body.setVelocity(playerBody, {
              x: playerBody.velocity.x,
              y: 5 // Mildly push down
            });
          }
          
          // Handle left and right boundary collisions
          if (otherBody.label === 'leftBoundary' || otherBody.label === 'rightBoundary') {
            // Push player towards center, reduce bounce
            const pushDirection = playerBody.position.x > width / 2 ? -1 : 1;
            
            Matter.Body.setVelocity(playerBody, {
              x: pushDirection,
              y: playerBody.velocity.y
            });
            
            // Check if within cooling time
            const currentTime = Date.now();
            if (currentTime - lastDamageTime < 1000) {
              return;
            }
            
            // Update last damage time
            setLastDamageTime(currentTime);
            
            // Reduce lives (losing 1 life when hitting boundary)
            setLives((prev) => {
              const newLives = Math.max(0, prev - 1);
              if (newLives <= 0 && !gameOver) {
                setGameOver(true);
                Alert.alert(
                  "Game Over",
                  `You lost, welcome to hell! Your score: ${score}`,
                  [
                    { text: "Return to Main Menu", onPress: () => navigation.navigate('MainScreen') }
                  ]
                );
              }
              return newLives;
            });
          }
        }

        // Handle spring collision
        if ((bodyA.label === 'player' && bodyB.label === 'spring') ||
            (bodyA.label === 'spring' && bodyB.label === 'player')) {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          const springBody = bodyA.label === 'spring' ? bodyA : bodyB;
          
          console.log('Player collision with spring started!');
          
          // Check if player is truly colliding with spring (not just passing by)
          const springTop = springBody.bounds.min.y;
          const playerBottom = playerBody.bounds.max.y;
          const playerHeight = playerBody.bounds.max.y - playerBody.bounds.min.y;
          
          // Calculate horizontal overlap to ensure player is really on the spring
          const springWidth = springBody.bounds.max.x - springBody.bounds.min.x;
          const springLeft = springBody.bounds.min.x;
          const springRight = springBody.bounds.max.x;
          const playerWidth = playerBody.bounds.max.x - playerBody.bounds.min.x;
          const playerLeft = playerBody.position.x - playerWidth / 2;
          const playerRight = playerBody.position.x + playerWidth / 2;
          
          // Calculate overlap
          const overlapLeft = Math.max(playerLeft, springLeft);
          const overlapRight = Math.min(playerRight, springRight);
          const overlapWidth = Math.max(0, overlapRight - overlapLeft);
          const overlapRatio = overlapWidth / playerWidth;
          
          // Only trigger spring if player is actually on top of it with sufficient overlap
          const verticalDistance = Math.abs(playerBottom - springTop);
          if (verticalDistance <= 10 && overlapRatio >= 0.3 && playerBody.velocity.y >= 0) {
            // Position player precisely on top of spring to prevent penetration
            Matter.Body.setPosition(playerBody, {
              x: playerBody.position.x,
              y: springTop - playerHeight/2 - 1 // 1 pixel above spring surface
            });
            
            // Gentler upward bounce with lower velocity
            Matter.Body.setVelocity(playerBody, {
              x: playerBody.velocity.x * 0.9, // Maintain most horizontal momentum
              y: -10  // Reduced from -15 to -10 for gentler bounce
            });
            
            // Apply weaker upward force
            Matter.Body.applyForce(playerBody, playerBody.position, {
              x: 0,
              y: -0.01 // Reduced from -0.03 to -0.01 for gentler effect
            });
            
            // Increase lives if below 10 (no cooldown for spring healing)
            if (lives < 10) {
              setLives(prev => Math.min(prev + 1, 10));
              console.log('Healed 1 life from spring jump!');
            }
            
            // Set player properties for better spring effect
            playerBody.restitution = 0.1;  // Further reduced from 0.3 to 0.1 for minimal bounce
            
            console.log(`Spring applied velocity: ${JSON.stringify(playerBody.velocity)}`);
          } else {
            console.log('Spring collision detected but not actually on top - no bounce applied');
          }
        }
      });
    };
    
    const collisionEndHandler = (event) => {
      if (!event || !event.pairs) return;
      
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        
        // Handle treadmill collision end
        if ((bodyA.label === 'player' && bodyB.label === 'treadmill') ||
            (bodyA.label === 'treadmill' && bodyB.label === 'player')) {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          
          console.log('Player and treadmill collision ended!');
          
          // Clear treadmill flag
          playerBody.isTouchingTreadmill = false;
          playerBody.currentTreadmill = null;
        }
        
        // Handle spike collision end
        if ((bodyA.label === 'player' && bodyB.label === 'spike') ||
            (bodyA.label === 'spike' && bodyB.label === 'player')) {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          
          // Only reset spike state when player explicitly leaves spike
          // Check if there is a clear horizontal movement or upward movement
          if ((Math.abs(playerBody.velocity.x) > 3 || playerBody.velocity.y < -1) && 
              playerBody.position.y < playerBody.currentSpike?.position.y - 20) {
            console.log('Player explicitly left spike');
            playerBody.isTouchingSpike = false;
            playerBody.currentSpike = null;
          } else {
            // If physics engine tries to separate them but player is still on spike, maintain spike contact
            console.log('Maintain spike contact state');
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

  const movePlayer = (direction) => {
    if (!entities || !entities.player1 || !entities.player1.body || gameOver) return;
    
    const playerBody = entities.player1.body;
    const stepSize = 15;

    // Fix long press movement keys, set position and give speed
    Matter.Body.setPosition(playerBody, {
      x: playerBody.position.x + (direction * stepSize),
      y: playerBody.position.y
    });
      
    Matter.Body.setVelocity(playerBody, {
      x: direction * 2,
      y: playerBody.velocity.y
    });
  };

  // Create head decoration
  useEffect(() => {
    if (!entities || !entities.physics) return;
    
    const world = entities.physics.world;
    const headRadius = 20;
    const headOffset = 40;  // Distance from boundary to head
    
    // Left head - Ensure fully fixed
    const leftHead = Matter.Bodies.circle(
      headOffset, 
      height / 2, 
      headRadius, 
      { 
        isStatic: true, 
        isSensor: true,
        label: 'leftHead',
        render: { fillStyle: '#ff0000' },
        collisionFilter: { group: 0 }  // Use collision group to ensure unaffected
      }
    );
    
    // Right head - Ensure fully fixed
    const rightHead = Matter.Bodies.circle(
      width - headOffset, 
      height / 2, 
      headRadius, 
      { 
        isStatic: true, 
        isSensor: true,
        label: 'rightHead',
        render: { fillStyle: '#ff0000' },
        collisionFilter: { group: 0 }  // Use collision group to ensure unaffected
      }
    );
    
    // Ensure head stays in fixed position, set as permanent static
    Matter.Body.setStatic(leftHead, true);
    Matter.Body.setStatic(rightHead, true);
    
    Matter.World.add(world, [leftHead, rightHead]);
    
    // Update entities
    setEntities(prevEntities => ({
      ...prevEntities,
      leftHead: { 
        body: leftHead, 
        size: [headRadius*2, headRadius*2], 
        color: 'red', 
        renderer: 'circle',
        isStatic: true  // Explicitly mark as static
      },
      rightHead: { 
        body: rightHead, 
        size: [headRadius*2, headRadius*2], 
        color: 'red', 
        renderer: 'circle',
        isStatic: true  // Explicitly mark as static
      }
    }));
    
  }, [entities?.physics]);
  
  // Add fireball
  useEffect(() => {
    if (!entities || !entities.physics) return;
    
    const world = entities.physics.world;
    const fireballRadius = 15;
    const fireballY = 60;  // Put above screen
    
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

  // Add continuous monitoring mechanism to prevent player from penetrating treadmill
  useEffect(() => {
    if (!entities || !entities.player1 || !entities.player1.body) return;
    
    const playerBody = entities.player1.body;
    const checkInterval = setInterval(() => {
      // Check if player is standing on treadmill
      if (playerBody.isTouchingTreadmill && playerBody.currentTreadmill) {
        const treadmill = playerBody.currentTreadmill;
        if (treadmill) {
          // Calculate player's relative position to treadmill
          const treadmillTop = treadmill.bounds.min.y;
          const playerBottom = playerBody.bounds.max.y;
          const relativePosition = playerBottom - treadmillTop;
          
          // If relative position indicates possible penetration or slide, adjust position
          if (relativePosition > 5 || playerBody.velocity.y > 0) {
            console.log("Prevent penetration: Re-position player to treadmill");
            
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

  // Modify treadmill effect handling, enhance push force
  const handleTreadmillEffect = (playerBody, treadmill, speed) => {
    // Use direct speed setting to ensure obvious push force effect
    Matter.Body.setVelocity(playerBody, {
      x: playerBody.velocity.x + speed * 0.3, // Significantly increase effect strength, ensure feeling push force
      y: 0 // Ensure vertical speed is 0 to prevent penetration
    });
    
    // Ensure player position only adjusted when necessary
    const treadmillTop = treadmill.bounds.min.y;
    const playerBottom = playerBody.bounds.max.y;
    const playerHeight = playerBody.bounds.max.y - playerBody.bounds.min.y;
    
    // Only adjust position when player visibly slides or penetrates
    if (playerBottom - treadmillTop > 3) {
      Matter.Body.setPosition(playerBody, {
        x: playerBody.position.x,
        y: treadmillTop - playerHeight / 2 - 2
      });
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
    width: width - 40, // Subtract left and right 20 padding
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