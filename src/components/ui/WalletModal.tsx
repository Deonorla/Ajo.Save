// WalletModal.tsx

import { Wallet, QrCode, ArrowRight, X } from "lucide-react";

// Define the shape of the props
interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWalletConnect: () => void;
  onSelectMetamask: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  onSelectWalletConnect,
  onSelectMetamask,
}) => {
  if (!isOpen) return null;

  // Simple overlay and modal structure with Tailwind CSS classes
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-background border border-primary/20 rounded-xl p-6 w-11/12 max-w-sm shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-2">Connect Wallet</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Choose a wallet to connect to Ajo.Save
        </p>

        <div className="space-y-4">
          {/* WalletConnect Option */}
          <button
            onClick={onSelectWalletConnect}
            className="w-full flex items-center justify-between p-4 bg-primary/10 hover:bg-primary/20 transition-colors duration-200 rounded-lg border border-primary/20 group"
          >
            <div className="flex items-center space-x-3">
              <QrCode className="h-5 w-5 text-primary" />
              <span className="font-semibold text-white">WalletConnect</span>
            </div>
            <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
          </button>

          {/* MetaMask Option */}
          {/* <button
            onClick={onSelectMetamask}
            className="w-full flex items-center justify-between p-4 bg-gray-700/50 hover:bg-gray-700 transition-colors duration-200 rounded-lg border border-gray-600 group"
          >
            <div className="flex items-center space-x-3">
              <Wallet className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-white">MetaMask / EVM</span>
            </div>
            <ArrowRight className="h-5 w-5 text-yellow-500 group-hover:translate-x-1 transition-transform" />
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
