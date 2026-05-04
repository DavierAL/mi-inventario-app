import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

import { database } from '../../../core/database';
import { Q } from '@nozbe/watermelondb';
import Producto from '../../../core/database/models/Producto';
import { useTheme } from '../../../core/ui/ThemeContext';
import { RootStackParamList } from '../../../core/types/navigation';
import { TOKENS } from '../../../core/ui/tokens';

// Core Components
import { HeaderPremium } from '../../../core/ui/components/HeaderPremium';
import { Text } from '../../../core/ui/components/Typography';
import { Input } from '../../../core/ui/components/Input';
import { Button } from '../../../core/ui/components/Button';
import { AnimatedPressable } from '../../../core/ui/components/AnimatedPressable';

type BrandAuditRouteProp = RouteProp<RootStackParamList, 'BrandAudit'>;

interface AuditState {
  manual: string;
  escaneado: number;
}

export const BrandAuditScreen: React.FC = () => {
  const route = useRoute<BrandAuditRouteProp>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { marca } = route.params;

  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [auditData, setAuditData] = useState<Record<string, AuditState>>({});
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const results = await database.collections
          .get<Producto>('productos')
          .query(Q.where('marca', marca))
          .fetch();
        setProductos(results);
        
        // Initialize audit data
        const initialData: Record<string, AuditState> = {};
        results.forEach(p => {
          initialData[p.id] = { manual: '0', escaneado: 0 };
        });
        setAuditData(initialData);
      } catch (error) {
        console.error('Error fetching productos for audit:', error);
      } finally {
        setCargando(false);
      }
    };
    fetchProductos();
  }, [marca]);

  const handleManualChange = (id: string, value: string) => {
    setAuditData(prev => ({
      ...prev,
      [id]: { ...prev[id], manual: value }
    }));
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    const producto = productos.find(p => p.codBarras === data);
    if (producto) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAuditData(prev => ({
        ...prev,
        [producto.id]: { ...prev[producto.id], escaneado: prev[producto.id].escaneado + 1 }
      }));
      Toast.show({
        type: 'success',
        text1: 'Producto Escaneado',
        text2: `${producto.sku} - ${producto.descripcion.substring(0, 30)}...`,
        position: 'bottom'
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: 'No encontrado',
        text2: `El código ${data} no pertenece a esta marca.`,
        position: 'bottom'
      });
    }
  };

  const handleEnviar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Enviar Inventario',
      '¿Estás seguro de enviar los datos del conteo? Se generará un reporte comparativo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Enviar', 
          onPress: () => {
            Toast.show({
              type: 'success',
              text1: 'Inventario Enviado',
              text2: 'Los datos han sido registrados exitosamente.',
            });
            navigation.goBack();
          } 
        }
      ]
    );
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setShowScanner(true);
  };

  if (cargando) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.fondo }]}>
        <ActivityIndicator size="large" color={colors.primario} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.fondo }]} edges={['bottom']}>
      <HeaderPremium 
        titulo={`Audit: ${marca}`} 
        extraAction={{
          icon: 'scan-outline',
          onPress: openScanner,
          accessibilityLabel: 'Abrir escáner'
        }}
      />

      <FlashList
        data={productos}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const state = auditData[item.id] || { manual: '0', escaneado: 0 };
          return (
            <View style={[styles.card, { backgroundColor: colors.superficie, borderColor: colors.borde }]}>
              <View style={styles.cardHeader}>
                <Image 
                  source={item.imagen} 
                  style={styles.productImage} 
                  contentFit="contain"
                  placeholder={require('../../../../assets/icon.png')}
                />
                <View style={styles.headerInfo}>
                  <Text variant="small" weight="bold" color={colors.textoPrincipal} numberOfLines={2}>
                    {item.descripcion}
                  </Text>
                  <Text variant="tiny" color={colors.textoSecundario}>SKU: {item.sku}</Text>
                </View>
                <View style={styles.systemStock}>
                  <Text variant="tiny" color={colors.textoTerciario}>SISTEMA</Text>
                  <Text variant="h3" weight="bold" color={colors.primario}>{item.stockMaster}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.borde }]} />

              <View style={styles.auditControls}>
                <View style={styles.controlGroup}>
                  <Text variant="tiny" weight="bold" color={colors.textoSecundario}>MANUAL</Text>
                  <Input
                    value={state.manual}
                    onChangeText={(val) => handleManualChange(item.id, val)}
                    keyboardType="number-pad"
                    containerStyle={styles.inputContainer}
                    style={styles.manualInput}
                  />
                </View>

                <View style={styles.controlGroup}>
                  <Text variant="tiny" weight="bold" color={colors.textoSecundario}>ESCANEADO</Text>
                  <View style={[styles.scanCounter, { backgroundColor: colors.fondoPrimario }]}>
                    <Text variant="body" weight="bold" color={colors.primario}>{state.escaneado}</Text>
                    <AnimatedPressable onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setAuditData(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], escaneado: prev[item.id].escaneado + 1 }
                        }));
                    }}>
                      <Ionicons name="add-circle" size={24} color={colors.primario} />
                    </AnimatedPressable>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={() => (
          <View style={styles.footer}>
            <Button 
              label="FINALIZAR Y ENVIAR" 
              variant="primary" 
              onPress={handleEnviar}
              style={styles.btnEnviar}
            />
          </View>
        )}
      />

      <Modal visible={showScanner} animationType="slide">
        <SafeAreaView style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128'] }}
          />
          <View style={styles.scannerOverlay}>
             <View style={styles.scannerHeader}>
                <Text variant="body" weight="bold" color="#fff">Escaneando: {marca}</Text>
                <AnimatedPressable onPress={() => setShowScanner(false)}>
                  <Ionicons name="close-circle" size={32} color="#fff" />
                </AnimatedPressable>
             </View>
             <View style={styles.scannerTarget} />
             <View style={styles.scannerFooter}>
                <Text variant="small" color="#fff" align="center">
                  Apunta a los códigos de barras de la marca {marca}. El conteo se incrementará automáticamente.
                </Text>
             </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    ...TOKENS.shadows.light,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  systemStock: {
    alignItems: 'center',
    minWidth: 60,
  },
  divider: {
    height: 1,
    marginVertical: 12,
    opacity: 0.5,
  },
  auditControls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlGroup: {
    flex: 1,
    gap: 4,
  },
  inputContainer: {
    marginBottom: 0,
  },
  manualInput: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  scanCounter: {
    height: 48,
    borderRadius: TOKENS.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  },
  btnEnviar: {
    backgroundColor: '#DC2626', // Red consistent with "ENVIAR" button in spreadsheet
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerTarget: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scannerFooter: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 16,
    borderRadius: 12,
  }
});
