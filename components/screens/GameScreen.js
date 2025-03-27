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

// 遊戲常數
const SCROLL_SPEED = -1.8;        // 加快卷軸速度，從-1.0增加到-1.8
const PLATFORM_GAP_MIN = 70;      // 平台間最小垂直間距
const PLATFORM_GAP_MAX = 170;     // 平台間最大垂直間距
const PLATFORM_WIDTH = 100;       // 平台寬度
const INITIAL_PLATFORMS = 8;      // 初始平台數量
const PLATFORM_TYPES = ['platform', 'treadmill', 'spring', 'spike']; // 平台類型
const PLATFORM_WEIGHTS = [40, 25, 20, 15]; // 各類型平台的生成權重，確保更均衡的分佈

export default function GameScreen({ route, navigation }) {
  const selectedPlayer = route?.params?.selectedPlayer || 'DefaultPlayer';
  const [lives, setLives] = useState(10);
  const [entities, setEntities] = useState(null);
  const [isHoldingLeft, setIsHoldingLeft] = useState(false);
  const [isHoldingRight, setIsHoldingRight] = useState(false);
  const [lastDamageTime, setLastDamageTime] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);  // 添加暫停狀態
  
  const engineRef = useRef(null);
  const gameEngineRef = useRef(null);
  const platformsRef = useRef({});
  const scrollPositionRef = useRef(0);
  const lowestPlatformRef = useRef(0);  // 從最高平台改為最低平台
  const lastScoreUpdateRef = useRef(Date.now());  // 用於計算分數的時間參考

  // 處理暫停/繼續遊戲
  const togglePause = () => {
    setIsPaused(!isPaused);
    console.log('遊戲狀態:', isPaused ? '繼續' : '暫停');
  };

  useEffect(() => {
    console.log('GameScreen route.params:', route?.params);
    console.log('Selected Player:', selectedPlayer);
  }, [route?.params, selectedPlayer]);

  // 產生隨機平台類型
  const getRandomPlatformType = () => {
    const totalWeight = PLATFORM_WEIGHTS.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < PLATFORM_WEIGHTS.length; i++) {
      if (random < PLATFORM_WEIGHTS[i]) {
        return PLATFORM_TYPES[i];
      }
      random -= PLATFORM_WEIGHTS[i];
    }
    return 'platform';  // 預設平台類型
  };
  
  // 創建一個新平台
  const createRandomPlatform = (world, y, isInitial = false) => {
    // 初始平台應該更穩定，不包含 spike
    const platformType = isInitial 
      ? (Math.random() < 0.7 ? 'platform' : (Math.random() < 0.5 ? 'treadmill' : 'spring'))
      : getRandomPlatformType();
    
    const x = Math.random() * (width - PLATFORM_WIDTH) + PLATFORM_WIDTH / 2;
    
    let platform;
    switch (platformType) {
      case 'treadmill':
        const direction = Math.random() < 0.5 ? -2 : 2;  // 增加速度大小，從±1增加到±2
        platform = createTreadmill(world, x, y, direction);
        // 確保跑步機有正確的標籤
        platform.body.label = 'treadmill';
        console.log("建立跑步機，速度:", direction, "顏色:", platform.color);
        break;
      case 'spring':
        platform = createSpring(world, x, y);
        // 確保彈簧有正確的標籤
        platform.body.label = 'spring';
        console.log("建立彈簧，顏色:", platform.color);
        break;
      case 'spike':
        platform = createSpike(world, x, y);
        // 確保尖刺有正確的標籤
        platform.body.label = 'spike';
        console.log("建立尖刺");
        break;
      default:  // 'platform'
        platform = createPlatform(world, x, y);
        // 確保普通平台有正確的標籤
        platform.body.label = 'platform';
        console.log("建立普通平台，顏色:", platform.color);
    }
    
    const platformId = `platform_${Date.now()}_${Math.random()}`;
    
    // 儲存平台引用以便後續管理
    platformsRef.current[platformId] = platform;
    
    // 更新最低平台位置
    if (y > lowestPlatformRef.current) {
      lowestPlatformRef.current = y;
    }
    
    return { [platformId]: platform };
  };
  
  // 主要物理系統
  const Physics = (entities, { time }) => {
    const engine = entities.physics?.engine;
    if (!engine) {
      console.error('Physics system: Engine is undefined!');
      return entities;
    }
    
    const delta = Math.min(time.delta, 16.667);

    // 處理遊戲結束
    if (gameOver) {
      return entities;
    }

    // 更新計分 - 改為每秒增加得分
    const currentTime = Date.now();
    const elapsedTime = currentTime - lastScoreUpdateRef.current;
    
    // 每秒增加 1 分
    if (elapsedTime >= 1000) {
      setScore(prev => prev + 1);
      lastScoreUpdateRef.current = currentTime;
    }

    // 處理畫面捲動
    scrollPositionRef.current += SCROLL_SPEED;
    
    // 捲動所有實體
    Object.keys(entities).forEach(key => {
      const entity = entities[key];
      if (entity.body && key !== 'player1' && key !== 'physics' && 
          key !== 'leftBoundary' && key !== 'rightBoundary' && 
          key !== 'topBoundary' && key !== 'bottomBoundary' &&
          key !== 'leftHead' && key !== 'rightHead' && key !== 'fireball') {
        Matter.Body.translate(entity.body, { x: 0, y: SCROLL_SPEED });
        
        // 如果平台移出畫面頂部，則刪除它
        if (entity.body.position.y < -100) {
          delete platformsRef.current[key];
          Matter.World.remove(engine.world, entity.body);
          delete entities[key];
        }
      }
    });
    
    // 確保玩家不會卷動
    if (entities.player1) {
      const playerBody = entities.player1.body;
      
      // 檢查玩家是否超出畫面下邊界（觸發遊戲結束）
      if (playerBody.position.y > height + 100) {
        setGameOver(true);
        Alert.alert(
          "遊戲結束",
          `你的得分是: ${score}`,
          [
            { text: "返回主選單", onPress: () => navigation.navigate('MainScreen') }
          ]
        );
        return entities;
      }
      
      // 處理長按移動
      const runningSpeed = 2;

      // 檢查玩家是否在平台上或在地面上
      const checkPlatformContact = () => {
        const platforms = Object.values(platformsRef.current);
        let isOnPlatform = false;
        let onSpikeNow = false;
        let onTreadmillNow = false;
        let treadmillSpeed = 0;
        let onSpringNow = false;
        let currentPlatformType = 'none';  // 記錄當前所在的平台類型
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
            
            // 檢查玩家是否在平台正上方，增加垂直閾值
            const verticalThreshold = 10;  // 增加閾值，使檢測更寬鬆
            const isAbovePlatform = Math.abs(playerBottom - platformTop) <= verticalThreshold;
            const isFalling = playerBody.velocity.y >= 0;  // 當 y 速度為 0 或正值時表示玩家正在下落或停止
            
            // 添加更多調試信息
            if (Math.random() < 0.02) {
              console.log(`與平台 ${platform.body.label} 的垂直距離: ${Math.abs(playerBottom - platformTop)}`);
              console.log(`平台位置: (${platform.body.position.x}, ${platform.body.position.y}), 玩家位置: (${playerBody.position.x}, ${playerBody.position.y})`);
              console.log(`平台頂部: ${platformTop}, 玩家底部: ${playerBottom}`);
              console.log(`重疊比例: ${overlapPercent}`);
            }
            
            if (isAbovePlatform) {
              debugInfo.platformsContacted.push({
                type: platform.body.label,
                color: platform.color || 'unknown',
                overlapPercent: overlapPercent,
                position: {
                  platform: { x: platform.body.position.x, y: platform.body.position.y },
                  player: { x: playerX, y: playerBody.position.y }
                }
              });
              
              if (overlapPercent >= 0.1) {  // 大幅降低閾值，使玩家更容易站穩
                // 如果玩家有一部分在平台上，可以站穩
                isOnPlatform = true;
                
                // 根據平台類型設置不同的行為
                if (platform.body.label === 'platform') {
                  // 強制玩家站在平台上
                  Matter.Body.setPosition(playerBody, {
                    x: playerBody.position.x,
                    y: platformTop - (playerBody.bounds.max.y - playerBody.bounds.min.y) / 2
                  });
                  Matter.Body.setVelocity(playerBody, {
                    x: playerBody.velocity.x,
                    y: 0  // 確保玩家停止下落
                  });
                  currentPlatformType = 'platform';
                  console.log('站在普通平台上！顏色:', platform.color);
                } else if (platform.body.label === 'treadmill') {
                  // 確保玩家站在跑步機上
                  Matter.Body.setPosition(playerBody, {
                    x: playerBody.position.x,
                    y: platformTop - (playerBody.bounds.max.y - playerBody.bounds.min.y) / 2
                  });
                  // 允許跑步機效果產生水平移動
                  onTreadmillNow = true;
                  treadmillSpeed = platform.body.treadmillSpeed || 0;
                  currentPlatformType = 'treadmill';
                  console.log('站在跑步機上！顏色:', platform.color, '速度:', treadmillSpeed);
                } else if (platform.body.label === 'spike') {
                  onSpikeNow = true;
                  currentPlatformType = 'spike';
                  console.log('站在尖刺上！');
                } else if (platform.body.label === 'spring') {
                  onSpringNow = true;
                  currentPlatformType = 'spring';
                  console.log('站在彈簧上！顏色:', platform.color);
                }
                
                if (platform.body.label !== 'spike') {
                  playerBody.friction = 0.1;
                  Matter.Body.setAngle(playerBody, 0);
                }
              }
            }
          }
        });
        
        // 每隔一段時間輸出調試信息
        if (Math.random() < 0.02) {
          console.log('平台接觸調試信息:', JSON.stringify(debugInfo));
          console.log('玩家速度:', playerBody.velocity);
          console.log('玩家所在階梯類型:', currentPlatformType);
        }
        
        // 玩家站在平台上時，立即記錄平台類型
        if (isOnPlatform) {
          console.log('玩家當前所在階梯:', currentPlatformType);
        }
        
        // 如果在 spike 上，處理特殊邏輯
        if (onSpikeNow && playerBody.isTouchingSpike) {
          // 徹底防止跳動
          Matter.Body.setVelocity(playerBody, { x: 0, y: 0 });
        }
        
        // 處理跑步機效果
        if (onTreadmillNow || (playerBody.isTouchingTreadmill && playerBody.currentTreadmill)) {
          let speed = treadmillSpeed;
          let treadmill = null;
          
          // 如果通過碰撞事件標記了跑步機，使用該跑步機的速度
          if (playerBody.isTouchingTreadmill && playerBody.currentTreadmill) {
            treadmill = playerBody.currentTreadmill;
            speed = treadmill.treadmillSpeed || 0;
            console.log(`使用碰撞標記的跑步機速度: ${speed}`);
          } else {
            // 查找當前接觸的跑步機
            const currentTreadmills = Object.values(platformsRef.current).filter(
              p => p && p.body && p.body.label === 'treadmill'
            );
            
            for (const t of currentTreadmills) {
              const treadmillTop = t.body.bounds.min.y;
              const playerBottom = playerBody.bounds.max.y;
              const verticalDistance = Math.abs(playerBottom - treadmillTop);
              
              if (verticalDistance <= 5) {
                treadmill = t.body;
                speed = t.body.treadmillSpeed || 0;
                break;
              }
            }
            
            console.log(`使用檢測到的跑步機速度: ${speed}`);
          }
          
          // 使用專門的處理函數處理跑步機效果
          if (treadmill) {
            handleTreadmillEffect(playerBody, treadmill, speed);
          }
        }
        
        // 處理彈簧效果 - 改進彈跳邏輯
        if (onSpringNow && playerBody.velocity.y >= 0) {
          // 只有當玩家下落時才觸發彈簧
          const currentTime = Date.now();
          const lastJumpTime = playerBody.lastJumpTime || 0;
          
          // 檢查是否可以進行彈跳 (確保冷卻時間)
          if (currentTime - lastJumpTime > 500) {
            // 確保玩家確實與彈簧接觸
            const springPlatforms = Object.values(platformsRef.current).filter(
              p => p && p.body && p.body.label === 'spring'
            );
            
            let isReallyOnSpring = false;
            let closestSpring = null;
            let minDistance = 999999;
            
            for (const spring of springPlatforms) {
              const springTop = spring.body.bounds.min.y;
              const playerBottom = playerBody.bounds.max.y;
              const springWidth = spring.body.bounds.max.x - spring.body.bounds.min.x;
              const springLeft = spring.body.bounds.min.x;
              const springRight = spring.body.bounds.max.x;
              const playerX = playerBody.position.x;
              const playerWidth = playerBody.bounds.max.x - playerBody.bounds.min.x;
              const playerLeft = playerX - playerWidth / 2;
              const playerRight = playerX + playerWidth / 2;
              
              // 計算重疊區域
              const overlapLeft = Math.max(playerLeft, springLeft);
              const overlapRight = Math.min(playerRight, springRight);
              const overlapWidth = Math.max(0, overlapRight - overlapLeft);
              const overlapPercent = overlapWidth / playerWidth;
              
              // 檢查垂直距離和水平重疊
              const verticalDistance = Math.abs(playerBottom - springTop);
              if (verticalDistance <= 10 && overlapPercent >= 0.3) {
                isReallyOnSpring = true;
                
                // 記錄最近的彈簧
                if (verticalDistance < minDistance) {
                  minDistance = verticalDistance;
                  closestSpring = spring;
                }
                
                console.log("真正站在彈簧上! 重疊比例:", overlapPercent, "垂直距離:", verticalDistance);
              }
            }
            
            if (isReallyOnSpring && closestSpring) {
              // 給予向上彈跳力以及適度的水平移動
              const jumpVelocity = -10;  // 減小彈跳力度，防止過度彈跳
              const horizontalBoost = (Math.random() - 0.5) * 2;  // 減少隨機左右偏移
              
              console.log("觸發彈簧彈跳!");
              
              // 先設置玩家位置到彈簧上方
              const springTop = closestSpring.body.bounds.min.y;
              const playerHeight = playerBody.bounds.max.y - playerBody.bounds.min.y;
              
              Matter.Body.setPosition(playerBody, {
                x: playerBody.position.x + horizontalBoost,
                y: springTop - playerHeight / 2 - 1
              });
              
              // 然後應用垂直速度，強制使用固定值以確保一致性
              Matter.Body.setVelocity(playerBody, {
                x: horizontalBoost,
                y: jumpVelocity
              });
              
              // 增加重力影響
              Matter.Body.applyForce(playerBody, playerBody.position, {
                x: 0, 
                y: 0.001 // 輕微向下力
              });
              
              playerBody.lastJumpTime = currentTime;
              
              // 防止連續彈跳，設置一個短暫的無碰撞狀態
              playerBody.isJumping = true;
              setTimeout(() => {
                if (playerBody) playerBody.isJumping = false;
              }, 300);
            }
          }
        }
        
        return { isOnPlatform, currentPlatformType };
      };

      const { isOnPlatform, currentPlatformType } = checkPlatformContact();

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
          // 當沒有按鍵時，根據平台類型處理
          if (currentPlatformType === 'platform') {
            // 在普通平台上完全停止水平和垂直移動
            Matter.Body.setVelocity(playerBody, {
              x: 0,
              y: 0  // 將垂直速度也設為0，防止彈跳
            });
          } else if (!playerBody.isTouchingSpike) {
            // 其他非尖刺平台上應用摩擦力
            const friction = 0.4;  // 增加摩擦力，讓停止更加自然
            Matter.Body.setVelocity(playerBody, {
              x: playerBody.velocity.x * (1 - friction),
              y: playerBody.velocity.y
            });
          }
        }
      }
      
      // 動態添加新平台 - 現在在底部添加
      const screenBottomY = -scrollPositionRef.current + height;
      const visibleBottomEdge = screenBottomY + 200;  // 在可見區域下方稍遠處添加平台
      
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
    
    // 設置物理世界參數 - 增加重力以讓玩家感覺更重
    engine.gravity.scale = 0.01;  // 增加重力比例，從0.005到0.01
    engine.gravity.y = 1;          // 保持重力向下
    
    engineRef.current = engine;
    
    if (!engine) {
      console.error('Engine creation failed!');
      return;
    }
    
    const world = engine.world;
    
    // 初始化平台和玩家
    platformsRef.current = {};
    scrollPositionRef.current = 0;
    
    // 創建邊界
    const boundaries = createBoundaries(world);
    
    // 創建初始平台，從上到下
    const initialEntities = { 
      physics: { engine, world },
      ...boundaries
    };
    
    // 確保第一個平台位於玩家上方並足夠寬
    const firstPlatformY = height * 0.3;
    const firstPlatform = createPlatform(world, width / 2, firstPlatformY);
    const firstPlatformId = 'platform_initial';
    platformsRef.current[firstPlatformId] = firstPlatform;
    initialEntities[firstPlatformId] = firstPlatform;
    
    // 創建更多初始平台，確保四種類型都有
    let lastY = firstPlatformY;
    lowestPlatformRef.current = lastY;
    
    // 強制在初始階段創建四種不同類型的平台
    const forcedTypes = ['platform', 'treadmill', 'spring', 'spike'];
    
    // 首先確保每種類型都至少有一個
    for (let i = 0; i < forcedTypes.length; i++) {
      lastY += (PLATFORM_GAP_MIN + Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN));
      
      let platform;
      const x = Math.random() * (width - PLATFORM_WIDTH) + PLATFORM_WIDTH / 2;
      
      switch (forcedTypes[i]) {
        case 'treadmill':
          const direction = Math.random() < 0.5 ? -2 : 2;  // 增加速度大小，從±1增加到±2
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
      
      console.log(`創建強制類型平台: ${forcedTypes[i]}，顏色:`, platform.color || '使用圖像');
    }
    
    // 再創建一些隨機平台
    for (let i = 0; i < INITIAL_PLATFORMS - forcedTypes.length; i++) {
      lastY += (PLATFORM_GAP_MIN + Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN));
      const platformEntities = createRandomPlatform(world, lastY, true);
      Object.assign(initialEntities, platformEntities);
      lowestPlatformRef.current = lastY;
    }
    
    // 創建玩家在第一個平台上方，增加質量讓他更有重量感
    const player = createPlayer(world, width / 2, firstPlatformY - 50, selectedPlayer);
    player.body.mass = player.body.mass * 3;  // 大幅增加玩家質量，從1.5倍增加到3倍
    initialEntities.player1 = player;

    setEntities(initialEntities);
    
    return () => {
      Matter.World.clear(world);
      Matter.Engine.clear(engine);
    };
  }, [selectedPlayer]);

  // 添加碰撞處理邏輯
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) {
      console.error('Collision setup: Engine is undefined!');
      return;
    }
    
    let isOnSpike = false;
    
    const collisionStartHandler = (event) => {
      if (!event || !event.pairs) {
        console.error('Event or event.pairs is undefined!');
        return;
      }
      
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        
        // 處理與跑步機的碰撞
        if ((bodyA.label === 'player' && bodyB.label === 'treadmill') ||
            (bodyA.label === 'treadmill' && bodyB.label === 'player')) {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          const treadmillBody = bodyA.label === 'treadmill' ? bodyA : bodyB;
          
          console.log('玩家與跑步機碰撞開始!');
          
          // 強制玩家站在跑步機上
          const treadmillTop = treadmillBody.bounds.min.y;
          Matter.Body.setPosition(playerBody, {
            x: playerBody.position.x,
            y: treadmillTop - (playerBody.bounds.max.y - playerBody.bounds.min.y) / 2 - 2  // 稍微上移一點防止穿透
          });
          
          // 停止玩家垂直速度
          Matter.Body.setVelocity(playerBody, {
            x: playerBody.velocity.x,
            y: 0
          });
          
          // 標記玩家正在接觸跑步機
          playerBody.isTouchingTreadmill = true;
          playerBody.currentTreadmill = treadmillBody;
        }
        
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
          setLives((prev) => {
            const newLives = Math.max(0, prev - 2);
            if (newLives <= 0 && !gameOver) {
              setGameOver(true);
              Alert.alert(
                "遊戲結束",
                `你失去了所有生命！\n你的得分是: ${score}`,
                [
                  { text: "返回主選單", onPress: () => navigation.navigate('MainScreen') }
                ]
              );
            }
            return newLives;
          });
          
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
        
        // 處理與邊界的碰撞
        if (bodyA.label === 'player' || bodyB.label === 'player') {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          const otherBody = bodyA.label === 'player' ? bodyB : bodyA;
          
          // 處理頂部邊界碰撞
          if (otherBody.label === 'topBoundary') {
            // 檢查是否在冷卻時間內
            const currentTime = Date.now();
            if (currentTime - lastDamageTime < 1000) {
              return;
            }
            
            // 更新上次受傷時間
            setLastDamageTime(currentTime);
            
            // 減少生命值（碰到頂部邊界損失1點生命）
            setLives((prev) => {
              const newLives = Math.max(0, prev - 1);
              if (newLives <= 0 && !gameOver) {
                setGameOver(true);
                Alert.alert(
                  "遊戲結束",
                  `你失去了所有生命！\n你的得分是: ${score}`,
                  [
                    { text: "返回主選單", onPress: () => navigation.navigate('MainScreen') }
                  ]
                );
              }
              return newLives;
            });
            
            // 將玩家向下彈開，但不要太強烈
            Matter.Body.setVelocity(playerBody, {
              x: playerBody.velocity.x,
              y: 5 // 輕微向下彈開
            });
          }
          
          // 處理左右邊界碰撞
          if (otherBody.label === 'leftBoundary' || otherBody.label === 'rightBoundary') {
            // 將玩家向中間彈開，減少彈力
            const pushDirection = playerBody.position.x > width / 2 ? -1 : 1;
            
            Matter.Body.setVelocity(playerBody, {
              x: pushDirection,
              y: playerBody.velocity.y
            });
            
            // 檢查是否在冷卻時間內
            const currentTime = Date.now();
            if (currentTime - lastDamageTime < 1000) {
              return;
            }
            
            // 更新上次受傷時間
            setLastDamageTime(currentTime);
            
            // 減少生命值（碰到邊界損失1點生命）
            setLives((prev) => {
              const newLives = Math.max(0, prev - 1);
              if (newLives <= 0 && !gameOver) {
                setGameOver(true);
                Alert.alert(
                  "遊戲結束",
                  `你失去了所有生命！\n你的得分是: ${score}`,
                  [
                    { text: "返回主選單", onPress: () => navigation.navigate('MainScreen') }
                  ]
                );
              }
              return newLives;
            });
          }
        }
      });
    };
    
    const collisionEndHandler = (event) => {
      if (!event || !event.pairs) return;
      
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        
        // 處理跑步機碰撞結束
        if ((bodyA.label === 'player' && bodyB.label === 'treadmill') ||
            (bodyA.label === 'treadmill' && bodyB.label === 'player')) {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          
          console.log('玩家與跑步機碰撞結束!');
          
          // 清除跑步機標記
          playerBody.isTouchingTreadmill = false;
          playerBody.currentTreadmill = null;
        }
        
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

    // 修復長按移動鍵，設置位置並給予速度
    Matter.Body.setPosition(playerBody, {
      x: playerBody.position.x + (direction * stepSize),
      y: playerBody.position.y
    });
      
    Matter.Body.setVelocity(playerBody, {
      x: direction * 2,
      y: playerBody.velocity.y
    });
  };

  // 創建頭部裝飾物
  useEffect(() => {
    if (!entities || !entities.physics) return;
    
    const world = entities.physics.world;
    const headRadius = 20;
    const headOffset = 40;  // 頭部與邊界的距離
    
    // 左側頭部 - 確保完全固定
    const leftHead = Matter.Bodies.circle(
      headOffset, 
      height / 2, 
      headRadius, 
      { 
        isStatic: true, 
        isSensor: true,
        label: 'leftHead',
        render: { fillStyle: '#ff0000' },
        collisionFilter: { group: 0 }  // 使用碰撞組別確保不受影響
      }
    );
    
    // 右側頭部 - 確保完全固定
    const rightHead = Matter.Bodies.circle(
      width - headOffset, 
      height / 2, 
      headRadius, 
      { 
        isStatic: true, 
        isSensor: true,
        label: 'rightHead',
        render: { fillStyle: '#ff0000' },
        collisionFilter: { group: 0 }  // 使用碰撞組別確保不受影響
      }
    );
    
    // 確保頭部保持在固定位置，設置為永久靜態
    Matter.Body.setStatic(leftHead, true);
    Matter.Body.setStatic(rightHead, true);
    
    Matter.World.add(world, [leftHead, rightHead]);
    
    // 更新實體
    setEntities(prevEntities => ({
      ...prevEntities,
      leftHead: { 
        body: leftHead, 
        size: [headRadius*2, headRadius*2], 
        color: 'red', 
        renderer: 'circle',
        isStatic: true  // 明確標記為靜態
      },
      rightHead: { 
        body: rightHead, 
        size: [headRadius*2, headRadius*2], 
        color: 'red', 
        renderer: 'circle',
        isStatic: true  // 明確標記為靜態
      }
    }));
    
  }, [entities?.physics]);
  
  // 添加 fireball
  useEffect(() => {
    if (!entities || !entities.physics) return;
    
    const world = entities.physics.world;
    const fireballRadius = 15;
    const fireballY = 60;  // 放在屏幕上方
    
    // 創建 fireball
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
    
    // 更新實體
    setEntities(prevEntities => ({
      ...prevEntities,
      fireball: { body: fireball, size: [fireballRadius*2, fireballRadius*2], color: 'orange', renderer: 'circle' }
    }));
    
  }, [entities?.physics]);

  // 添加持續監控機制來防止玩家穿透跑步機
  useEffect(() => {
    if (!entities || !entities.player1 || !entities.player1.body) return;
    
    const playerBody = entities.player1.body;
    const checkInterval = setInterval(() => {
      // 檢查玩家是否正站在跑步機上
      if (playerBody.isTouchingTreadmill && playerBody.currentTreadmill) {
        const treadmill = playerBody.currentTreadmill;
        if (treadmill) {
          // 計算玩家與跑步機的相對位置
          const treadmillTop = treadmill.bounds.min.y;
          const playerBottom = playerBody.bounds.max.y;
          const relativePosition = playerBottom - treadmillTop;
          
          // 如果相對位置表明可能穿透或者下滑，則修正位置
          if (relativePosition > 5 || playerBody.velocity.y > 0) {
            console.log("防止穿透：重新定位玩家到跑步機上");
            
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
    }, 50); // 每 50ms 檢查一次
    
    return () => clearInterval(checkInterval);
  }, [entities]);

  // 修改跑步機效果處理，增強推力
  const handleTreadmillEffect = (playerBody, treadmill, speed) => {
    // 使用直接速度設置以確保明顯的推力效果
    Matter.Body.setVelocity(playerBody, {
      x: playerBody.velocity.x + speed * 0.3, // 大幅增加效果強度，確保能感受到推力
      y: 0 // 確保垂直速度為0，防止穿透
    });
    
    // 確保玩家位置只在必要時調整
    const treadmillTop = treadmill.bounds.min.y;
    const playerBottom = playerBody.bounds.max.y;
    const playerHeight = playerBody.bounds.max.y - playerBody.bounds.min.y;
    
    // 只有當玩家明顯下滑或穿透時才調整位置
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
    width: width - 40, // 減去左右各20的padding
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