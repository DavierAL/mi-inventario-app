import { useState, useEffect, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { precargarSonidos, reproducirSonido } from '../../../core/utils/sonidos';
import { useInventarioStore } from '../../inventory/store/useInventarioStore';
import { ScannerRepository } from '../repository/scannerRepository';
import { MENSAJES } from '../../../core/constants/mensajes';

/**
 * useScanner
 * 
 * Custom hook que encapsula la lógica de negocio del escáner:
 * - Control de estado de procesamiento para evitar escaneos duplicados.
 * - Feedback auditivo y háptico.
 * - Integración con el Store de Inventario para edición de productos.
 */
export const useScanner = () => {
    const { 
        setProductoEditando, productoEditando, 
        guardarEdicion 
    } = useInventarioStore();
    
    const [procesandoEscaneo, setProcesandoEscaneo] = useState<boolean>(false);
    const lockEscaneo = useRef<boolean>(false);

    useEffect(() => {
        // Precargar sonidos al montar el hook
        precargarSonidos();
        
        // Reset de procesamiento cuando se cierra el modal de edición
        if (productoEditando === null) {
            const timer = setTimeout(() => {
                setProcesandoEscaneo(false);
                lockEscaneo.current = false;
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [productoEditando]);

    /**
     * Feedback de éxito/error (Sonido + Vibración)
     */
    const reproducirFeedback = useCallback(async (exito: boolean) => {
        try {
            if (exito) {
                reproducirSonido('beep');
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                reproducirSonido('error');
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        } catch (error) {
            console.log("Audio/Haptic no soportado", error);
        }
    }, []);

    /**
     * Orquestador principal de un nuevo código escaneado
     */
    const manejarCodigoEscaneado = useCallback(async ({ data }: { data: string }) => {
        if (lockEscaneo.current) return;
        lockEscaneo.current = true;
        setProcesandoEscaneo(true);

        const codigoLimpio = String(data).trim();

        try {
            const productoEncontrado = await ScannerRepository.buscarProducto(codigoLimpio);

            if (productoEncontrado) {
                await reproducirFeedback(true);
                // Abrimos el modal de edición mediante el Store
                setProductoEditando(productoEncontrado);
            } else {
                await reproducirFeedback(false);
                Toast.show({
                    type: 'error',
                    text1: MENSAJES.ERROR_NO_ENCONTRADO,
                    text2: MENSAJES.ERROR_NO_ENCONTRADO_SUB(codigoLimpio),
                    position: 'top',
                    visibilityTime: 3000,
                });
                // Permitir re-escaneo tras un breve delay si no se encontró nada
                setTimeout(() => {
                    setProcesandoEscaneo(false);
                    lockEscaneo.current = false;
                }, 1500);
            }
        } catch (error) {
            console.error('[useScanner] Error en búsqueda:', error);
            setProcesandoEscaneo(false);
            lockEscaneo.current = false;
        }
    }, [procesandoEscaneo, setProductoEditando, reproducirFeedback]);

    /**
     * Proxy para guardar cambios desde el modal
     */
    const handleGuardarCambios = useCallback(async (fv: string, fecha: string, com: string) => {
        const res = await guardarEdicion(fv, fecha, com);
        
        if (res.exito) {
            reproducirSonido('success');
            Toast.show({
                type: 'success',
                text1: MENSAJES.EXITO_GUARDADO,
                text2: MENSAJES.EXITO_GUARDADO_SUB(res.codigo || ''),
                visibilityTime: 2500
            });
        } else {
            reproducirSonido('error');
            Toast.show({ 
                type: 'error', 
                text1: MENSAJES.ERROR_GUARDADO, 
                text2: res.mensajeError || 'No se pudo guardar en la nube.' 
            });
        }
        return res;
    }, [guardarEdicion]);

    return {
        procesandoEscaneo,
        productoEditando,
        setProductoEditando,
        manejarCodigoEscaneado,
        handleGuardarCambios
    };
};
