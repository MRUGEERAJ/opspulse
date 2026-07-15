declare module '@react-native-community/netinfo' {
  export type NetInfoState = {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
  };

  type NetInfoListener = (state: NetInfoState) => void;

  type NetInfoStatic = {
    addEventListener: (listener: NetInfoListener) => () => void;
    fetch: () => Promise<NetInfoState>;
  };

  const NetInfo: NetInfoStatic;

  export default NetInfo;
}
