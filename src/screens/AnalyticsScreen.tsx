// ARCHIVO: src/screens/AnalyticsScreen.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import { useAnalytics } from '../hooks/useAnalytics';
import { exportarReportePDF } from '../utils/exportaciones';
import { useTheme } from '../context/ThemeContext';

const screenWidth = Dimensions.get("window").width;

export const AnalyticsScreen = () => {
    const { colors, isDark } = useTheme();
    const { saludPorcentaje, capitalPerdido, datosDona, marcasRiesgo, recomendaciones } = useAnalytics();

    // Ajustar colores de la dona para modo oscuro si es necesario
    const datosDonaTematizados = datosDona.map(d => ({
        ...d,
        legendFontColor: colors.textoPrincipal
    }));

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.fondo }]}>
            <ScrollView style={styles.contenedor}>
                <Text style={[styles.tituloSec, { color: colors.textoPrincipal }]}>Dashboard Analítico</Text>

                {/* 1. KPIs FINANCIEROS */}
                <View style={styles.filaKpi}>
                    <View style={[styles.tarjetaKpi, { backgroundColor: colors.superficie, borderLeftColor: colors.exito, borderLeftWidth: 4 }]}>
                        <Text style={[styles.kpiLabel, { color: colors.textoSecundario }]}>Salud Inventario</Text>
                        <Text style={[styles.kpiValor, { color: colors.textoPrincipal }]}>{saludPorcentaje}%</Text>
                    </View>
                    <View style={[styles.tarjetaKpi, { backgroundColor: colors.superficie, borderLeftColor: colors.error, borderLeftWidth: 4 }]}>
                        <Text style={[styles.kpiLabel, { color: colors.textoSecundario }]}>Pérdida Estimada</Text>
                        <Text style={[styles.kpiValor, { color: colors.error }]}>S/ {capitalPerdido.toFixed(2)}</Text>
                    </View>
                </View>

                {/* 2. GRÁFICO DE DONA */}
                <View style={[styles.tarjetaGrafico, { backgroundColor: colors.superficie }]}>
                    <Text style={[styles.tituloGrafico, { color: colors.textoPrincipal }]}>Estado del Stock Físico</Text>
                    <PieChart
                        data={datosDonaTematizados}
                        width={screenWidth - 40}
                        height={180}
                        chartConfig={{
                            color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                            labelColor: (opacity = 1) => colors.textoPrincipal,
                        }}
                        accessor={"stock"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        absolute // Muestra el número real en lugar de %
                    />
                </View>

                {/* 3. BARRAS HORIZONTALES (TOP MARCAS EN RIESGO) */}
                <View style={[styles.tarjetaGrafico, { backgroundColor: colors.superficie }]}>
                    <Text style={[styles.tituloGrafico, { color: colors.textoPrincipal }]}>Top Marcas en Riesgo ({'<' }30 días)</Text>
                    {marcasRiesgo.length === 0 ? (
                        <Text style={[styles.textoVacio, { color: colors.textoSecundario }]}>¡Excelente! Ninguna marca en riesgo inminente.</Text>
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

                {/* 4. PLANES DE ACCIÓN (INSIGHTS) */}
                <View style={[styles.tarjetaGrafico, { backgroundColor: colors.superficie }]}>
                    <Text style={[styles.tituloGrafico, { color: colors.textoPrincipal }]}>🧠 Recomendaciones (IA)</Text>
                    {recomendaciones.length === 0 ? <Text style={[styles.textoVacio, { color: colors.textoSecundario }]}>Todo bajo control.</Text> : null}
                    {recomendaciones.map((rec, index) => (
                        <View key={index} style={[styles.insightItem, { backgroundColor: colors.inputFondo, borderColor: colors.borde }]}>
                            <Text style={[styles.insightTexto, { color: colors.textoPrincipal }]}>{rec}</Text>
                        </View>
                    ))}
                </View>

                {/* 5. HERRAMIENTAS GERENCIALES */}
                <TouchableOpacity style={[styles.botonExportar, { backgroundColor: colors.primario }]} onPress={() => exportarReportePDF(saludPorcentaje, capitalPerdido, recomendaciones)}>
                    <Text style={styles.textoBoton}>🖨️ Compartir Reporte Gerencial PDF</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    contenedor: { flex: 1, padding: 15 },
    tituloSec: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
    filaKpi: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    tarjetaKpi: { flex: 1, padding: 15, borderRadius: 10, elevation: 2 },
    kpiLabel: { fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 5 },
    kpiValor: { fontSize: 24, fontWeight: '900' },
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
    botonExportar: { padding: 15, borderRadius: 10, alignItems: 'center', marginVertical: 10 },
    textoBoton: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
