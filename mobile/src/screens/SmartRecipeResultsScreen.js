import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, Modal, TouchableWithoutFeedback, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function SmartRecipeResultsScreen({ navigation, route }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  // varsayılan sort : eşleşme
  const [sortBy, setSortBy] = useState('match'); 

  useEffect(() => {
    fetchSmartRecipes();
  }, []);

  const fetchSmartRecipes = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const type = route.params?.type || 'stock';
      const selectedIds = route.params?.selectedIds || [];

      let response;

      if (type === 'manual') {
        // manuel recipe önerisi
        response = await axios.post(
          `${API_URL}/api/recipes/match-manual`, 
          { selectedIds: selectedIds },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // MyStocktan recipe önerisi
        response = await axios.get(
          `${API_URL}/api/recipes/match`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setRecipes(response.data);
    } catch (error) {
      console.error("Recipe loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  //sıralama mantığı
  const sortedRecipes = useMemo(() => {
    let sorted = [...recipes];

    switch (sortBy) {
      case 'rating_high':
        sorted.sort((a, b) => parseFloat(b.average_rating || 0) - parseFloat(a.average_rating || 0));
        break;
      case 'rating_low':
        sorted.sort((a, b) => parseFloat(a.average_rating || 0) - parseFloat(b.average_rating || 0));
        break;
      case 'calories_low': 
        sorted.sort((a, b) => a.calories - b.calories);
        break;
      case 'calories_high': 
        sorted.sort((a, b) => b.calories - a.calories);
        break;
      case 'time_short': 
        sorted.sort((a, b) => a.prep_time - b.prep_time);
        break;
      case 'time_long': 
        sorted.sort((a, b) => b.prep_time - a.prep_time);
        break;
      default: 
        sorted.sort((a, b) => b.match_percentage - a.match_percentage);
        break;
    }
    return sorted;
  }, [recipes, sortBy]);

  const renderRecipeItem = ({ item }) => {
    const missingList = item.missing_ingredients || [];
    const displayMissing = missingList.slice(0, 2);
    const remainingCount = missingList.length - 2;

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('RecipeDetails', { recipe: item })}
      >
        <View style={{flexDirection: 'row'}}>
          <Image source={{ uri: item.image_url }} style={styles.cardImage} />

          <View style={styles.cardContent}>
            
            <View style={styles.rowBetween}>
              <Text style={styles.recipeTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={[
                styles.matchBadge, 
                { color: item.match_percentage >= 80 ? '#4CAF50' : '#FF9800' }
              ]}>
                %{item.match_percentage} match
              </Text>
            </View>

            <View style={styles.missingContainer}>
              {missingList.length === 0 ? (
                <Text style={{color: '#4CAF50', fontSize: 12}}>All ingredients available! 🎉</Text>
              ) : (
                <>
                  <Text style={styles.missingTitle}>Missing:</Text>
                  {displayMissing.map((ing, idx) => (
                    <Text key={idx} style={styles.missingText}>• {ing.name}</Text>
                  ))}
                  {remainingCount > 0 && (
                    <Text style={styles.moreText}>+ {remainingCount} more...</Text>
                  )}
                </>
              )}
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.metaContainer}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={styles.metaText}>{item.prep_time}m</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="flame-outline" size={14} color="#666" />
                  <Text style={styles.metaText}>{item.calories} kcal</Text>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={{fontSize: 12, color: '#666', marginLeft: 4, fontWeight:'bold'}}>
                  {parseFloat(item.average_rating).toFixed(1)}
                  </Text>
                </View>
              </View>
              
              
              <View style={styles.detailButton}>
                <Text style={styles.detailButtonText}>Details</Text>
                <Ionicons name="chevron-forward" size={14} color="#000" />
              </View>
            </View>

          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Recommended for You</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.sortButton}>
          <Ionicons name="swap-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedRecipes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRecipeItem}
        contentContainerStyle={{paddingBottom: 20}}
        ListEmptyComponent={<Text style={styles.emptyText}>No matching recipes found based on your stock.</Text>}
      />

      {/* modal matching */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Ranking Criterion</Text>
              
              <ScrollView>
                {/* eşleşme oranı */}
                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={() => { setSortBy('match'); setModalVisible(false); }}
                >
                  <Ionicons name={sortBy === 'match' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Matching Percantage (Highest)</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/*ratinge göre */}
                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={() => { setSortBy('rating_high'); setModalVisible(false); }}
                >
                  <Ionicons name={sortBy === 'rating_high' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Highest Rating</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={() => { setSortBy('rating_low'); setModalVisible(false); }}
                >
                  <Ionicons name={sortBy === 'rating_low' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Lowest Rating</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* kalori (Azdan Çoğa) */}
                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={() => { setSortBy('calories_low'); setModalVisible(false); }}
                >
                  <Ionicons name={sortBy === 'calories_low' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Calories (Low to High)</Text>
                </TouchableOpacity>

                {/* kalori (Çoktan Aza) */}
                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={() => { setSortBy('calories_high'); setModalVisible(false); }}
                >
                  <Ionicons name={sortBy === 'calories_high' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Calories (High to Low)</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* süre (Kısadan Uzuna) */}
                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={() => { setSortBy('time_short'); setModalVisible(false); }}
                >
                  <Ionicons name={sortBy === 'time_short' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Time (Shortest to Longest)</Text>
                </TouchableOpacity>

                {/* süre (Uzundan Kısaya) */}
                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={() => { setSortBy('time_long'); setModalVisible(false); }}
                >
                  <Ionicons name={sortBy === 'time_long' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Time (Longest to Shortest)</Text>
                </TouchableOpacity>
              </ScrollView>

            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  header: { fontSize: 24, fontWeight: 'bold' },
  sortButton: { padding: 5 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: { width: 100, height: '100%' },
  cardContent: { flex: 1, padding: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  recipeTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 10 },
  matchBadge: { fontWeight: 'bold', fontSize: 14 },
  missingContainer: { marginBottom: 10 },
  missingTitle: { fontSize: 12, color: '#FF6B6B', fontWeight: 'bold' },
  missingText: { fontSize: 12, color: '#666' },
  moreText: { fontSize: 11, color: '#999', fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  metaContainer: { flexDirection: 'row', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#666' },
  detailButton: { 
    flexDirection: 'row', alignItems: 'center', 
    borderWidth: 1, borderColor: '#000', borderRadius: 5, 
    paddingHorizontal: 8, paddingVertical: 4 
  },
  detailButtonText: { fontSize: 12, fontWeight: 'bold', marginRight: 2 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50 },

  // modal stil
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    maxHeight: '60%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 5
  }
});