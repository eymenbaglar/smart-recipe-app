import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, ActivityIndicator, TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function MealHistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderHistoryItem = ({ item }) => {
    // Tarihi formatla (Örn: 12 Oct 2023, 14:30)
    const date = new Date(item.cooked_at);
    const dateString = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('RecipeDetails', { recipe: item })} // Tarifi tekrar görmek isterse
      >
        <View style={{flexDirection: 'row'}}>
          {/* Resim */}
          <Image source={{ uri: item.image_url }} style={styles.image} />
          
          {/* İçerik */}
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.dateText}>{dateString} • {timeString}</Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="flame-outline" size={14} color="#FF9800" />
                <Text style={styles.statText}>{item.calories} kcal</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={14} color="#4CAF50" />
                <Text style={styles.statText}>{item.prep_time} min</Text>
              </View>
            </View>
          </View>

          {/* Sağ Ok */}
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.history_id.toString()}
        renderItem={renderHistoryItem}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={60} color="#ddd" />
            <Text style={styles.emptyText}>Henüz bir yemek pişirmedin.</Text>
            <Text style={styles.emptySubText}>Tarif sihirbazını kullanarak ilk yemeğini pişir!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    // Gölge
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  image: { width: 80, height: 80, resizeMode: 'cover' },
  content: { flex: 1, padding: 12, justifyContent: 'center' },
  
  title: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dateText: { fontSize: 12, color: '#666', marginLeft: 5 },
  
  statsContainer: { flexDirection: 'row', gap: 15 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 12, color: '#666', marginLeft: 4, fontWeight: '500' },

  arrowContainer: { paddingRight: 15 },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 20 },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 10, textAlign: 'center', paddingHorizontal: 40 }
});