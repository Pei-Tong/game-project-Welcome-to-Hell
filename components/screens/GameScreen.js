import React from 'react';
import { 
  StyleSheet, 
  Text, 
  ImageBackground, 
  TouchableOpacity 
} from 'react-native';

export default function GameScreen({ route, navigation }) {
  const { selectedPlayer } = route.params; // if needed for game logic

  return (
    <ImageBackground 
      source={require('../../assets/img/bg2.png')}
      style={styles.background}
    >
      {/* Navigate Back Button */}
      <TouchableOpacity style={styles.backArrow} onPress={() => navigation.goBack()}>
        <Text style={styles.backArrowText}>←</Text>
      </TouchableOpacity>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
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
