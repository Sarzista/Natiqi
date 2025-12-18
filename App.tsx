import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';
import { useFonts, Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold } from '@expo-google-fonts/tajawal';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { AppNavigator } from './src/navigation';

// Inject CSS animation for web gradient text
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'gradient-shift-animation';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes gradient-shift {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }

      /* Hide default browser password reveal/clear icons, we'll use our own */
      input[type="password"]::-ms-reveal,
      input[type="password"]::-ms-clear,
      input::-ms-reveal,
      input::-ms-clear,
      input[type="password"]::-webkit-credentials-auto-fill-button,
      input[type="password"]::-webkit-textfield-decoration-container,
      input[type="password"]::-webkit-clear-button {
        display: none;
      }

      /* Themed focus ring for inputs (match app colors instead of default black) */
      input:focus {
        outline: none;
        border-color: ${'#3aab83'};
        box-shadow: 0 0 0 2px rgba(58, 171, 131, 0.35);
      }
    `;
    document.head.appendChild(style);
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
  });

  if (!fontsLoaded) {
    // Keep the splash screen while fonts load
    return null;
  }

  return (
    <View style={styles.container}>
      <LanguageProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </AuthProvider>
      </LanguageProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
