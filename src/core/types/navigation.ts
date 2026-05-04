// ARCHIVO: src/core/types/navigation.ts
export type RootStackParamList = {
  Login: undefined;
  InventarioList: { marca?: string } | undefined;
  Scanner: undefined;
  Analytics: undefined;
  Historial: undefined;
  PickingList: undefined;
  StorePanel: { pedidoId?: string } | undefined;
  LogisticsHistory: undefined;
  ControlMarcas: undefined;
  MarcaConfig: { marcaId: string; nombre: string; diasRango: number; inventariar: boolean };
  BrandAudit: { marca: string };
};
