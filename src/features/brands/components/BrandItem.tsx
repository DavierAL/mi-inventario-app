import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../core/ui/ThemeContext';
import { Text } from '../../../core/ui/components/Typography';
import { Badge } from '../../../core/ui/components/Badge';
import { AnimatedPressable } from '../../../core/ui/components/AnimatedPressable';
import { MarcaEstado } from '../services/marcasService';

interface Props {
  marca: MarcaEstado;
  onPress: () => void;
  disabled?: boolean;
}

export const BrandItem: React.FC<Props> = ({ marca, onPress, disabled }) => {
  const { colors } = useTheme();

  const getStatusConfig = () => {
    if (!marca.inventariar) return { label: 'Deshabilitada', variant: 'neutral' as const };
    if (marca.estaAtrasada) return { label: 'Atrasada', variant: 'error' as const };
    return { label: 'Al día', variant: 'success' as const };
  };

  const status = getStatusConfig();

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.container,
        { 
          backgroundColor: colors.superficie, 
          borderBottomColor: colors.borde,
          opacity: disabled ? 0.6 : 1
        }
      ]}
      accessibilityLabel={`Marca ${marca.nombre}, estado ${status.label}`}
    >
      <View style={styles.content}>
        <View style={styles.leftInfo}>
          <Text variant="body" weight="bold" color={colors.textoPrincipal}>
            {marca.nombre}
          </Text>
          <View style={styles.metaRow}>
            <Badge label={status.label} variant={status.variant} />
            <Text variant="tiny" color={colors.textoSecundario} style={styles.daysText}>
              {marca.inventariar 
                ? (marca.estaAtrasada 
                    ? (marca.diasDesdeUltimoConteo === -1 ? 'Sin conteo' : `${marca.diasDesdeUltimoConteo} días sin contar`)
                    : `Próximo en ${marca.proximoConteoEn} días`)
                : 'No se cuenta'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textoTerciario} />
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftInfo: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  daysText: {
    marginLeft: 4,
  },
});
