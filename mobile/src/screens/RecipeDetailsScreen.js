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
  
  // --- YENİ: FAVORİ STATE ---
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    fetchIngredients();
    checkIfFavorite(); // Sayfa açılınca kontrol et
  }, []);

  // --- YENİ: FAVORİ KONTROLÜ ---
  const checkIfFavorite = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      // Basit bir yöntem: Tüm favorileri çekip içinde bu ID var mı diye bakıyoruz
      // (İleride sadece tek bir ID kontrol eden endpoint yazılabilir ama bu da çalışır)
      const response = await axios.get(`${API_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const found = response.data.find(fav => fav.id === recipe.id);
      setIsFavorite(!!found);
    } catch (error) {
      console.log("Favori kontrol hatası", error);
    }
  };

  // --- YENİ: FAVORİ TOGGLE (EKLE/ÇIKAR) ---
  const toggleFavorite = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/favorites/toggle`, 
        { recipeId: recipe.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Backend'den gelen yeni durumu ayarla
      setIsFavorite(response.data.isFavorite);
      
    } catch (error) {
      console.error(error);
      Alert.alert("Hata", "İşlem yapılamadı.");
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

  const renderIngredientItem = (item, index) => {
    const displayQty = parseFloat(item.quantity);
    const displayUnit = item.unit_type === 'qty' ? 'adet' : item.unit_type;
    const missingData = recipe.missing_ingredients?.find((missing) => missing.name === item.name);

    let statusColor = "#4CAF50"; 
    let statusIcon = "checkmark-circle";
    let statusText = "";

    if (missingData) {
      const requiredQty = parseFloat(item.quantity);
      const missingQty = parseFloat(missingData.missing_amount);

      if (missingQty >= requiredQty) {
        statusColor = "#FF3B30"; 
        statusIcon = "close-circle";
        statusText = `(Tamamı eksik)`;
      } else {
        statusColor = "#FF9500"; 
        statusIcon = "alert-circle";
        const displayMissingQty = parseFloat(missingQty.toFixed(2));
        statusText = `(Eksik: ${displayMissingQty} ${displayUnit})`;
      }
    }

    return (
      <View key={index} style={styles.ingredientRow}>
        <Ionicons name={statusIcon} size={22} color={statusColor} />
        <View style={{flex: 1, marginLeft: 10}}>
          <Text style={[styles.ingredientText, { color: '#333' }]}>
            {displayQty} {displayUnit} {item.name}
          </Text>
          {statusText !== "" && (
            <Text style={{ fontSize: 12, color: statusColor, fontWeight: '600', marginTop: 2 }}>{statusText}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{flex: 1, backgroundColor: '#fff'}}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <Image source={{ uri: recipe.image_url }} style={styles.image} />
        
        {/* GERİ BUTONU */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        {/* --- YENİ: FAVORİ BUTONU --- */}
        <TouchableOpacity style={styles.favButton} onPress={toggleFavorite}>
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={28} 
            color={isFavorite ? "#FF3B30" : "white"} 
          />
        </TouchableOpacity>
        {/* --------------------------- */}

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
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={18} color="#666" />
              <Text style={styles.metaText}>{recipe.serving} Kişilik</Text>
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
            {recipe.instructions ? recipe.instructions : "Tarif detayları hazırlanıyor..."}
          </Text>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
  image: { width: '100%', height: 300, resizeMode: 'cover' },
  
  backButton: {
    position: 'absolute', top: 40, left: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center'
  },
  
  // --- FAVORİ BUTONU STİLİ ---
  favButton: {
    position: 'absolute', top: 40, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center'
  },

  content: {
    flex: 1, marginTop: -20, backgroundColor: '#fff',
    borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  metaContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  metaText: { marginLeft: 5, color: '#555', fontWeight: '600', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  ingredientsList: { marginTop: 5 },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  ingredientText: { fontSize: 16, fontWeight: '500', lineHeight: 22 },
  instructionsText: { fontSize: 16, lineHeight: 26, color: '#444' }
});