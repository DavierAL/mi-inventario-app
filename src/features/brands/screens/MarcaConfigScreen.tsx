import React, { useState } from 'react';
import {
  View,
  Switch,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { RootStackParamList } from '../../../core/types/navigation';
import { useTheme } from '../../../core/ui/ThemeContext';
import { usePermissions } from '../../../core/hooks/usePermissions';
import { MarcasService } from '../services/marcasService';
import { ErrorService } from '../../../core/services/ErrorService';

// Core Components
import { HeaderPremium } from '../../../core/ui/components/HeaderPremium';
import { Text } from '../../../core/ui/components/Typography';
import { Input } from '../../../core/ui/components/Input';
import { Button } from '../../../core/ui/components/Button';
import { TOKENS } from '../../../core/ui/tokens';

type MarcaConfigRouteProp = RouteProp<RootStackParamList, 'MarcaConfig'>;

export const MarcaConfigScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<MarcaConfigRouteProp>();
  const { colors } = useTheme();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('edit_brands');

  const { marcaId, nombre, diasRango: diasInicial, inventariar: inventariarInicial } = route.params;

  const [diasRango, setDiasRango] = useState(String(diasInicial));
  const [inventariar, setInventariar] = useState(inventariarInicial);
  const [guardando, setGuardando] = useState(false);

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

  if (!hasPermission('view_brands')) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.fondo }]}>
        <Text color={colors.textoPrincipal}>No tienes permisos para ver esta sección.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.fondo }]} edges={['bottom']}>
      <HeaderPremium titulo="Configuración" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text variant="tiny" weight="bold" color={colors.textoTerciario} style={styles.sectionTitle}>
            INFORMACIÓN GENERAL
          </Text>
          <View style={[styles.card, { backgroundColor: colors.superficie, borderColor: colors.borde }]}>
            <View style={styles.infoRow}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primario + '15' }]}>
                <Ionicons name="pricetag" size={20} color={colors.primario} />
              </View>
              <View style={styles.infoText}>
                <Text variant="small" color={colors.textoSecundario}>Nombre de la Marca</Text>
                <Text variant="body" weight="bold" color={colors.textoPrincipal}>{nombre}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="tiny" weight="bold" color={colors.textoTerciario} style={styles.sectionTitle}>
            PARÁMETROS DE INVENTARIO
          </Text>
          
          <Input
            label="Frecuencia de conteo (días)"
            value={diasRango}
            onChangeText={setDiasRango}
            keyboardType="number-pad"
            placeholder="Ej: 30"
            editable={canEdit}
            accessibilityLabel="Frecuencia de conteo en días"
            accessibilityHint="Ingresa cuántos días deben pasar entre cada inventario"
          />

          <View style={[styles.cardRow, { backgroundColor: colors.superficie, borderColor: colors.borde, opacity: canEdit ? 1 : 0.6 }]}>
             <View style={{ flex: 1 }}>
                <Text variant="body" weight="bold" color={colors.textoPrincipal}>Habilitar inventario</Text>
                <Text variant="tiny" color={colors.textoSecundario}>Si se desactiva, esta marca no aparecerá en los recordatorios.</Text>
             </View>
             <Switch
                value={inventariar}
                onValueChange={setInventariar}
                disabled={!canEdit}
                trackColor={{ false: colors.borde, true: colors.primario }}
                thumbColor="#fff"
                accessibilityLabel="Habilitar inventario para esta marca"
              />
          </View>
        </View>

        {canEdit && (
          <Button
            label="Guardar cambios"
            onPress={handleGuardar}
            loading={guardando}
            style={styles.btnSave}
            accessibilityLabel="Guardar cambios de configuración"
          />
        )}

        <Button
          label="Cancelar"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={styles.btnCancel}
          accessibilityLabel="Cancelar y volver"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { marginBottom: 8, letterSpacing: 1 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardRow: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
  },
  btnSave: {
    marginTop: 12,
  },
  btnCancel: {
    marginTop: 8,
  },
});
