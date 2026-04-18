// ARCHIVO: src/core/constants/mensajes.ts

export const MENSAJES = {
    // Notificaciones (Toasts)
    EXITO_GUARDADO: '✅ Guardado exitoso',
    EXITO_GUARDADO_SUB: (id: string) => `Las modificaciones de ${id} se sincronizaron.`,
    EXITO_MODO_OFFLINE: '✅ Guardado (Modo Offline)',
    EXITO_MODO_OFFLINE_SUB: 'Cambio guardado localmente. Se enviará a Excel al recuperar conexión.',
    ERROR_GUARDADO: '❌ Error al guardar',
    ERROR_GUARDADO_DB: 'No se pudo insertar en la base de datos.',
    ERROR_NO_ENCONTRADO: '❌ No encontrado',
    ERROR_NO_ENCONTRADO_SUB: (cod: string) => `El código ${cod} no existe en stock.`,
    
    // Estados de Carga y Errores
    CARGANDO_INVENTARIO: 'Sincronizando con la nube...',
    ERROR_CONEXION_REALTIME: 'Error de conexión en tiempo real. Reintentando...',
    ERROR_NUBE_INICIAL: 'No se pudo conectar con los servicios en la nube (Supabase).\nVerifica tu conexión a internet inicial.',
    REINTENTAR_CONEXION: 'Reintentar Conexión',

    // UI Labels - Lista
    TITULO_APP: 'Inventario Activo',
    PRODUCTOS_REGISTRADOS: (cont: number, total: number, filtrando: boolean) => 
        filtrando ? `${cont} de ${total} productos` : `${total} productos registrados`,
    BUSCAR_PLACEHOLDER: 'Buscar SKU, código o título...',
    SIN_RESULTADOS: (busqueda: string) => busqueda ? `Sin resultados para "${busqueda}"` : 'Sin inventario',
    MODO_OFFLINE_BANNER: (sync: string) => `📵 Caché local · Última sync: ${sync}`,

    // Filtros y Orden
    FILTRO_TODOS: 'Todos',
    FILTRO_VENCIDOS: 'Vencidos',
    FILTRO_30_DIAS: '< 30 d',
    FILTRO_90_DIAS: '< 90 d',
    ORDEN_MARCA: 'Marca',
    ORDEN_STOCK: 'Stock',
    ORDEN_VENCE: 'Vence',

    // Escáner
    MODO_EDICION: 'Modo Edición',
    ALINEA_CODIGO: 'Alinea el código en el centro',
    TERMINAR_LOTE: '✕ Terminar Lote',

    // Analíticas
    DASHBOARD_TITULO: 'Dashboard Analítico',
    SALUD_LABEL: 'Salud Inventario',
    PERDIDA_LABEL: 'Pérdida Estimada',
    STOCK_FISICO_TITULO: 'Estado del Stock Físico',
    MARCAS_RIESGO_TITULO: (dias: number) => `Top Marcas en Riesgo (< ${dias} días)`,
    MARCAS_RIESGO_VACIO: '¡Excelente! Ninguna marca en riesgo inminente.',
    IA_RECOMENDACIONES: '🧠 Recomendaciones (IA)',
    EXPORTAR_PDF: '🖨️ Compartir Reporte Gerencial PDF',
};
