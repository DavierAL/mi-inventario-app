// jest.setup.js

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

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
    create: jest.fn().mockResolvedValue({}),
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
    desc: 'DESC',
    asc: 'ASC',
    like: jest.fn(),
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

// Mock linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(true),
  canOpenURL: jest.fn().mockResolvedValue(true),
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

// Mock UI Components
jest.mock('./src/core/ui/BottomBar', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        BottomBar: () => React.createElement(View),
    };
});
