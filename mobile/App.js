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
import VerificationScreen from './src/screens/VerificationScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetVerificationScreen from './src/screens/ResetVerificationScreen';
import NewPasswordScreen from './src/screens/NewPasswordScreen';

// Navigator
import TabNavigator from './src/navigation/tabNavigator'; 

const Stack = createStackNavigator();

// Profil icon
const HeaderRightButton = () => {
  const navigation = useNavigation();
  const [unreadCount, setUnreadCount] = useState(0);

  //Retrieve the notification count whenever the page is focused or navigation changes
  useFocusEffect(
    useCallback(() => {
      const checkUnread = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          
          if (!token) return;

          const res = await axios.get(`${API_URL}/api/notifications/unread-count`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUnreadCount(res.data.count);
        } catch (e) {
          console.log("Number of notifications could not be retrieved:", e.message);
        }
      };

      checkUnread();
      
      const interval = setInterval(checkUnread, 5000);
      return () => clearInterval(interval);
      
    }, [])
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
      
      {/* Notification Button */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('Notifications')} 
        style={{ marginRight: 15, position: 'relative' }} 
      >
        <Ionicons name="notifications-outline" size={28} color="#000" />
        
        {/* Red Badge (Number) */}
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
            borderColor: '#fff' 
          }}>
            <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Profile Button */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('Profile')}
      >
        <Ionicons name="person-circle-outline" size={32} color="#000" />
      </TouchableOpacity>

    </View>
  );
};

export default function App() {
  //constant defaults
  const [isLoggedIn, setIsLoggedIn] =useState(false);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    checkLoginStatus();
  }, []);

  //checking token status
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

  // Log in
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  // Log out
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
            <Stack.Screen 
            name="Verification" 
            component={VerificationScreen} 
            options={{ headerShown: false }} 
            />
            <Stack.Screen name="ForgotPassword" 
            component={ForgotPasswordScreen} 
            options={{ headerShown: false }} 
            />
            <Stack.Screen name="ResetVerification" 
            component={ResetVerificationScreen} 
            options={{ headerShown: false }} 
            />
            <Stack.Screen name="NewPassword" 
            component={NewPasswordScreen} 
            options={{ headerShown: false }} 
            />
          </>
        ) : (
          <>
            {/* Home Screen*/}
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
              options={{ title: 'Settings' }}
            >
              {(props) => (
                <SettingsScreen {...props} onLogout={handleLogout} />
              )}
            </Stack.Screen>
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
            options={{ headerShown: false }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}