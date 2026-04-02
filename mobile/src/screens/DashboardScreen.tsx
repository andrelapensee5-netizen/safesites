import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { documentsApi, subscriptionApi } from '../services/api';

export default function DashboardScreen({ navigation }: any) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [docsRes, subRes] = await Promise.all([
        documentsApi.list(),
        subscriptionApi.status(),
      ]);
      setDocuments(docsRes.data.documents.slice(0, 5));
      setSubscription(subRes.data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.header}>Dashboard</Text>

      {subscription?.isTrialing && (
        <View style={styles.trialBanner}>
          <Text style={styles.trialText}>🎯 Free Trial Active</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Billing')}>
            <Text style={styles.trialLink}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsRow}>
        <StatCard label="Documents" value={subscription?.documentsThisMonth ?? 0} />
        <StatCard label="Status" value={subscription?.status ?? '-'} />
      </View>

      <Text style={styles.sectionTitle}>Recent Documents</Text>
      {documents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No documents yet</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Upload')}>
            <Text style={styles.buttonText}>Upload Document</Text>
          </TouchableOpacity>
        </View>
      ) : (
        documents.map((doc) => (
          <TouchableOpacity key={doc.id} style={styles.docCard}
            onPress={() => navigation.navigate('DocumentDetail', { id: doc.id })}>
            <Text style={styles.docName} numberOfLines={1}>{doc.originalName}</Text>
            <Text style={styles.docStatus}>{doc.status}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{String(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  trialBanner: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 12, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  trialText: { color: '#92400e', fontWeight: '600' },
  trialLink: { color: '#2563eb', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { color: '#6b7280', marginBottom: 16 },
  button: { backgroundColor: '#2563eb', borderRadius: 8, padding: 12, paddingHorizontal: 24 },
  buttonText: { color: 'white', fontWeight: '600' },
  docCard: { backgroundColor: 'white', borderRadius: 8, padding: 14, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docName: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  docStatus: { fontSize: 12, color: '#6b7280', marginLeft: 8 },
});
