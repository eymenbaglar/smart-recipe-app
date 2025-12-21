import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, Image, TouchableOpacity, 
  StyleSheet, Dimensions, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.44;

export default function RecipeListScreen({ route, navigation }) {
  // Parametreleri al (Başlık ve API Endpoint tipi)
  const { title, type } = route.params; 

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      // Gelen 'type' parametresine göre doğru endpoint'e git
      // type: 'trends' veya 'newest'
      const endpoint = `${API_URL}/api/recipes/social/${type}`;
      
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 20}
      });
      setRecipes(res.data);
    } catch (error) {
      console.error("Liste çekme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // Favori işlemini burada da yapmak istersen SocialScreen'deki toggleFavorite mantığını buraya da ekleyebilirsin.
  // Şimdilik sadece görünüm ve detay sayfasına gitme işlemini yapıyoruz.

  const renderGridCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.gridCard}
      onPress={() => navigation.navigate('RecipeDetails', { item })}
    >
      <Image source={{ uri: item.image_url }} style={styles.gImage} />
      
      {/* Basit Kalp Görünümü (Fonksiyonsuz - Sadece Bilgi) */}
      <View style={styles.likeBtn}>
         <Ionicons 
            name={item.is_favorited ? "heart" : "heart-outline"} 
            size={20} 
            color={item.is_favorited ? "#FF0000" : "#fff"} 
         />
      </View>

      <View style={styles.gInfo}>
        <Text style={styles.gTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.row}>
            <Ionicons name="person-circle-outline" size={14} color="#666" />
            <Text style={styles.gUser} numberOfLines={1}>{item.username}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header (Geri Butonu ve Başlık) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6F61" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGridCard}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 15 }}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>Tarif bulunamadı.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: 40 }, // StatusBar payı
  header: { 
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 15,
    borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 5
  },
  backBtn: { padding: 5, marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  
  // Grid Kart Stilleri (SocialScreen ile aynı)
  gridCard: { width: CARD_WIDTH, marginBottom: 15, backgroundColor: '#fff', borderRadius: 12, elevation: 2, overflow: 'hidden' },
  gImage: { width: '100%', height: CARD_WIDTH }, 
  gInfo: { padding: 10 },
  gTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5, height: 40 }, 
  row: { flexDirection: 'row', alignItems: 'center' },
  gUser: { fontSize: 11, color: '#888', marginLeft: 4 },
  likeBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.3)', padding: 6, borderRadius: 20 }
});