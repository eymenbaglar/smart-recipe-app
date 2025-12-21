import React, { useState, useEffect , useCallback} from 'react';
import { TouchableOpacity, View, Text, StyleSheet} from 'react-native';
import { NavigationContainer, useNavigation, useFocusEffect } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen'; 
import SettingsScreen from './src/screens/SettingsScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import SmartRecipeResultsScreen from './src/screens/SmartRecipeResultsScreen';
import RecipeDetailsScreen from './src/screens/RecipeDetailsScreen';
import ManualInputScreen from './src/screens/ManualInputScreen';
import MealHistoryScreen from './src/screens/MealHistoryScreen';
import RecommendedRecipesScreen from './src/screens/RecommendedRecipesScreen';
import MyReviewsScreen from './src/screens/MyReviewsScreen';
import AddRecipeScreen from './src/screens/AddRecipeScreen';
import MyRecipesScreen from './src/screens/MyRecipesScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import RecipeListScreen from './src/screens/RecipeListScreen';

// Navigator
import TabNavigator from './src/navigation/tabNavigator'; 

const Stack = createStackNavigator();

// Profil ikonu
const HeaderRightButton = () => {
  const navigation = useNavigation();
  const [unreadCount, setUnreadCount] = useState(0);

  // Sayfa her odaklandığında veya navigasyon değiştiğinde bildirim sayısını çek
  useFocusEffect(
    useCallback(() => {
      const checkUnread = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          // Eğer token yoksa (giriş yapılmamışsa) işlem yapma
          if (!token) return;

          const res = await axios.get(`${API_URL}/api/notifications/unread-count`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUnreadCount(res.data.count);
        } catch (e) {
          console.log("Bildirim sayısı alınamadı:", e.message);
        }
      };

      checkUnread();
      
      const interval = setInterval(checkUnread, 5000);
      return () => clearInterval(interval);
      
    }, [])
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
      
      {/* --- BİLDİRİM BUTONU --- */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('Notifications')} 
        style={{ marginRight: 15, position: 'relative' }} // Profil ile arasında boşluk
      >
        <Ionicons name="notifications-outline" size={28} color="#000" />
        
        {/* Kırmızı Badge (Sayı) */}
        {unreadCount > 0 && (
          <View style={{
            position: 'absolute',
            right: -2,
            top: -2,
            backgroundColor: 'red',
            borderRadius: 8,
            width: 16,
            height: 16,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#fff' // İkonun üstünde daha net durması için beyaz kenarlık
          }}>
            <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* --- PROFİL BUTONU (Senin Mevcut Kodun) --- */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('Profile')}
      >
        <Ionicons name="person-circle-outline" size={32} color="#000" />
      </TouchableOpacity>

    </View>
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

  // Giriş yap
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  // Çıkış yap
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user'); 
      setIsLoggedIn(false); 
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isLoading) {
    return null; 
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
            {/* Ana ekran(giriş yapmış)*/}
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
                headerRight: () => <HeaderRightButton />, 
              }}
            />
            <Stack.Screen 
              name="Profile"
              options={{ title: 'My Profile' }}
            >
              {(props) => (
                <ProfileScreen {...props} onLogout={handleLogout} />
              )}
            </Stack.Screen>
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen} 
              options={{ title: 'Settings' }}
            />
            <Stack.Screen 
              name="ChangePassword" 
              component={ChangePasswordScreen} 
              options={{ title: 'Change Password' }}
            />
            <Stack.Screen 
              name="SmartRecipeResults" 
              component={SmartRecipeResultsScreen} 
              options={{ title: 'Matching Recipes' }}
            />
            <Stack.Screen 
              name="RecipeDetails" 
              component={RecipeDetailsScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="ManualInput" 
              component={ManualInputScreen} 
              options={{ title: 'Manual Selection' }}
            />
            <Stack.Screen 
              name="MealHistory" 
              component={MealHistoryScreen} 
              options={{ title: 'Meal History' }}
            />
            <Stack.Screen 
              name="RecommendedRecipes" 
              component={RecommendedRecipesScreen} 
              options={{ title: 'Recommended Recipes' }}
            />
            <Stack.Screen 
              name="MyReviews" 
              component={MyReviewsScreen} 
              options={{ title: 'My Comments & Reviews' }}
            />
            <Stack.Screen 
            name="AddRecipe" 
            component={AddRecipeScreen} 
            options={{ title: 'Add Recipe' }} 
            />
            <Stack.Screen 
            name="MyRecipes" 
            component={MyRecipesScreen} 
            options={{ title: 'My Recipe'}} 
            />
            <Stack.Screen 
              name="Notifications" 
              component={NotificationScreen} 
              options={{ title: 'Notifications' }} 
            />
            <Stack.Screen 
            name="RecipeList" 
            component={RecipeListScreen} 
            options={{ headerShown: false }} // Kendi header'ımızı yaptık
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}