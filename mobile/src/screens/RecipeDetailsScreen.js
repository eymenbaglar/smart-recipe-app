import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function RecipeDetailsScreen({ route, navigation }) {
  const { recipe } = route.params;
  
  const [fullIngredients, setFullIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  // Porsiyon State'leri
  const [currentServings, setCurrentServings] = useState(recipe.serving || 1);
  const originalServings = recipe.serving || 1;

  useEffect(() => {
    fetchIngredients();
    checkIfFavorite();
  }, []);

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

  const updateServings = (direction) => {
    if (direction === 'increase') {
      setCurrentServings(prev => prev + 1);
    } else {
      if (currentServings > 1) {
        setCurrentServings(prev => prev - 1);
      }
    }
  };

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

      Alert.alert("Success", "Bon appétit! Inventory updated.");
      navigation.navigate('Main', { screen: 'MyStock' });
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update inventory.");
    }
  };

  // --- HESAPLAMA YARDIMCISI ---
  const calculateRequiredAmount = (baseQty, unitType) => {
    const multiplier = currentServings / originalServings;
    const rawAmount = baseQty * multiplier;

    if (unitType === 'qty') {
      // Adet ise yuvarlama mantığı (0.5 katları)
      let rounded = Math.ceil(rawAmount * 2) / 2;
      if (rounded === 0) rounded = 0.5;
      return rounded;
    } else {
      // Gram ise 1 ondalık basamak
      return parseFloat(rawAmount.toFixed(1));
    }
  };

  // --- YENİ RENDER MANTIĞI (CANLI KIYASLAMA) ---
  const renderIngredientItem = (item, index) => {
    // 1. O anki porsiyona göre ne kadar lazım?
    const requiredQty = calculateRequiredAmount(parseFloat(item.quantity), item.unit_type);
    const displayUnit = item.unit_type === 'qty' ? 'adet' : item.unit_type;
    
    // 2. Kullanıcıda ne kadar var? (Backend'den geliyor)
    const userStock = parseFloat(item.user_stock_quantity);

    let statusColor = "#4CAF50"; 
    let statusIcon = "checkmark-circle";
    let statusText = "";

    // MANTIK:
    if (item.is_staple) {
      // Staple (Tuz/Yağ) her zaman Mavi
      statusColor = "#2196F3"; 
      statusIcon = "home"; 
    } else {
      // Stok Kontrolü
      if (userStock >= requiredQty) {
        // Yeterli
        statusColor = "#4CAF50"; 
        statusIcon = "checkmark-circle";
      } else if (userStock === 0) {
        // Hiç Yok
        statusColor = "#FF3B30"; 
        statusIcon = "close-circle";
        statusText = `(Fully missing)`;
      } else {
        // Eksik Var
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

  return (
    <View style={{flex: 1, backgroundColor: '#fff'}}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <Image source={{ uri: recipe.image_url }} style={styles.image} />
        
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.favButton} onPress={toggleFavorite}>
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={28} color={isFavorite ? "#FF3B30" : "white"} />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>{recipe.title}</Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={styles.metaText}>{recipe.prep_time} mins</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={18} color="#666" />
              <Text style={styles.metaText}>{recipe.calories} kcal</Text>
            </View>
            
            {/* Porsiyon Kontrolü */}
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
      </ScrollView>

      {/* Footer Butonu */}
      <View style={styles.footerButtonContainer}>
        <TouchableOpacity style={styles.cookButton} onPress={handleCookPress}>
          <Text style={styles.cookButtonText}>I Cooked This Meal</Text>
          <Ionicons name="restaurant" size={20} color="white" style={{marginLeft: 10}} />
        </TouchableOpacity>
      </View>

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
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  metaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems:'center', marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  metaText: { marginLeft: 5, color: '#555', fontWeight: '600', fontSize: 13 },
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
  cookButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});