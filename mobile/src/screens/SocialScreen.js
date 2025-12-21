import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, Text, TextInput, FlatList, Image, TouchableOpacity, 
  StyleSheet, Dimensions, ActivityIndicator, ScrollView, RefreshControl, 
  Switch 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.44;


// --- 1. PARÇA: HEADER BİLEŞENİ ---
const SocialHeader = ({ 
  searchTerm, setSearchTerm, handleSearchFocus, 
  mode, setMode, 
  categories, selectedCategory, handleCategorySelect, 
  trends, newest, toggleFavorite,
  navigation 
}) => {
  
  // Filtreleme aktif mi? (Raf gizleme mantığı için)
  const isFilterActive = searchTerm.length > 0 || selectedCategory !== 'Tümü';

  // YENİ: Chips Gözüksün mü? (Sadece arama kutusu BOŞSA gözüksün)
  const showChips = searchTerm.length === 0;

  const renderHorizontalCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.horizontalCard}
      onPress={() => navigation.navigate('RecipeDetails', { item })}
    >
      <Image source={{ uri: item.image_url }} style={styles.hImage} />
      
      {/* 1. RATING ROZETİ (SOL ÜST) */}
      <View style={styles.ratingBadge}>
          <Ionicons name="star" size={10} color="#fff" />
          <Text style={styles.ratingText}>
              {item.raw_rating ? Number(item.raw_rating).toFixed(1) : item.average_rating}
          </Text>
      </View>

      {/* 2. FAVORİ BUTONU (SAĞ ÜST) */}
      <TouchableOpacity 
        style={styles.likeBtnHorizontal} // Yeni stil ismi verdik
        onPress={() => toggleFavorite(item)}
      >
         <Ionicons 
            name={item.is_favorited ? "heart" : "heart-outline"} 
            size={18} 
            color={item.is_favorited ? "#FF0000" : "#fff"} 
         />
      </TouchableOpacity>

      {/* BİLGİ KISMI */}
      <View style={styles.hInfo}>
        <Text style={styles.hTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.row}>
            <Text style={styles.hUser}>@{item.username}</Text>
            {item.is_verified && <Ionicons name="checkmark-circle" size={12} color="#2196F3" />}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View>
      <View style={styles.topContainer}>
        {/* ARAMA BARI */}
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#888" />
            <TextInput 
                placeholder="Ne yemek istersin?"
                style={styles.input}
                value={searchTerm}
                onChangeText={setSearchTerm}
                onFocus={handleSearchFocus}
                autoCapitalize="none"
            />
            {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                    <Ionicons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
            )}
        </View>
        
        {/* SWITCH (Filtre Varsa Gözükür) */}
        {isFilterActive && (
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>
              {mode === 'all' ? 'Tümü' : 'Std'}
            </Text>
            <Switch
              trackColor={{ false: "#767577", true: "#FF6F61" }}
              thumbColor={"#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={(val) => setMode(val ? 'all' : 'standard')}
              value={mode === 'all'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        )}
      </View>

      {/* --- DEĞİŞİKLİK BURADA: CHIPS (KATEGORİLER) --- */}
      {/* Sadece showChips (yani arama boşsa) true ise render et */}
      {showChips && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
          {categories.map((cat, index) => (
              <TouchableOpacity 
                  key={index} 
                  style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                  onPress={() => handleCategorySelect(cat)}
              >
                  <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                      {cat}
                  </Text>
              </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* RAFLAR (Filtre Yoksa Gözükür) */}
      {!isFilterActive && (
        <>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔥 Haftanın Trendleri</Text>
                <TouchableOpacity 
        onPress={() => navigation.navigate('RecipeList', { 
            title: '🔥 Haftanın Trendleri', 
            type: 'trends' // Backend endpointi için anahtar kelime
        })}
    >
        <Text style={styles.seeAll}>Tümü</Text>
    </TouchableOpacity>
            </View>
            <FlatList 
                horizontal
                data={trends}
                renderItem={renderHorizontalCard}
                keyExtractor={item => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 15 }}
            />

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>💎 Son Eklenenler</Text>
    <TouchableOpacity 
        onPress={() => navigation.navigate('RecipeList', { 
            title: '💎 Son Eklenenler', 
            type: 'newest' 
        })}
    >
        <Text style={styles.seeAll}>Tümü</Text>
    </TouchableOpacity>
            </View>
            <FlatList 
                horizontal
                data={newest}
                renderItem={renderHorizontalCard}
                keyExtractor={item => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 15 }}
            />
        </>
      )}

      {/* GRID BAŞLIĞI */}
      <View style={[styles.sectionHeader, { marginTop: 20, marginBottom: 10 }]}>
         <Text style={styles.sectionTitle}>
             {isFilterActive ? '🔍 Arama Sonuçları' : '🎲 Keşfet (Sürpriz)'}
         </Text>
      </View>
    </View>
  );
};


// --- 2. PARÇA: ANA EKRAN ---
export default function SocialScreen() {
  const navigation = useNavigation();
  
  const [mode, setMode] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  
  const [trends, setTrends] = useState([]);
  const [newest, setNewest] = useState([]);
  const [feed, setFeed] = useState([]);
  
  // Loading state'i SADECE ilk açılış için kullanacağız
  const [initialLoading, setInitialLoading] = useState(true); 
  const [refreshing, setRefreshing] = useState(false);

  const categories = ['Tümü', 'Kahvaltılık', 'Akşam Yemeği', 'Tatlı', 'Vegan', 'Pratik', 'Hamur İşi'];

  // --- API FONKSİYONLARI ---
  // isSilent: true ise ekranda loading göstermez (Arama yaparken klavye kapanmasın diye)
  const refreshAllData = async (isSilent = false) => {
    
    // Eğer sessiz mod değilse ve refresh yapılmıyorsa loading göster
    if (!isSilent && !refreshing) setInitialLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Sadece 'Tümü' seçiliyse trendleri güncelle (Search yaparken gereksiz trafik olmasın)
      if (searchTerm === '' && selectedCategory === 'Tümü') {
          const [trendsRes, newestRes] = await Promise.all([
            axios.get(`${API_URL}/api/recipes/social/trends`, { headers,params: { limit: 10 } }),
            axios.get(`${API_URL}/api/recipes/social/newest`, { headers,params: { limit: 10 } })
          ]);
          setTrends(trendsRes.data);
          setNewest(newestRes.data);
      }

      // Feed Kısmını Güncelle
      if (searchTerm.length > 0 || selectedCategory !== 'Tümü') {
         const searchRes = await axios.get(`${API_URL}/api/recipes/social/search`, {
            params: { q: searchTerm, category: selectedCategory, mode: mode },
            headers: { Authorization: `Bearer ${token}` }
         });
         setFeed(searchRes.data);
      } else {
         const randomRes = await axios.get(`${API_URL}/api/recipes/social/random`, { headers });
         setFeed(randomRes.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  // --- USE EFFECTS ---

  // 1. Ekran ilk açıldığında veya Odaklanıldığında çalışır (Initial Load)
  useFocusEffect(
    useCallback(() => {
      // Eğer arama yapıyorsak focus effect verileri ezmesin
      if (searchTerm === '') {
          refreshAllData(false); // Loading göstererek yükle
      }
    }, []) // Dependency array boş, sadece mount/focus anında
  );

  // 2. Arama Terimi, Kategori veya Mod Değişince Çalışır (Search Effect)
  useEffect(() => {
      // BURASI KRİTİK: isSilent = true gönderiyoruz.
      // Böylece loading state değişmiyor, liste unmount olmuyor, klavye kapanmıyor.
      refreshAllData(true); 
  }, [searchTerm, selectedCategory, mode]);

  const onRefresh = () => {
    setRefreshing(true);
    refreshAllData(true); // Pull to refresh zaten kendi loading'ini gösterir
  };

  const handleSearchFocus = () => {
    setMode('all'); 
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    if (searchTerm === '') setMode('standard');
    if (cat === 'Tümü') setSearchTerm('');
  };

  const toggleFavorite = async (recipe) => {
    try {
      // 1. Backend'e istek at
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_URL}/api/favorites/toggle`, 
        { recipeId: recipe.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 2. UI'ı Güncelle (Local State Update)
      // Hangi listedeyse (Feed, Trends, Newest) oradaki 'is_favorited' değerini tersine çevir.
      
      const updateList = (list) => list.map(item => 
        item.id === recipe.id ? { ...item, is_favorited: !item.is_favorited } : item
      );

      setFeed(current => updateList(current));
      setTrends(current => updateList(current));
      setNewest(current => updateList(current));

    } catch (error) {
      console.error("Favori hatası:", error);
      alert("İşlem sırasında bir hata oluştu.");
    }
  };

  const renderGridCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.gridCard}
      onPress={() => navigation.navigate('RecipeDetails', { item })}
    >
      <Image source={{ uri: item.image_url }} style={styles.gImage} />
      <TouchableOpacity 
        style={styles.likeBtn} 
        onPress={() => toggleFavorite(item)} // Fonksiyonu bağladık
      >
         <Ionicons 
            name={item.is_favorited ? "heart" : "heart-outline"} // Dolu veya Boş kalp
            size={20} 
            color={item.is_favorited ? "#FF0000" : "#fff"} // Kırmızı veya Beyaz
         />
      </TouchableOpacity>
      <View style={styles.gInfo}>
        <Text style={styles.gTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.row}>
            <Ionicons name="person-circle-outline" size={14} color="#666" />
            <Text style={styles.gUser} numberOfLines={1}>{item.username}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Header'ı Memoize ediyoruz (Gereksiz render'ı önlemek için ekstra güvenlik)
  const headerComponent = useMemo(() => (
    <SocialHeader 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearchFocus={handleSearchFocus}
        mode={mode}
        setMode={setMode}
        categories={categories}
        selectedCategory={selectedCategory}
        handleCategorySelect={handleCategorySelect}
        trends={trends}
        newest={newest}
        navigation={navigation}
        toggleFavorite={toggleFavorite}
    />
  ), [searchTerm, mode, selectedCategory, trends, newest]);

  return (
    <View style={styles.container}>
      {/* Sadece sayfa ilk açılırken dönen loading, arama yaparken GÖZÜKMEYECEK */}
      {initialLoading ? (
        <ActivityIndicator size="large" color="#FF6F61" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGridCard}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 15 }}
          
          ListHeaderComponent={headerComponent} // Memoize edilmiş header
          
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled" // Klavye dışına basınca kapansın ama butonlara basınca algılasın
          ListEmptyComponent={
              <Text style={{textAlign:'center', marginTop: 20, color:'#999'}}>
                  Sonuç bulunamadı.
              </Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6F61']} tintColor="#FF6F61" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  topContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 10, alignItems: 'center', height: 50 },
  searchBar: { flex: 1, flexDirection: 'row', backgroundColor: '#fff', padding: 10, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, height: '100%' },
  input: { flex: 1, marginLeft: 10, fontSize: 15 },
  switchContainer: { flexDirection: 'column', alignItems: 'center', marginLeft: 10, justifyContent: 'center' },
  switchLabel: { fontSize: 10, fontWeight: 'bold', color: '#555', marginBottom: 2 },
  chipsContainer: { marginBottom: 15, paddingLeft: 15 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  chipActive: { backgroundColor: '#333', borderColor: '#333' },
  chipText: { color: '#555', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, alignItems: 'center', marginBottom: 10, marginTop: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  seeAll: { color: '#FF6F61', fontWeight: '600' },
  horizontalCard: { width: 150, marginRight: 15, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 3 },
  hImage: { width: '100%', height: 100 },
  hInfo: { padding: 8 },
  hTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  hUser: { fontSize: 10, color: '#777', marginRight: 4 },
  ratingBadge: { 
    position: 'absolute', 
    top: 10,      // Resmin tepesinden boşluk
    left: 10,     // Resmin solundan boşluk (SOLA ALDIK)
    backgroundColor: 'rgba(0,0,0,0.6)', 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8,
    zIndex: 1 // Resmin üstünde kalsın
  },
  
  ratingText: { 
    color: '#fff', 
    fontSize: 10, 
    marginLeft: 3, 
    fontWeight: 'bold' 
  },
  gridCard: { width: CARD_WIDTH, marginBottom: 15, backgroundColor: '#fff', borderRadius: 12, elevation: 2, overflow: 'hidden' },
  gImage: { width: '100%', height: CARD_WIDTH }, 
  gInfo: { padding: 10 },
  gTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5, height: 40 }, 
  gUser: { fontSize: 11, color: '#888', marginLeft: 4 },
  likeBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.3)', padding: 6, borderRadius: 20 },
  likeBtnHorizontal: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 6,
    borderRadius: 20,
    zIndex: 1
  },
});