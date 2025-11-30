import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RecipeWizardScreen({ navigation }) {

  // 1. Seçenek: Stoktan Otomatik Eşleştirme
  const handleUseStock = () => {
    // Buraya daha sonra "Smart Matching" sayfasına yönlendirme kodunu yazacağız.
    navigation.navigate('SmartRecipeResults');
    // Örn: navigation.navigate('SmartRecipeResults');
  };

  // 2. Seçenek: Manuel Malzeme Seçimi
  const handleManualInput = () => {
    // Buraya daha sonra manuel seçim sayfasına yönlendirme kodunu yazacağız.
    console.log("Manuel seçim seçildi");
    // Örn: navigation.navigate('ManualRecipeInput');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* BAŞLIK ALANI */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles" size={40} color="#FFD700" />
        </View>
        <Text style={styles.title}>Recipe Wizard</Text>
        <Text style={styles.subtitle}>
          Bugün nasıl bir yemek pişirmek istersin?
        </Text>
      </View>

      {/* SEÇENEKLER ALANI */}
      <View style={styles.optionsContainer}>

        {/* --- SEÇENEK 1: DOLABIMDAN --- */}
        <TouchableOpacity style={[styles.card, styles.stockCard]} onPress={handleUseStock}>
          <View style={styles.cardContent}>
            <View style={[styles.cardIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="cube-outline" size={32} color="#4CAF50" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Dolabımdan Kullan</Text>
              <Text style={styles.cardDescription}>
                Sanal dolabındaki malzemelere göre sana özel tarifler önerelim.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
          </View>
        </TouchableOpacity>

        {/* --- SEÇENEK 2: MANUEL GİRİŞ --- */}
        <TouchableOpacity style={[styles.card, styles.manualCard]} onPress={handleManualInput}>
          <View style={styles.cardContent}>
            <View style={[styles.cardIcon, { backgroundColor: '#F5F5F5' }]}>
              <Ionicons name="create-outline" size={32} color="#333" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Malzemeleri Elle Gir</Text>
              <Text style={styles.cardDescription}>
                Kullanmak istediğin malzemeleri şimdi seç ve tarif bul.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#333" />
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
    justifyContent: 'center', // Dikeyde ortala
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8E1', // Açık sarı
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
    borderColor: '#4CAF50', // Yeşil çerçeve
    backgroundColor: '#FAFAFA',
  },
  manualCard: {
    borderColor: '#333', // Siyah çerçeve
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