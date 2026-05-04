import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../core/types/navigation';
import { useControlMarcas } from '../hooks/useControlMarcas';
import { generarReporteMarcasPDF } from '../services/pdfReporteMarcas';
import { MarcasService } from '../services/marcasService';
import { ErrorService } from '../../../core/services/ErrorService';
import { useTheme } from '../../../core/ui/ThemeContext';
import { usePermissions } from '../../../core/hooks/usePermissions';
import { supabase } from '../../../core/database/supabase';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ControlMarcasScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const { hasRole } = usePermissions();
  const isAdmin = hasRole('admin');

  const {
    cargando,
    error,
    atrasadas,
    alDia,
    noInventariar,
    hayMarcasParaHoy,
    nombresMarcasHoy,
    recargar,
    enviarConstancia,
  } = useControlMarcas();

  const handleEnviarConstancia = useCallback(async () => {
    try {
      Alert.alert(
        'Enviar constancia',
        'Se generará un PDF con el estado de todas las marcas y se enviará por correo. ¿Deseas continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Enviar',
            style: 'default',
            onPress: async () => {
              try {
                const uri = await generarReporteMarcasPDF(atrasadas, alDia, noInventariar);
                // Leer el archivo como base64
                const response = await fetch(uri);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                  const base64data = reader.result as string;
                  const base64Content = base64data.split(',')[1];

                  // Llamar a Edge Function
                  const { error: fnError } = await supabase.functions.invoke('enviar-constancia-inventario', {
                    body: {
                      pdfBase64: base64Content,
                      filename: `constancia-inventario-${new Date().toISOString().split('T')[0]}.pdf`,
                    },
                  });

                  if (fnError) throw fnError;

                  // Actualizar fechas de último conteo
                  await enviarConstancia(atrasadas);

                  Toast.show({
                    type: 'success',
                    text1: 'Constancia enviada',
                    text2: 'El PDF fue enviado por correo exitosamente.',
                  });
                };
              } catch (err) {
                ErrorService.handle(err, { component: 'ControlMarcasScreen', operation: 'handleEnviarConstancia' });
              }
            },
          },
        ]
      );
    } catch (err) {
      ErrorService.handle(err, { component: 'ControlMarcasScreen', operation: 'handleEnviarConstancia' });
    }
  }, [atrasadas, alDia, noInventariar, enviarConstancia]);

  const irAConfig = (marcaId: string, nombre: string, diasRango: number, inventariar: boolean) => {
    navigation.navigate('MarcaConfig', { marcaId, nombre, diasRango, inventariar });
  };

  if (cargando) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.fondo }]}>
        <ActivityIndicator size="large" color={colors.primario} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.fondo }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textoPrincipal }]}>Control de Marcas</Text>
        {hayMarcasParaHoy && (
          <View style={[styles.alertBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={[styles.alertText, { color: '#991B1B' }]}>
              Hoy toca inventariar: {nombresMarcasHoy}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.btnConstancia, { backgroundColor: colors.primario }]}
        onPress={handleEnviarConstancia}
      >
        <Ionicons name="mail-outline" size={18} color="#fff" />
        <Text style={styles.btnConstanciaText}>Enviar constancia por email</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* SECCIÓN 1: ATRASADAS */}
        {atrasadas.length > 0 && (
          <View style={[styles.section, { backgroundColor: '#FFF5F5' }]}>
            <Text style={[styles.sectionTitle, { color: '#DC2626' }]}>
              OJO! Aquí se debe hacer inventario
            </Text>
            {atrasadas.map(marca => (
              <TouchableOpacity
                key={marca.id}
                style={[styles.row, { borderBottomColor: '#FECACA' }]}
                onPress={() => isAdmin && irAConfig(marca.id, marca.nombre, marca.diasRango, marca.inventariar)}
                activeOpacity={isAdmin ? 0.7 : 1}
              >
                <Text style={[styles.rowNombre, { color: colors.textoPrincipal }]}>{marca.nombre}</Text>
                <Text style={[styles.rowDias, { color: '#DC2626' }]}>
                  {marca.diasDesdeUltimoConteo === -1 ? 'Nunca' : `${marca.diasDesdeUltimoConteo} días`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* SECCIÓN 2: AL DÍA */}
        {alDia.length > 0 && (
          <View style={[styles.section, { backgroundColor: '#F0FFF4' }]}>
            <Text style={[styles.sectionTitle, { color: '#059669' }]}>
              Inventario al día
            </Text>
            {alDia.map(marca => (
              <TouchableOpacity
                key={marca.id}
                style={[styles.row, { borderBottomColor: '#A7F3D0' }]}
                onPress={() => isAdmin && irAConfig(marca.id, marca.nombre, marca.diasRango, marca.inventariar)}
                activeOpacity={isAdmin ? 0.7 : 1}
              >
                <Text style={[styles.rowNombre, { color: colors.textoPrincipal }]}>{marca.nombre}</Text>
                <Text style={[styles.rowDias, { color: '#059669' }]}>
                  Próximo en {marca.proximoConteoEn} días
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* SECCIÓN 3: NO SE INVENTARIAN */}
        {noInventariar.length > 0 && (
          <View style={[styles.section, { backgroundColor: '#F9FAFB' }]}>
            <Text style={[styles.sectionTitle, { color: '#6B7280' }]}>
              En estas marcas no se realiza conteo
            </Text>
            {noInventariar.map(marca => (
              <TouchableOpacity
                key={marca.id}
                style={[styles.row, { borderBottomColor: '#E5E7EB' }]}
                onPress={() => isAdmin && irAConfig(marca.id, marca.nombre, marca.diasRango, marca.inventariar)}
                activeOpacity={isAdmin ? 0.7 : 1}
              >
                <Text style={[styles.rowNombre, { color: '#9CA3AF' }]}>{marca.nombre}</Text>
                <Text style={[styles.rowDias, { color: '#9CA3AF' }]}>No aplica</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  alertText: { flex: 1, fontSize: 14, fontWeight: '600' },
  btnConstancia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  btnConstanciaText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  scroll: { padding: 16, paddingTop: 0, gap: 16 },
  section: { borderRadius: 12, padding: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowNombre: { fontSize: 15, fontWeight: '500', flex: 1 },
  rowDias: { fontSize: 13, fontWeight: '600' },
});
