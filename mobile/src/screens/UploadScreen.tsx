import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { documentsApi } from '../services/api';

export default function UploadScreen({ navigation }: any) {
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (uri: string, name: string, mimeType: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri, name, type: mimeType } as any);
      const { data } = await documentsApi.upload(formData);
      Alert.alert('Success', 'Document uploaded! AI analysis started.', [
        { text: 'View', onPress: () => navigation.navigate('DocumentDetail', { id: data.document.id }) },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      await uploadFile(asset.uri, asset.name, asset.mimeType || 'application/octet-stream');
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Camera permission is needed to scan documents.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const name = `scan_${Date.now()}.jpg`;
      await uploadFile(asset.uri, name, 'image/jpeg');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Upload Document</Text>
      <Text style={styles.subtitle}>Choose a document to upload for AI analysis</Text>

      {uploading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Uploading...</Text>
        </View>
      ) : (
        <View style={styles.options}>
          <TouchableOpacity style={styles.option} onPress={pickDocument}>
            <Text style={styles.optionIcon}>📄</Text>
            <Text style={styles.optionTitle}>Pick Document</Text>
            <Text style={styles.optionSubtitle}>PDF, DOCX, DOC</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={takePhoto}>
            <Text style={styles.optionIcon}>📷</Text>
            <Text style={styles.optionTitle}>Scan with Camera</Text>
            <Text style={styles.optionSubtitle}>Take a photo of a document</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.infoTitle}>AI Analysis includes:</Text>
        {['Risk Assessment', 'Clause Analysis', 'Redline Suggestions', 'Plain English Summary'].map((item) => (
          <Text key={item} style={styles.infoItem}>✓ {item}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6b7280', marginBottom: 32 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, color: '#6b7280' },
  options: { gap: 16, marginBottom: 32 },
  option: { backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2 },
  optionIcon: { fontSize: 48, marginBottom: 8 },
  optionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 },
  optionSubtitle: { fontSize: 14, color: '#9ca3af' },
  info: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16 },
  infoTitle: { fontSize: 15, fontWeight: '600', color: '#1d4ed8', marginBottom: 8 },
  infoItem: { fontSize: 14, color: '#1e40af', marginBottom: 4 },
});
