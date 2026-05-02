// jest.setup.js
// Mocks must be at the top (they are hoisted, but better to be explicit)
global.process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
global.process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
global.process.env.EXPO_PUBLIC_CLOUD_FUNCTION_URL = 'https://test.supabase.co/functions/v1/proxy';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-audio
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn().mockImplementation(() => ({
    play: jest.fn(),
    seekTo: jest.fn(),
  })),
}));

// Mock sonidos utility
jest.mock('./src/core/utils/sonidos', () => ({
  precargarSonidos: jest.fn(),
  reproducirSonido: jest.fn(),
}));

// Mock expo-image
jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: (props) => React.createElement(View, props),
  };
});

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'file:///manipulated.jpg' }),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

// Mock global expo properties
global.ExponentAsset = {
  downloadAsync: jest.fn(),
};

// Mock expo-camera
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: (props) => React.createElement(View, props),
    useCameraPermissions: jest.fn(() => [
        { granted: true, status: 'granted' },
        jest.fn().mockResolvedValue({ granted: true, status: 'granted' })
    ]),
  };
});

// Mock Expo Modules Core
jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    removeAllListeners: jest.fn(),
    emit: jest.fn(),
  })),
  NativeModule: jest.fn(),
  ProxyNativeModule: jest.fn(),
}));

// Mock Expo Font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn().mockReturnValue(true),
  isLoading: jest.fn().mockReturnValue(false),
}));

// Mock Vector Icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Ionicons: (props) => React.createElement(View, props),
    AntDesign: (props) => React.createElement(View, props),
    MaterialIcons: (props) => React.createElement(View, props),
  };
});

// Mock WatermelonDB Core
const mockTable = {
    query: jest.fn().mockReturnThis(),
    fetch: jest.fn().mockResolvedValue([]),
    fetchCount: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((fn) => {
        const item = {
            update: jest.fn().mockImplementation((updateFn) => {
                if (updateFn) updateFn(item);
                return Promise.resolve(item);
            }),
            destroyPermanently: jest.fn().mockResolvedValue(undefined),
        };
        if (fn) fn(item);
        return Promise.resolve(item);
    }),
    find: jest.fn().mockResolvedValue({}),
    observeWithColumns: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
};

jest.mock('@nozbe/watermelondb', () => ({
  Model: class {
      static associations = {};
      update = jest.fn(fn => fn(this));
      destroyPermanently = jest.fn().mockResolvedValue(undefined);
  },
  Database: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockReturnValue(mockTable),
    write: jest.fn(fn => fn()),
  })),
  appSchema: jest.fn(s => s),
  tableSchema: jest.fn(s => s),
  Q: {
    where: jest.fn(),
    or: jest.fn(),
    and: jest.fn(),
    sortBy: jest.fn(),
    take: jest.fn(),
    desc: 'DESC',
    asc: 'ASC',
    like: jest.fn(),
    oneOf: jest.fn(),
    eq: jest.fn(),
    lt: jest.fn(),
    gt: jest.fn(),
    lte: jest.fn(),
    gte: jest.fn(),
    sanitizeLikeString: jest.fn(s => s),
  },
}));

// Mock WatermelonDB Migrations
jest.mock('@nozbe/watermelondb/Schema/migrations', () => ({
  schemaMigrations: jest.fn(s => s),
  createTable: jest.fn(s => s),
  addColumns: jest.fn(s => s),
}));

// Mock WatermelonDB SQLite Adapter
jest.mock('@nozbe/watermelondb/adapters/sqlite', () => {
    return jest.fn().mockImplementation(() => ({}));
});

// Mock WatermelonDB Sync
jest.mock('@nozbe/watermelondb/sync', () => ({
  synchronize: jest.fn().mockResolvedValue(undefined),
}));

// Mock WatermelonDB Decorators
const mockDecorator = () => (target, key) => {};
jest.mock('@nozbe/with-observables', () => () => (comp) => comp);
jest.mock('@nozbe/watermelondb/decorators', () => ({
  field: mockDecorator,
  text: mockDecorator,
  date: mockDecorator,
  readonly: (target, key) => {},
  children: mockDecorator,
  relation: mockDecorator,
}));

// Mock Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock Theme
jest.mock('./src/core/ui/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      fondo: '#fff',
      superficie: '#fff',
      borde: '#eee',
      textoPrincipal: '#000',
      textoSecundario: '#666',
      textoTerciario: '#999',
      primario: '#0075de',
      fondoPrimario: '#e0f2fe',
      error: '#f00',
      placeholder: '#ccc',
      fondoBuscador: '#fafafa',
    },
    isDark: false,
    toggleTheme: jest.fn(),
  }),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    then: jest.fn(cb => cb({ data: [], error: null })),
    storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://photo.url' } }),
    },
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'test-uuid' } }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    }
  }),
}));

// Mock Expo Modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 1, Light: 0 },
  NotificationFeedbackType: { Success: 0, Error: 1 },
}));

// Mock Alert and Linking
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(true),
  canOpenURL: jest.fn().mockResolvedValue(true),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  getInitialURL: jest.fn().mockResolvedValue(null),
}));

// Mock Safe Area
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, style }) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Mock FileSystem
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///test/',
  cacheDirectory: 'file:///cache/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  moveAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { Base64: 'base64' },
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn().mockReturnValue(jest.fn()),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
  useNetInfo: jest.fn().mockReturnValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
  NetInfoStateType: {
    unknown: 'unknown',
    none: 'none',
    wifi: 'wifi',
    cellular: 'cellular',
  },
}));

// Mock TurboModuleRegistry and Native Modules constants
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
    getEnforcing: jest.fn((name) => {
        if (name === 'DeviceInfo') return { getConstants: () => ({}) };
        if (name === 'StatusBarManager') return { getConstants: () => ({ height: 20 }), setStyle: jest.fn() };
        return {};
    }),
    get: jest.fn((name) => {
        if (name === 'DeviceInfo') return { getConstants: () => ({}) };
        return {};
    }),
    enforce: jest.fn(() => ({})),
}));

jest.mock('react-native/src/private/specs_DEPRECATED/modules/NativeDeviceInfo', () => ({
    __esModule: true,
    default: {
        getConstants: () => ({
            Dimensions: {
                window: { width: 400, height: 800, scale: 2, fontScale: 1 },
                screen: { width: 400, height: 800, scale: 2, fontScale: 1 },
            }
        }),
    },
}));

jest.mock('react-native/Libraries/Utilities/NativePlatformConstantsIOS', () => ({
    __esModule: true,
    default: {
        getConstants: () => ({
            forceTouchAvailable: false,
            interfaceStyle: 'light',
            isTesting: true,
            osVersion: '15.0',
            reactNativeVersion: { major: 0, minor: 72, patch: 0 },
            systemName: 'iOS',
        }),
    },
}));

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
    return class {
        addListener = jest.fn(() => ({ remove: jest.fn() }));
        removeListeners = jest.fn();
        removeAllListeners = jest.fn();
    };
});

jest.mock('react-native/Libraries/ReactNative/NativeI18nManager', () => ({
    __esModule: true,
    default: {
        getConstants: () => ({ isRTL: false, doLeftAndRightSwapInRTL: true }),
    },
}));

// Mock StatusBarManager completo
jest.mock('react-native/Libraries/Components/StatusBar/StatusBar', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        __esModule: true,
        default: (props) => React.createElement(View, props),
        setHidden: jest.fn(),
        setBarStyle: jest.fn(),
        setBackgroundColor: jest.fn(),
        setTranslucent: jest.fn(),
        setNetworkActivityIndicatorVisible: jest.fn(),
    };
});

jest.mock('react-native/Libraries/Components/StatusBar/NativeStatusBarManagerAndroid', () => ({
    __esModule: true,
    default: {
        getConstants: () => ({
            DEFAULT_BACKGROUND_COLOR: 0,
            HEIGHT: 24,
            TRANSLUCENT: true,
        }),
        setHidden: jest.fn(),
        setColor: jest.fn(),
        setTranslucent: jest.fn(),
        setStyle: jest.fn(),
    },
}));

jest.mock('react-native/Libraries/Components/StatusBar/NativeStatusBarManagerIOS', () => ({
    __esModule: true,
    default: {
        getConstants: () => ({
            DEFAULT_BACKGROUND_COLOR: 0,
            HEIGHT: 20,
        }),
        setHidden: jest.fn(),
        setStyle: jest.fn(),
        setNetworkActivityIndicatorVisible: jest.fn(),
    },
}));

jest.mock('react-native/Libraries/Utilities/NativeDeviceInfo', () => ({
    __esModule: true,
    default: {
        getConstants: () => ({
            Dimensions: {
                window: { width: 400, height: 800, scale: 2, fontScale: 1 },
                screen: { width: 400, height: 800, scale: 2, fontScale: 1 },
            }
        }),
    },
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
    const reanimatedMock = require('react-native-reanimated/mock');
    return {
        ...reanimatedMock,
        // Añadir cualquier export faltante en el mock oficial si es necesario
    };
});

// Mock Worklets (Requerido por Reanimated v4)
jest.mock('react-native-worklets', () => ({
    Worklets: {
        createRunOnJS: jest.fn(fn => fn),
        createRunOnUI: jest.fn(fn => fn),
        createSharedValue: jest.fn(val => ({ value: val })),
    },
    createSerializable: jest.fn(val => val),
    isWorklet: jest.fn(() => false),
    isWorkletFunction: jest.fn(() => false),
    WorkletRuntime: jest.fn(),
    serializableMappingCache: new Map(),
    scheduleOnUI: jest.fn(fn => fn),
    RuntimeKind: {
        JS: 0,
        UI: 1,
    },
}));

// Mock FlashList
jest.mock('@shopify/flash-list', () => {
    const React = require('react');
    const { FlatList } = require('react-native');
    return {
        FlashList: (props) => React.createElement(FlatList, props),
    };
});

// Mock UI Components
jest.mock('./src/core/ui/BottomBar', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        BottomBar: () => React.createElement(View),
    };
});

// Polyfills para Reanimated en Node
global._WORKLET = false;
global._IS_FABRIC = false;

require('react-native-gesture-handler/jestSetup');

