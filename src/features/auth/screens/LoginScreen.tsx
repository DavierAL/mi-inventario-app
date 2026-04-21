import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  Alert
} from 'react-native';
import { Button } from '../../../core/ui/components/Button';
import { useTheme } from '../../../core/ui/ThemeContext';
import { TOKENS } from '../../../core/ui/tokens';
import { useAuthStore } from '../../../core/store/useAuthStore';
import { Typography } from '../../../core/ui/components/Typography';

export const LoginScreen = () => {
  const { colors } = useTheme();
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
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Typography variant="h1" style={styles.title}>Mi Inventario</Typography>
          <Typography variant="body" color="secondary">Inicia sesión para continuar</Typography>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Typography variant="small" style={styles.label}>Email</Typography>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.superficie, 
                color: colors.textoPrincipal,
                borderColor: colors.borde 
              }]}
              placeholder="ejemplo@correo.com"
              placeholderTextColor={colors.textoTerciario}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Typography variant="small" style={styles.label}>Contraseña</Typography>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.superficie, 
                color: colors.textoPrincipal,
                borderColor: colors.borde 
              }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textoTerciario}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Button 
            label="Entrar" 
            onPress={handleLogin} 
            loading={isLoading}
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Typography variant="small" color="tertiary">
            Solo administradores pueden crear nuevas cuentas.
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
    paddingHorizontal: TOKENS.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: TOKENS.spacing.xxl,
    alignItems: 'center',
  },
  title: {
    marginBottom: TOKENS.spacing.xs,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: TOKENS.spacing.lg,
  },
  label: {
    marginBottom: TOKENS.spacing.xs,
    marginLeft: 4,
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderRadius: TOKENS.radius.md,
    paddingHorizontal: TOKENS.spacing.md,
    borderWidth: 1,
    fontSize: 16,
  },
  button: {
    marginTop: TOKENS.spacing.md,
  },
  footer: {
    marginTop: TOKENS.spacing.xxl,
    alignItems: 'center',
  }
});
