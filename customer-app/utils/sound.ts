import { Audio } from 'expo-av';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SUCCESS_TONE = require('../assets/sounds/success.mp3') as number;

export async function playSuccessTone() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
    });
    const { sound } = await Audio.Sound.createAsync(SUCCESS_TONE, {
      shouldPlay: true,
      volume: 0.55,
    });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded || !status.didJustFinish) return;
      void sound.unloadAsync();
    });
  } catch {
    // Don't block booking flow if audio fails on device.
  }
}
