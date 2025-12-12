import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function RecommendationRow() {
  const navigation = useNavigation();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('random'); // 'random' veya 'algorithm'

  useEffect(() => {
    fetchRecommendations();
  }, []);

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

  if (loading) return <ActivityIndicator size="small" color="#000" style={{margin: 20}} />;
  if (recipes.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {type === 'algorithm' ? "Based on your taste 👨‍🍳" : "Discover New Tastes 🎲"}
        </Text>
        {type === 'algorithm' && (
          <Ionicons name="sparkles" size={16} color="#FFD700" />
        )}
      </View>
      
      <FlatList
        data={recipes}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('RecipeDetails', { recipe: item })}
          >
            <Image source={{ uri: item.image_url }} style={styles.image} />
            <View style={styles.overlay}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardMeta}>{item.calories} kcal • {item.prep_time}m • <Ionicons name="star" size={10} color="#FFD700" />
                <Text style={{fontSize: 10, color: '#fff', marginLeft: 2, fontWeight:'bold'}}>
                {parseFloat(item.average_rating).toFixed(1)}
              </Text></Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10, gap: 5 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  card: {
    width: 160, height: 220, marginRight: 15,
    borderRadius: 15, overflow: 'hidden', backgroundColor: '#f0f0f0'
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 10
  },
  cardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  cardMeta: { color: '#ddd', fontSize: 11 }
});