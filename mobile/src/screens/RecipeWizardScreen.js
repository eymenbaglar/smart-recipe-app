import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RecipeWizardScreen({ navigation }) {

  // MyStocktan eşleştirme
  const handleUseStock = () => {
    navigation.navigate('SmartRecipeResults');
  };

  // Manuel girişten eşleştirme
  const handleManualInput = () => {
    navigation.navigate('ManualInput');
  };

  const handleRecommendations = () => {
  navigation.navigate('RecommendedRecipes');
};

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles" size={40} color="#FFD700" />
        </View>
        <Text style={styles.title}>Recipe Wizard</Text>
        <Text style={styles.subtitle}>
          What kind of meal would you like to cook today?
        </Text>
      </View>

      {/* options */}
      <View style={styles.optionsContainer}>

        {/* seçenek1: dolabımdan */}
        <TouchableOpacity style={[styles.card, styles.stockCard]} onPress={handleUseStock}>
          <View style={styles.cardContent}>
            <View style={[styles.cardIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="cube-outline" size={32} color="#4CAF50" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Use from MyStock</Text>
              <Text style={styles.cardDescription}>
                Let us suggest recipes tailored to you based on the ingredients in your Stock.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
          </View>
        </TouchableOpacity>

        {/* seçenek2: manuel girişle öneri */}
        <TouchableOpacity style={[styles.card, styles.manualCard]} onPress={handleManualInput}>
          <View style={styles.cardContent}>
            <View style={[styles.cardIcon, { backgroundColor: '#F5F5F5' }]}>
              <Ionicons name="create-outline" size={32} color="#333" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Enter Ingredients Manuel</Text>
              <Text style={styles.cardDescription}>
                Select the ingredients you want to use now and find a recipe.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#333" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, styles.recommendCard]} onPress={handleRecommendations}>
      <View style={styles.cardContent}>
          <View style={[styles.cardIcon, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="restaurant-outline" size={32} color="#2196F3" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>Let Us Suggest You</Text>
            <Text style={styles.cardDescription}>
              Check out the recipes we have prepared according to your tastes.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#2196F3" />
        </View>
      </TouchableOpacity>

        

      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  optionsContainer: {
    width: '100%',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  stockCard: {
    borderColor: '#4CAF50', 
    backgroundColor: '#FAFAFA',
  },
  manualCard: {
    borderColor: '#333', 
    backgroundColor: '#FAFAFA',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});