// src/core/ui/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface } from './components';
import { ErrorService } from '../services/ErrorService';
import { TOKENS } from './tokens';
import { ThemeColors } from './colores';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    ErrorService.handle(error, {
      component: 'ErrorBoundary',
      stack: errorInfo.componentStack,
      showToast: false,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorScreen 
          error={this.state.error} 
          onReset={this.handleReset} 
        />
      );
    }

    return this.props.children;
  }
}

const ErrorScreen = ({ error, onReset }: { error: Error | null, onReset: () => void }) => {
  const theme = useTheme();
  // Salvaguarda por si el error ocurre fuera del provider o durante su inicialización
  const colors = theme?.colors || ThemeColors.light;

  return (
    <View style={[styles.container, { backgroundColor: colors.fondo }]}>
      <Surface variant="elevated" padding="xxl" style={styles.card}>
        <Ionicons name="alert-circle" size={64} color={colors.error} />
        <Text variant="h2" weight="bold" style={[styles.title, { color: colors.textoPrincipal }]}>
          Algo salió mal
        </Text>
        <Text variant="body" align="center" color={colors.textoSecundario} style={styles.message}>
          La aplicación ha encontrado un error inesperado. Hemos registrado el problema y estamos trabajando en ello.
        </Text>
        {__DEV__ && error && (
          <Surface variant="flat" padding="md" style={[styles.debugInfo, { backgroundColor: colors.fondoPrimario }]}>
            <Text variant="tiny" style={[styles.debugText, { color: colors.error }]}>
              {error.message}
            </Text>
          </Surface>
        )}
        <Button
          label="Reintentar"
          variant="primary"
          onPress={onReset}
          style={styles.button}
          icon={<Ionicons name="refresh" size={20} color={colors.absolutoBlanco} />}
        />
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: TOKENS.spacing.xl,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    borderRadius: TOKENS.radius.lg,
  },
  title: {
    marginTop: TOKENS.spacing.lg,
  },
  message: {
    marginTop: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.xl,
  },
  debugInfo: {
    width: '100%',
    marginBottom: TOKENS.spacing.xl,
  },
  debugText: {
    fontFamily: 'monospace',
  },
  button: {
    width: '100%',
  },
});
