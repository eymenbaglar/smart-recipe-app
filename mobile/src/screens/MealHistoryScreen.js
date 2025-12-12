import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, ActivityIndicator, TouchableOpacity, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native'; 


const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

//modal
import RateRecipeModal from '../components/RateRecipeModal';

export default function MealHistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  //modal stateleri
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedRecipeForRate, setSelectedRecipeForRate] = useState(null); 
  const [initialReviewData, setInitialReviewData] = useState(null);

  //sayfaya her gelindiğinde listeyi yeniler
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

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

  //puanlama butonuna basınca
  const handleOpenRateModal = (item) => {
    setSelectedRecipeForRate(item.id);
    
    //eğer önceden puanlandıysa
    if (item.my_rating) {
      setInitialReviewData({
        rating: item.my_rating,
        comment: item.my_comment
      });
    } else {
      setInitialReviewData(null);
    }

    setShowRateModal(true);
  };

  //puan gönderme
  const handleRateSubmit = async (rating, comment) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_URL}/api/reviews`, 
        { recipeId: selectedRecipeForRate, rating, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchHistory();
      
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to submit review");
    }
  };

  const renderHistoryItem = ({ item }) => {
    const date = new Date(item.cooked_at);
    const dateString = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const hasRated = item.my_rating > 0;

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('RecipeDetails', { recipe: item })}
        >
          <View style={{flexDirection: 'row'}}>
            <Image source={{ uri: item.image_url }} style={styles.image} />
            
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
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={{fontSize: 11, color: '#666', marginLeft: 3, fontWeight:'bold'}}>
                  {parseFloat(item.average_rating).toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Rate Butonu*/}
        <View style={styles.actionRow}>
           <TouchableOpacity 
             style={[styles.rateButton, hasRated && styles.editButton]} 
             onPress={() => handleOpenRateModal(item)}
           >
             <Ionicons 
               name={hasRated ? "star" : "star-outline"} 
               size={16} 
               color={hasRated ? "#FFF" : "#555"} 
               style={{marginRight: 6}}
             />
             <Text style={[styles.rateButtonText, hasRated && {color:'#FFF'}]}>
               {hasRated ? `You Rated: ${item.my_rating}/5 (Edit)` : "Rate Recipe"}
             </Text>
           </TouchableOpacity>
        </View>

      </View>
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
            <Text style={styles.emptyText}>No cooking history yet.</Text>
            <Text style={styles.emptySubText}>Use the recipe wizard to cook your first meal!</Text>
          </View>
        }
      />

      {/* Puanlama Modalı */}
      <RateRecipeModal 
        visible={showRateModal}
        onClose={() => setShowRateModal(false)}
        onSubmit={handleRateSubmit}
        initialData={initialReviewData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  cardWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    borderWidth: 1, borderColor: '#eee'
  },

  card: { flexDirection: 'row', alignItems: 'center' },
  image: { width: 90, height: 90, resizeMode: 'cover' },
  content: { flex: 1, padding: 12, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dateText: { fontSize: 12, color: '#666', marginLeft: 5 },
  statsContainer: { flexDirection: 'row', gap: 15 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 12, color: '#666', marginLeft: 4, fontWeight: '500' },
  arrowContainer: { paddingRight: 15 , paddingTop: 10},
  
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 10,
    backgroundColor: '#FAFAFA'
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff'
  },
  editButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  rateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555'
  },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 20 },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 10, textAlign: 'center', paddingHorizontal: 40 }
});