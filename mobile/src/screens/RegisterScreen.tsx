import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { authApi } from '../services/api';

export default function RegisterScreen({ navigation }: any) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'CONSUMER' });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      await authApi.register(form);
      Alert.alert('Success', 'Account created! Please check your email to verify your account.', [
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>SafeSite</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Create Account</Text>
        {['firstName', 'lastName', 'email'].map((field) => (
          <TextInput
            key={field}
            style={styles.input}
            placeholder={field.replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase())}
            value={(form as any)[field]}
            onChangeText={(v) => setForm((p) => ({ ...p, [field]: v }))}
            keyboardType={field === 'email' ? 'email-address' : 'default'}
            autoCapitalize={field === 'email' ? 'none' : 'words'}
          />
        ))}
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          value={form.password}
          onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  heading: { fontSize: 24, fontWeight: '600', color: '#111827', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#2563eb', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  link: { color: '#2563eb', textAlign: 'center', fontSize: 14 },
});
