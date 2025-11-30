import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// screens
import HomeScreen from '../screens/HomeScreen';
import MyStockScreen from '../screens/MyStockScreen';
import ProfileScreen from '../screens/ProfileScreen'; 
import RecipeWizardScreen from '../screens/RecipeWizardScreen';

//geçici ekranlar
function SocialScreen() {
  return <View style={styles.center}><Text>Social Screen</Text></View>;
}
function FavoritesScreen() {
  return <View style={styles.center}><Text>Favorites Screen</Text></View>;
}

const Tab = createBottomTabNavigator();

// Wizard butonu
const CustomTabBarButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={styles.customButtonContainer}
    onPress={onPress}
  >
    <View style={styles.customButton}>
      {children}
    </View>
  </TouchableOpacity>
);

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: false, 
        tabBarStyle: {
          backgroundColor: '#ffffff',
          height: 70,
          borderTopWidth: 1,
          borderColor: '#f0f0f0',
        },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: 'gray',
        headerShown: false, 
      }}
    >
      {/* 1. Home */}
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={28} color={color} />
          ),
        }} 
      />
      {/* 2. Social */}
      <Tab.Screen 
        name="Social" 
        component={SocialScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={color} />
          ),
        }} 
      />
      {/* 3. Recipe Wizard (Özel Buton) */}
      <Tab.Screen 
        name="Wizard" 
        component={RecipeWizardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons name="sparkles" size={32} color={focused ? '#fff' : '#f0f0f0'} />
          ),
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} />
          ),
        }}
      />
      {/* 4. Favorites */}
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="heart-outline" size={28} color={color} />
          ),
        }} 
      />
      {/* 5. MyStock */}
      <Tab.Screen 
        name="MyStock" 
        component={MyStockScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="cube-outline" size={28} color={color} />
          ),
        }} 
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white'
  },
  customButtonContainer: {
    top: -30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#000', // Siyah arka plan
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10
  },
});