import React from "react";
import { useWallet } from "../../auth/WalletContext";

interface Props {
  onClose: () => void;
}

export const WalletConnectModal: React.FC<Props> = ({ onClose }) => {
  const { connectMetaMask, error } = useWallet();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-80">
        <h2 className="text-xl font-semibold mb-4">Connect Wallet</h2>

        <button
          onClick={async () => {
            await connectMetaMask();
            onClose();
          }}
          className="w-full py-2 px-4 mb-3 bg-yellow-400 hover:bg-yellow-500 rounded-xl"
        >
          MetaMask
        </button>

        {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 px-4 border rounded-xl"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
