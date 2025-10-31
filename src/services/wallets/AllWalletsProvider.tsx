import type { ReactNode } from "react";
<<<<<<< HEAD
// import { MetamaskContextProvider } from "../../contexts/MetamaskContext";
import { WalletConnectContextProvider } from "../../contexts/WalletConnectContext";
// import { MetaMaskClient } from "./metamask/metamaskClient";
=======
import { MetamaskContextProvider } from "../../contexts/MetamaskContext";
import { WalletConnectContextProvider } from "../../contexts/WalletConnectContext";
import { MetaMaskClient } from "./metamask/metamaskClient";
>>>>>>> repoB/wallectconnect-Integration
import { WalletConnectClient } from "./walletconnect/walletConnectClient";

export const AllWalletsProvider = (props: {
  children: ReactNode | undefined;
}) => {
  return (
<<<<<<< HEAD
    // <MetamaskContextProvider>
    <WalletConnectContextProvider>
      {/* <MetaMaskClient /> */}
      <WalletConnectClient />
      {props.children}
    </WalletConnectContextProvider>
    // </MetamaskContextProvider>
=======
    <MetamaskContextProvider>
      <WalletConnectContextProvider>
        <MetaMaskClient />
        <WalletConnectClient />
        {props.children}
      </WalletConnectContextProvider>
    </MetamaskContextProvider>
>>>>>>> repoB/wallectconnect-Integration
  );
};
