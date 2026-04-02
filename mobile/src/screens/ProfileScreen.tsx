import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usersApi } from '../services/api';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    usersApi.me().then((r) => {
      setUser(r.data.user);
      setFirstName(r.data.user.firstName);
      setLastName(r.data.user.lastName);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await usersApi.updateProfile({ firstName, lastName });
      setUser(data.user);
      Alert.alert('Success', 'Profile updated');
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Profile</Text>

      {user && (
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.firstName?.[0]}{user.lastName?.[0]}</Text>
          </View>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.role}>{user.role}</Text>
        </View>
      )}

      <View style={styles.form}>
        <Text style={styles.label}>First Name</Text>
        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
        <Text style={styles.label}>Last Name</Text>
        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#dbeafe',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#1d4ed8' },
  email: { fontSize: 16, color: '#374151', marginBottom: 4 },
  role: { fontSize: 13, color: '#9ca3af' },
  form: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 15 },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 8, padding: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: '600' },
  logoutBtn: { backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 14, alignItems: 'center' },
  logoutText: { color: '#374151', fontWeight: '600' },
});
