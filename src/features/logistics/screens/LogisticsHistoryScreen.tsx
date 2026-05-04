import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../core/ui/ThemeContext';
import { useLogisticaHistorial } from '../hooks/useLogisticaHistorial';
import { formatearTiempoRelativo, formatearHora } from '../../../core/utils/fecha';
import { BottomBar, TabActivo } from '../../../core/ui/BottomBar';
import { Text, Surface, Badge, HeaderPremium } from '../../../core/ui/components';
import { TOKENS } from '../../../core/ui/tokens';
import LogisticaHistorial from '../../../core/database/models/LogisticaHistorial';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../core/types/navigation';

const FastList = FlashList;

const HistorialItem = React.memo(({ item, esUltimo }: { item: LogisticaHistorial; esUltimo: boolean }) => {
    const { colors } = useTheme();
    
    const getStatusIcon = (estado: string): React.ComponentProps<typeof Ionicons>['name'] => {
        switch (estado) {
            case 'Entregado': return 'checkmark-circle';
            case 'Listo para envío':
            case 'En_Tienda': return 'cube';
            case 'Impresión Etiqueta':
            case 'Pendiente': return 'print';
            default: return 'ellipse';
        }
    };

    const getStatusVariant = (estado: string): 'success' | 'primary' | 'warning' | 'neutral' => {
        if (estado === 'Entregado') return 'success';
        if (estado === 'En_Tienda' || estado === 'Listo para envío') return 'primary';
        if (estado === 'Pendiente' || estado === 'Impresión Etiqueta') return 'warning';
        return 'neutral';
    };

    return (
        <View style={styles.itemContenedor}>
            <View style={styles.timelineIzquierda}>
                <Surface 
                    variant="elevated" 
                    padding="xs" 
                    radius="full" 
                    style={styles.iconoCirculo}
                >
                    <Ionicons name={getStatusIcon(item.estadoNuevo)} size={16} color={colors.primario} />
                </Surface>
                {!esUltimo && (
                    <View style={[styles.timelineLinea, { backgroundColor: colors.borde }]} />
                )}
            </View>

            <Surface variant="elevated" padding="md" style={styles.tarjeta}>
                <View style={styles.tarjetaCabecera}>
                    <Text variant="small" weight="bold">{item.codPedido}</Text>
                    <Text variant="tiny" color={colors.textoTerciario}>
                        {formatearTiempoRelativo(item.timestamp)}
                    </Text>
                </View>

                <View style={styles.cambioRow}>
                    <Badge label={item.estadoAnterior.replace('_', ' ')} variant="neutral" />
                    <Ionicons name="arrow-forward" size={14} color={colors.textoTerciario} style={styles.marginHorizontal8} />
                    <Badge label={item.estadoNuevo.replace('_', ' ')} variant={getStatusVariant(item.estadoNuevo)} />
                </View>

                <View style={[styles.tarjetaFooter, { borderTopColor: colors.borde }]}>
                    <View style={styles.flex1}>
                        <Text variant="tiny" color={colors.textoTerciario}>
                            {formatearHora(item.timestamp)}
                        </Text>
                        {item.rolUsuario && (
                            <View style={styles.rolRow}>
                                <Ionicons name="shield-checkmark" size={10} color={colors.primario} style={styles.marginRight4} />
                                <Text variant="tiny" weight="bold" color={colors.primario}>
                                    {item.rolUsuario.toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                    {item.operador && (
                        <Text variant="tiny" color={colors.textoTerciario}>
                            👤 {item.operador}
                        </Text>
                    )}
                </View>
            </Surface>
        </View>
    );
});

export const LogisticsHistoryScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { entradas, cargando, error } = useLogisticaHistorial();

    return (
        <SafeAreaView style={[styles.contenedor, { backgroundColor: colors.fondo }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.fondo}
            />

            <HeaderPremium titulo="Historial Logística" />

            <View style={styles.contenido}>
                {cargando ? (
                    <View style={styles.centrado}>
                        <Text variant="body">Cargando historial...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centrado}>
                        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                        <Text variant="body" color={colors.error} style={styles.marginTop12}>{error}</Text>
                    </View>
                ) : entradas.length === 0 ? (
                    <View style={styles.centrado}>
                        <Ionicons name="time-outline" size={64} color={colors.textoTerciario} />
                        <Text variant="h3" weight="bold" style={styles.marginTop16}>Sin movimientos</Text>
                        <Text variant="body" color={colors.textoSecundario} align="center">
                            Los cambios de estado aparecerán aquí.
                        </Text>
                    </View>
                ) : (
                    <FastList
                        data={entradas}
                        keyExtractor={(item: LogisticaHistorial) => item.id}
                        // @ts-ignore - Caso excepcional: los tipos locales de FlashListProps omiten estimatedItemSize aunque es mandatorio
                        estimatedItemSize={120}
                        renderItem={({ item, index }: { item: LogisticaHistorial; index: number }) => (
                            <HistorialItem item={item} esUltimo={index === entradas.length - 1} />
                        )}
                        contentContainerStyle={styles.lista}
                    />
                )}
            </View>

            <BottomBar
                modoActivo="historial"
                onTabPress={(tab: TabActivo) => {
                    if (tab === 'lista') navigation.navigate('InventarioList');
                    if (tab === 'logistica') navigation.navigate('PickingList');
                    if (tab === 'escaner') navigation.navigate('Scanner');
                    if (tab === 'analytics') navigation.navigate('Analytics');
                    if (tab === 'marcas') navigation.navigate('ControlMarcas');
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    contenedor: { flex: 1 },
    contenido: { flex: 1 },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    lista: { padding: 20, paddingBottom: 40 },
    itemContenedor: { flexDirection: 'row', marginBottom: TOKENS.spacing.md },
    timelineIzquierda: { alignItems: 'center', marginRight: 14, width: 36 },
    iconoCirculo: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    timelineLinea: { width: 1, flex: 1, marginTop: 6 },
    tarjeta: { flex: 1 },
    tarjetaCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cambioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    tarjetaFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, paddingTop: 8 },
    flex1: { flex: 1 },
    marginHorizontal8: { marginHorizontal: TOKENS.spacing.sm },
    marginRight4: { marginRight: 4 },
    marginTop12: { marginTop: TOKENS.spacing.md },
    marginTop16: { marginTop: TOKENS.spacing.md },
    rolRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 }
});
