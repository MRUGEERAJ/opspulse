import "@react-native/js-polyfills/error-guard";

import mock from "@react-native/jest-preset/jest/mock";

global.__DEV__ = true;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;

Object.defineProperties(global, {
  cancelAnimationFrame: {
    configurable: true,
    value(id) {
      return clearTimeout(id);
    },
    writable: true
  },
  nativeFabricUIManager: {
    configurable: true,
    value: {},
    writable: true
  },
  performance: {
    configurable: true,
    value: {
      now: jest.fn(Date.now)
    },
    writable: true
  },
  requestAnimationFrame: {
    configurable: true,
    value(callback) {
      return setTimeout(() => callback(jest.now()), 0);
    },
    writable: true
  },
  window: {
    configurable: true,
    value: global,
    writable: true
  }
});

mock("m#react-native/Libraries/AppState/AppState", "m#./mocks/AppState");
mock(
  "m#react-native/Libraries/BatchedBridge/NativeModules",
  "m#./mocks/NativeModules"
);
mock(
  "m#react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo",
  "m#./mocks/AccessibilityInfo"
);
mock(
  "m#react-native/Libraries/Components/ActivityIndicator/ActivityIndicator",
  "m#./mocks/ActivityIndicator"
);
mock(
  "m#react-native/Libraries/Components/RefreshControl/RefreshControl",
  "m#./mocks/RefreshControl"
);
mock(
  "m#react-native/Libraries/Components/ScrollView/ScrollView",
  "m#./mocks/ScrollView"
);
mock(
  "m#react-native/Libraries/Components/TextInput/TextInput",
  "m#./mocks/TextInput"
);
mock("m#react-native/Libraries/Components/View/View", "m#./mocks/View");
mock(
  "m#react-native/Libraries/Components/View/ViewNativeComponent",
  "m#./mocks/ViewNativeComponent"
);
mock(
  "m#react-native/Libraries/Core/InitializeCore",
  "m#./mocks/InitializeCore"
);
mock("m#react-native/Libraries/Core/NativeExceptionsManager");
mock("m#react-native/Libraries/Image/Image", "m#./mocks/Image");
mock("m#react-native/Libraries/Linking/Linking", "m#./mocks/Linking");
mock("m#react-native/Libraries/Modal/Modal", "m#./mocks/Modal");
mock(
  "m#react-native/Libraries/NativeComponent/NativeComponentRegistry",
  "m#./mocks/NativeComponentRegistry"
);
mock(
  "m#react-native/Libraries/ReactNative/RendererProxy",
  "m#./mocks/RendererProxy"
);
mock(
  "m#react-native/Libraries/ReactNative/requireNativeComponent",
  "m#./mocks/requireNativeComponent"
);
mock("m#react-native/Libraries/ReactNative/UIManager", "m#./mocks/UIManager");
mock("m#react-native/Libraries/Text/Text", "m#./mocks/Text");
mock(
  "m#react-native/Libraries/Utilities/useColorScheme",
  "m#./mocks/useColorScheme"
);
mock("m#react-native/Libraries/Vibration/Vibration", "m#./mocks/Vibration");

jest.mock("react-native-keychain", () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY"
  },
  getGenericPassword: jest.fn(async () => false),
  resetGenericPassword: jest.fn(async () => true),
  setGenericPassword: jest.fn(async () => true)
}));

jest.mock("react-native-config", () => ({
  __esModule: true,
  default: {
    API_URL: "http://127.0.0.1:3000"
  }
}));
