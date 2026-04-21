import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import Modal from 'react-native-modal';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import Producto from '../../../core/database/models/Producto';
import { formatearFecha } from '../../../core/utils/fecha';
import { formatearPrecio } from '../../../core/utils/formato';
import { useTheme } from '../../../core/ui/ThemeContext';

import { Logger } from '../../../core/services/LoggerService';
import { ErrorService } from '../../../core/services/ErrorService';
import { validateData, EditProductoSchema } from '../../../core/validation/schemas';

interface Props {
    visible: boolean;
    producto: Producto | null;
    onGuardar: (fv: string, fechaEdicion: string, comentario: string) => Promise<void> | void;
    onCancelar: () => void;
}

export const EditProductoModal: React.FC<Props> = ({
    visible,
    producto,
    onGuardar,
    onCancelar,
}) => {
    const { colors, isDark } = useTheme();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const [formFV, setFormFV] = useState<string>('');
    const [formFechaEdicion] = useState<string>(new Date().toLocaleDateString('es-ES'));
    const [formComentario, setFormComentario] = useState<string>('');
    const [mostrarDatePicker, setMostrarDatePicker] = useState<boolean>(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());

    React.useEffect(() => {
        if (producto) {
            const fvStr = formatearFecha(producto.fvActualTs);  
            setFormFV(fvStr);
            setFormComentario(producto.comentarios ? String(producto.comentarios) : '');
            setErrors({});

            if (fvStr) {
                const partes = fvStr.split('/');
                if (partes.length === 3) {
                    const [dia, mes, anio] = partes.map(Number);
                    const fecha = new Date(anio, mes - 1, dia);
                    if (!isNaN(fecha.getTime())) {
                        setFechaSeleccionada(fecha);
                    }
                }
            }
        }
    }, [producto]);

    const manejarCambioDeFecha = (_event: DateTimePickerEvent, fecha?: Date) => {
        setMostrarDatePicker(Platform.OS === 'ios'); 
        if (fecha) {
            setFechaSeleccionada(fecha);
            const dia = String(fecha.getDate()).padStart(2, '0');
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const anio = fecha.getFullYear();
            const nuevaFecha = `${dia}/${mes}/${anio}`;
            setFormFV(nuevaFecha);
            if (errors.fv_actual) {
                setErrors(prev => {
                    const { fv_actual, ...rest } = prev;
                    return rest;
                });
            }
        }
    };

    const handleConfirmar = async () => {
        if (isSubmitting) return;

        // 1. Validar con Zod
        const validation = validateData(EditProductoSchema, {
            fv_actual: formFV,
            comentarios: formComentario,
        });

        if (!validation.isValid) {
            setErrors(validation.errors as any);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        setIsSubmitting(true);
        Logger.info('[EditModal] Intentando guardar cambios', { sku: producto?.sku });

        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await onGuardar(formFV, formFechaEdicion, formComentario);
            Logger.info('[EditModal] Cambios guardados con éxito', { sku: producto?.sku });
        } catch (error) {
            ErrorService.handle(error, { 
                component: 'EditProductoModal', 
                operation: 'onGuardar' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!visible) {
            setIsSubmitting(false);
            setErrors({});
        }
    }, [visible]);

    if (!producto) return null;

    return (
        <Modal 
            isVisible={visible} 
            onBackdropPress={onCancelar}
            onSwipeComplete={onCancelar}
            swipeDirection="down"
            style={styles.modalBase}
            avoidKeyboard={true}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} 
                style={{ flex: 1, justifyContent: 'flex-end' }}
            >
                <View style={[styles.modalContenedor, { backgroundColor: colors.superficie, maxHeight: '90%' }]}>
                    
                    <View style={styles.handleContainer}>
                        <View style={[styles.handleBar, { backgroundColor: colors.borde }]} />
                    </View>
 
                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                <View style={[styles.cabeceraModal, { marginTop: -10 }]}>
                    <View style={[styles.contenedorImagenModal, { backgroundColor: colors.inputDeshabilitado, borderColor: colors.borde }]}>
                        {producto.imagen ? (
                            <Image
                                source={{ uri: String(producto.imagen) }}
                                style={styles.imagenModal}
                                contentFit="contain"
                                transition={200}
                                cachePolicy="disk"
                            />
                        ) : (
                            <Text style={styles.imagenModalPlaceholder}>📦</Text>
                        )}
                    </View>
                    <View style={styles.infoModal}>
                        <Text style={[styles.modalTitulo, { color: colors.textoPrincipal }]}>Actualizar Inventario</Text>
                        <Text style={[styles.modalSubtitulo, { color: colors.textoSecundario }]} numberOfLines={2}>{producto.descripcion}</Text>
                        <Text style={[styles.modalCod, { color: colors.textoSecundario, backgroundColor: colors.inputDeshabilitado }]}>CÓDIGO: {producto.codBarras}</Text>
                    </View>
                </View>

                <View style={[styles.filaPrecios, { backgroundColor: colors.fondoPrimario }]}>
                    <View style={styles.precioItem}>
                        <Text style={[styles.precioLabel, { color: colors.textoSecundario }]}>Precio Web</Text>
                        <Text style={[styles.precioValor, { color: colors.textoPrincipal }]}>{formatearPrecio(producto.precioWeb)}</Text>
                    </View>
                    <View style={styles.precioDivisor} />
                    <View style={styles.precioItem}>
                        <Text style={[styles.precioLabel, { color: colors.textoSecundario }]}>Precio Tienda</Text>
                        <Text style={[styles.precioValor, { color: colors.primario }]}>{formatearPrecio(producto.precioTienda)}</Text>
                    </View>
                </View>

                <View style={styles.filaFormulario}>
                    <View style={styles.columnaFormulario}>
                        <Text style={[styles.label, { color: colors.textoSecundario }]}>Stock Físico</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputDeshabilitado, color: colors.textoSecundario, borderColor: colors.borde }]}
                            value={String(producto.stockMaster || 0)}
                            editable={false}
                        />
                    </View>
                    <View style={styles.columnaFormulario}>
                        <Text style={[styles.label, { color: colors.textoSecundario }]}>Vencimiento</Text>
                        <TouchableOpacity
                            style={[
                                styles.inputTouchable, 
                                { backgroundColor: colors.fondoPrimario, borderColor: errors.fv_actual ? '#eb5757' : colors.primario }
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setMostrarDatePicker(true);
                            }}
                        >
                            <Text style={[styles.inputTouchableTexto, { color: colors.textoPrincipal }, !formFV && { color: colors.placeholder }]}>
                                {formFV || 'Seleccionar...'}
                            </Text>
                            <Text style={styles.iconoCalendario}>📅</Text>
                        </TouchableOpacity>
                        {errors.fv_actual && (
                            <Text style={{ color: '#eb5757', fontSize: 10, marginTop: 4, fontWeight: '600' }}>
                                {errors.fv_actual[0]}
                            </Text>
                        )}
                    </View>
                </View>

                    {mostrarDatePicker && (
                        <DateTimePicker
                            value={fechaSeleccionada}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={manejarCambioDeFecha}
                            minimumDate={new Date(2020, 0, 1)}
                            themeVariant={isDark ? 'dark' : 'light'}
                        />
                    )}

                    <Text style={[styles.label, { color: colors.textoSecundario }]}>Fecha de Edición</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputDeshabilitado, color: colors.textoSecundario, borderColor: colors.borde }]}
                        value={formFechaEdicion}
                        editable={false}
                    />

                    <Text style={[styles.label, { color: colors.textoSecundario }]}>Comentarios</Text>
                    <TextInput
                        style={[
                            styles.input, 
                            styles.inputMultilinea, 
                            { backgroundColor: colors.inputFondo, color: colors.textoPrincipal, borderColor: errors.comentarios ? '#eb5757' : colors.borde }
                        ]}
                        multiline
                        returnKeyType="done"
                        value={formComentario}
                        onChangeText={(val) => {
                            setFormComentario(val);
                            if (errors.comentarios) {
                                setErrors(prev => {
                                    const { comentarios, ...rest } = prev;
                                    return rest;
                                });
                            }
                        }}
                        placeholder="Añadir nota de revisión..."
                        placeholderTextColor={colors.placeholder}
                    />
                    {errors.comentarios && (
                        <Text style={{ color: '#eb5757', fontSize: 10, marginTop: 4, fontWeight: '600' }}>
                            {errors.comentarios[0]}
                        </Text>
                    )}

                    <View style={styles.filaBotones}>
                        <TouchableOpacity
                            style={[styles.boton, { backgroundColor: colors.textoSecundario }]}
                            onPress={onCancelar}
                        >
                            <Text style={styles.textoBoton}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.boton, 
                                { backgroundColor: isSubmitting ? colors.inputDeshabilitado : colors.primario },
                                isSubmitting && { borderColor: 'transparent' }
                            ]}
                            onPress={handleConfirmar}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={colors.textoPrincipal} size="small" />
                            ) : (
                                <Text style={styles.textoBoton}>Confirmar</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBase: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    modalContenedor: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        elevation: 20,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 14,
    },
    handleBar: {
        width: 45,
        height: 5,
        borderRadius: 5,
    },
    cabeceraModal: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 14,
    },
    contenedorImagenModal: {
        width: 80,
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    imagenModal: {
        width: '100%',
        height: '100%',
    },
    imagenModalPlaceholder: {
        fontSize: 32,
    },
    infoModal: {
        flex: 1,
    },
    modalTitulo: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 2,
    },
    modalSubtitulo: {
        fontSize: 14,
        marginBottom: 6,
        fontWeight: '500',
    },
    modalCod: {
        fontSize: 11,
        fontFamily: 'monospace',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        fontWeight: 'bold',
    },
    filaPrecios: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    precioItem: {
        alignItems: 'center',
    },
    precioLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    precioValor: {
        fontSize: 16,
        fontWeight: '900',
    },
    precioDivisor: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    filaFormulario: {
        flexDirection: 'row',
        gap: 12,
    },
    columnaFormulario: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 6,
        marginTop: 12,
        letterSpacing: 0.5,
    },
    input: {
        borderWidth: 1.5,
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        fontWeight: '500',
    },
    inputMultilinea: {
        height: 80,
        textAlignVertical: 'top',
    },
    inputTouchable: {
        borderWidth: 1.5,
        borderRadius: 10,
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    inputTouchableTexto: {
        fontSize: 16,
        fontWeight: '600',
    },
    iconoCalendario: {
        fontSize: 18,
    },
    filaBotones: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
        paddingBottom: 10,
        gap: 12,
    },
    boton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
    },
    textoBoton: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

