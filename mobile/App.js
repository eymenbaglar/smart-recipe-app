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
import SettingsScreen from './src/screens/SettingsScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import SmartRecipeResultsScreen from './src/screens/SmartRecipeResultsScreen';
import RecipeDetailsScreen from './src/screens/RecipeDetailsScreen';
import ManualInputScreen from './src/screens/ManualInputScreen';
import MealHistoryScreen from './src/screens/MealHistoryScreen';
import RecommendedRecipesScreen from './src/screens/RecommendedRecipesScreen';
import MyReviewsScreen from './src/screens/MyReviewsScreen';

// Navigator
import TabNavigator from './src/navigation/tabNavigator'; 

const Stack = createStackNavigator();

// Profil ikonu
const HeaderRightButton = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('Profile')} 
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
              options={{ title: 'Yemek Geçmişim' }}
            />
            <Stack.Screen 
              name="RecommendedRecipes" 
              component={RecommendedRecipesScreen} 
              options={{ title: 'Önerilenler' }}
            />
            <Stack.Screen 
              name="MyReviews" 
              component={MyReviewsScreen} 
              options={{ title: 'Yorumlarım & Puanlarım' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}