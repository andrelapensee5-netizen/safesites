import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { documentsApi } from '../services/api';

export default function DocumentsScreen({ navigation }: any) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await documentsApi.list();
      setDocuments(data.documents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Document', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await documentsApi.delete(id);
          setDocuments((p) => p.filter((d) => d.id !== id));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Documents</Text>
      <FlatList
        data={documents}
        keyExtractor={(d) => d.id}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<Text style={styles.empty}>No documents yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('DocumentDetail', { id: item.id })}
            onLongPress={() => handleDelete(item.id, item.originalName)}
          >
            <View style={styles.itemContent}>
              <Text style={styles.itemName} numberOfLines={1}>{item.originalName}</Text>
              <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <View style={[styles.badge, statusColors[item.status] && { backgroundColor: statusColors[item.status] }]}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const statusColors: Record<string, string> = {
  ANALYZED: '#dcfce7', PROCESSING: '#fef9c3', FAILED: '#fee2e2', NOTARIZED: '#dbeafe',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 32 },
  item: { backgroundColor: 'white', borderRadius: 10, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemContent: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  itemDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  badge: { backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '500', color: '#374151' },
});
