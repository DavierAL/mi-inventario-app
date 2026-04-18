import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';

/**
 * useNetworkStatus
 * 
 * Hook centralizado para monitorear el estado de la conexión a internet.
 * Proporciona una interfaz reactiva que se actualiza automáticamente
 * cuando cambia la conectividad del dispositivo.
 */
export const useNetworkStatus = () => {
  const [networkState, setNetworkState] = useState<NetInfoState>({
    type: NetInfoStateType.unknown,
    isConnected: null,
    isInternetReachable: null,
    details: null,
  });

  useEffect(() => {
    // 1. Obtener estado inicial de forma asíncrona
    NetInfo.fetch().then((state) => {
      setNetworkState(state);
    });

    // 2. Suscribirse a los cambios de red en tiempo real
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkState(state);
    });

    // 3. Limpiar suscripción al desmontar el hook
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...networkState,
    /**
     * Helper booleano simplificado: ¿Tenemos internet real?
     */
    isOnline: !!networkState.isConnected && !!networkState.isInternetReachable,
    /**
     * Permite forzar una actualización manual del estado
     */
    refresh: async () => {
      const state = await NetInfo.fetch();
      setNetworkState(state);
      return state;
    },
  };
};
