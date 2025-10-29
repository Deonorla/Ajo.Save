import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { WalletProvider } from "./auth/WalletContext.tsx";
import { AllWalletsProvider } from "./services/wallets/AllWalletsProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <AllWalletsProvider>
          <App />
        </AllWalletsProvider>
      </WalletProvider>
    </BrowserRouter>
  </StrictMode>
);
