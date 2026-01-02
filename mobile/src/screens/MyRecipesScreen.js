import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

const Tab = createMaterialTopTabNavigator();

export default function MyRecipesScreen({ navigation }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Retrieves the list of recipes created user
  const fetchMyRecipes = async () => {
    try {
      if (!refreshing) setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_URL}/my-recipes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecipes(response.data);
    } catch (error) {
      console.log("API Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  //Reload recipes when the screen comes
  useFocusEffect(
    useCallback(() => {
      fetchMyRecipes();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyRecipes();
  };

  // deletion of a recipe
  const handleDelete = (recipeId) => {
    Alert.alert(
      "Delete Recipe",
      "Are you sure you want to delete this recipe? This action is irreversible.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`${API_URL}/api/recipes/${recipeId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              // Listeyi güncelle (Silineni arayüzden kaldır)
              setRecipes(prev => prev.filter(item => item.id !== recipeId));
              Alert.alert("Successful", "The recipe has been deleted.");
            } catch (error) {
              console.error(error);
              Alert.alert("Error", error.response?.data?.error || "Deletion failed.");
            }
          }
        }
      ]
    );
  };

  // Ensures the image URL is valid and properly formatted
  const getSafeImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/\\/g, '/');
    if (!API_URL) return null;
    return encodeURI(`${API_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`);
  };

  // card design
  const renderRecipeCard = ({ item }) => {
    const isRejected = item.status === 'rejected';
    const isApproved = item.status === 'approved';
    const imageUrl = getSafeImageUrl(item.image_url);

    // Determining color and text according to status.
    let statusColor = '#4CAF50'; // Green
    let statusText = 'Approved';
    
    if (item.status === 'pending') {
      statusColor = '#FFC107'; // Yellow
      statusText = 'Waiting';
    } else if (item.status === 'rejected') {
      statusColor = '#FF5252'; // Red
      statusText = 'Rejected';
    }

    return (
      <View style={[styles.recipeCard, isRejected && styles.rejectedBorder]}>
        <TouchableOpacity 
          style={{ flexDirection: 'row', flex: 1 }}
          onPress={() => navigation.navigate('RecipeDetails', { recipe: item })}
          disabled={!isApproved} // Only approved recipes can view details
        >
          {/* Image */}
          {imageUrl ? (
            <Image 
              source={{ uri: item.image_url }} 
              style={styles.recipeImage} 
              resizeMode="cover"
              contentFit="cover"
              transition={500}
              cachePolicy="memory-disk"  
            />
          ) : (
            <View style={[styles.recipeImage, styles.placeholderImage]}>
              <Ionicons name="restaurant" size={30} color="#ccc" />
            </View>
          )}

          {/* Recipe Information */}
          <View style={styles.recipeInfo}>
            <View style={styles.headerRow}>
              <Text style={styles.recipeTitle} numberOfLines={1}>{item.title}</Text>
              {/* Status Badge */}
              <Text style={[styles.statusBadge, { color: statusColor }]}>
                {statusText}
              </Text>
            </View>

            {/* Description */}
            <Text style={styles.categoryText}>{item.description}</Text>

            {/* Time, Calories, Rating */}
            <View style={styles.cardFooter}>
              <View style={styles.metaContainer}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={styles.metaText}>
                    {item.prep_time ? `${item.prep_time} min` : '-'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="flame-outline" size={14} color="#666" />
                  <Text style={styles.metaText}>
                    {item.calories ? `${item.calories} kcal` : '-'}
                  </Text>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={{fontSize: 12, color: '#666', marginLeft: 4, fontWeight:'bold'}}>
                  {parseFloat(item.average_rating).toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Rejection Reason */}
        {isRejected && item.rejection_reason && (
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonTitle}>Reason for Rejection:</Text>
            <Text style={styles.reasonText}>{item.rejection_reason}</Text>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.actionContainer}>
          {/* Edit Button */}
          <TouchableOpacity 
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() => navigation.navigate('AddRecipe', { recipeToEdit: item })}
          >
              <Ionicons name="create-outline" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>

          {/*Delete Button */}
          {!item.is_verified && (
              <TouchableOpacity 
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => handleDelete(item.id)}
              >
              <Ionicons name="trash-outline" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>Delete</Text>
              </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // tabs
  const PublishedTab = () => (
    <View style={styles.tabContainer}>
      <FlatList
        data={recipes.filter(r => r.status === 'approved')}
        keyExtractor={item => item.id.toString()}
        renderItem={renderRecipeCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>There are no published recipes yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
        initialNumToRender={6}
        maxToRenderPerBatch={4}  
        windowSize={5}              
        removeClippedSubviews={true}
      />
    </View>
  );

  const PendingTab = () => (
    <View style={styles.tabContainer}>
      <FlatList
        data={recipes.filter(r => r.status === 'pending' || r.status === 'rejected')}
        keyExtractor={item => item.id.toString()}
        renderItem={renderRecipeCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>There are no pending recipe</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
        initialNumToRender={6}
        maxToRenderPerBatch={4}  
        windowSize={5}              
        removeClippedSubviews={true}
      />
    </View>
  );

  if (loading) return <View style={styles.loadingCenter}><ActivityIndicator size="large" color="#333" /></View>;

  // Calculate Numbers
  const publishedCount = recipes.filter(r => r.status === 'approved').length;
  const pendingCount = recipes.filter(r => r.status === 'pending' || r.status === 'rejected').length;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#333',
        tabBarInactiveTintColor: 'gray',
        tabBarIndicatorStyle: { backgroundColor: '#333' },
        tabBarLabelStyle: { fontWeight: 'bold' },
        tabBarStyle: { backgroundColor: '#fff' }
      }}
    >
      <Tab.Screen 
        name="Approved" 
        component={PublishedTab} 
        options={{ title: `Approved (${publishedCount})` }} 
      />
      <Tab.Screen 
        name="Waiting" 
        component={PendingTab} 
        options={{ title: `Waiting (${pendingCount})` }} 
      />
    </Tab.Navigator>
  );
}


const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabContainer: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  
  
  recipeCard: {
    backgroundColor: 'white',
    borderRadius: 15, 
    padding: 12,
    marginBottom: 15,
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'column', 
  },
  rejectedBorder: {
    borderWidth: 1,
    borderColor: '#9b0606ff',
    backgroundColor: '#fff5f5'
  },

  
  recipeImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },

 
  recipeInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    paddingVertical: 2
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 5,
  },
  statusBadge: {
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 2
  },
  categoryText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    marginBottom: 4
  },

  
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500'
  },

  
  reasonContainer: {
    marginTop: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderRadius: 8,
  },
  reasonTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  reasonText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 2
  },

  
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end', 
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    gap: 10, 
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  editBtn: {
    backgroundColor: '#4CAF50', 
  },
  deleteBtn: {
    backgroundColor: '#F44336', 
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
    fontSize: 15
  },
});