import React from 'react';
import { 
  StyleSheet, 
  Text, 
  ImageBackground, 
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import Matter from 'matter-js';
import createBoundaries from '../entities/Boundaries';
import createPlatform from '../entities/Platform';
import createSpike from '../entities/Spike';

const { width, height } = Dimensions.get('window');

// 簡單的物理更新系統
const Physics = (entities, { time }) => {
  const engine = entities.physics.engine;
  const delta = Math.min(time.delta, 16.667);
  Matter.Engine.update(engine, delta);
  return entities;
};



export default function GameScreen({ route, navigation }) {
  const { selectedPlayer } = route.params; // if needed for game logic

  // 初始化 Matter.js 引擎和世界
  const engine = Matter.Engine.create({ enableSleeping: false });
  const world = engine.world;

  const boundaries = createBoundaries(world);
  const platform = createPlatform(world, width / 2, height - 200);
  const spike = createSpike(world, width / 2, height - 230);


  // 定義遊戲實體
  const entities = {
    physics: { engine, world },
    ...boundaries, // 添加邊界實體
    platform1: platform,
    spike1: spike,
  };




  return (
    <ImageBackground 
      source={require('../../assets/img/Bg2.png')}
      style={styles.background}
    >
      <GameEngine 
        style={styles.gameContainer}
        systems={[Physics]} // 添加物理更新系統
        entities={entities}
      >
        {/* Navigate Back Button */}
        <TouchableOpacity style={styles.backArrow} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrowText}>←</Text>
        </TouchableOpacity>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
});
