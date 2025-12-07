import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

// Modal
import RateRecipeModal from '../components/RateRecipeModal';

export default function MyReviewsScreen({ navigation }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State'leri
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [initialReviewData, setInitialReviewData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchMyReviews();
    }, [])
  );


  const handleViewRecipe = async (recipeId) => {
    try {
      // Kullanıcıya hissettirmeden yükleme efekti verebiliriz ama
      // işlem çok hızlı olacağı için direkt axios çağırıyoruz.
      const token = await AsyncStorage.getItem('token');
      
      // 1. Tarifin tam detayını çek
      const response = await axios.get(`${API_URL}/api/recipes/details/${recipeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const fullRecipeData = response.data;

      // 2. Detay sayfasına tüm veriyi göndererek git
      navigation.navigate('RecipeDetails', { recipe: fullRecipeData });

    } catch (error) {
      console.error("Tarif detayı çekilemedi:", error);
      Alert.alert("Error", "Could not load recipe details.");
    }
  };

  const fetchMyReviews = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/user/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Düzenle Butonuna Basınca
  const handleEditPress = (item) => {
    setSelectedRecipeId(item.recipe_id);
    setInitialReviewData({
      rating: item.rating,
      comment: item.comment
    });
    setShowRateModal(true);
  };

  // Modal Submit (Güncelleme İşlemi)
  const handleRateSubmit = async (rating, comment) => {
    try {
      const token = await AsyncStorage.getItem('token');
      // Mevcut "POST /reviews" rotamız zaten "Varsa Güncelle" (Upsert) yapıyor.
      // O yüzden ekstra bir "PUT" rotasına gerek yok.
      await axios.post(`${API_URL}/api/reviews`, 
        { recipeId: selectedRecipeId, rating, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchMyReviews(); // Listeyi yenile
      
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update review");
    }
  };

  const renderItem = ({ item }) => {
    const date = new Date(item.updated_at).toLocaleDateString();

    // Yıldızları render etme yardımcısı
    const renderStars = (r) => {
      const stars = [];
      for (let i = 1; i <= 5; i++) {
        stars.push(
          <Ionicons key={i} name={i <= r ? "star" : "star-outline"} size={14} color="#FFD700" />
        );
      }
      return stars;
    };

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Image source={{ uri: item.image_url }} style={styles.image} />
          <View style={styles.headerInfo}>
            <Text style={styles.recipeTitle} numberOfLines={1}>{item.recipe_title}</Text>
            <View style={styles.starsRow}>
              {renderStars(item.rating)}
              <Text style={styles.ratingText}>{item.rating}/5</Text>
            </View>
            <Text style={styles.dateText}>Last updated: {date}</Text>
          </View>
          
          {/* Düzenle Butonu */}
          <TouchableOpacity style={styles.editButton} onPress={() => handleEditPress(item)}>
            <Ionicons name="create-outline" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.commentContainer}>
           {item.comment ? (
             <Text style={styles.commentText}>"{item.comment}"</Text>
           ) : (
             <Text style={styles.noCommentText}>No written comment.</Text>
           )}
        </View>

        {/* detaya git butonu */}
        <TouchableOpacity 
          style={styles.viewRecipeButton}
          onPress={() => handleViewRecipe(item.recipe_id)} // <-- BURAYI DEĞİŞTİRDİK
        >

           <Text style={styles.viewRecipeText}>View Recipe</Text>
           <Ionicons name="chevron-forward" size={14} color="#666" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>;

  return (
    <View style={styles.container}>
      <FlatList 
        data={reviews}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="chatbox-ellipses-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No reviews yet.</Text>
          </View>
        }
      />

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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  
  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 15, padding: 15,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    borderWidth: 1, borderColor: '#eee'
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  image: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee' },
  headerInfo: { flex: 1, marginLeft: 12 },
  recipeTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  ratingText: { fontSize: 12, fontWeight: 'bold', color: '#666', marginLeft: 5 },
  dateText: { fontSize: 10, color: '#999' },
  editButton: { padding: 5 },
  
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  
  commentContainer: { backgroundColor: '#FAFAFA', padding: 10, borderRadius: 8, marginBottom: 10 },
  commentText: { fontSize: 14, color: '#444', fontStyle: 'italic' },
  noCommentText: { fontSize: 12, color: '#aaa', fontStyle: 'italic' },

  viewRecipeButton: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  viewRecipeText: { fontSize: 12, color: '#666', marginRight: 2 },
  emptyText: { marginTop: 10, color: '#aaa', fontSize: 16 }
});