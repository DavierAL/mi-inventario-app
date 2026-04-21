import { useInventarioStore } from '../useInventarioStore';

describe('useInventarioStore', () => {
    beforeEach(() => {
        // Reset store state
        useInventarioStore.setState({
            productos: [],
            cargando: false,
            error: null
        });
    });

    it('inicia con estado vacio', () => {
        const state = useInventarioStore.getState();
        expect(state.productos).toEqual([]);
        expect(state.cargando).toBe(false);
    });

    it('actualiza el estado de carga', () => {
        useInventarioStore.getState().setCargando(true);
        expect(useInventarioStore.getState().cargando).toBe(true);
    });
});
