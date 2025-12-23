import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, Text, TextInput, FlatList, TouchableOpacity, 
  StyleSheet, Dimensions, ActivityIndicator, ScrollView, RefreshControl, 
  Switch 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.44;

// ==================================================
// 1. PARÇA: HEADER BİLEŞENİ (Sabit Kısım)
// ==================================================
const SocialHeader = ({ 
  searchTerm, setSearchTerm, handleSearchFocus, 
  mode, setMode, 
  categories, selectedCategory, handleCategorySelect, 
  trends, newest, 
  navigation,
  toggleFavorite 
}) => {
  
  const isFilterActive = searchTerm.length > 0 || selectedCategory !== 'Tümü';
  const showChips = searchTerm.length === 0;

const renderHorizontalCard = ({ item }) => {
    const authorName = item.username || 'Admin'; 

    return (
      <TouchableOpacity 
        style={styles.horizontalCard}
        onPress={() => navigation.navigate('RecipeDetails', { item })}
        activeOpacity={0.9}
      >
        <Image 
          source={{ uri: item.image_url }} 
          style={styles.hImage} 
          contentFit="cover" // resizeMode yerine contentFit
          transition={500}   // 500ms yumuşak geçiş (fade-in) efekti
          cachePolicy="memory-disk" // Hem RAM hem Disk önbelleği kullan
        />
        
        {/* Rating */}
        <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#FFD700" /> 
            <Text style={styles.ratingText}>
                {item.raw_rating ? Number(item.raw_rating).toFixed(1) : item.average_rating}
            </Text>
        </View>
  
        {/* Favori */}
        <TouchableOpacity 
          style={styles.likeBtnHorizontal} 
          onPress={() => toggleFavorite(item)}
        >
           <Ionicons 
              name={item.is_favorited ? "heart" : "heart-outline"} 
              size={18} 
              color={item.is_favorited ? "#FF453A" : "#fff"} 
           />
        </TouchableOpacity>
  
        <View style={styles.hInfo}>
          {/* --- BAŞLIK VE TİK YAN YANA --- */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.hTitle, { marginBottom: 0, flex: 1 }]} numberOfLines={1}>
                  {item.title}
              </Text>
              {item.is_verified && (
                  <Ionicons name="checkmark-circle" size={14} color="#2196F3" style={{ marginLeft: 4 }} />
              )}
          </View>

          {/* Kullanıcı Bilgisi (Buradan tiki kaldırdık) */}
          <View style={styles.row}>
              <Image 
                  source={{ uri: 'https://ui-avatars.com/api/?name=' + authorName + '&background=random' }} 
                  style={styles.avatarSmall} 
                  contentFit="cover"
                  transition={0}
              />
              <Text style={styles.hUser}>@{authorName}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  return (
    <View style={{ marginBottom: 10 }}>
      {/* --- ÜST KISIM (BEYAZ BLOK) --- */}
      <View style={styles.headerBlock}>
          <View style={styles.topContainer}>
            {/* ARAMA BARI */}
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput 
                    placeholder="Bugün ne pişirelim?"
                    placeholderTextColor="#999"
                    style={styles.input}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    onFocus={handleSearchFocus}
                    autoCapitalize="none"
                />
                {searchTerm.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchTerm('')}>
                        <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>
            
            {/* SWITCH */}
            {isFilterActive && (
              <View style={styles.switchContainer}>
                <Switch
                  trackColor={{ false: "#E0E0E0", true: "#FF6F61" }}
                  thumbColor={"#fff"}
                  ios_backgroundColor="#E0E0E0"
                  onValueChange={(val) => setMode(val ? 'all' : 'standard')}
                  value={mode === 'all'}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
                <Text style={styles.switchLabel}>
                  {mode === 'all' ? 'Tümü' : 'Std'}
                </Text>
              </View>
            )}
          </View>

          {/* KATEGORİLER (Chips) */}
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
      </View>

      {/* --- RAFLAR BÖLÜMÜ (AYRI BİR BLOK) --- */}
      {!isFilterActive && (
        <View style={styles.shelfContainer}>
            {/* RAF 1: TRENDLER */}
            <View style={styles.sectionHeader}>
                <View style={styles.titleRow}>
                    <Text style={styles.sectionEmoji}>🔥</Text>
                    <Text style={styles.sectionTitle}>Haftanın Trendleri</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => navigation.navigate('RecipeList', { title: '🔥 Haftanın Trendleri', type: 'trends' })}
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
                contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 15 }}
                initialNumToRender={6}      // İlk açılışta sadece 6 kart render et (Hızlanır)
                maxToRenderPerBatch={4}     // Kaydırdıkça dörder dörder yükle
                windowSize={5}              // Ekranın sadece 5 katı kadar alanı hafızada tut
                removeClippedSubviews={true}
            />

            {/* AYIRICI ÇİZGİ */}
            <View style={styles.divider} />

            {/* RAF 2: YENİLER */}
            <View style={styles.sectionHeader}>
                <View style={styles.titleRow}>
                    <Text style={styles.sectionEmoji}>💎</Text>
                    <Text style={styles.sectionTitle}>Son Eklenenler</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => navigation.navigate('RecipeList', { title: '💎 Son Eklenenler', type: 'newest' })}
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
                contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 15 }}
                initialNumToRender={6}      // İlk açılışta sadece 6 kart render et (Hızlanır)
                maxToRenderPerBatch={4}     // Kaydırdıkça dörder dörder yükle
                windowSize={5}              // Ekranın sadece 5 katı kadar alanı hafızada tut
                removeClippedSubviews={true}
            />
        </View>
      )}

      {/* --- GRID BAŞLIĞI --- */}
      <View style={styles.feedTitleContainer}>
         <Text style={styles.feedTitle}>
             {isFilterActive ? '🔍 Arama Sonuçları' : '🎲 Sizin İçin Seçtiklerimiz'}
         </Text>
         {!isFilterActive && <Text style={styles.feedSubtitle}>Sonsuz keşif dünyası</Text>}
      </View>
    </View>
  );
};


// ==================================================
// 2. PARÇA: ANA EKRAN (SocialScreen)
// ==================================================
export default function SocialScreen() {
  const navigation = useNavigation();
  
  // --- STATE TANIMLARI ---
  const [mode, setMode] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  
  // Veri State'leri
  const [trends, setTrends] = useState([]);
  const [newest, setNewest] = useState([]);
  const [feed, setFeed] = useState([]);
  
  // Yükleme State'leri
  const [initialLoading, setInitialLoading] = useState(true); 
  const [refreshing, setRefreshing] = useState(false);
  
  // --- SONSUZ KAYDIRMA (PAGINATION) ---
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  
  // SEED: Oturum boyunca sabit kalacak rastgele sayı
  // Bu sayede sayfa 2'ye geçince liste yeniden karışmaz.
  const [seed] = useState(Math.random().toString()); 

  const categories = ['Tümü', 'Kahvaltılık', 'Akşam Yemeği', 'Tatlı', 'Vegan', 'Pratik', 'Hamur İşi'];

  // --- FAVORİ İŞLEMİ ---
  const toggleFavorite = async (recipe) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_URL}/api/favorites/toggle`, 
        { recipeId: recipe.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updateList = (list) => list.map(item => 
        item.id === recipe.id ? { ...item, is_favorited: !item.is_favorited } : item
      );

      setFeed(current => updateList(current));
      setTrends(current => updateList(current));
      setNewest(current => updateList(current));

    } catch (error) {
      console.error("Favori hatası:", error);
    }
  };

  // --- ANA VERİ ÇEKME (REFRESH / FIRST LOAD) ---
  const refreshAllData = async (isSilent = false) => {
    if (!isSilent && !refreshing) setInitialLoading(true);
    setError(false);

    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Trendler ve Yeni Eklenenler (Sadece Search Boşsa)
      if (searchTerm === '' && selectedCategory === 'Tümü') {
          const [trendsRes, newestRes] = await Promise.all([
            axios.get(`${API_URL}/api/recipes/social/trends`, { headers, params: { limit: 10 } }),
            axios.get(`${API_URL}/api/recipes/social/newest`, { headers, params: { limit: 10 } })
          ]);
          setTrends(trendsRes.data);
          setNewest(newestRes.data);
      }

      // 2. Feed Kısmı (Sayfa 1)
      setPage(1);
      setHasMoreData(true);

      if (searchTerm.length > 0 || selectedCategory !== 'Tümü') {
         // Arama Modu
         const searchRes = await axios.get(`${API_URL}/api/recipes/social/search`, {
            params: { q: searchTerm, category: selectedCategory, mode: mode },
            headers
         });
         setFeed(searchRes.data);
      } else {
         // Random Feed (Sayfa 1) - seed parametresini kullanıyoruz
         const randomRes = await axios.get(`${API_URL}/api/recipes/social/random`, { 
            headers,
            params: { page: 1, limit: 20, seed: seed } 
         });
         setFeed(randomRes.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  // --- SONSUZ KAYDIRMA FONKSİYONU ---
  const loadMoreFeed = async () => {
    // EĞER HATA VARSA (error) ÇALIŞMA (Döngüyü Engeller)
    if (isLoadingMore || !hasMoreData || searchTerm.length > 0 || selectedCategory !== 'Tümü' || error) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/recipes/social/random`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: nextPage, limit: 20, seed: seed }
      });

      if (res.data.length === 0) {
        setHasMoreData(false);
      } else {
        setFeed(prevFeed => {
          const existingIds = new Set(prevFeed.map(item => item.id));
          const uniqueNewItems = res.data.filter(item => !existingIds.has(item.id));
          return [...prevFeed, ...uniqueNewItems];
        });
        setPage(nextPage);
      }
    } catch (error) {
      console.error("Daha fazla yüklenemedi:", error);
      setError(true); // <--- YENİ: Hata olduğunu sisteme bildir (Freni Çek)
    } finally {
      setIsLoadingMore(false);
    }
  };

  // --- EFFECT HOOKS ---
  useFocusEffect(
    useCallback(() => {
      if (searchTerm === '') {
          refreshAllData(false); 
      }
    }, [])
  );

  useEffect(() => {
      refreshAllData(true); // Search/Filter değişirse sessiz yenile
  }, [searchTerm, selectedCategory, mode]);

  const onRefresh = () => {
    setRefreshing(true);
    refreshAllData(true);
  };

  const handleSearchFocus = () => { setMode('all'); };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    if (searchTerm === '') setMode('standard');
    if (cat === 'Tümü') setSearchTerm('');
  };

  // Grid Kart Render
  const renderGridCard = ({ item }) => {
      const authorName = item.username || 'Admin';

      return (
        <TouchableOpacity 
          style={styles.gridCard}
          onPress={() => navigation.navigate('RecipeDetails', { item })}
        >
          <Image 
            source={{ uri: item.image_url }} 
            style={styles.gImage} 
            contentFit="cover"
            transition={500}
            cachePolicy="memory-disk"
          />
                  
          <TouchableOpacity 
            style={styles.likeBtn} 
            onPress={() => toggleFavorite(item)}
          >
            <Ionicons 
                name={item.is_favorited ? "heart" : "heart-outline"} 
                size={20} 
                color={item.is_favorited ? "#FF453A" : "#fff"} 
            />
          </TouchableOpacity>
    
          <View style={styles.gInfo}>
            {/* 1. BAŞLIK VE TİK */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Text style={[styles.gTitle, { marginBottom: 0, flex: 1 }]} numberOfLines={2}>
                    {item.title}
                </Text>
                {item.is_verified && (
                    <Ionicons name="checkmark-circle" size={14} color="#2196F3" style={{ marginLeft: 4, marginTop: 2 }} />
                )}
            </View>

            {/* 2. YENİ EKLENEN: RATING SATIRI (Başlık ve İsim Arası) */}
            <View style={styles.gridRatingRow}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.gridRatingText}>
                  {item.average_rating ? Number(item.average_rating).toFixed(1) : '0.0'}
              </Text>
              <Text style={styles.gridRatingCount}></Text> 
            </View>

            {/* 3. KULLANICI İSMİ */}
            <View style={styles.row}>
                <Ionicons name="person-circle-outline" size={14} color="#999" />
                <Text style={styles.gUser} numberOfLines={1}>{authorName}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    };

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
  ), [searchTerm, mode, selectedCategory, trends, newest, feed]); 

  return (
    <View style={styles.container}>
      {initialLoading ? (
        <ActivityIndicator size="large" color="#FF6F61" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item, index) => item.id.toString() + index}
          renderItem={renderGridCard}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 15 }}
          
          ListHeaderComponent={headerComponent}
          
          // --- PAGINATION PROPS ---
          onEndReached={loadMoreFeed}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator size="small" color="#FF6F61" style={{ marginVertical: 20 }} />
            ) : null
          }

          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
              <Text style={{textAlign:'center', marginTop: 20, color:'#999'}}>
                  Sonuç bulunamadı.
              </Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6F61']} tintColor="#FF6F61" />
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

// STYLES (Değişmedi ama eksik kalmasın diye ekliyorum)
const styles = StyleSheet.create({
  headerBlock: {
    backgroundColor: '#fff',
    paddingTop: 10,
    paddingBottom: 5,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 15, // Alttaki raflarla mesafe
    zIndex: 10
  },
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  row: { flexDirection: 'row', alignItems: 'center' },
  topContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15, alignItems: 'center', height: 50 },
  searchBar: { 
    flex: 1, flexDirection: 'row', backgroundColor: '#F0F2F5', // Hafif gri input zemini
    paddingHorizontal: 15, borderRadius: 25, alignItems: 'center', // Daha yuvarlak (Pill shape)
    height: 46
  },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: '#333', fontWeight: '500' },
  switchContainer: { flexDirection: 'column', alignItems: 'center', marginLeft: 12 },
  switchLabel: { fontSize: 9, fontWeight: '700', color: '#666', marginTop: 2 },
  chipsContainer: { paddingLeft: 15, marginBottom: 10 },
  chip: { 
    paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#F0F2F5', 
    borderRadius: 20, marginRight: 10
  },
  shelfContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 0, // Tam genişlik
    marginBottom: 10,
    paddingTop: 10,
    paddingBottom: 5,
    // Alt ve üst çizgilerle ayrıştır
    borderTopWidth: 1, borderTopColor: '#eee',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 15, marginVertical: 10 },
  chipActive: { backgroundColor: '#333' }, // Canlı mercan rengi
  chipText: { color: '#666', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, alignItems: 'center', marginBottom: 12, marginTop: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionEmoji: { fontSize: 18, marginRight: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  seeAll: { color: '#FF6F61', fontWeight: '600', fontSize: 13 },
  horizontalCard: { 
    width: 160, marginRight: 15, backgroundColor: '#fff', 
    borderRadius: 16, // Daha yuvarlak köşeler
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, // Soft Shadow
    marginBottom: 5 // Gölge kesilmesin diye
  },
  hImage: { width: '100%', height: 110, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  hInfo: { padding: 10 },
  hTitle: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 6 },
  hUser: { fontSize: 11, color: '#666', fontWeight: '500' },
  avatarSmall: { width: 16, height: 16, borderRadius: 8, marginRight: 4, backgroundColor:'#eee' },
  feedTitleContainer: { paddingHorizontal: 15, marginTop: 10, marginBottom: 15 },
  feedTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  feedSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  ratingBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.9)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8, zIndex: 1 },
  ratingText: { color: '#333', fontSize: 10, marginLeft: 3, fontWeight: '800' },
  likeBtnHorizontal: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 6, borderRadius: 20, zIndex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  gridCard: { 
    width: (width / 2) - 20, // Hesaplamalı genişlik
    marginBottom: 20, backgroundColor: '#fff', 
    borderRadius: 16, 
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3
  },
  gImage: { width: '100%', height: (width / 2) - 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 }, // Kare
  gInfo: { padding: 12 },
  gTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#222', 
    height: 18, 
    lineHeight: 19 
    // marginBottom sildik çünkü altına rating geldi
  },
  gridRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,    // Başlıktan uzaklık
    marginBottom: 6  // Kullanıcı isminden uzaklık
  },
  gridRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginLeft: 4
  },
  gridRatingCount: {
    fontSize: 10,
    color: '#999',
    marginLeft: 2
  },
  gUser: { fontSize: 11, color: '#888', marginLeft: 4 },
  likeBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.95)', padding: 7, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.1, elevation: 2 }
});