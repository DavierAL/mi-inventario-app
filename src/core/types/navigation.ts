// ARCHIVO: src/core/types/navigation.ts
export type RootStackParamList = {
  Login: undefined;
  InventarioList: undefined;
  Scanner: undefined;
  Analytics: undefined;
  Historial: undefined;
  PickingList: undefined;
  StorePanel: { pedidoId?: string } | undefined;
  LogisticsHistory: undefined;
};
