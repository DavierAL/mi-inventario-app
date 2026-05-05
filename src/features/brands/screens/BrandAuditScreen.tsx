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
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';

import { database } from '../../../core/database';
import { Q } from '@nozbe/watermelondb';
import Producto from '../../../core/database/models/Producto';
import { useTheme } from '../../../core/ui/ThemeContext';
import { RootStackParamList } from '../../../core/types/navigation';
import { TOKENS } from '../../../core/ui/tokens';
import { generateAuditPdf } from '../utils/auditPdfGenerator';
import { supabase } from '../../../core/database/supabase';
import { AuthService } from '../../../core/services/AuthService';
import MarcaControl from '../../../core/database/models/MarcaControl';

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
  const [enviando, setEnviando] = useState(false);
  const [responsable, setResponsable] = useState('...');
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

        // Fetch current user for "Responsable"
        const session = await AuthService.getSession();
        if (session?.user) {
          const { profile } = await AuthService.getProfile(session.user.id);
          if (profile) setResponsable(profile.nombre);
        }
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

  const incrementManual = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAuditData(prev => {
      const current = parseInt(prev[id]?.manual || '0', 10);
      return {
        ...prev,
        [id]: { ...prev[id], manual: (current + 1).toString() }
      };
    });
  };

  const decrementManual = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAuditData(prev => {
      const current = parseInt(prev[id]?.manual || '0', 10);
      if (current <= 0) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], manual: (current - 1).toString() }
      };
    });
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

  const handleEnviar = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      'Enviar Inventario',
      '¿Estás seguro de enviar los datos del conteo? Se generará un reporte comparativo y se enviará por correo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Enviar', 
          onPress: async () => {
            try {
              setEnviando(true);
              
              // 1. Generate PDF HTML
              const html = await generateAuditPdf(marca, responsable, productos, auditData);
              
              // 2. Print to file
              const { uri } = await Print.printToFileAsync({ html });
              
              // 3. Convert to Base64
              const pdfBase64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
              });
              
              const filename = `Audit_${marca.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

              const { data, error } = await supabase.functions.invoke('enviar-constancia-inventario', {
                body: { pdfBase64, filename }
              });

              if (error) {
                // Si es un error de status (500), intentamos obtener el detalle del JSON
                let errorMessage = error.message;
                try {
                  const details = await (error as any).context?.json();
                  if (details?.error) errorMessage = details.error;
                } catch (e) { /* ignore */ }
                
                throw new Error(errorMessage || 'Error en la llamada a la función');
              }

              // 5. Update last audit date locally
              await database.write(async () => {
                const brands = await database.get<MarcaControl>('marcas_control')
                  .query(Q.where('nombre', marca))
                  .fetch();
                if (brands.length > 0) {
                  await brands[0].update(m => {
                    m.ultimoConteo = new Date();
                  });
                }
              });

              Toast.show({
                type: 'success',
                text1: 'Inventario Enviado',
                text2: 'El reporte ha sido enviado exitosamente por correo.',
              });
              navigation.goBack();
            } catch (err: any) {
              console.error('Error al enviar auditoria:', err);
              Alert.alert('Error', `Detalle: ${err.message || 'Error desconocido'}`);
            } finally {
              setEnviando(false);
            }
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
        // @ts-ignore
        estimatedItemSize={180}
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
                <View style={[styles.systemStock, { backgroundColor: colors.superficieAlta || '#F8FAFC' }]}>
                  <Text variant="tiny" weight="bold" color={colors.textoTerciario}>SISTEMA</Text>
                  <Text variant="h2" weight="bold" color={colors.textoPrincipal}>{item.stockMaster}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.borde }]} />

              <View style={styles.auditControls}>
                <View style={styles.controlGroup}>
                  <Text variant="tiny" weight="bold" color={colors.textoSecundario} style={{ marginBottom: 4 }}>DIF. MANUAL</Text>
                  <View style={[styles.counterContainer, { backgroundColor: colors.fondoPrimario }]}>
                    <AnimatedPressable onPress={() => decrementManual(item.id)} hitSlop={8}>
                      <Ionicons name="remove-circle-outline" size={22} color={colors.primario} />
                    </AnimatedPressable>
                    <Input
                      value={state.manual}
                      onChangeText={(val) => handleManualChange(item.id, val)}
                      keyboardType="number-pad"
                      containerStyle={{ flex: 1, marginBottom: 0 }}
                      style={styles.manualInput}
                      variant="flat"
                    />
                    <AnimatedPressable onPress={() => incrementManual(item.id)} hitSlop={8}>
                      <Ionicons name="add-circle" size={22} color={colors.primario} />
                    </AnimatedPressable>
                  </View>
                </View>

                <View style={styles.controlGroup}>
                  <Text variant="tiny" weight="bold" color={colors.textoSecundario} style={{ marginBottom: 4 }}>DIF. ESCANEADO</Text>
                  <View style={[styles.counterContainer, styles.scanDisplay, { backgroundColor: colors.superficieAlta || '#F1F5F9' }]}>
                    <Text variant="h3" weight="bold" color={colors.primario} align="center">
                      {state.escaneado}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={() => (
          <View style={styles.footer}>
            <Button 
              label={enviando ? "ENVIANDO..." : "FINALIZAR Y ENVIAR"} 
              variant="primary" 
              onPress={handleEnviar}
              disabled={enviando}
              style={[styles.btnEnviar, { backgroundColor: colors.error }]}
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
             <View style={styles.scannerTarget}>
               <View style={[styles.scannerCorner, styles.topLeft]} />
               <View style={[styles.scannerCorner, styles.topRight]} />
               <View style={[styles.scannerCorner, styles.bottomLeft]} />
               <View style={[styles.scannerCorner, styles.bottomRight]} />
             </View>
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
    justifyContent: 'center',
    minWidth: 70,
    height: 60,
    borderRadius: TOKENS.radius.md,
    padding: 8,
  },
  divider: {
    height: 1,
    marginVertical: 14,
    opacity: 0.3,
  },
  auditControls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlGroup: {
    flex: 1,
  },
  manualInput: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 18,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  counterContainer: {
    height: 52,
    borderRadius: TOKENS.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  scanDisplay: {
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  footer: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  btnEnviar: {
    backgroundColor: '#DC2626',
    borderRadius: TOKENS.radius.lg,
    height: 56,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
  },
  scannerTarget: {
    width: 280,
    height: 180,
    borderRadius: 20,
    alignSelf: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  scannerCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#3B82F6',
    borderWidth: 4,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 20 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 20 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 20 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 20 },
  scannerFooter: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  }
});
