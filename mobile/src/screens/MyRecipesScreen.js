import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

const Tab = createMaterialTopTabNavigator();

export default function MyRecipesScreen({ navigation }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- VERİ ÇEKME ---
  const fetchMyRecipes = async () => {
    try {
      if (!refreshing) setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_URL}/my-recipes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecipes(response.data);
    } catch (error) {
      console.log("API Hatası:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyRecipes();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyRecipes();
  };

  // --- İŞLEMLER ---
  const handleDelete = (recipeId) => {
    Alert.alert(
      "Tarifi Sil",
      "Bu tarifi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`${API_URL}/api/recipes/${recipeId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              // Listeyi güncelle (Silineni arayüzden kaldır)
              setRecipes(prev => prev.filter(item => item.id !== recipeId));
              Alert.alert("Başarılı", "Tarif silindi.");
            } catch (error) {
              console.error(error);
              Alert.alert("Hata", error.response?.data?.error || "Silme işlemi başarısız.");
            }
          }
        }
      ]
    );
  };

  // --- GÜVENLİ RESİM URL ---
  const getSafeImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/\\/g, '/');
    if (!API_URL) return null;
    return encodeURI(`${API_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`);
  };

  // --- KART TASARIMI (SmartRecipeResultsScreen REFERANS ALINARAK) ---
  const renderRecipeCard = ({ item }) => {
    const isRejected = item.status === 'rejected';
    const isApproved = item.status === 'approved';
    const imageUrl = getSafeImageUrl(item.image_url);

    // Statüye göre renk ve metin belirleme
    let statusColor = '#4CAF50'; // Yeşil (Approved)
    let statusText = 'Yayında';
    
    if (item.status === 'pending') {
      statusColor = '#FFC107'; // Sarı
      statusText = 'İnceleniyor';
    } else if (item.status === 'rejected') {
      statusColor = '#FF5252'; // Kırmızı
      statusText = 'Reddedildi';
    }

    return (
      <View style={[styles.recipeCard, isRejected && styles.rejectedBorder]}>
        <TouchableOpacity 
          style={{ flexDirection: 'row', flex: 1 }}
          onPress={() => navigation.navigate('RecipeDetails', { recipe: item })}
          disabled={!isApproved} // Sadece onaylılar detaya gidebilir
        >
          {/* Sol: Resim */}
          {imageUrl ? (
            <Image 
              source={{ uri: item.image_url }} 
              style={styles.recipeImage} 
              resizeMode="cover"
              contentFit="cover"
              transition={500}
              cachePolicy="memory-disk"  
            />
          ) : (
            <View style={[styles.recipeImage, styles.placeholderImage]}>
              <Ionicons name="restaurant" size={30} color="#ccc" />
            </View>
          )}

          {/* Sağ: Bilgiler */}
          <View style={styles.recipeInfo}>
            <View style={styles.headerRow}>
              <Text style={styles.recipeTitle} numberOfLines={1}>{item.title}</Text>
              {/* Statü Rozeti (Match Badge yerine) */}
              <Text style={[styles.statusBadge, { color: statusColor }]}>
                {statusText}
              </Text>
            </View>

            {/* Açıklama */}
            <Text style={styles.categoryText}>{item.description}</Text>

            {/* Alt Bilgiler: Süre ve Kalori */}
            <View style={styles.cardFooter}>
              <View style={styles.metaContainer}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={styles.metaText}>
                    {item.prep_time ? `${item.prep_time} dk` : '-'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="flame-outline" size={14} color="#666" />
                  <Text style={styles.metaText}>
                    {item.calories ? `${item.calories} kcal` : '-'}
                  </Text>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                                  <Ionicons name="star" size={12} color="#FFD700" />
                                  <Text style={{fontSize: 12, color: '#666', marginLeft: 4, fontWeight:'bold'}}>
                                  {parseFloat(item.average_rating).toFixed(1)}
                                  </Text>
                                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Red Nedeni (Sadece Reddedilenler İçin) */}
        {isRejected && item.rejection_reason && (
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonTitle}>Red Nedeni:</Text>
            <Text style={styles.reasonText}>{item.rejection_reason}</Text>
          </View>
        )}

        {/* Butonlar (Yayında olmayanlar için alt kısma ekledim) */}
        
        <View style={styles.actionContainer}>
  
        {/* Düzenle Butonu (Her zaman görünür) */}
        <TouchableOpacity 
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => navigation.navigate('AddRecipe', { recipeToEdit: item })}
        >
            <Ionicons name="create-outline" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>Düzenle</Text>
        </TouchableOpacity>

        {/* Sil Butonu (Sadece Onaylı Değilse Görünür - is_verified: false) */}
        {!item.is_verified && (
            <TouchableOpacity 
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item.id)}
            >
            <Ionicons name="trash-outline" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>Sil</Text>
            </TouchableOpacity>
        )}

        </View>
      </View>
      
    );
    
  };

  // Sekmeler
  const PublishedTab = () => (
    <View style={styles.tabContainer}>
      <FlatList
        data={recipes.filter(r => r.status === 'approved')}
        keyExtractor={item => item.id.toString()}
        renderItem={renderRecipeCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>Henüz yayınlanmış tarifin yok.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
        initialNumToRender={6}
        maxToRenderPerBatch={4}  
        windowSize={5}              
        removeClippedSubviews={true}
      />
    </View>
  );

  const PendingTab = () => (
    <View style={styles.tabContainer}>
      <FlatList
        data={recipes.filter(r => r.status === 'pending' || r.status === 'rejected')}
        keyExtractor={item => item.id.toString()}
        renderItem={renderRecipeCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>İşlem bekleyen tarifin yok.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
        initialNumToRender={6}
        maxToRenderPerBatch={4}  
        windowSize={5}              
        removeClippedSubviews={true}
      />
    </View>
  );

  if (loading) return <View style={styles.loadingCenter}><ActivityIndicator size="large" color="#333" /></View>;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#333',
        tabBarInactiveTintColor: 'gray',
        tabBarIndicatorStyle: { backgroundColor: '#333' },
        tabBarLabelStyle: { fontWeight: 'bold' },
        tabBarStyle: { backgroundColor: '#fff' }
      }}
    >
      <Tab.Screen name="Yayında" component={PublishedTab} />
      <Tab.Screen name="Bekleyenler" component={PendingTab} />
    </Tab.Navigator>
  );
}

// --- STİLLER (SmartRecipeResultsScreen ile Eşleştirildi) ---
const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabContainer: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 }, // Arka plan rengi gri yapıldı
  
  // Kart Stili (Referans dosyadan uyarlandı)
  recipeCard: {
    backgroundColor: 'white',
    borderRadius: 15, // Yuvarlak köşeler artırıldı
    padding: 12,
    marginBottom: 15,
    elevation: 3, // Android gölge
    shadowColor: '#000', // iOS gölge
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'column', // İçerik + Butonlar alt alta olsun diye column yaptım, üst kısım row
  },
  rejectedBorder: {
    borderWidth: 1,
    borderColor: '#9b0606ff',
    backgroundColor: '#fff5f5'
  },

  // Resim Stili
  recipeImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Sağ Taraf Bilgileri
  recipeInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    paddingVertical: 2
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 5,
  },
  statusBadge: {
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 2
  },
  categoryText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    marginBottom: 4
  },

  // Alt Bilgi (Footer) - Süre ve Kalori
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500'
  },

  // Red Nedeni Alanı
  reasonContainer: {
    marginTop: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderRadius: 8,
  },
  reasonTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  reasonText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 2
  },

  // Butonlar Alanı
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 15
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  actionText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600'
  },

  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
    fontSize: 15
  },

  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Sağ tarafa yasla
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    gap: 10, // Butonlar arası boşluk
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  editBtn: {
    backgroundColor: '#4CAF50', // Yeşil
  },
  deleteBtn: {
    backgroundColor: '#F44336', // Kırmızı
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});