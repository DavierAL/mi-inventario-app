import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInDown, 
  FadeIn,
  Layout,
} from 'react-native-reanimated';

import { RootStackParamList } from '../../../core/types/navigation';
import { useControlMarcas } from '../hooks/useControlMarcas';
import { generarReporteMarcasPDF } from '../services/pdfReporteMarcas';
import { ErrorService } from '../../../core/services/ErrorService';
import { useTheme } from '../../../core/ui/ThemeContext';
import { usePermissions } from '../../../core/hooks/usePermissions';
import { supabase } from '../../../core/database/supabase';
import { TOKENS } from '../../../core/ui/tokens';

// Core Components
import { HeaderPremium } from '../../../core/ui/components/HeaderPremium';
import { Text } from '../../../core/ui/components/Typography';
import { Input } from '../../../core/ui/components/Input';
import { BrandItem } from '../components/BrandItem';
import { AnimatedPressable } from '../../../core/ui/components/AnimatedPressable';
import { Shimmer } from '../../../core/ui/components/Shimmer';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FilterTab = ({ label, active, onPress, dotColor }: any) => {
  const { colors } = useTheme();
  return (
    <AnimatedPressable 
      onPress={onPress}
      style={[
        styles.tab, 
        active && { backgroundColor: colors.fondoPrimario, borderRadius: 8 }
      ]}
      haptic={Haptics.ImpactFeedbackStyle.Light}
    >
      <View style={styles.tabContent}>
        {dotColor && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
        <Text 
          variant="small" 
          weight={active ? 'bold' : 'medium'} 
          color={active ? colors.primario : colors.textoSecundario}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
};

export const ControlMarcasScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { hasRole } = usePermissions();
  const isAdmin = hasRole('admin');

  const {
    cargando,
    atrasadas,
    alDia,
    marcasFiltradas,
    busqueda,
    setBusqueda,
    filtroEstado,
    setFiltroEstado,
    hayMarcasParaHoy,
    nombresMarcasHoy,
    recargar,
    enviarConstancia,
  } = useControlMarcas();

  const handleEnviarConstancia = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Enviar reporte PDF',
      'Se generará un resumen del estado actual de las marcas y se enviará al correo administrativo. ¿Continuar?',
      [
        { text: 'Ahora no', style: 'cancel' },
        {
          text: 'Enviar PDF',
          onPress: async () => {
            try {
              const uri = await generarReporteMarcasPDF(atrasadas, alDia, marcasFiltradas.filter(m => !m.inventariar));
              const response = await fetch(uri);
              const blob = await response.blob();
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = async () => {
                const base64data = reader.result as string;
                const base64Content = base64data.split(',')[1];

                const { error: fnError } = await supabase.functions.invoke('enviar-constancia-inventario', {
                  body: {
                    pdfBase64: base64Content,
                    filename: `marcas-${new Date().toISOString().split('T')[0]}.pdf`,
                  },
                });

                if (fnError) throw fnError;
                await enviarConstancia(atrasadas);

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Toast.show({
                  type: 'success',
                  text1: 'Reporte enviado',
                  text2: 'El documento PDF ha sido procesado exitosamente.',
                });
              };
            } catch (err) {
              ErrorService.handle(err, { component: 'ControlMarcasScreen', operation: 'handleEnviarConstancia' });
            }
          },
        },
      ]
    );
  }, [atrasadas, alDia, marcasFiltradas, enviarConstancia]);

  const listData = useMemo(() => {
    const list: any[] = [];
    
    const filtradasAtrasadas = marcasFiltradas.filter(m => m.estaAtrasada && m.inventariar);
    const filtradasAlDia = marcasFiltradas.filter(m => !m.estaAtrasada && m.inventariar);
    const filtradasNoInventariar = marcasFiltradas.filter(m => !m.inventariar);

    if (filtradasAtrasadas.length > 0) {
      list.push({ id: 'h-a', type: 'header', title: 'PENDIENTES', color: colors.error, count: filtradasAtrasadas.length });
      list.push(...filtradasAtrasadas.map(m => ({ ...m, type: 'item' })));
    }
    if (filtradasAlDia.length > 0) {
      list.push({ id: 'h-d', type: 'header', title: 'AL DÍA', color: colors.exito, count: filtradasAlDia.length });
      list.push(...filtradasAlDia.map(m => ({ ...m, type: 'item' })));
    }
    if (filtradasNoInventariar.length > 0) {
      list.push({ id: 'h-n', type: 'header', title: 'DESHABILITADAS', color: colors.textoTerciario, count: filtradasNoInventariar.length });
      list.push(...filtradasNoInventariar.map(m => ({ ...m, type: 'item' })));
    }
    return list;
  }, [marcasFiltradas, colors]);

  const irAConfig = (marca: any) => {
    navigation.navigate('MarcaConfig', { 
      marcaId: marca.id, 
      nombre: marca.nombre, 
      diasRango: marca.diasRango, 
      inventariar: marca.inventariar 
    });
  };

  const handleMarcaPress = (marca: any) => {
    // Todos los roles van a la auditoría al hacer click
    navigation.navigate('BrandAudit', { marca: marca.nombre });
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <View key={i} style={styles.skeletonRow}>
          <View style={{ flex: 1, gap: 8 }}>
            <Shimmer width="60%" height={16} borderRadius={4} />
            <Shimmer width="40%" height={12} borderRadius={4} />
          </View>
          <Shimmer width={20} height={20} borderRadius={10} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.fondo }]} edges={['bottom']}>
      <HeaderPremium 
        titulo="Marcas" 
        extraAction={{
          icon: 'share-outline',
          onPress: handleEnviarConstancia,
          accessibilityLabel: 'Enviar reporte PDF'
        }}
      />

      <View style={styles.topSection}>
        <View style={styles.searchRow}>
          <Input
            placeholder="Filtrar por nombre..."
            value={busqueda}
            onChangeText={setBusqueda}
            icon={<Ionicons name="search" size={18} color={colors.textoTerciario} />}
            containerStyle={{ flex: 1, marginBottom: 0 }}
            rightIcon={busqueda ? (
              <AnimatedPressable onPress={() => setBusqueda('')}>
                <Ionicons name="close-circle" size={20} color={colors.textoTerciario} />
              </AnimatedPressable>
            ) : null}
          />
        </View>

        <View style={[styles.filterBar, { backgroundColor: colors.superficie, borderColor: colors.borde }]}>
           <FilterTab 
              label="Todas" 
              active={filtroEstado === 'todas'} 
              onPress={() => setFiltroEstado('todas')} 
            />
           <FilterTab 
              label="Pendientes" 
              active={filtroEstado === 'pendientes'} 
              onPress={() => setFiltroEstado('pendientes')} 
              dotColor={colors.error}
            />
           <FilterTab 
              label="Al día" 
              active={filtroEstado === 'al-dia'} 
              onPress={() => setFiltroEstado('al-dia')} 
              dotColor={colors.exito}
            />
        </View>
      </View>

      {cargando ? renderSkeleton() : (
        <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(400)}>
          <FlashList
            data={listData}
            keyExtractor={(item) => item.id}
            // @ts-ignore
            estimatedItemSize={72}
            onRefresh={recargar}
            refreshing={false}
            renderItem={({ item, index }) => {
              if (item.type === 'header') {
                return (
                  <View style={[styles.headerSection, { backgroundColor: colors.fondo }]}>
                    <Text variant="tiny" weight="bold" color={item.color} style={{ letterSpacing: 1.5 }}>
                      {item.title} ({item.count})
                    </Text>
                  </View>
                );
              }
              return (
                <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
                  <BrandItem 
                    marca={item} 
                    onPress={() => handleMarcaPress(item)} 
                    onConfig={isAdmin ? () => irAConfig(item) : undefined}
                  />
                </Animated.View>
              );
            }}
            ListHeaderComponent={() => (
              hayMarcasParaHoy && !busqueda && filtroEstado !== 'al-dia' ? (
                <Animated.View entering={FadeIn.delay(200)} style={styles.alertWrapper}>
                  <View style={[styles.alertBox, { 
                    backgroundColor: colors.error + '08', 
                    borderColor: colors.error + '25',
                    borderStyle: 'dashed'
                  }]}>
                    <View style={[styles.alertIcon, { backgroundColor: colors.error + '15' }]}>
                      <Ionicons name="notifications" size={20} color={colors.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="small" weight="bold" color={colors.error}>ALERTA DE INVENTARIO</Text>
                      <Text variant="tiny" color={colors.error} style={{ opacity: 0.8 }}>
                        {atrasadas.length > 3 
                          ? `Tienes ${atrasadas.length} marcas que requieren conteo inmediato.`
                          : `Hoy toca: ${nombresMarcasHoy}`}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              ) : null
            )}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <Ionicons name="file-tray-outline" size={64} color={colors.textoTerciario} style={{ opacity: 0.3 }} />
                <Text variant="body" weight="medium" color={colors.textoSecundario} style={{ marginTop: 16 }}>
                  {busqueda ? 'No hay coincidencias' : 'Nada que mostrar aquí'}
                </Text>
                <Text variant="small" color={colors.textoTerciario} align="center" style={{ marginTop: 4, paddingHorizontal: 40 }}>
                  Prueba cambiando los filtros o ajustando tu búsqueda.
                </Text>
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listContent: {
    paddingBottom: 60,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 24,
  },
  alertWrapper: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: 8,
    paddingBottom: 16,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    gap: 12,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  skeletonContainer: {
    padding: 16,
    gap: 20,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 16,
  },
});
