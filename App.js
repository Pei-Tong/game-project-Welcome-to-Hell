import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { GameEngine } from 'react-native-game-engine';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>INFO-5144 W25</Text>

      <GameEngine 
        // entities={entities()}
      style={styles.gameContainer}
      ></GameEngine>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  gameContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }
});
