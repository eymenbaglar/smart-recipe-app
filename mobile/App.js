import React, { useState, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen'; 

// Navigator
import TabNavigator from './src/navigation/tabNavigator'; 

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
  const [isLoggedIn, setIsLoggedIn] =useState(false);
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

  // 1. GİRİŞ YAP FONKSİYONU
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  // 2. ÇIKIŞ YAP FONKSİYONU
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user'); // Kullanıcı verisini de temizle
      setIsLoggedIn(false); // State'i güncelle (Otomatik Login'e atar)
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isLoading) {
    return null; // Splash screen
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
            <Stack.Screen 
              name="Profile"
              options={{ title: 'Profilim' }}
            >
              {(props) => (
                <ProfileScreen {...props} onLogout={handleLogout} />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}