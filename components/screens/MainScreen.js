import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ImageBackground, 
  Image, 
  TouchableOpacity 
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useNavigation } from '@react-navigation/native';

// Prevent the splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function MainScreen() {
  const navigation = useNavigation();

  const [fontsLoaded] = useFonts({
    secondary: require('../../assets/fonts/secondary-font.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ImageBackground 
      source={require('../../assets/img/bg.png')} // Change to desired background image
      style={styles.background}
    >
      <View style={styles.overlay}>
        {/* Top Section */}
        <Text style={styles.topTitle}>WELCOME TO HELL!!</Text>
        <Text style={styles.subtitle}>We hope you get there!!</Text>

        {/* Middle Section */}
        <Text style={styles.chooseTitle}>CHOOSE YOUR WARRIOR</Text>
        <View style={styles.playerContainer}>
          <TouchableOpacity>
            <Image 
              source={require('../../assets/img/Player.png')}
              style={styles.playerImage}
            />
          </TouchableOpacity>
          <TouchableOpacity>
            <Image 
              source={require('../../assets/img/Player2.png')}
              style={styles.playerImage}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Section */}
        <TouchableOpacity style={styles.playButton}>
          <Text style={styles.playButtonText}>PLAY</Text>
        </TouchableOpacity>

        {/* Go Back Button with arrow */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  topTitle: {
    fontFamily: 'secondary',
    fontSize: 40,
    color: '#fff000',
    marginTop: 40,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'secondary',
    fontSize: 18,
    color: '#fff000',
    marginTop: 10,
    textAlign: 'center',
  },
  chooseTitle: {
    fontFamily: 'secondary',
    fontSize: 24,
    color: '#fff000',
    marginTop: 80,
    textAlign: 'center',
  },
  playerContainer: {
    flexDirection: 'row',
    marginTop: 30,
    justifyContent: 'space-around',
    width: '100%',
  },
  playerImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  playButton: {
    backgroundColor: '#930606',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 5,
    marginTop: 60,
  },
  playButtonText: {
    fontFamily: 'secondary',
    fontSize: 24,
    color: '#fff000',
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  backButtonText: {
    fontFamily: 'secondary',
    fontSize: 36,
    color: '#fff000',
  },
});
