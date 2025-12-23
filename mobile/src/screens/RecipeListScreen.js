import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, 
  StyleSheet, Dimensions, ActivityIndicator, StatusBar 
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

const { width } = Dimensions.get('window');
// SocialScreen ile aynı matematik: (Ekran Genişliği / 2) - (Kenar Boşlukları)
const CARD_WIDTH = (width / 2) - 20; 

export default function RecipeListScreen({ route, navigation }) {
  const { title, type } = route.params; 

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const endpoint = `${API_URL}/api/recipes/social/${type}`;
      
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 50 } 
      });
      setRecipes(res.data);
    } catch (error) {
      console.error("Liste çekme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderGridCard = ({ item }) => {
    const authorName = item.username || 'Admin';

    return (
      <TouchableOpacity 
        style={styles.gridCard}
        onPress={() => navigation.navigate('RecipeDetails', { item })}
        activeOpacity={0.9}
      >
        <Image source={{ uri: item.image_url }} 
        style={styles.gImage}
        contentFit="cover"
        transition={500}
        cachePolicy="memory-disk" 
        />
        
        {/* Kalp İkonu */}
        <View style={styles.likeBtn}>
           <Ionicons 
              name={item.is_favorited ? "heart" : "heart-outline"} 
              size={20} 
              color={item.is_favorited ? "#FF453A" : "#1A1A1A"} 
           />
        </View>
  
        <View style={styles.gInfo}>
          {/* 1. BAŞLIK VE TİK */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Text style={[styles.gTitle, { flex: 1 }]} numberOfLines={2}>
                  {item.title}
              </Text>
              {item.is_verified && (
                  <Ionicons name="checkmark-circle" size={14} color="#2196F3" style={{ marginLeft: 4, marginTop: 2 }} />
              )}
          </View>

          {/* 2. RATING (ARA SATIR) */}
          <View style={styles.gridRatingRow}>
             <Ionicons name="star" size={12} color="#FFD700" />
             <Text style={styles.gridRatingText}>
                {item.raw_rating 
                    ? Number(item.raw_rating).toFixed(1) 
                    : (item.average_rating ? Number(item.average_rating).toFixed(1) : '0.0')}
             </Text>
             <Text style={styles.gridRatingCount}></Text> 
          </View>

          {/* 3. KULLANICI İSMİ */}
          <View style={styles.row}>
              <Ionicons name="person-circle-outline" size={14} color="#888" />
              <Text style={styles.gUser} numberOfLines={1}>{authorName}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header (SocialScreen HeaderBlock tarzında) */}
      <View style={styles.headerBlock}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
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
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 15 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }}>
                Henüz tarif eklenmemiş.
            </Text>
          }
          initialNumToRender={6}      // İlk açılışta sadece 6 kart render et (Hızlanır)
          maxToRenderPerBatch={4}     // Kaydırdıkça dörder dörder yükle
          windowSize={5}              // Ekranın sadece 5 katı kadar alanı hafızada tut
          removeClippedSubviews={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // SocialScreen ile aynı Arka Plan Rengi
  container: { flex: 1, backgroundColor: '#F5F7FA' },

  // --- HEADER (SocialScreen Tarzı) ---
  headerBlock: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50, // Status Bar payı (SafeAreaView kullanmıyorsak)
    paddingBottom: 15,
    paddingHorizontal: 15,
    // Header Gölgesi
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 10
  },
  backBtn: { padding: 5, marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  
  // --- GRID KART STİLLERİ (SocialScreen Aynısı) ---
  gridCard: { 
    width: CARD_WIDTH, 
    marginBottom: 20, 
    backgroundColor: '#fff', 
    borderRadius: 16, // Daha yuvarlak
    // Soft Shadow
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 4, 
    elevation: 3
  },
  gImage: { width: '100%', height: CARD_WIDTH, borderTopLeftRadius: 16, borderTopRightRadius: 16 }, 
  gInfo: { padding: 12 },
  
  gTitle: { 
    fontSize: 14, fontWeight: '700', color: '#222', 
    marginBottom: 0, 
    height: 18, lineHeight: 19 
  }, 
  
  // Rating Satırı
  gridRatingRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 6, marginBottom: 6 
  },
  gridRatingText: { fontSize: 12, fontWeight: '700', color: '#333', marginLeft: 4 },
  gridRatingCount: { fontSize: 10, color: '#999', marginLeft: 2 },

  row: { flexDirection: 'row', alignItems: 'center' },
  gUser: { fontSize: 11, color: '#888', marginLeft: 4, fontWeight: '500' },
  
  likeBtn: { 
    position: 'absolute', top: 10, right: 10, 
    backgroundColor: 'rgba(255,255,255,0.95)', padding: 7, 
    borderRadius: 20, 
    shadowColor: "#000", shadowOpacity: 0.1, elevation: 2 
  }
});