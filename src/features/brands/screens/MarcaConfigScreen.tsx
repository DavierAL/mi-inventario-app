import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../core/types/navigation';
import { useTheme } from '../../../core/ui/ThemeContext';
import { usePermissions } from '../../../core/hooks/usePermissions';
import { MarcasService } from '../services/marcasService';
import { ErrorService } from '../../../core/services/ErrorService';
import Toast from 'react-native-toast-message';

type MarcaConfigRouteProp = RouteProp<RootStackParamList, 'MarcaConfig'>;

export const MarcaConfigScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<MarcaConfigRouteProp>();
  const { colors } = useTheme();
  const { hasRole } = usePermissions();
  const isAdmin = hasRole('admin');

  const { marcaId, nombre, diasRango: diasInicial, inventariar: inventariarInicial } = route.params;

  const [diasRango, setDiasRango] = useState(String(diasInicial));
  const [inventariar, setInventariar] = useState(inventariarInicial);
  const [guardando, setGuardando] = useState(false);

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.fondo, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textoPrincipal, fontSize: 16 }}>No tienes permisos para editar marcas.</Text>
      </SafeAreaView>
    );
  }

  const handleGuardar = async () => {
    const dias = parseInt(diasRango, 10);
    if (isNaN(dias) || dias < 1) {
      Alert.alert('Error', 'La frecuencia de conteo debe ser un número mayor a 0');
      return;
    }

    try {
      setGuardando(true);
      await MarcasService.actualizarMarca(marcaId, { diasRango: dias, inventariar });
      Toast.show({
        type: 'success',
        text1: 'Marca actualizada',
        text2: `${nombre} se actualizó correctamente.`,
      });
      navigation.goBack();
    } catch (err) {
      ErrorService.handle(err, { component: 'MarcaConfigScreen', operation: 'handleGuardar' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.fondo }]}>
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textoPrincipal }]}>Marca</Text>
        <Text style={[styles.valor, { color: colors.textoPrincipal }]}>{nombre}</Text>

        <Text style={[styles.label, { color: colors.textoPrincipal, marginTop: 20 }]}>
          Frecuencia de conteo (días)
        </Text>
        <TextInput
          style={[styles.input, { color: colors.textoPrincipal, borderColor: colors.borde }]}          value={diasRango}
          onChangeText={setDiasRango}
          keyboardType="number-pad"
          placeholder="Ej: 30"
          placeholderTextColor={colors.textoSecundario}
        />

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.textoPrincipal }]}>Realizar inventario</Text>
          <Switch
            value={inventariar}
            onValueChange={setInventariar}
            trackColor={{ false: '#D1D5DB', true: '#34D399' }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity
          style={[styles.btnGuardar, { backgroundColor: colors.primario, opacity: guardando ? 0.6 : 1 }]}
          onPress={handleGuardar}
          disabled={guardando}
        >
          <Text style={styles.btnGuardarText}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  valor: { fontSize: 18, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  btnGuardar: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnGuardarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
