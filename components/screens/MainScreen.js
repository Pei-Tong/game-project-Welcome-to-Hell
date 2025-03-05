import React, { useEffect, useState } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';

// Prevent the splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function MainScreen() {
  const navigation = useNavigation();

  const [fontsLoaded] = useFonts({
    secondary: require('../../assets/fonts/secondary-font.ttf'),
  });

  // State for the chosen player and modal visibility
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // State for settings modal visibility
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // State for loading simulation
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Reset state each time the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setSelectedPlayer(null);
      setShowModal(false);
      setShowSettingsModal(false);
      setIsLoading(false);
      setLoadingProgress(0);
    }, [])
  );

  // Simulate a loading process when PLAY is pressed
  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            // Navigate to GameScreen with selected player info when loading is complete
            navigation.navigate('GameScreen', { selectedPlayer });
            return 100;
          }
          return prev + 10;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  if (!fontsLoaded) return null;

  return (
    <ImageBackground 
      source={require('../../assets/img/bg.png')}
      style={styles.background}
    >
      <View style={styles.overlay}>
        {/* Top Section */}
        <Text style={styles.topTitle}>WELCOME TO HELL!!</Text>
        <Text style={styles.subtitle}>We hope you get there!!</Text>

        {/* Settings Button as a styled button using Secondary-font */}
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettingsModal(true)}
        >
          <Text style={styles.settingsButtonText}>SETTINGS ⚙️</Text>
        </TouchableOpacity>

        {/* Middle Section */}
        <Text style={styles.chooseTitle}>CHOOSE YOUR WARRIOR</Text>
        <View style={styles.playerContainer}>
          <TouchableOpacity 
            onPress={() => { 
              setSelectedPlayer('Player'); 
              setShowModal(true);
            }}
          >
            <Image 
              source={require('../../assets/img/Player.png')}
              style={[
                styles.playerImage, 
                selectedPlayer === 'Player' && styles.selectedPlayer
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => { 
              setSelectedPlayer('Player2'); 
              setShowModal(true);
            }}
          >
            <Image 
              source={require('../../assets/img/Player2.png')}
              style={[
                styles.playerImage, 
                selectedPlayer === 'Player2' && styles.selectedPlayer
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* Modal to pop up the chosen player */}
        {showModal && selectedPlayer && (
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selected Warrior</Text>
              <Image 
                source={
                  selectedPlayer === 'Player'
                    ? require('../../assets/img/Player.png')
                    : require('../../assets/img/Player2.png')
                }
                style={styles.modalPlayerImage}
              />
              <TouchableOpacity 
                style={styles.modalCloseButton} 
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Settings Modal with blurred background and red/black color scheme */}
        {showSettingsModal && (
          <BlurView intensity={50} tint="dark" style={styles.blurContainer}>
            <View style={[styles.modalContainer, styles.settingsModalContainer]}>
              <View style={[styles.modalContent, styles.settingsModalContent]}>
                <Text style={[styles.modalTitle, styles.settingsModalTitle]}>Settings</Text>
                {/* Add your settings options here */}
                <TouchableOpacity 
                  style={styles.modalCloseButton} 
                  onPress={() => setShowSettingsModal(false)}
                >
                  <Text style={[styles.modalCloseButtonText, styles.settingsModalCloseButtonText]}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        )}

        {/* Bottom Section */}
        <TouchableOpacity 
          style={[
            styles.playButton, 
            selectedPlayer && styles.playButtonActive
          ]}
          onPress={() => {
            if (selectedPlayer) {
              setIsLoading(true);
            }
          }}
          disabled={!selectedPlayer || isLoading}
        >
          <Text style={styles.playButtonText}>PLAY</Text>
        </TouchableOpacity>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading {loadingProgress}%</Text>
          </View>
        )}

        {/* Go Back Button with arrow (at bottom center) */}
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
  settingsButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#930606',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 5,
  },
  settingsButtonText: {
    fontFamily: 'secondary',
    fontSize: 24,
    color: '#ffff00',
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPlayer: {
    borderColor: '#fff000',
    borderWidth: 4,
  },
  playButton: {
    backgroundColor: '#930606',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 5,
    marginTop: 60,
    opacity: 0.5,
  },
  playButtonActive: {
    opacity: 1,
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
  loadingContainer: {
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 5,
  },
  loadingText: {
    fontFamily: 'secondary',
    fontSize: 18,
    color: '#fff000',
  },
  modalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '80%',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'secondary',
    fontSize: 24,
    marginBottom: 10,
    color: '#000',
  },
  modalPlayerImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  modalCloseButton: {
    marginTop: 10,
    backgroundColor: '#930606',
    padding: 10,
    borderRadius: 5,
  },
  modalCloseButtonText: {
    fontFamily: 'secondary',
    fontSize: 18,
    color: '#fff',
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsModalContainer: {
  },
  settingsModalContent: {
    backgroundColor: '#000', 
    width: '80%',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000', 
  },
  settingsModalTitle: {
    fontFamily: 'secondary',
    fontSize: 24,
    marginBottom: 10,
    color: '#fff000', 
  },
  settingsModalCloseButtonText: {
    fontFamily: 'secondary',
    fontSize: 18,
    color: '#fff000',
  },
});
