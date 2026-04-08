// ARCHIVO: src/screens/AnalyticsScreen.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useAnalytics } from '../hooks/useAnalytics';
import { exportarReportePDF } from '../utils/exportaciones';

const screenWidth = Dimensions.get("window").width;

export const AnalyticsScreen = () => {
  const { saludPorcentaje, capitalPerdido, datosDona, marcasRiesgo, recomendaciones } = useAnalytics();

  return (
    <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.contenedor}>
        <Text style={styles.tituloSec}>Dashboard Analítico</Text>

        {/* 1. KPIs FINANCIEROS */}
        <View style={styles.filaKpi}>
            <View style={[styles.tarjetaKpi, { borderLeftColor: '#38A169', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>Salud Inventario</Text>
            <Text style={styles.kpiValor}>{saludPorcentaje}%</Text>
            </View>
            <View style={[styles.tarjetaKpi, { borderLeftColor: '#E53E3E', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiLabel}>Pérdida Estimada</Text>
            <Text style={[styles.kpiValor, { color: '#E53E3E' }]}>S/ {capitalPerdido.toFixed(2)}</Text>
            </View>
        </View>

        {/* 2. GRÁFICO DE DONA */}
        <View style={styles.tarjetaGrafico}>
            <Text style={styles.tituloGrafico}>Estado del Stock Físico</Text>
            <PieChart
            data={datosDona}
            width={screenWidth - 40}
            height={180}
            chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
            accessor={"stock"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            absolute // Muestra el número real en lugar de %
            />
        </View>

        {/* 3. BARRAS HORIZONTALES (TOP MARCAS EN RIESGO) */}
        <View style={styles.tarjetaGrafico}>
            <Text style={styles.tituloGrafico}>Top Marcas en Riesgo (&lt;30 días)</Text>
            {marcasRiesgo.length === 0 ? <Text style={styles.textoVacio}>¡Excelente! Ninguna marca en riesgo inminente.</Text> : null}
            
            {marcasRiesgo.map(([marca, cant]) => {
            // Calculamos el ancho de la barra (el más alto es 100%)
            const maxCant = marcasRiesgo[0][1]; 
            const widthPercent = (cant / maxCant) * 100;

            return (
                <View key={marca} style={styles.barraContenedor}>
                <View style={styles.barraCabecera}>
                    <Text style={styles.barraMarca}>{marca}</Text>
                    <Text style={styles.barraCant}>{cant} unds.</Text>
                </View>
                <View style={styles.barraFondo}>
                    <View style={[styles.barraRelleno, { width: `${widthPercent}%` }]} />
                </View>
                </View>
            );
            })}
        </View>

        {/* 4. PLANES DE ACCIÓN (INSIGHTS) */}
        <View style={styles.tarjetaGrafico}>
            <Text style={styles.tituloGrafico}>🧠 Recomendaciones (IA)</Text>
            {recomendaciones.length === 0 ? <Text style={styles.textoVacio}>Todo bajo control.</Text> : null}
            {recomendaciones.map((rec, index) => (
            <View key={index} style={styles.insightItem}>
                <Text style={styles.insightTexto}>{rec}</Text>
            </View>
            ))}
        </View>

        {/* 5. HERRAMIENTAS GERENCIALES */}
        <TouchableOpacity style={styles.botonExportar} onPress={() => exportarReportePDF(saludPorcentaje, capitalPerdido, recomendaciones)}>
            <Text style={styles.textoBoton}>🖨️ Compartir Reporte Gerencial PDF</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
        </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0F4F8' },
  contenedor: { flex: 1, padding: 15 },
  tituloSec: { fontSize: 24, fontWeight: 'bold', color: '#2D3748', marginBottom: 15, marginTop: 10 },
  filaKpi: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  tarjetaKpi: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 10, elevation: 2 },
  kpiLabel: { fontSize: 12, color: '#718096', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 5 },
  kpiValor: { fontSize: 24, fontWeight: '900', color: '#2D3748' },
  tarjetaGrafico: { backgroundColor: 'white', padding: 15, borderRadius: 10, elevation: 2, marginBottom: 15 },
  tituloGrafico: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginBottom: 10 },
  textoVacio: { color: '#A0AEC0', fontStyle: 'italic', marginTop: 5 },
  // Estilos de la Barra Horizontal
  barraContenedor: { marginBottom: 12 },
  barraCabecera: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barraMarca: { fontWeight: '600', color: '#4A5568' },
  barraCant: { color: '#DD6B20', fontWeight: 'bold' },
  barraFondo: { height: 10, backgroundColor: '#EDF2F7', borderRadius: 5, overflow: 'hidden' },
  barraRelleno: { height: '100%', backgroundColor: '#DD6B20', borderRadius: 5 },
  // Insights
  insightItem: { backgroundColor: '#F7FAFC', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  insightTexto: { color: '#2D3748', fontSize: 14, lineHeight: 20 },
  // Botones
  botonExportar: { backgroundColor: '#3182CE', padding: 15, borderRadius: 10, alignItems: 'center', marginVertical: 10 },
  textoBoton: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
