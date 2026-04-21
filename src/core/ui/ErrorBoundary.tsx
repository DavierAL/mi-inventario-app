// src/core/ui/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface } from './components';
import { ErrorService } from '../services/ErrorService';
import { TOKENS } from './tokens';
import { Ionicons } from '@expo/vector-icons';

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
      showToast: false, // Don't show toast if we are showing full error screen
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
        <View style={styles.container}>
          <Surface variant="elevated" padding="xxl" style={styles.card}>
            <Ionicons name="alert-circle" size={64} color="#eb5757" />
            <Text variant="h2" weight="bold" style={styles.title}>
              Algo salió mal
            </Text>
            <Text variant="body" align="center" color="#666" style={styles.message}>
              La aplicación ha encontrado un error inesperado. Hemos registrado el problema y estamos trabajando en ello.
            </Text>
            {__DEV__ && this.state.error && (
              <Surface variant="flat" padding="md" style={styles.debugInfo}>
                <Text variant="tiny" style={styles.debugText}>
                  {this.state.error.message}
                </Text>
              </Surface>
            )}
            <Button
              label="Reintentar"
              variant="primary"
              onPress={this.handleReset}
              style={styles.button}
              icon={<Ionicons name="refresh" size={20} color="#fff" />}
            />
          </Surface>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6f5f4',
    padding: TOKENS.spacing.xl,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    borderRadius: TOKENS.radius.lg,
  },
  title: {
    marginTop: TOKENS.spacing.lg,
    color: '#1a1a1a',
  },
  message: {
    marginTop: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.xl,
  },
  debugInfo: {
    backgroundColor: '#fee2e2',
    width: '100%',
    marginBottom: TOKENS.spacing.xl,
  },
  debugText: {
    color: '#991b1b',
    fontFamily: 'monospace',
  },
  button: {
    width: '100%',
  },
});
