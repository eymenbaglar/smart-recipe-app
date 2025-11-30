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

  // Sıralama State'leri
  const [modalVisible, setModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState('date_new'); // Varsayılan: En Yeni

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

  // --- GELİŞMİŞ SIRALAMA MANTIĞI ---
  const sortedFavorites = useMemo(() => {
    let sorted = [...favorites];

    switch (sortBy) {
      case 'match_high': // Eşleşme: Yüksek -> Düşük
        sorted.sort((a, b) => b.match_percentage - a.match_percentage);
        break;
      case 'match_low': // Eşleşme: Düşük -> Yüksek
        sorted.sort((a, b) => a.match_percentage - b.match_percentage);
        break;
      case 'calories_low': // Kalori: Az -> Çok
        sorted.sort((a, b) => a.calories - b.calories);
        break;
      case 'calories_high': // Kalori: Çok -> Az
        sorted.sort((a, b) => b.calories - a.calories);
        break;
      case 'time_short': // Süre: Kısa -> Uzun
        sorted.sort((a, b) => a.prep_time - b.prep_time);
        break;
      case 'time_long': // Süre: Uzun -> Kısa
        sorted.sort((a, b) => b.prep_time - a.prep_time);
        break;
      case 'date_old': // Tarih: Eski -> Yeni
        sorted.sort((a, b) => new Date(a.added_at) - new Date(b.added_at));
        break;
      case 'date_new': // Tarih: Yeni -> Eski (Varsayılan)
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
                <Text style={{color: '#4CAF50', fontSize: 12}}>Malzemeler Tam! 🎉</Text>
              ) : (
                <>
                  <Text style={styles.missingTitle}>Eksikler:</Text>
                  {displayMissing.map((ing, idx) => (
                    <Text key={idx} style={styles.missingText}>• {ing.name}</Text>
                  ))}
                  {remainingCount > 0 && (
                    <Text style={styles.moreText}>+ {remainingCount} daha...</Text>
                  )}
                </>
              )}
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.metaContainer}>
                <Ionicons name="time-outline" size={14} color="#666" />
                <Text style={styles.metaText}>{item.prep_time} dk</Text>
                <Ionicons name="flame-outline" size={14} color="#666" style={{marginLeft: 5}}/>
                <Text style={styles.metaText}>{item.calories} kcal</Text>
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
      
      {/* HEADER: Başlık ve Sıralama Butonu */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Favorilerim ❤️</Text>
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
            <Text style={styles.emptyText}>Henüz favori tarifin yok.</Text>
          </View>
        }
      />

      {/* --- SIRALAMA MODALI --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sıralama Ölçütü</Text>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                
                {/* 1. TARİH */}
                <Text style={styles.sectionHeader}>Tarih</Text>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('date_new'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'date_new' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>En Yeni Eklenen (Varsayılan)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('date_old'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'date_old' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>En Eski Eklenen</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* 2. EŞLEŞME */}
                <Text style={styles.sectionHeader}>Eşleşme Oranı</Text>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('match_high'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'match_high' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>En Yüksek Eşleşme</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('match_low'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'match_low' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>En Düşük Eşleşme</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* 3. KALORİ */}
                <Text style={styles.sectionHeader}>Kalori</Text>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('calories_low'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'calories_low' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Azdan Çoğa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('calories_high'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'calories_high' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Çoktan Aza</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* 4. SÜRE */}
                <Text style={styles.sectionHeader}>Hazırlama Süresi</Text>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('time_short'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'time_short' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Kısadan Uzuna</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOption} onPress={() => { setSortBy('time_long'); setModalVisible(false); }}>
                  <Ionicons name={sortBy === 'time_long' ? "radio-button-on" : "radio-button-off"} size={20} color="#000" />
                  <Text style={styles.optionText}>Uzundan Kısaya</Text>
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

  // Modal Stilleri
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 5, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#666', marginTop: 10, marginBottom: 5 },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  optionText: { fontSize: 16, marginLeft: 10, color: '#333' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 5 }
});