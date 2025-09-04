import "@rainbow-me/rainbowkit/styles.css";
import {
  connectorsForWallets,
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider, createConfig, http } from "wagmi";
import { hederaTestnet } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import {
  metaMaskWallet,
  injectedWallet,
  coinbaseWallet,
  walletConnectWallet,
  trustWallet,
  ledgerWallet,
  braveWallet,
  phantomWallet,
} from "@rainbow-me/rainbowkit/wallets";

const projectId = "dey-play-projectId"; // Replace with your actual WalletConnect Project ID

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        walletConnectWallet,
        injectedWallet,
      ],
    },
    {
      groupName: "Other",
      wallets: [trustWallet, ledgerWallet, braveWallet, phantomWallet],
    },
  ],
  {
    appName: "Dey.Play",
    projectId,
  }
);

const queryClient = new QueryClient();

const config = createConfig({
  chains: [hederaTestnet],
  connectors,
  transports: {
    [hederaTestnet.id]: http(),
  },
});

const Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider
        modalSize="compact"
        showRecentTransactions={true}
        theme={{
          blurs: {
            modalOverlay: "blur(8px)",
          },
          colors: {
            accentColor: "#16a34a",
            accentColorForeground: "white",
            actionButtonBorder: "transparent",
            actionButtonBorderMobile: "transparent",
            actionButtonSecondaryBackground: "transparent",
            closeButtonBackground: "transparent",
            connectButtonBackground: "#16a34a",
            connectButtonBackgroundError: "#dc2626",
            connectButtonInnerBackground: "white",
            connectButtonText: "white",
            connectButtonTextError: "white",
            connectionIndicator: "#16a34a",
            downloadBottomCardBackground: "#f9fafb",
            downloadTopCardBackground: "white",
            modalBackdrop: "rgba(0, 0, 0, 0.5)",
            modalBackground: "white",
            modalBorder: "transparent",
            modalText: "#111827",
            modalTextSecondary: "#6b7280",
            profileAction: "black",
            profileActionHover: "#f3f4f6",
            profileForeground: "#111827",
            selectedOptionBorder: "#16a34a",
            standby: "#6b7280",
            closeButton: "#6b7280",
            error: "#dc2626",
            generalBorder: "#d1d5db",
            generalBorderDim: "#e5e7eb",
            menuItemBackground: "#ffffff",
            modalTextDim: "#9ca3af",
          },
          fonts: {
            body: "system-ui, sans-serif",
          },
          radii: {
            actionButton: "8px",
            connectButton: "8px",
            menuButton: "8px",
            modal: "16px",
            modalMobile: "16px",
          },
          shadows: {
            connectButton: "0 2px 6px rgba(0,0,0,0.08)",
            dialog: "0 4px 32px rgba(0,0,0,0.16)",
            profileDetailsAction: "0 2px 6px rgba(0,0,0,0.08)",
            selectedOption: "0 2px 6px rgba(0,0,0,0.12)",
            walletLogo: "0 2px 6px rgba(0,0,0,0.08)",
            selectedWallet: "0 0 0 2px #16a34a",
          },
        }}
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </RainbowKitProvider>
    </WagmiProvider>
  );
};

export default Provider;
