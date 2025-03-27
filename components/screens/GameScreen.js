import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  ImageBackground, 
  TouchableOpacity,
  Dimensions,
  View
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

export default function GameScreen({ route, navigation }) {
  const selectedPlayer = route?.params?.selectedPlayer || 'DefaultPlayer';
  const [lives, setLives] = useState(10);
  const [entities, setEntities] = useState(null);
  const [isHoldingLeft, setIsHoldingLeft] = useState(false);
  const [isHoldingRight, setIsHoldingRight] = useState(false);
  const [lastDamageTime, setLastDamageTime] = useState(0);
  
  const engineRef = useRef(null);
  const gameEngineRef = useRef(null);

  useEffect(() => {
    console.log('GameScreen route.params:', route?.params);
    console.log('Selected Player:', selectedPlayer);
  }, [route?.params, selectedPlayer]);

  const Physics = (entities, { time }) => {
    const engine = entities.physics?.engine;
    if (!engine) {
      console.error('Physics system: Engine is undefined!');
      return entities;
    }
    
    const delta = Math.min(time.delta, 16.667);

    // 處理長按移動
    if (entities.player1) {
      const playerBody = entities.player1.body;
      const runningSpeed = 2;

      // 檢查玩家是否在平台上或在地面上
      const checkPlatformContact = () => {
        const platforms = [
          entities.startPlatform, 
          entities.platform1, 
          entities.treadmill1,
          entities.spike1
        ];
        let isOnPlatform = false;
        let onSpikeNow = false;
        let onTreadmillNow = false;
        let treadmillSpeed = 0;
        let debugInfo = { platformsContacted: [] };
        
        platforms.forEach(platform => {
          if (platform && platform.body) {
            const platformTop = platform.body.bounds.min.y;
            const playerBottom = playerBody.bounds.max.y;
            const platformWidth = platform.body.bounds.max.x - platform.body.bounds.min.x;
            const platformLeft = platform.body.bounds.min.x;
            const platformRight = platform.body.bounds.max.x;
            const playerX = playerBody.position.x;
            const playerWidth = playerBody.bounds.max.x - playerBody.bounds.min.x;
            const playerLeft = playerX - playerWidth / 2;
            const playerRight = playerX + playerWidth / 2;
            
            // 計算玩家與平台的重疊部分
            const overlapLeft = Math.max(playerLeft, platformLeft);
            const overlapRight = Math.min(playerRight, platformRight);
            const overlapWidth = Math.max(0, overlapRight - overlapLeft);
            
            // 玩家在平台上的百分比
            const overlapPercent = overlapWidth / playerWidth;
            
            // 檢查玩家是否在平台正上方
            const verticalThreshold = 5; // 增加垂直閾值，更容易檢測平台接觸
            const isAbovePlatform = Math.abs(playerBottom - platformTop) <= verticalThreshold;
            
            if (isAbovePlatform) {
              // 收集調試信息
              debugInfo.platformsContacted.push({
                type: platform.body.label,
                overlapPercent: overlapPercent,
                position: {
                  platform: { x: platform.body.position.x, y: platform.body.position.y },
                  player: { x: playerX, y: playerBody.position.y }
                }
              });
              
              if (overlapPercent >= 0.5) {
                // 如果玩家有一半以上在平台上，可以站穩
                isOnPlatform = true;
                
                // 記錄特殊平台的狀態
                if (platform.body.label === 'spike') {
                  onSpikeNow = true;
                } else if (platform.body.label === 'treadmill') {
                  onTreadmillNow = true;
                  treadmillSpeed = platform.body.treadmillSpeed || 0;
                }
                
                if (platform.body.label !== 'spike') {
                  playerBody.friction = 0.1;
                  Matter.Body.setAngle(playerBody, 0);
                }
                
                if (platform.body.label === 'platform') {
                  console.log('玩家在平台上！身分證：' + platform.body.id);
                  
                  // 確保在平台上時沒有 x 方向的被動力量
                  if (Math.abs(playerBody.velocity.x) < 0.1 && !isHoldingLeft && !isHoldingRight) {
                    Matter.Body.setVelocity(playerBody, {
                      x: 0,
                      y: playerBody.velocity.y
                    });
                  }
                }
              } else if (overlapPercent > 0) {
                // 如果玩家不足一半在平台上，開始失去平衡
                const fallDirection = playerX > (platformLeft + platformRight) / 2 ? 1 : -1;
                Matter.Body.setAngularVelocity(playerBody, fallDirection * 0.05);
                
                // 給予一個輕微的推力，幫助玩家下落
                Matter.Body.applyForce(
                  playerBody, 
                  playerBody.position, 
                  { x: fallDirection * 0.0005, y: 0.0001 }
                );
                
                playerBody.friction = 0;
              }
            }
          }
        });
        
        // 每隔 60 幀輸出一次調試信息
        if (Math.random() < 0.02) {
          console.log('平台接觸調試信息:', JSON.stringify(debugInfo));
          console.log('玩家速度:', playerBody.velocity);
          console.log('玩家在 Spike 上:', onSpikeNow);
          console.log('玩家在 Treadmill 上:', onTreadmillNow, '速度:', treadmillSpeed);
        }
        
        // 如果在 spike 上，處理特殊邏輯
        if (onSpikeNow && playerBody.isTouchingSpike) {
          // 徹底防止跳動
          Matter.Body.setVelocity(playerBody, { x: 0, y: 0 });
        }
        
        // 處理跑步機效果
        if (onTreadmillNow) {
          // 只在 treadmill 上時才應用效果
          Matter.Body.setVelocity(playerBody, {
            x: playerBody.velocity.x + treadmillSpeed * 0.05,
            y: playerBody.velocity.y
          });
        }
        
        return isOnPlatform;
      };

      const isOnPlatform = checkPlatformContact();

      // 允許在任何平台上移動，包括 spike
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
          // 當沒有按鍵時，應用摩擦力 - 除非在 spike 上
          if (!playerBody.isTouchingSpike) {
            const friction = 0.2;
            Matter.Body.setVelocity(playerBody, {
              x: playerBody.velocity.x * (1 - friction),
              y: playerBody.velocity.y
            });
          }
        }
      }
      
      // 移除獨立的跑步機效果處理，已整合到平台檢測中
    }

    // 處理彈簧彈跳
    if (entities.player1 && entities.spring1) {
      const playerBody = entities.player1.body;
      const springBody = entities.spring1.body;
      
      // 檢查玩家是否正在下落並且接觸到彈簧
      if (Matter.Bounds.overlaps(playerBody.bounds, springBody.bounds)) {
        const currentTime = Date.now();
        const lastJumpTime = playerBody.lastJumpTime || 0;
        
        // 確保玩家正在下落且距離上次跳躍超過 1 秒
        if (playerBody.velocity.y >= 0 && currentTime - lastJumpTime > 1000) {
          const initialJumpVelocity = -8;
          const currentHorizontalVelocity = playerBody.velocity.x;
          
          // 保持水平速度但稍微增強，以便能夠跳到其他平台
          const boostMultiplier = 1.5;
          const horizontalBoost = Math.abs(currentHorizontalVelocity) < 0.1 
            ? (Math.random() > 0.5 ? 1 : -1) * 2 // 如果幾乎沒有水平速度，給予隨機方向
            : currentHorizontalVelocity * boostMultiplier; // 增強現有方向
          
          Matter.Body.setVelocity(playerBody, {
            x: horizontalBoost,
            y: initialJumpVelocity
          });
          
          // 記錄這次跳躍的時間
          playerBody.lastJumpTime = currentTime;
        }
      }
    }

    Matter.Engine.update(engine, delta);
    return entities;
  };

  useEffect(() => {
    const engine = Matter.Engine.create({ 
      enableSleeping: false
    });
    
    // 設置物理世界參數
    engine.gravity.scale = 0.002;     // 增加重力效果
    engine.gravity.y = 1;             // 保持重力方向向下
    
    engineRef.current = engine;
    
    if (!engine) {
      console.error('Engine creation failed!');
      return;
    }
    
    const world = engine.world;
    
    const boundaries = createBoundaries(world);

    // 創建初始平台（在畫面上方約1/3處）
    const startPlatform = createPlatform(world, width / 2, height * 0.3);

    // 創建其他遊戲元素
    const spike = createSpike(world, width / 2 + 100, height * 0.3 + 100); // 在上方平台右下方
    const platform = createPlatform(world, width / 2, height - 200);
    const spring = createSpring(world, width / 2 - 100, height - 250);
    const treadmill = createTreadmill(world, width / 2 + 100, height - 180, -0.5); // 恢復跑步機效果，但減弱
    
    // 創建玩家（位置在初始平台上方一點）
    const player = createPlayer(world, width / 2, height * 0.3 - 50, selectedPlayer);
    
    // 輸出所有創建的實體標籤
    console.log('創建實體標籤:');
    console.log('startPlatform:', startPlatform.body.label);
    console.log('platform1:', platform.body.label);
    console.log('spring1:', spring.body.label);
    console.log('treadmill1:', treadmill.body.label);
    
    const gameEntities = {
      physics: { engine, world },
      ...boundaries,
      startPlatform: startPlatform,
      platform1: platform,
      spike1: spike,
      spring1: spring,
      treadmill1: treadmill,
      player1: player,
    };
    
    setEntities(gameEntities);
    
    return () => {
      Matter.World.clear(world);
      Matter.Engine.clear(engine);
    };
  }, [selectedPlayer]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) {
      console.error('Collision setup: Engine is undefined!');
      return;
    }
    
    let isOnSpike = false;  // 追蹤玩家是否在 spike 上
    
    const collisionStartHandler = (event) => {
      if (!event || !event.pairs) {
        console.error('Event or event.pairs is undefined!');
        return;
      }
      
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        
        // 處理與 spike 的碰撞
        if ((bodyA.label === 'player' && bodyB.label === 'spike') ||
            (bodyA.label === 'spike' && bodyB.label === 'player')) {
          if (isOnSpike) return;
          
          isOnSpike = true;
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          const spikeBody = bodyA.label === 'spike' ? bodyA : bodyB;
          
          // 檢查是否在冷卻時間內
          const currentTime = Date.now();
          if (currentTime - lastDamageTime < 1000) {
            return;
          }
          
          // 更新上次受傷時間
          setLastDamageTime(currentTime);
          
          // 減少生命值
          setLives((prev) => Math.max(0, prev - 2));
          
          // 完全停止玩家移動並強制設置在 spike 上
          Matter.Body.setVelocity(playerBody, { x: 0, y: 0 });
          Matter.Body.setAngularVelocity(playerBody, 0);
          
          // 精確地放置玩家在 spike 上
          Matter.Body.setPosition(playerBody, {
            x: playerBody.position.x,
            y: spikeBody.position.y - (spikeBody.bounds.max.y - spikeBody.bounds.min.y) / 2 - 
               (playerBody.bounds.max.y - playerBody.bounds.min.y) / 2 + 5
          });
          
          // 增加玩家質量，使其更穩定，並降低彈性
          const originalMass = playerBody.mass;
          Matter.Body.setMass(playerBody, originalMass * 5);
          playerBody.restitution = 0;  // 去除彈性
          
          // 設置一個標記，防止連續損傷
          playerBody.isTouchingSpike = true;
          
          // 添加特殊處理函數以防止彈跳
          const preventBounce = () => {
            if (playerBody && playerBody.isTouchingSpike) {
              Matter.Body.setVelocity(playerBody, { x: 0, y: 0 });
            }
          };
          
          // 建立彈跳檢測間隔
          const bounceInterval = setInterval(preventBounce, 16);
          
          // 5秒後重置狀態
          setTimeout(() => {
            if (playerBody) {
              // 停止彈跳檢測
              clearInterval(bounceInterval);
              
              // 恢復原來的質量
              Matter.Body.setMass(playerBody, originalMass);
              playerBody.restitution = 0;  // 保持無彈性
              isOnSpike = false;
              playerBody.isTouchingSpike = false;
            }
          }, 5000);
        }
      });
    };
    
    // 在 collisionEnd 中只處理玩家真正離開 spike 的情況
    const collisionEndHandler = (event) => {
      if (!event || !event.pairs) return;
      
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        
        if ((bodyA.label === 'player' && bodyB.label === 'spike') ||
            (bodyA.label === 'spike' && bodyB.label === 'player')) {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          
          // 檢查玩家是否真的完全離開了 spike
          if (playerBody.velocity.y < 0 || Math.abs(playerBody.velocity.x) > 1) {
            isOnSpike = false;
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
  }, [lastDamageTime]);  // 添加 lastDamageTime 作為依賴

  useEffect(() => {
    if (lives <= 0) {
      navigation.navigate('MainScreen');
    }
  }, [lives, navigation]);

  const movePlayer = (direction) => {
    if (!entities || !entities.player1 || !entities.player1.body) return;
    
    const playerBody = entities.player1.body;
    const stepSize = 15;

    // 檢查玩家是否在平台上
    const platforms = [
      entities.startPlatform, 
      entities.platform1, 
      entities.treadmill1,
      entities.spike1
    ];
    
    let isOnPlatform = false;
    
    platforms.forEach(platform => {
      if (platform && platform.body) {
        const platformTop = platform.body.bounds.min.y;
        const playerBottom = playerBody.bounds.max.y;
        const platformWidth = platform.body.bounds.max.x - platform.body.bounds.min.x;
        const platformLeft = platform.body.bounds.min.x;
        const platformRight = platform.body.bounds.max.x;
        const playerX = playerBody.position.x;
        const playerWidth = playerBody.bounds.max.x - playerBody.bounds.min.x;
        const playerLeft = playerX - playerWidth / 2;
        const playerRight = playerX + playerWidth / 2;
        
        // 計算重疊百分比
        const overlapLeft = Math.max(playerLeft, platformLeft);
        const overlapRight = Math.min(playerRight, platformRight);
        const overlapWidth = Math.max(0, overlapRight - overlapLeft);
        const overlapPercent = overlapWidth / playerWidth;
        
        // 檢查玩家是否在平台正上方
        const isAbovePlatform = playerBottom >= platformTop - 2 && playerBottom <= platformTop + 2;
        
        if (isAbovePlatform && overlapPercent >= 0.5) {
          isOnPlatform = true;
        }
      }
    });

    // 只有在平台上時才能移動
    if (isOnPlatform) {
      // 設置新的位置
      Matter.Body.setPosition(playerBody, {
        x: playerBody.position.x + (direction * stepSize),
        y: playerBody.position.y
      });
      
      // 給予輕微的速度效果
      Matter.Body.setVelocity(playerBody, {
        x: direction * 1,
        y: playerBody.velocity.y
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
        running={true}
      >
        <Text style={styles.livesText}>Lives: {lives}</Text>
        <Text style={styles.playerText}>Player: {selectedPlayer}</Text>
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
  livesText: {
    position: 'absolute',
    top: 20,
    left: 20,
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
});