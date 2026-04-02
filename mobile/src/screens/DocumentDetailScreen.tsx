import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { documentsApi } from '../services/api';

export default function DocumentDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    documentsApi.get(id).then((r) => setDocument(r.data.document)).finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    try {
      const { data } = await documentsApi.download(id);
      await Linking.openURL(data.downloadUrl);
    } catch {
      Alert.alert('Error', 'Failed to download document');
    }
  };

  if (loading) return <View style={styles.center}><Text>Loading...</Text></View>;
  if (!document) return null;

  const a = document.analysis;

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={2}>{document.originalName}</Text>

      <View style={styles.meta}>
        <StatusBadge status={document.status} />
        <Text style={styles.metaText}>{new Date(document.createdAt).toLocaleDateString()}</Text>
        <Text style={styles.metaText}>{(document.fileSize / 1024).toFixed(0)} KB</Text>
      </View>

      <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
        <Text style={styles.downloadText}>⬇️ Download</Text>
      </TouchableOpacity>

      {a && (
        <View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>
            <Text style={styles.cardText}>{a.summary}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Risk Score: {a.riskScore}/100</Text>
            <View style={styles.riskBar}>
              <View style={[styles.riskFill, {
                width: `${a.riskScore}%` as any,
                backgroundColor: a.riskScore >= 70 ? '#ef4444' : a.riskScore >= 40 ? '#f59e0b' : '#22c55e',
              }]} />
            </View>
          </View>

          {a.risks?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Risks ({a.risks.length})</Text>
              {a.risks.slice(0, 3).map((r: any, i: number) => (
                <View key={i} style={styles.riskItem}>
                  <Text style={styles.riskType}>{r.severity.toUpperCase()}: {r.type}</Text>
                  <Text style={styles.riskDesc}>{r.description}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <View style={styles.badge}><Text style={styles.badgeText}>{status}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { marginBottom: 12 },
  backText: { color: '#2563eb', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  metaText: { fontSize: 13, color: '#6b7280' },
  badge: { backgroundColor: '#dbeafe', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#1d4ed8' },
  downloadBtn: { backgroundColor: '#2563eb', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 20 },
  downloadText: { color: 'white', fontWeight: '600' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  cardText: { fontSize: 14, color: '#4b5563', lineHeight: 22 },
  riskBar: { backgroundColor: '#e5e7eb', borderRadius: 4, height: 8, overflow: 'hidden' },
  riskFill: { height: 8, borderRadius: 4 },
  riskItem: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  riskType: { fontSize: 13, fontWeight: '600', color: '#ef4444' },
  riskDesc: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
