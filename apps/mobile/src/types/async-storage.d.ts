declare module '@react-native-async-storage/async-storage' {
  type AsyncStorageStatic = {
    clear: () => Promise<void>;
    getItem: (key: string) => Promise<string | null>;
    removeItem: (key: string) => Promise<void>;
    setItem: (key: string, value: string) => Promise<void>;
  };

  const AsyncStorage: AsyncStorageStatic;

  export default AsyncStorage;
}
