import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator 
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function RecommendedRecipesScreen({ navigation }) {
  //Default constants
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('random');

  useEffect(() => {
    fetchRecommendations();
  }, []);

  //fetch recommended recipes
  const fetchRecommendations = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/recipes/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecipes(response.data.data);
      setType(response.data.type);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('RecipeDetails', { recipe: item })}
    >
      <Image source={{ uri: item.image_url }} 
      style={styles.image}
      contentFit="cover" 
      transition={500}  
      cachePolicy="memory-disk" />
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.metaContainer}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.metaText}>{item.prep_time} min</Text>
          <Ionicons name="flame-outline" size={14} color="#666" style={{marginLeft: 10}} />
          <Text style={styles.metaText}>{item.calories} kcal</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4 , marginLeft: 10}}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={{fontSize: 12, color: '#666', marginLeft: 4, fontWeight:'bold'}}>
          {parseFloat(item.average_rating || 0).toFixed(1)}
          </Text>
        </View>
        </View>
        
        {/* Algoritma çalışırsa puanı göster */}
        {type === 'algorithm' && item.total_score && (
          <View style={styles.scoreContainer}>
             <Text style={styles.scoreText}>Taste Match Score: {item.total_score}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {type === 'algorithm' ? "Curated for You" : "Chef's Selection"}
        </Text>
        <Text style={styles.headerSubtitle}>
          {type === 'algorithm' 
            ? "Based on your recent cooking history." 
            : "Since you're new, here are some popular picks!"}
        </Text>
      </View>

      <FlatList
        data={recipes}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20 }}
        initialNumToRender={6}
        maxToRenderPerBatch={4}  
        windowSize={5}              
        removeClippedSubviews={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: '#f9f9f9', borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 5 },
  
  card: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0', alignItems: 'center' },
  image: { width: 70, height: 70, borderRadius: 10, backgroundColor: '#eee' },
  content: { flex: 1, marginLeft: 15 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  metaContainer: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12, color: '#666', marginLeft: 4 },
  
  scoreContainer: { marginTop: 5, backgroundColor: '#FFF8E1', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  scoreText: { fontSize: 10, color: '#F57F17', fontWeight: 'bold' }
});