import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import { useAnalytics } from '../../analytics/hooks/useAnalytics';
import { exportarReportePDF } from '../../../core/utils/exportaciones';
import { useTheme } from '../../../core/ui/ThemeContext';
import { formatearPrecio } from '../../../core/utils/formato';
import { MENSAJES } from '../../../core/constants/mensajes';
import { Ionicons } from '@expo/vector-icons';

import withObservables from '@nozbe/with-observables';
import { database } from '../../../core/database';
import Producto from '../../../core/database/models/Producto';

const screenWidth = Dimensions.get("window").width;

interface Props {
    productos: Producto[];
}

const AnalyticsScreenRaw: React.FC<Props> = ({ productos }) => {
    const { colors, isDark } = useTheme();
    const { saludPorcentaje, capitalPerdido, datosDona, marcasRiesgo, recomendaciones, totalInventario } = useAnalytics(productos);

    // Ajustar colores de la dona para modo oscuro
    const datosDonaTematizados = datosDona.map(d => ({
        ...d,
        legendFontColor: colors.textoPrincipal
    }));

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.fondo }]}>
            <ScrollView style={styles.contenedor}>
                {/* Header — Notion typography */}
                <Text style={[styles.tituloSec, { color: colors.textoPrincipal }]}>{MENSAJES.DASHBOARD_TITULO}</Text>

                {/* 1. INDICADORES RÁPIDOS — Metric Cards */}
                <View style={styles.filaIndicadores}>
                    <View style={[styles.tarjetaIndicador, {
                        backgroundColor: colors.superficie,
                        borderColor: colors.borde,
                    }]}>
                        <Text style={[styles.tituloIndicador, { color: colors.textoTerciario }]}>{MENSAJES.SALUD_LABEL}</Text>
                        <Text style={[styles.valorIndicador, { color: colors.primario }]}>{saludPorcentaje}%</Text>
                    </View>
                    <View style={[styles.tarjetaIndicador, {
                        backgroundColor: colors.superficie,
                        borderColor: colors.borde,
                    }]}>
                        <Text style={[styles.tituloIndicador, { color: colors.textoTerciario }]}>{MENSAJES.PERDIDA_LABEL}</Text>
                        <Text style={[styles.valorIndicador, { color: colors.error }]}>{formatearPrecio(capitalPerdido)}</Text>
                    </View>
                </View>

                {/* 2. GRÁFICO DE DONA */}
                <View style={[styles.tarjetaGrafico, {
                    backgroundColor: colors.superficie,
                    borderColor: colors.borde,
                    height: 260,
                }]}>
                    <Text style={[styles.tituloGrafico, { color: colors.textoPrincipal }]}>{MENSAJES.STOCK_FISICO_TITULO}</Text>
                    <PieChart
                        data={datosDonaTematizados}
                        width={screenWidth - 80}
                        height={180}
                        chartConfig={{
                            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        }}
                        accessor={"stock"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        absolute
                    />
                </View>

                {/* 3. BARRAS HORIZONTALES (TOP MARCAS EN RIESGO) */}
                <View style={[styles.tarjetaGrafico, {
                    backgroundColor: colors.superficie,
                    borderColor: colors.borde,
                }]}>
                    <Text style={[styles.tituloGrafico, { color: colors.textoPrincipal }]}>{MENSAJES.MARCAS_RIESGO_TITULO(30)}</Text>
                    {marcasRiesgo.length === 0 ? (
                        <Text style={[styles.textoVacio, { color: colors.textoSecundario }]}>{MENSAJES.MARCAS_RIESGO_VACIO}</Text>
                    ) : null}

                    {marcasRiesgo.map(([marca, cant]) => {
                        const maxCant = marcasRiesgo[0][1];
                        const widthPercent = (cant / maxCant) * 100;

                        return (
                            <View key={marca} style={styles.barraContenedor}>
                                <View style={styles.barraCabecera}>
                                    <Text style={[styles.barraMarca, { color: colors.textoPrincipal }]}>{marca}</Text>
                                    <Text style={[styles.barraCant, { color: colors.error }]}>{cant} unds.</Text>
                                </View>
                                <View style={[styles.barraFondo, { backgroundColor: colors.superficieAlta }]}>
                                    <View style={[styles.barraRelleno, { width: `${widthPercent}%`, backgroundColor: colors.error }]} />
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* 4. RECOMENDACIONES */}
                <View style={[styles.seccionIA, {
                    backgroundColor: colors.fondoPrimario,
                    borderColor: colors.primario,
                    borderWidth: 1,
                    padding: 15,
                    borderRadius: 12,
                    marginBottom: 20,
                }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <Ionicons name="bulb" size={20} color={colors.primario} />
                        <Text style={{ fontSize: 16, fontWeight: '700', letterSpacing: -0.125, color: colors.primario, marginLeft: 8 }}>{MENSAJES.IA_RECOMENDACIONES}</Text>
                    </View>
                    {recomendaciones.length === 0 ? <Text style={[styles.textoVacio, { color: colors.textoSecundario }]}>Todo bajo control.</Text> : null}
                    {recomendaciones.map((rec, index) => (
                        <View key={index} style={[styles.insightItem, {
                            backgroundColor: colors.superficie,
                            borderColor: colors.borde,
                            borderWidth: 1,
                            padding: 12,
                            borderRadius: 8,
                            marginTop: 8,
                        }]}>
                            <Text style={[styles.insightTexto, { color: colors.textoPrincipal }]}>{rec}</Text>
                        </View>
                    ))}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* BOTÓN FLOTANTE: COMPARTIR REPORTE */}
            <TouchableOpacity 
                style={styles.botonCompartir}
                onPress={() => exportarReportePDF(saludPorcentaje, capitalPerdido, recomendaciones)}
            >
                <Ionicons name="share-outline" size={22} color="#FFF" />
                <Text style={styles.textoBotonCompartir}>{MENSAJES.EXPORTAR_PDF}</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

// Inyección reactiva asíncrona desde SQLite
const enhance = withObservables([], () => ({
    productos: database.collections.get<Producto>('productos').query().observe(),
}));

export const AnalyticsScreen = enhance(AnalyticsScreenRaw);

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    contenedor: { flex: 1, padding: 16 },
    // Notion typography
    tituloSec: { fontSize: 22, fontWeight: '700', letterSpacing: -0.25, marginBottom: 16, marginTop: 8 },
    // Metric Cards — Notion spec
    filaIndicadores: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    tarjetaIndicador: {
        flex: 1, padding: 16, borderRadius: 12, borderWidth: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 9, elevation: 2,
        justifyContent: 'center', alignItems: 'center'
    },
    tituloIndicador: { fontSize: 12, fontWeight: '600', letterSpacing: 0.125, marginBottom: 6 },
    valorIndicador: { fontSize: 28, fontWeight: '700', letterSpacing: -0.625 },
    // Chart cards
    tarjetaGrafico: {
        padding: 16, borderRadius: 12, borderWidth: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 9, elevation: 2,
        marginBottom: 16
    },
    tituloGrafico: { fontSize: 16, fontWeight: '700', letterSpacing: -0.125, marginBottom: 12 },
    textoVacio: { fontStyle: 'italic', marginTop: 5 },
    barraContenedor: { marginBottom: 12 },
    barraCabecera: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    barraMarca: { fontWeight: '600', fontSize: 14 },
    barraCant: { fontWeight: '700', fontSize: 14 },
    barraFondo: { height: 8, borderRadius: 4, overflow: 'hidden' },
    barraRelleno: { height: '100%', borderRadius: 4 },
    insightItem: { padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
    insightTexto: { fontSize: 14, lineHeight: 21 },
    seccionIA: { padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1 },
    botonCompartir: {
        backgroundColor: '#0075de',
        position: 'absolute', bottom: 20, right: 20, left: 20,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        padding: 14, borderRadius: 8, elevation: 4,
        shadowColor: '#0075de', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
    },
    textoBotonCompartir: { color: 'white', fontWeight: '600', fontSize: 15, marginLeft: 8 }
});

