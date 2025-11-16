import React, { useState, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen'; // Profil ekranını buraya alıyoruz

// Navigator
import TabNavigator from './src/navigation/tabNavigator'; // Yeni TabNavigator'ı import et

const Stack = createStackNavigator();

// Header'daki Profil İkonu için yardımcı bileşen
const HeaderRightButton = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('Profile')} // Profile ekranına git
      style={{ marginRight: 15 }}
    >
      <Ionicons name="person-circle-outline" size={32} color="#000" />
    </TouchableOpacity>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
  setIsLoggedIn(true);
};

  if (isLoading) {
    return null; // Splash screen gösterilebilir
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isLoggedIn ? (
          <>
            <Stack.Screen 
              name="Login" 
              options={{ headerShown: false }}
            >
        {(props) => (
        <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />
        )}
      </Stack.Screen>
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen} 
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            {/* Giriş Yapan Kullanıcının Ana Ekranı (Tab'ları içerir) */}
            <Stack.Screen 
              name="Main" 
              component={TabNavigator} 
              options={{
                title: 'DISCHCOVERY',
                headerTitleAlign: 'center',
                headerTitleStyle: {
                  fontWeight: 'bold',
                  fontSize: 20,
                },
                headerRight: () => <HeaderRightButton />, // Profil ikonu
              }}
            />
            {/* Profil İkonuna basınca açılacak ekran */}
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen} 
              options={{ title: 'Profilim' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}