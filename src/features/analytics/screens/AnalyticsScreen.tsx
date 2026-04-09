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

const screenWidth = Dimensions.get("window").width;

export const AnalyticsScreen = () => {
    const { colors, isDark } = useTheme();
    const { saludPorcentaje, capitalPerdido, datosDona, marcasRiesgo, recomendaciones, totalInventario } = useAnalytics();

    // Ajustar colores de la dona para modo oscuro
    const datosDonaTematizados = datosDona.map(d => ({
        ...d,
        legendFontColor: colors.textoPrincipal
    }));

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.fondo }]}>
            <ScrollView style={styles.contenedor}>
                <Text style={[styles.tituloSec, { color: colors.textoPrincipal }]}>{MENSAJES.DASHBOARD_TITULO}</Text>

                {/* 1. INDICADORES RÁPIDOS */}
                <View style={styles.filaIndicadores}>
                    <View style={[styles.tarjetaIndicador, { backgroundColor: colors.superficie }]}>
                        <Text style={[styles.tituloIndicador, { color: colors.textoSecundario }]}>{MENSAJES.SALUD_LABEL}</Text>
                        <Text style={[styles.valorIndicador, { color: colors.primario }]}>{saludPorcentaje}%</Text>
                    </View>
                    <View style={[styles.tarjetaIndicador, { backgroundColor: colors.superficie }]}>
                        <Text style={[styles.tituloIndicador, { color: colors.textoSecundario }]}>{MENSAJES.PERDIDA_LABEL}</Text>
                        <Text style={[styles.valorIndicador, { color: colors.error }]}>{formatearPrecio(capitalPerdido)}</Text>
                    </View>
                </View>

                {/* 2. GRÁFICO DE DONA (ESTADO FÍSICO) */}
                <View style={[styles.tarjetaGrafico, { backgroundColor: colors.superficie, height: 260 }]}>
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
                <View style={[styles.tarjetaGrafico, { backgroundColor: colors.superficie }]}>
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
                                <View style={[styles.barraFondo, { backgroundColor: colors.inputDeshabilitado }]}>
                                    <View style={[styles.barraRelleno, { width: `${widthPercent}%`, backgroundColor: colors.error }]} />
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* 4. RECOMENDACIONES (IA) */}
                <View style={[styles.seccionIA, { backgroundColor: isDark ? '#1C1C1E' : '#F0F9FF', borderColor: colors.primario, borderWidth: 1, padding: 15, borderRadius: 10, marginBottom: 20 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <Ionicons name="bulb" size={20} color={colors.primario} />
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primario, marginLeft: 8 }}>{MENSAJES.IA_RECOMENDACIONES}</Text>
                    </View>
                    {recomendaciones.length === 0 ? <Text style={[styles.textoVacio, { color: colors.textoSecundario }]}>Todo bajo control.</Text> : null}
                    {recomendaciones.map((rec, index) => (
                        <View key={index} style={[styles.insightItem, { backgroundColor: colors.superficie, borderColor: colors.borde, borderWidth: 1, padding: 10, borderRadius: 8, marginTop: 8 }]}>
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

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    contenedor: { flex: 1, padding: 15 },
    tituloSec: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
    filaIndicadores: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    tarjetaIndicador: { 
        flex: 1, padding: 15, borderRadius: 10, elevation: 2,
        justifyContent: 'center', alignItems: 'center'
    },
    tituloIndicador: { fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 5 },
    valorIndicador: { fontSize: 24, fontWeight: '900' },
    tarjetaGrafico: { padding: 15, borderRadius: 10, elevation: 2, marginBottom: 15 },
    tituloGrafico: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    textoVacio: { fontStyle: 'italic', marginTop: 5 },
    barraContenedor: { marginBottom: 12 },
    barraCabecera: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    barraMarca: { fontWeight: '600' },
    barraCant: { fontWeight: 'bold' },
    barraFondo: { height: 10, borderRadius: 5, overflow: 'hidden' },
    barraRelleno: { height: '100%', borderRadius: 5 },
    insightItem: { padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
    insightTexto: { fontSize: 14, lineHeight: 20 },
    seccionIA: { padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1 },
    botonCompartir: {
        backgroundColor: '#3182CE',
        position: 'absolute', bottom: 20, right: 20, left: 20,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        padding: 16, borderRadius: 16, elevation: 4
    },
    textoBotonCompartir: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 }
});

