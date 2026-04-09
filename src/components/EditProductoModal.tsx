import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import Modal from 'react-native-modal';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { ProductoInventario } from '../types/inventario';
import { formatearFecha } from '../utils/fecha';
import { formatearPrecio } from '../utils/formato';
import { useTheme } from '../context/ThemeContext';

interface Props {
    visible: boolean;
    producto: ProductoInventario | null;
    onGuardar: (fv: string, fechaEdicion: string, comentario: string) => void;
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

    const [formFV, setFormFV] = useState<string>('');
    const [formFechaEdicion] = useState<string>(new Date().toLocaleDateString('es-ES'));
    const [formComentario, setFormComentario] = useState<string>('');
    const [mostrarDatePicker, setMostrarDatePicker] = useState<boolean>(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());

    React.useEffect(() => {
        if (producto) {
            const fvStr = formatearFecha(producto.FV_Actual);  
            setFormFV(fvStr);
            setFormComentario(producto.Comentarios ? String(producto.Comentarios) : '');

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
            setFormFV(`${dia}/${mes}/${anio}`);
        }
    };

    useEffect(() => {
        if (!visible) setIsSubmitting(false);
    }, [visible]);

    if (!producto) return null;

    return (
        <Modal 
            isVisible={visible} 
            onBackdropPress={onCancelar}
            onSwipeComplete={onCancelar}
            swipeDirection="down"
            style={styles.modalBase}
            avoidKeyboard={Platform.OS === 'ios'}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1, justifyContent: 'flex-end' }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={[styles.modalContenedor, { backgroundColor: colors.superficie, maxHeight: '90%' }]}>
                    
                    {/* 📌 BARRA DE ARRASTRE TIPO iOS */}
                    <View style={styles.handleContainer}>
                        <View style={[styles.handleBar, { backgroundColor: colors.borde }]} />
                    </View>

                    {/* SCROLL PARA EVITAR CLIPPING CON TECLADO */}
                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                {/* Cabecera / Imagen */}
                <View style={[styles.cabeceraModal, { marginTop: -10 }]}>
                    <View style={[styles.contenedorImagenModal, { backgroundColor: colors.inputDeshabilitado, borderColor: colors.borde }]}>
                        {producto.Imagen ? (
                            <Image
                                source={{ uri: String(producto.Imagen) }}
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
                        <Text style={[styles.modalSubtitulo, { color: colors.textoSecundario }]} numberOfLines={2}>{producto.Descripcion}</Text>
                        <Text style={[styles.modalCod, { color: colors.textoSecundario, backgroundColor: colors.inputDeshabilitado }]}>CÓDIGO: {producto.Cod_Barras}</Text>
                    </View>
                </View>

                {/* Resumen de Precios */}
                <View style={[styles.filaPrecios, { backgroundColor: colors.fondoPrimario }]}>
                    <View style={styles.precioItem}>
                        <Text style={[styles.precioLabel, { color: colors.textoSecundario }]}>Precio Web</Text>
                        <Text style={[styles.precioValor, { color: colors.textoPrincipal }]}>{formatearPrecio(producto.Precio_Web)}</Text>
                    </View>
                    <View style={styles.precioDivisor} />
                    <View style={styles.precioItem}>
                        <Text style={[styles.precioLabel, { color: colors.textoSecundario }]}>Precio Tienda</Text>
                        <Text style={[styles.precioValor, { color: colors.primario }]}>{formatearPrecio(producto.Precio_Tienda)}</Text>
                    </View>
                </View>

                {/* Fila Stock (solo lectura) + Vencimiento */}
                <View style={styles.filaFormulario}>
                    <View style={styles.columnaFormulario}>
                        <Text style={[styles.label, { color: colors.textoSecundario }]}>Stock Físico</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputDeshabilitado, color: colors.textoSecundario, borderColor: colors.borde }]}
                            value={String(producto.Stock_Master || 0)}
                            editable={false}
                        />
                    </View>
                    <View style={styles.columnaFormulario}>
                        <Text style={[styles.label, { color: colors.textoSecundario }]}>Vencimiento</Text>
                        <TouchableOpacity
                            style={[styles.inputTouchable, { backgroundColor: colors.fondoPrimario, borderColor: colors.primario }]}
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
                    </View>
                </View>

                    {/* Selector Nativo */}
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
                        style={[styles.input, styles.inputMultilinea, { backgroundColor: colors.inputFondo, color: colors.textoPrincipal, borderColor: colors.borde }]}
                        multiline
                        returnKeyType="done"
                        value={formComentario}
                        onChangeText={setFormComentario}
                        placeholder="Añadir nota de revisión..."
                        placeholderTextColor={colors.placeholder}
                    />

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
                            onPress={() => {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                setIsSubmitting(true);
                                onGuardar(formFV, formFechaEdicion, formComentario);
                            }}
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
