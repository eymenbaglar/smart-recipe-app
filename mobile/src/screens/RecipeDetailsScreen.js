import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert 
} from 'react-native';
import { Ionicons , MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

//modal
import RateRecipeModal from '../components/RateRecipeModal';

export default function RecipeDetailsScreen({ route, navigation }) {
  const recipe = route.params.item || route.params.recipe;
  
  // state tanımları
  const [fullIngredients, setFullIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Porsiyon State'leri
  const [currentServings, setCurrentServings] = useState(recipe.serving || 1);
  const originalServings = recipe.serving || 1;

  // Puanlama State'leri
  const [ratingStats, setRatingStats] = useState({ avg: 0, count: 0, comments: 0 });
  const [userReview, setUserReview] = useState(null);
  const [showRateModal, setShowRateModal] = useState(false);

  //yorum statei
  const [reviews, setReviews] = useState([]);

  // --- GEÇMİŞE KAYDETME (YENİ EKLENEN KISIM) ---
  useEffect(() => {
    if (recipe) {
      addToHistory(recipe);
    }
  }, [recipe]);

  const addToHistory = async (item) => {
    try {
      // 1. Mevcut geçmişi çek
      const existingHistory = await AsyncStorage.getItem('recipe_history');
      let newHistory = existingHistory ? JSON.parse(existingHistory) : [];

      // 2. Bu tarif daha önce listede varsa onu çıkar (En başa eklemek için)
      newHistory = newHistory.filter(h => h.id !== item.id);

      // 3. Tarifi listenin başına ekle (Sadece gerekli bilgileri alarak)
      newHistory.unshift({
        id: item.id,
        title: item.title,
        image_url: item.image_url,
        prep_time: item.prep_time,
        calories: item.calories
      });

      // 4. Listeyi 10 elemanla sınırla (Hafıza şişmesin)
      if (newHistory.length > 10) {
        newHistory = newHistory.slice(0, 10);
      }

      // 5. Geri kaydet
      await AsyncStorage.setItem('recipe_history', JSON.stringify(newHistory));
    } catch (error) {
      console.log("Geçmişe kaydedilemedi:", error);
    }
  };
  // ---------------------------------------------

  //başlangıç
  useEffect(() => {
    fetchIngredients();
    checkIfFavorite();
    fetchRatingStats();
    fetchReviews();
  }, []);

  //API fonksiyonları
  
  const fetchIngredients = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/recipes/${recipe.id}/ingredients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFullIngredients(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRatingStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/recipes/${recipe.id}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { stats, userReview } = response.data;
      setRatingStats({
        avg: parseFloat(stats.average_rating),
        count: parseInt(stats.total_ratings),
        comments: parseInt(stats.total_comments)
      });
      setUserReview(userReview);
      
    } catch (error) {
      console.log("Stats error", error);
    }
  };

  const fetchReviews = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/recipes/${recipe.id}/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(response.data);
    } catch (error) {
      console.log("Reviews fetch error", error);
    }
  };

  const checkIfFavorite = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const found = response.data.find(fav => fav.id === recipe.id);
      setIsFavorite(!!found);
    } catch (error) {
      console.log("Favorite check error", error);
    }
  };

  //etkileşim fonksiyonları

  const toggleFavorite = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/favorites/toggle`, 
        { recipeId: recipe.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsFavorite(response.data.isFavorite);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not update favorites.");
    }
  };

  const handleRateSubmit = async (rating, comment) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_URL}/api/reviews`, 
        { recipeId: recipe.id, rating, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchRatingStats();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to submit review");
    }
  };

  const updateServings = (direction) => {
    if (direction === 'increase') {
      setCurrentServings(prev => prev + 1);
    } else {
      if (currentServings > 1) {
        setCurrentServings(prev => prev - 1);
      }
    }
  };

  //cooking mantığı

  const handleCookPress = () => {
    Alert.alert(
      "Confirm Cooking",
      "Are you sure you cooked this recipe?\n\nWarning: Ingredients will be deducted from your stock based on the current portion size.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, I Cooked It", onPress: confirmCook }
      ]
    );
  };

  const confirmCook = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const multiplier = currentServings / originalServings;

      await axios.post(`${API_URL}/api/recipes/cook`, 
        { recipeId: recipe.id, multiplier: multiplier },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert(
        "Success", 
        "Bon appétit! Inventory updated.",
        [
          { 
            text: "OK", 
            onPress: () => setShowRateModal(true) 
          }
        ]
      );
      
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update inventory.");
    }
  };

  const handleModalClose = () => {
    setShowRateModal(false);
    navigation.navigate('Main', { screen: 'MyStock' });
  };

  //hesaplama ve render yardımcıları

  const calculateRequiredAmount = (baseQty, unitType) => {
    const multiplier = currentServings / originalServings;
    const rawAmount = baseQty * multiplier;

    if (unitType === 'qty') {
      let rounded = Math.ceil(rawAmount * 2) / 2;
      if (rounded === 0) rounded = 0.5;
      return rounded;
    } else {
      return parseFloat(rawAmount.toFixed(1));
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      let iconName = "star-outline";
      if (rating >= i) {
        iconName = "star";
      } else if (rating >= i - 0.5) {
        iconName = "star-half";
      }
      stars.push(<Ionicons key={i} name={iconName} size={16} color="#FFD700" />);
    }
    return stars;
  };

  const renderIngredientItem = (item, index) => {
    const requiredQty = calculateRequiredAmount(parseFloat(item.quantity), item.unit_type);
    const displayUnit = item.unit_type === 'qty' ? 'adet' : item.unit_type;
    const userStock = parseFloat(item.user_stock_quantity);

    let statusColor = "#4CAF50"; 
    let statusIcon = "checkmark-circle";
    let statusText = "";

    if (item.is_staple) {
      statusColor = "#2196F3"; 
      statusIcon = "home"; 
    } else {
      if (userStock >= requiredQty) {
        statusColor = "#4CAF50"; 
        statusIcon = "checkmark-circle";
      } else if (userStock === 0) {
        statusColor = "#FF3B30"; 
        statusIcon = "close-circle";
        statusText = `(Fully missing)`;
      } else {
        statusColor = "#FF9500"; 
        statusIcon = "alert-circle";
        const missingAmount = parseFloat((requiredQty - userStock).toFixed(1));
        statusText = `(Missing: ${missingAmount} ${displayUnit})`;
      }
    }

    return (
      <View key={index} style={styles.ingredientRow}>
        <Ionicons name={statusIcon} size={22} color={statusColor} />
        <View style={{flex: 1, marginLeft: 10}}>
          <Text style={[styles.ingredientText, { color: '#333' }]}>
            {requiredQty} {displayUnit} {item.name}
          </Text>
          {statusText !== "" && (
            <Text style={{ fontSize: 12, color: statusColor, fontWeight: '600', marginTop: 2 }}>
              {statusText}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderReviewItem = (item, index) => {
    const date = new Date(item.created_at).toLocaleDateString('en-US', { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });

    return (
      <View key={index} style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.userInfo}>
            {/* Profil Resmi Yerine Baş Harf (Sonradan Düzenlenecek) */}
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {item.username ? item.username.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <Text style={styles.usernameText}>{item.username || 'Unknown User'}</Text>
          </View>
          <Text style={styles.reviewDate}>{date}</Text>
        </View>

        {/* Yıldızlar */}
        <View style={styles.reviewStars}>
          {renderStars(item.rating)}
        </View>

        {/* Yorum Metni */}
        {item.comment ? (
          <Text style={styles.reviewComment}>{item.comment}</Text>
        ) : (
          <Text style={{color:'#ccc', fontSize:12, fontStyle:'italic'}}>No comment provided.</Text>
        )}
      </View>
    );
  };

  return (
    <View style={{flex: 1, backgroundColor: '#fff'}}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <Image source={{ uri: recipe.image_url }} 
        style={styles.image}
        contentFit="cover"
        transition={500}
        cachePolicy="memory-disk" />
        
        {/* Üst Butonlar */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.favButton} onPress={toggleFavorite}>
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={28} color={isFavorite ? "#FF3B30" : "white"} />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>{recipe.title}{recipe.is_verified ?  <MaterialIcons name="verified" size={24} color="green" /> : ''}</Text>
          
          {/* Puanlama Satırı */}
          <View style={styles.ratingRow}>
            <View style={styles.starsWrapper}>
              {renderStars(ratingStats.avg)}
            </View>
            <Text style={styles.ratingText}>
              {ratingStats.avg.toFixed(1)} <Text style={styles.ratingCount}>({ratingStats.count})</Text>
            </Text>
            <View style={styles.dot} />
            <Ionicons name="chatbubble-outline" size={14} color="#666" />
            <Text style={styles.commentText}>{ratingStats.comments} comments</Text>
            <View style={styles.dot} />
            <View style={[styles.statItem, {paddingLeft:10,flexDirection: 'row' }]}>
              <Ionicons name="person-circle-outline" size={18} color="#555" />
            < Text style={styles.statText}> {recipe.username || 'Admin'}</Text>
            </View>
          </View>

          {/* Meta Bilgileri ve Porsiyon */}
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={styles.metaText}>{recipe.prep_time} mins</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={18} color="#666" />
              <Text style={styles.metaText}>{recipe.calories} kcal</Text>
            </View>
            
            <View style={[styles.metaItem, { paddingVertical: 4 }]}>
              <TouchableOpacity onPress={() => updateServings('decrease')}>
                <Ionicons name="remove-circle" size={24} color="#4CAF50" />
              </TouchableOpacity>
              
              <View style={{marginHorizontal: 8, alignItems:'center'}}>
                <Text style={{fontWeight:'bold', fontSize:16, color:'#333'}}>{currentServings}</Text>
                <Text style={{fontSize:10, color:'#666'}}>Person</Text>
              </View>

              <TouchableOpacity onPress={() => updateServings('increase')}>
                <Ionicons name="add-circle" size={24} color="#4CAF50" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.metaItem2}>
              <Text style={styles.metaText}>{recipe.category} </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {recipe.description ? recipe.description : 'Bu tarif için henüz bir açıklama girilmemiş.'}
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Ingredients</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <View style={styles.ingredientsList}>
              {fullIngredients.map(renderIngredientItem)}
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.instructionsText}>
            {recipe.instructions ? recipe.instructions : "No instructions available."}
          </Text>

        </View>
        <View style={styles.divider} />

          {/* Yorumlar Bölümü*/}
          <Text marginLeft='25' style={styles.sectionTitle}>Reviews ({ratingStats.count})</Text>
          
          {reviews.length === 0 ? (
            <Text style={{color:'#666', fontStyle:'italic', marginTop:5}}>
              No reviews yet. Be the first to cook and rate this meal!
            </Text>
          ) : (
            <View style={{marginTop: 10}}>
              {reviews.map(renderReviewItem)}
            </View>
          )}

          <View style={{height: 20}} />
      </ScrollView>

      {/* Alt Sabit Buton */}
      <View style={styles.footerButtonContainer}>
        <TouchableOpacity style={styles.cookButton} onPress={handleCookPress}>
          <Text style={styles.cookButtonText}>I Cooked This Meal</Text>
          <Ionicons name="restaurant" size={20} color="white" style={{marginLeft: 10}} />
        </TouchableOpacity>
      </View>

      {/* Puanlama Modalı */}
      <RateRecipeModal 
        visible={showRateModal}
        onClose={handleModalClose}
        onSubmit={handleRateSubmit}
        initialData={userReview}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 100 },
  image: { width: '100%', height: 300, resizeMode: 'cover' },
  
  backButton: {
    position: 'absolute', top: 40, left: 20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
  },
  favButton: {
    position: 'absolute', top: 40, right: 20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
  },

  content: {
    flex: 1, marginTop: -20, backgroundColor: '#fff',
    borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  
  // Rating Styles
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 15 },
  starsWrapper: { flexDirection: 'row', marginRight: 5 },
  ratingText: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  ratingCount: { color: '#888', fontWeight: 'normal' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ccc', marginHorizontal: 8 },
  commentText: { color: '#666', fontSize: 12, marginLeft: 4 },

  metaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems:'center', marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  metaText: { marginLeft: 5, color: '#555', fontWeight: '600', fontSize: 13 },
  metaItem2: {backgroundColor: '#F5F5F5', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 , alignItems:'center',justifyContent:'center'},
  
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  ingredientsList: { marginTop: 5 },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  ingredientText: { fontSize: 16, fontWeight: '500', lineHeight: 22 },
  instructionsText: { fontSize: 16, lineHeight: 26, color: '#444' },

  footerButtonContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', padding: 20, borderTopWidth: 1, borderTopColor: '#eee', elevation: 10
  },
  cookButton: {
    backgroundColor: '#000', height: 50, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center'
  },
  cookButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  reviewCard: {
    backgroundColor: '#FAFAFA',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee'
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 10
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  usernameText: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  reviewDate: { fontSize: 12, color: '#999' },
  reviewStars: { flexDirection: 'row', marginBottom: 8 },
  reviewComment: { color: '#444', fontSize: 14, lineHeight: 20 }
});