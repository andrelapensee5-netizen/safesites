import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ScrollView } from 'react-native';
import { subscriptionApi } from '../services/api';

export default function BillingScreen() {
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    subscriptionApi.status().then((r) => setSubscription(r.data)).catch(() => {});
  }, []);

  const handleSubscribe = async () => {
    try {
      const { data } = await subscriptionApi.checkout();
      await Linking.openURL(data.checkoutUrl);
    } catch {
      Alert.alert('Error', 'Failed to start subscription checkout');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Billing</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Plan</Text>
        <Text style={styles.planName}>SafeSite Pro</Text>
        <Text style={styles.planPrice}>$49<Text style={styles.planPeriod}>/month</Text></Text>
        <Text style={styles.planDesc}>Includes 15 documents/month. 2x rate after 15 documents.</Text>

        {subscription && (
          <View style={styles.stats}>
            <Text style={styles.statText}>Status: <Text style={styles.statValue}>{subscription.status}</Text></Text>
            <Text style={styles.statText}>Documents this month: <Text style={styles.statValue}>{subscription.documentsThisMonth}</Text></Text>
          </View>
        )}

        {(!subscription?.status || ['TRIALING', 'CANCELED'].includes(subscription?.status)) && (
          <TouchableOpacity style={styles.button} onPress={handleSubscribe}>
            <Text style={styles.buttonText}>Subscribe Now</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.features}>
        <Text style={styles.featuresTitle}>What's included</Text>
        {[
          '✓ Unlimited document uploads (15 included)',
          '✓ AI-powered risk analysis',
          '✓ Clause explanation in plain English',
          '✓ Redline suggestions',
          '✓ Notarization integration',
          '✓ Secure AWS S3 storage',
          '✓ Mobile & desktop apps',
        ].map((f) => (
          <Text key={f} style={styles.feature}>{f}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 20 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' },
  planName: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  planPrice: { fontSize: 36, fontWeight: 'bold', color: '#2563eb', marginVertical: 8 },
  planPeriod: { fontSize: 18, color: '#6b7280' },
  planDesc: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  stats: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, marginBottom: 16 },
  statText: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  statValue: { fontWeight: '600', color: '#111827' },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  features: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16 },
  featuresTitle: { fontSize: 16, fontWeight: '600', color: '#1d4ed8', marginBottom: 12 },
  feature: { fontSize: 14, color: '#1e40af', marginBottom: 6 },
});
