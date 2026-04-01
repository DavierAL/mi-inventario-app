// ARCHIVO: src/components/EditProductoModal.tsx

import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    Modal, StyleSheet, Platform, Alert,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ProductoInventario } from '../types/inventario';

interface Props {
    visible: boolean;
    producto: ProductoInventario | null;
    guardando: boolean;
    onGuardar: (fv: string, fechaEdicion: string, comentario: string) => void;
    onCancelar: () => void;
}

export const EditProductoModal: React.FC<Props> = ({
    visible,
    producto,
    guardando,
    onGuardar,
    onCancelar,
}) => {
    const [formFV, setFormFV] = useState<string>('');
    const [formFechaEdicion] = useState<string>(new Date().toLocaleDateString('es-ES'));
    const [formComentario, setFormComentario] = useState<string>('');

    // Estado del DateTimePicker
    const [mostrarDatePicker, setMostrarDatePicker] = useState<boolean>(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());

    // Sincronizamos los campos cuando cambia el producto a editar
    React.useEffect(() => {
        if (producto) {
            const fvStr = producto.FV_Actual ? String(producto.FV_Actual) : '';
            setFormFV(fvStr);
            setFormComentario(producto.Comentarios ? String(producto.Comentarios) : '');

            // Si el producto ya tiene una fecha de vencimiento válida, la usamos como valor inicial del picker
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
        setMostrarDatePicker(Platform.OS === 'ios'); // En iOS el picker se mantiene visible
        if (fecha) {
            setFechaSeleccionada(fecha);
            // Formateamos la fecha a DD/MM/AAAA para guardarla
            const dia = String(fecha.getDate()).padStart(2, '0');
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const anio = fecha.getFullYear();
            setFormFV(`${dia}/${mes}/${anio}`);
        }
    };

    const handleGuardar = () => {
        onGuardar(formFV, formFechaEdicion, formComentario);
    };

    if (!producto) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalFondo}>
                <View style={styles.modalContenedor}>
                    <Text style={styles.modalTitulo}>Actualizar Inventario</Text>
                    <Text style={styles.modalSubtitulo} numberOfLines={2}>{producto.Descripcion}</Text>
                    <Text style={styles.modalCod}>CÓDIGO: {producto.Cod_Barras}</Text>

                    {/* Fila Stock (solo lectura) + Vencimiento */}
                    <View style={styles.filaFormulario}>
                        <View style={styles.columnaFormulario}>
                            <Text style={styles.label}>Stock Actual</Text>
                            <TextInput
                                style={[styles.input, styles.inputDeshabilitado]}
                                value={String(producto.Stock_Master || 0)}
                                editable={false}
                            />
                        </View>
                        <View style={styles.columnaFormulario}>
                            <Text style={styles.label}>Vencimiento</Text>
                            {/* Tocando este campo abre el DatePicker nativo */}
                            <TouchableOpacity
                                style={styles.inputTouchable}
                                onPress={() => setMostrarDatePicker(true)}
                            >
                                <Text style={[styles.inputTouchableTexto, !formFV && styles.placeholder]}>
                                    {formFV || 'Seleccionar fecha'}
                                </Text>
                                <Text style={styles.iconoCalendario}>📅</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* DateTimePicker nativo (se muestra/oculta según estado) */}
                    {mostrarDatePicker && (
                        <DateTimePicker
                            value={fechaSeleccionada}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={manejarCambioDeFecha}
                            minimumDate={new Date(2020, 0, 1)}
                        />
                    )}

                    <Text style={styles.label}>Fecha de Actualización</Text>
                    <TextInput
                        style={[styles.input, styles.inputDeshabilitado]}
                        value={formFechaEdicion}
                        editable={false}
                    />

                    <Text style={styles.label}>Observaciones / Comentarios</Text>
                    <TextInput
                        style={[styles.input, styles.inputMultilinea]}
                        multiline
                        returnKeyType="done"
                        value={formComentario}
                        onChangeText={setFormComentario}
                        placeholder="Añadir una nota..."
                        placeholderTextColor="#A0AEC0"
                    />

                    <View style={styles.filaBotones}>
                        <TouchableOpacity
                            style={[styles.boton, styles.botonCancelar]}
                            onPress={onCancelar}
                        >
                            <Text style={styles.textoBoton}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.boton, styles.botonGuardar]}
                            onPress={handleGuardar}
                            disabled={guardando}
                        >
                            <Text style={styles.textoBoton}>
                                {guardando ? 'Procesando...' : 'Confirmar Cambios'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalFondo: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContenedor: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 20,
    },
    modalTitulo: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1A202C',
        marginBottom: 4,
    },
    modalSubtitulo: {
        fontSize: 15,
        color: '#4A5568',
        marginBottom: 8,
        fontWeight: '500',
    },
    modalCod: {
        fontSize: 12,
        color: '#718096',
        fontFamily: 'monospace',
        marginBottom: 20,
        backgroundColor: '#EDF2F7',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
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
        color: '#4A5568',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 6,
        marginTop: 12,
        letterSpacing: 0.5,
    },
    input: {
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        color: '#2D3748',
        backgroundColor: '#F7FAFC',
        fontWeight: '500',
    },
    inputDeshabilitado: {
        backgroundColor: '#EDF2F7',
        color: '#A0AEC0',
    },
    inputMultilinea: {
        height: 80,
        textAlignVertical: 'top',
    },
    // Reemplaza el TextInput de fecha por un botón que abre el DatePicker
    inputTouchable: {
        borderWidth: 1.5,
        borderColor: '#3182CE',
        borderRadius: 10,
        padding: 14,
        backgroundColor: '#EBF8FF',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 0,
    },
    inputTouchableTexto: {
        fontSize: 16,
        color: '#2D3748',
        fontWeight: '600',
    },
    placeholder: {
        color: '#A0AEC0',
        fontWeight: '400',
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
    botonCancelar: {
        backgroundColor: '#A0AEC0',
    },
    botonGuardar: {
        backgroundColor: '#3182CE',
    },
    textoBoton: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
