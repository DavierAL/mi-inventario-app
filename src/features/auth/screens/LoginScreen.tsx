import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  Alert,
  StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import { Button, Surface, Typography, Input } from '../../../core/ui/components';
import { useTheme } from '../../../core/ui/ThemeContext';
import { TOKENS } from '../../../core/ui/tokens';
import { useAuthStore } from '../../../core/store/useAuthStore';
import { SHADOWS } from '../../../core/ui/shadows';
import { Ionicons } from '@expo/vector-icons';

export const LoginScreen = () => {
  const { colors, isDark } = useTheme();
  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);
  const error = useAuthStore(state => state.error);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa email y contraseña');
      return;
    }
    const success = await login(email, password);
    if (!success && error) {
      Alert.alert('Error de Login', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.fondo }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Surface variant="flat" style={[styles.logoContainer, { backgroundColor: colors.superficieAlta, borderColor: colors.borde }]}>
            <Image 
              source={require('../../../../assets/logo-mascotify.svg')}
              style={styles.logo}
              contentFit="contain"
            />
          </Surface>
          <Typography variant="h1" weight="bold" style={styles.title}>Mascotify</Typography>
          <Typography variant="body" color="secondary" align="center" style={styles.subtitle}>
            Gestión inteligente de inventario y logística para el cuidado de tus mascotas
          </Typography>
        </View>

        <Surface variant="elevated" padding="xl" style={styles.card}>
          <View style={styles.form}>
            <Input
              label="Correo Electrónico"
              placeholder="admin@mascotify.pe"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              icon={<Ionicons name="mail-outline" size={20} color={colors.textoTerciario} />}
              containerStyle={styles.inputGroup}
            />

            <Input
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textoTerciario} />}
              containerStyle={styles.inputGroup}
            />

            <Button 
              label="Iniciar Sesión" 
              onPress={handleLogin} 
              loading={isLoading}
              variant="primary"
              style={styles.button}
            />
          </View>
        </Surface>

        <View style={styles.footer}>
          <Typography variant="tiny" weight="bold" color="tertiary" style={{ letterSpacing: 1 }}>
            V 1.2.0 — DavierAL
          </Typography>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    ...SHADOWS.CARD,
  },
  logo: {
    width: 70,
    height: 70,
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  card: {
    borderRadius: 20,
    ...SHADOWS.CARD,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  button: {
    marginTop: 12,
    height: 56,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  }
});
