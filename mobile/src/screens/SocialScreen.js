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

// Config dosyanızdan API_URL'i çekebilirsiniz veya buraya yazabilirsiniz.
// import { API_URL } from '../config'; 
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
  toggleFavorite,
  // --- YENİ EKLENEN PROPLAR (Sıralama İçin) ---
  sortBy, setSortBy, showSortOptions, setShowSortOptions 
}) => {
  
  const isFilterActive = searchTerm.length > 0 || selectedCategory !== 'All' || sortBy !== 'random'; // Sort kontrolü eklendi
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
          contentFit="cover" 
          transition={500}   
          cachePolicy="memory-disk" 
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

          {/* Kullanıcı Bilgisi */}
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
                    placeholder="What should we cook today?"
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
                  {mode === 'all' ? 'All' : 'Non-Verified'}
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

          {/* --- YENİ EKLENEN: SIRALAMA ÇUBUĞU (Filter Bar) --- */}
          <View style={styles.filterBar}>
             <Text style={styles.resultText}>
                {selectedCategory === 'All' && searchTerm === '' ? 'Discover' : (selectedCategory === 'All' ? 'Search Results' : selectedCategory)}
             </Text>

             <TouchableOpacity 
               style={styles.sortButton} 
               onPress={() => setShowSortOptions(!showSortOptions)}
             >
               <Ionicons name="filter" size={16} color="#333" />
               <Text style={styles.sortButtonText}>
                 {sortBy === 'random' ? 'Random' : 'Top Rated'}
               </Text>
               <Ionicons name="chevron-down" size={16} color="#666" />
             </TouchableOpacity>
          </View>

          {/* --- YENİ EKLENEN: SIRALAMA SEÇENEKLERİ (Açılır Menü) --- */}
          {showSortOptions && (
            <View style={styles.sortOptionsContainer}>
               <TouchableOpacity 
                  style={[styles.sortOption, sortBy === 'random' && styles.sortOptionActive]}
                  onPress={() => { setSortBy('random'); setShowSortOptions(false); }}
               >
                  <Text style={[styles.sortOptionText, sortBy === 'random' && {color: '#333'}]}>Random Shuffle</Text>
                  {sortBy === 'random' && <Ionicons name="checkmark" size={18} color="#333" />}
               </TouchableOpacity>
               
               <TouchableOpacity 
                  style={[styles.sortOption, sortBy === 'rating' && styles.sortOptionActive]}
                  onPress={() => { setSortBy('rating'); setShowSortOptions(false); }}
               >
                  <Text style={[styles.sortOptionText, sortBy === 'rating' && {color: '#333'}]}>Highest Rated</Text>
                  {sortBy === 'rating' && <Ionicons name="checkmark" size={18} color="#333" />}
               </TouchableOpacity>
            </View>
          )}

      </View>

      {/* --- RAFLAR BÖLÜMÜ --- */}
      {/* Sadece Vitrin Modunda (Her şey varsayılan) Göster */}
      {!isFilterActive && searchTerm === '' && selectedCategory === 'All' && sortBy === 'random' && (
        <View style={styles.shelfContainer}>
            {/* RAF 1: TRENDLER */}
            <View style={styles.sectionHeader}>
                <View style={styles.titleRow}>
                    <Text style={styles.sectionEmoji}>🔥</Text>
                    <Text style={styles.sectionTitle}>Trends of the Week</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => navigation.navigate('RecipeList', { title: '🔥 Trends of the Week', type: 'trends' })}
                >
                    <Text style={styles.seeAll}>All</Text>
                </TouchableOpacity>
            </View>
            <FlatList 
                horizontal
                data={trends}
                renderItem={renderHorizontalCard}
                keyExtractor={item => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 15 }}
                initialNumToRender={6}
                maxToRenderPerBatch={4}
                windowSize={5}
                removeClippedSubviews={true}
            />

            {/* AYIRICI ÇİZGİ */}
            <View style={styles.divider} />

            {/* RAF 2: YENİLER */}
            <View style={styles.sectionHeader}>
                <View style={styles.titleRow}>
                    <Text style={styles.sectionEmoji}>💎</Text>
                    <Text style={styles.sectionTitle}>Most Recent</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => navigation.navigate('RecipeList', { title: '💎 Most Recent', type: 'newest' })}
                >
                    <Text style={styles.seeAll}>All</Text>
                </TouchableOpacity>
            </View>
            <FlatList 
                horizontal
                data={newest}
                renderItem={renderHorizontalCard}
                keyExtractor={item => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 15 }}
                initialNumToRender={6}
                maxToRenderPerBatch={4}
                windowSize={5}
                removeClippedSubviews={true}
            />
        </View>
      )}

      {/* --- GRID BAŞLIĞI --- */}
      <View style={styles.feedTitleContainer}>
         <Text style={styles.feedTitle}>
             {isFilterActive ? '🔍 Results' : '🎲 Our Selections for You'}
         </Text>
         {!isFilterActive && <Text style={styles.feedSubtitle}>An endless world of discovery</Text>}
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // YENİ STATE'LER (Sıralama İçin)
  const [sortBy, setSortBy] = useState('random'); // 'random' | 'rating'
  const [showSortOptions, setShowSortOptions] = useState(false);

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
  
  const [seed, setSeed] = useState(Math.random().toString());

  const categories = [
    'All', 'Breakfast', 'Soup', 'Main Course', 
    'Salad & Appetizer', 'Dessert', 'Bakery', 'Beverage'
  ];

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
      console.error("Favorite error:", error);
    }
  };

  // --- ANA VERİ ÇEKME (REFRESH / FIRST LOAD) ---
  const refreshAllData = async (isSilent = false) => {
    if (!isSilent && !refreshing) setInitialLoading(true);
    setError(false);

    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const newSeed = Math.random().toString(); 
      setSeed(newSeed)

      // SENARYO 1: Vitrin Modu (Search Yok, Kategori All, Sıralama Random)
      if (searchTerm === '' && selectedCategory === 'All' && sortBy === 'random') {
          const [trendsRes, newestRes] = await Promise.all([
            axios.get(`${API_URL}/api/recipes/social/trends`, { headers, params: { limit: 10 } }),
            axios.get(`${API_URL}/api/recipes/social/newest`, { headers, params: { limit: 10 } })
          ]);
          setTrends(trendsRes.data);
          setNewest(newestRes.data);

          // Feed Kısmı (Random)
          const randomRes = await axios.get(`${API_URL}/api/recipes/social/random`, { 
            headers,
            params: { page: 1, limit: 20, seed: seed } 
          });
          setFeed(randomRes.data);
      } 
      else {
          // SENARYO 2: Filtreleme Modu (Search VAR veya Kategori SEÇİLİ veya Sıralama RATING)
          // Artık her türlü filtrelemede /search endpointini kullanıyoruz
          const searchRes = await axios.get(`${API_URL}/api/recipes/social/search`, {
            params: { 
                q: searchTerm, 
                category: selectedCategory, 
                mode: mode,
                sort: sortBy // <-- Sıralama bilgisini gönderiyoruz
            },
            headers
          });
          setFeed(searchRes.data);
      }

      setPage(1);
      setHasMoreData(true);

    } catch (error) {
      console.error(error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  // --- SONSUZ KAYDIRMA FONKSİYONU ---
  const loadMoreFeed = async () => {
    // Sadece "Vitrin Modu"ndaysak (Random) sayfalama yapıyoruz. 
    // Filtreleme sonuçlarında backend sayfalama desteklemiyorsa burayı bu şekilde bırakıyoruz.
    if (isLoadingMore || !hasMoreData || searchTerm.length > 0 || selectedCategory !== 'All' || sortBy !== 'random' || error) return;

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
      console.error("Could not be loaded further:", error);
      setError(true);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // --- EFFECT HOOKS ---
  useFocusEffect(
    useCallback(() => {
      refreshAllData(true);
    }, [searchTerm, selectedCategory, mode, sortBy])
  );

  // Filtreler değişince veriyi yenile
  useEffect(() => {
      refreshAllData(true); 
  }, [searchTerm, selectedCategory, mode, sortBy]); // sortBy eklendi

  const onRefresh = () => {
    setRefreshing(true);
    refreshAllData(true);
  };

  const handleSearchFocus = () => { setMode('all'); };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    if (searchTerm === '') setMode('standard');
    if (cat === 'All') setSearchTerm('');
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

            {/* 2. RATING SATIRI */}
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
        // Sıralama state'lerini prop olarak gönderiyoruz
        sortBy={sortBy}
        setSortBy={setSortBy}
        showSortOptions={showSortOptions}
        setShowSortOptions={setShowSortOptions}
    />
  ), [searchTerm, mode, selectedCategory, trends, newest, feed, sortBy, showSortOptions]); 

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
                  No results found.
              </Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6F61']} tintColor="#FF6F61" />
          }

          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    backgroundColor: '#fff',
    paddingTop: 10,
    paddingBottom: 0, // Alt padding'i sıfırladık çünkü filtre barı en alta geldi
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 15,
    zIndex: 10
  },
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  row: { flexDirection: 'row', alignItems: 'center' },
  topContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15, alignItems: 'center', height: 50 },
  searchBar: { 
    flex: 1, flexDirection: 'row', backgroundColor: '#F0F2F5', 
    paddingHorizontal: 15, borderRadius: 25, alignItems: 'center', 
    height: 46
  },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: '#333', fontWeight: '500' },
  switchContainer: { flexDirection: 'column', alignItems: 'center', marginLeft: 12 },
  switchLabel: { fontSize: 7, fontWeight: '900', color: '#666', marginTop: 2 },
  chipsContainer: { paddingLeft: 15, marginBottom: 10 },
  chip: { 
    paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#F0F2F5', 
    borderRadius: 20, marginRight: 10
  },
  shelfContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 0, 
    marginBottom: 10,
    paddingTop: 10,
    paddingBottom: 5,
    borderTopWidth: 1, borderTopColor: '#eee',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 15, marginVertical: 10 },
  chipActive: { backgroundColor: '#333' },
  chipText: { color: '#666', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, alignItems: 'center', marginBottom: 12, marginTop: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionEmoji: { fontSize: 18, marginRight: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  seeAll: { color: '#FF6F61', fontWeight: '600', fontSize: 13 },
  horizontalCard: { 
    width: 160, marginRight: 15, backgroundColor: '#fff', 
    borderRadius: 16, 
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, 
    marginBottom: 5 
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
  likeBtnHorizontal: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.3)', padding: 6, borderRadius: 20, zIndex: 1 },
  gridCard: { 
    width: (width / 2) - 20, 
    marginBottom: 20, backgroundColor: '#fff', 
    borderRadius: 16, 
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3
  },
  gImage: { width: '100%', height: (width / 2) - 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 }, 
  gInfo: { padding: 12 },
  gTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#222', 
    height: 18, 
    lineHeight: 19 
  },
  gridRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,    
    marginBottom: 6  
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
  likeBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.3)', padding: 7, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.1, elevation: 2 },
  
  // --- YENİ EKLENEN STİLLER (Filtre Barı ve Dropdown) ---
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,     // Çiplerden ayırmak için üst çizgi
    borderTopColor: '#f0f0f0',
  },
  resultText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    marginHorizontal: 6,
  },
  // Dropdown Seçenekleri
  sortOptionsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sortOptionActive: {
    backgroundColor: '#f4f3f3',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#333',
  },
});