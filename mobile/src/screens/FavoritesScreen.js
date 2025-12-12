import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, Modal, TouchableWithoutFeedback, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev';

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  //sıralama stateleri
  const [modalVisible, setModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState('date_new'); 
  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  const fetchFavorites = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavorites(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  //sorting part
  const sortedFavorites = useMemo(() => {
    let sorted = [...favorites];

    switch (sortBy) {
      case 'rating_high': 
        sorted.sort((a, b) => parseFloat(b.average_rating || 0) - parseFloat(a.average_rating || 0));
        break;
      case 'rating_low': 
        sorted.sort((a, b) => parseFloat(a.average_rating || 0) - parseFloat(b.average_rating || 0));
        break;
      case 'match_high':
        sorted.sort((a, b) => b.match_percentage - a.match_percentage);
        break;
      case 'match_low':
        sorted.sort((a, b) => a.match_percentage - b.match_percentage);
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
      case 'date_old': 
        sorted.sort((a, b) => new Date(a.added_at) - new Date(b.added_at));
        break;
      case 'date_new': 
      default:
        sorted.sort((a, b) => new Date(b.added_at) - new Date(a.added_at));
        break;
    }
    return sorted;
  }, [favorites, sortBy]);

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
              <View style={[
                styles.badge, 
                { backgroundColor: item.match_percentage >= 80 ? '#E8F5E9' : '#FFF3E0' }
              ]}>
                <Text style={[
                  styles.matchText,
                  { color: item.match_percentage >= 80 ? '#4CAF50' : '#FF9800' }
                ]}>%{item.match_percentage}</Text>
              </View>
            </View>

            <View style={styles.missingContainer}>
              {missingList.length === 0 ? (
                <Text style={{color: '#4CAF50', fontSize: 12}}>All ingredients available! 🎉</Text>
              ) : (
                <>
                  <Text style={styles.missingTitle}>Missing Ingredients:</Text>
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
                <Ionicons name="time-outline" size={14} color="#666" />
                <Text style={styles.metaText}>{item.prep_time} m</Text>
                <Ionicons name="flame-outline" size={14} color="#666" style={{marginLeft: 5}}/>
                <Text style={styles.metaText}>{item.calories} kcal</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2 , marginLeft: 5}}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={{fontSize: 12, color: '#666', marginLeft: 4, fontWeight:'bold'}}>
                  {parseFloat(item.average_rating).toFixed(1)}
                </Text>
                </View>
              </View>
              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
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
      
      {/* header: başlık kısmı ve sıralama butonu */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>My Favorites ❤️</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.sortButton}>
          <Ionicons name="swap-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={sortedFavorites}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRecipeItem}
        contentContainerStyle={{paddingBottom: 20}}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="heart-dislike-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>You don't have a favorite recipe yet.</Text>
          </View>
        }
      />

      {/* sıralama için modal ekran */}
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
              
              <ScrollView showsVerticalScrollIndicator={false}>
                
                {/* 1. TARİH */}
                <Text style={styles.sectionHeader}>Date</Text>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('date_new'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'date_new' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Most Recently Added (Default)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('date_old'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'date_old' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Most Oldest Added</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* rating */}
                <Text style={styles.sectionHeader}>Rating</Text>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('rating_high'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'rating_high' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Highest Rating</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('rating_low'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'rating_low' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Lowest Rating</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* eşleşme */}
                <Text style={styles.sectionHeader}>Matching Percantage</Text>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('match_high'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'match_high' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Highest Match</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('match_low'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'match_low' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Lowest Match</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* 3. KALORİ */}
                <Text style={styles.sectionHeader}>Calories</Text>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('calories_low'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'calories_low' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Low to High</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('calories_high'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'calories_high' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>High to Low</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* süre */}
                <Text style={styles.sectionHeader}>Preperation Time</Text>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('time_short'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'time_short' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Shortest to Longest</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('time_long'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'time_long' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Longest to Shortest</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  header: { fontSize: 24, fontWeight: 'bold' },
  sortButton: { padding: 5 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#eee',
    overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  cardImage: { width: 100, height: '100%' },
  cardContent: { flex: 1, padding: 10 },
  
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  recipeTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 5 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  matchText: { fontWeight: 'bold', fontSize: 12 },

  missingContainer: { marginBottom: 8, minHeight: 35 },
  missingTitle: { fontSize: 11, color: '#FF6B6B', fontWeight: 'bold' },
  missingText: { fontSize: 11, color: '#666' },
  moreText: { fontSize: 10, color: '#999', fontStyle: 'italic' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  metaContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#666' },
  dateText: { fontSize: 10, color: '#aaa' },
  emptyText: { marginTop: 10, color: '#aaa', fontSize: 16 },

  //modal stilleri
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 5, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#666', marginTop: 10, marginBottom: 5 },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  optionText: { fontSize: 16, marginLeft: 10, color: '#333' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 5 }
});