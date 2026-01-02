import React, { useState, useCallback, useEffect} from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { Ionicons,FontAwesome6} from '@expo/vector-icons';
// Bileşenler
import RecommendationRow from '../components/RecommendationRow';

export default function HomeScreen({ navigation }) {
  const [recentRecipes, setRecentRecipes] = useState([]);
  const [username, setUsername] = useState('User'); // Varsayılan isim

  //Load user details
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          if (user.username) {
            
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

    // Reload history each time you return to the page.
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

  // Card design for recently viewed recipes
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
      {/* Header Message */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>Hello, {username}!</Text>
        <Text style={styles.subtitle}>What are we cooking today?</Text>
      </View>

      {/* Recipe Wizard button  */}
      <TouchableOpacity 
        style={styles.wizardButton}
        
        
        onPress={() => navigation.navigate('Wizard')} 
      >
        <View style={styles.wizardContent}>
          <Ionicons name="sparkles" size={24} color="#000" style={{ marginRight: 10 }} />
          <Text style={styles.wizardButtonText}>Recipe Wizard</Text>
        </View>
        <Text style={styles.wizardSubText}>Find recipes with your ingredients</Text>
      </TouchableOpacity>

      {/* Personal Recommendations (Existing Component) */}
      <View style={styles.sectionContainer}>
        <RecommendationRow />
      </View>

      {/* Recently Viewed Recipes */}
      {recentRecipes.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.sectionTitle}>Recently Viewed</Text>
            <View style={{
                backgroundColor: '#e0e0e0', 
                borderRadius: 50,           
                marginLeft: 8,
                top:-6,              
                justifyContent: 'center',
                alignItems: 'center'
            }}>
              <FontAwesome6 name="clock" size={16} color="black" />
            </View>
          </View>
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

      {/* 5. Social Redirection */}
      <View style={styles.sectionContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
    
    <Text style={styles.sectionTitle}>Discover Community</Text>

    {/*Icon Box */}
    <View style={{
        backgroundColor: 'green',
        borderRadius: 50,
        marginLeft: 8,
        marginBottom: 11,
        justifyContent: 'center',
        alignItems: 'center'
    }}>
      <FontAwesome6 name="earth-americas" size={16} color="#0b1fccff" />
    </View>

  </View>
        
        <TouchableOpacity 
          style={styles.communityBanner}
          
          
          onPress={() => navigation.navigate('Social')} 
          
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
  
  
  wizardButton: {
    backgroundColor: '#FFFAE5', 
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