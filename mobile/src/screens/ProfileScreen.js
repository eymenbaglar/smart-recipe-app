import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform // Platform eklendi
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker'; // EKLENDİ
import axios from 'axios'; // EKLENDİ

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function ProfileScreen({ navigation, onLogout }) { 
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false); // EKLENDİ: Yükleme durumu

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- EKLENDİ: RESİM SEÇME FONKSİYONU ---
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to allow access to photos to upload a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadProfilePhoto(result.assets[0]);
    }
  };

  // --- EKLENDİ: RESİM YÜKLEME FONKSİYONU ---
  const uploadProfilePhoto = async (imageAsset) => {
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const formData = new FormData();
      const filename = imageAsset.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('photo', {
        uri: Platform.OS === 'android' ? imageAsset.uri : imageAsset.uri.replace('file://', ''),
        name: filename,
        type: type,
      });

      const response = await axios.post(`${API_URL}/api/profile/upload-photo`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      // Yerel veriyi güncelle
      const updatedPath = response.data.filePath;
      const updatedUser = { ...user, profile_picture: updatedPath };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      Alert.alert("Success", "Profile picture updated.");

    } catch (error) {
      console.error("Upload Error:", error);
      Alert.alert("Error", "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  // --- EKLENDİ: RESİM URL BELİRLEME ---
  const getProfileImage = () => {
    if (user?.profile_picture) {
      const cleanPath = user.profile_picture.replace(/\\/g, '/');
      return { uri: `${API_URL}/${cleanPath}` };
    }
    return { uri: 'https://placehold.co/150x150/E0E0E0/B0B0B0?text=Profil' };
  };

  const handleLogoutPress = () => {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes", 
          onPress: () => {
            if (onLogout) {
              onLogout();
            } else {
              Alert.alert("Error", "The exit function could not be found.");
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const menuItems = [
    { icon: 'share-social-outline', title: 'Share A Recipe', count: null },
    { icon: 'book-outline', title: 'My Recipes', count: null },
    { icon: 'time-outline', title: 'Meal History', count: null, screen: 'MealHistory' },,
    { icon: 'star-outline', title: 'My Reviews', count: null, screen: 'MyReviews' },,
    { icon: 'settings-outline', title: 'Settings', count: null, screen: 'Settings' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        
        {/* --- GÜNCELLENDİ: PROFİL FOTOĞRAFI ALANI --- */}
        <View style={styles.profileImageContainer}>
          {uploading ? (
            <View style={[styles.profileImage, styles.center]}>
              <ActivityIndicator color="#4CAF50" />
            </View>
          ) : (
            <Image 
              source={getProfileImage()} 
              style={styles.profileImage}
            />
          )}
          
          <TouchableOpacity style={styles.editButton} onPress={handlePickImage}>
            <Ionicons name="camera-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
        {/* ------------------------------------------- */}
        
        <Text style={styles.username}>{user?.username || 'Kullanıcı'}</Text>
        <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>28</Text>
            <Text style={styles.statLabel}>Recipes</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem} onPress={() => item.screen ? navigation.navigate(item.screen) : null}
            disabled={!item.screen}>
            <View style={styles.menuItemLeft}>
              <Ionicons name={item.icon} size={24} color="#666" />
              <Text style={styles.menuItemText}>{item.title}</Text>
            </View>
            <View style={styles.menuItemRight}>
              {item.count && (
                <Text style={styles.menuItemCount}>{item.count}</Text>
              )}
              {item.screen && (
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
        <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: { // EKLENDİ: Ortalamak için
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ddd',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  menuContainer: {
    backgroundColor: 'white',
    marginTop: 10,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemCount: {
    fontSize: 14,
    color: '#999',
    marginRight: 10,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginTop: 10,
    marginBottom: 30,
    paddingVertical: 15,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF6B6B',
    marginLeft: 10,
    fontWeight: '600',
  },
});