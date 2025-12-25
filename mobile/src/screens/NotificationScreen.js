import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev'; 

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(`${API_URL}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Listeyi güncelle (hepsini okundu yap)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      Alert.alert("Error", "The operation failed.");
    }
  };

  // Bildirim tipine göre ikon ve renk seçimi
  const getIconAndColor = (type) => {
    switch (type) {
      case 'success': return { icon: 'checkmark-circle', color: '#4CAF50' }; // Yeşil
      case 'warning': return { icon: 'alert-circle', color: '#FF9800' };    // Turuncu
      case 'error':   return { icon: 'close-circle', color: '#F44336' };    // Kırmızı
      default:        return { icon: 'information-circle', color: '#2196F3' }; // Mavi
    }
  };

  const renderItem = ({ item }) => {
    const { icon, color } = getIconAndColor(item.type);
    
    return (
      <View style={[styles.card, !item.is_read && styles.unreadCard]}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleString('tr-TR')}
          </Text>
        </View>
        {!item.is_read && <View style={styles.dot} />}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Text style={styles.markReadText}>Mark as Read All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6F61" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>You have no notifications yet.</Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              fetchNotifications();
            }} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 15, backgroundColor: '#fff', elevation: 2
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  markReadText: { color: '#FF6F61', fontWeight: '600' },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', padding: 15, marginBottom: 10,
    borderRadius: 10, alignItems: 'center', elevation: 1
  },
  unreadCard: { backgroundColor: '#fffdf5', borderLeftWidth: 4, borderLeftColor: '#FF6F61' },
  iconContainer: { marginRight: 15 },
  textContainer: { flex: 1 },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 2, color: '#333' },
  message: { fontSize: 14, color: '#555', marginBottom: 5 },
  date: { fontSize: 12, color: '#999' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6F61', marginLeft: 5 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888', fontSize: 16 }
});