import React, { useState, useCallback, useEffect} from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

// Bileşenler
import RecommendationRow from '../components/RecommendationRow';

export default function HomeScreen({ navigation }) {
  const [recentRecipes, setRecentRecipes] = useState([]);
  const [username, setUsername] = useState('User'); // Varsayılan isim

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          if (user.username) {
            // İsmin baş harfini büyük yapmak için (Opsiyonel estetik)
            const formattedName = user.username.charAt(0).toUpperCase() + user.username.slice(1);
            setUsername(formattedName);
          }
        }
      } catch (error) {
        console.log("User information could not be loaded:", error);
      }
    };
    loadUserInfo();
  }, []);

    // Sayfaya her geri dönüldüğünde geçmişi yeniden yükle
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('recipe_history');
      if (history) {
        setRecentRecipes(JSON.parse(history));
      }
    } catch (error) {
      console.log("Past could not be loaded:", error);
    }
  };

  // Son Görüntülenen Kart Tasarımı
  const renderRecentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.recentCard}
      onPress={() => navigation.navigate('RecipeDetails', { item: item })} // veya { recipe: item }
    >
      <Image source={{ uri: item.image_url }} 
      style={styles.recentImage}
      contentFit="cover" 
      transition={500}   
      cachePolicy="memory-disk"  />
      <View style={styles.recentOverlay}>
        <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* 1. Başlık Mesajı */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>Hello, {username}!</Text>
        <Text style={styles.subtitle}>What are we cooking today?</Text>
      </View>

      {/* 2. Recipe Wizard (Tek Buton) */}
      <TouchableOpacity 
        style={styles.wizardButton}
        // App.js'e göre 'ManualInput' veya 'SmartRecipeResults' wizard başlangıcıdır.
        // Genelde malzeme seçimi (ManualInput) ile başlar.
        onPress={() => navigation.navigate('Wizard')} 
      >
        <View style={styles.wizardContent}>
          <Ionicons name="sparkles" size={24} color="#000" style={{ marginRight: 10 }} />
          <Text style={styles.wizardButtonText}>Recipe Wizard</Text>
        </View>
        <Text style={styles.wizardSubText}>Find recipes with your ingredients</Text>
      </TouchableOpacity>

      {/* 3. Kişisel Öneriler (Mevcut Bileşen) */}
      <View style={styles.sectionContainer}>
        <RecommendationRow />
      </View>

      {/* 4. Son Görüntülenenler (YENİ) */}
      {recentRecipes.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recently Viewed 🕒</Text>
          <FlatList
            horizontal
            data={recentRecipes}
            renderItem={renderRecentItem}
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 5 }}
            initialNumToRender={6}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews={true}
          />
        </View>
      )}

      {/* 5. Topluluk (Social) Yönlendirmesi */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Discover Community 🌍</Text>
        
        <TouchableOpacity 
          style={styles.communityBanner}
          // App.js yapına göre TabNavigator içindeki 'Social' ekranına gitmek için:
          // Genelde TabNavigator'ın route name'i 'Main' ise ve içinde 'SocialTab' varsa:
          onPress={() => navigation.navigate('Social')} 
          // Eğer direkt çalışmazsa: navigation.navigate('Main', { screen: 'SocialTab' });
        >
          <View>
            <Text style={styles.communityTitle}>Explore What Others Cook!</Text>
            <Text style={styles.communityText}>See trends, new recipes and more...</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={32} color="#254db9ff" />
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerSection: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  
  // Wizard Button Stilleri
  wizardButton: {
    backgroundColor: '#FFFAE5', // Hafif sarımsı öne çıkan renk
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wizardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  wizardButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  wizardSubText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 34, 
  },

  sectionContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },

  // Son Görüntülenen Kartları
  recentCard: {
    width: 120,
    height: 120,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  recentImage: {
    width: '100%',
    height: '100%',
  },
  recentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
  },
  recentTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Community Banner
  communityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#c7d7f9ff', 
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1042a4ff',
  },
  communityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  communityText: {
    fontSize: 13,
    color: '#333',
    marginTop: 4,
  },
});