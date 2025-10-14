/**
 * WalletDiagnostics Component - Fixed infinite refresh loop
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import useHashPackWallet from "@/hooks/useHashPackWallet";
import { useAjoFactory } from "@/hooks/useAjoFactory";

interface DiagnosticItem {
  name: string;
  status: "success" | "error" | "warning" | "loading";
  message: string;
}

const WalletDiagnostics = () => {
  const wallet = useHashPackWallet();
  const factory = useAjoFactory();
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🔥 FIX: Use refs to track previous values and prevent infinite loops
  const prevValuesRef = useRef({
    connected: wallet.connected,
    hasExtension: wallet.hasExtension,
    hasDAppSigner: !!wallet.dAppSigner,
    hasContractWrite: !!factory.contractWrite,
    hasContractRead: !!factory.contractRead,
    isInitializing: wallet.isInitializing,
  });

  const runDiagnostics = useCallback(() => {
    const results: DiagnosticItem[] = [];

    // Check 1: HashPack Extension
    results.push({
      name: "HashPack Extension",
      status: wallet.hasExtension ? "success" : "error",
      message: wallet.hasExtension
        ? "Extension detected"
        : "Extension not found - install HashPack",
    });

    // Check 2: Wallet Connection
    results.push({
      name: "Wallet Connection",
      status: wallet.connected ? "success" : "error",
      message: wallet.connected
        ? `Connected: ${wallet.accountId}`
        : "Not connected - click connect button",
    });

    // Check 3: dAppSigner
    results.push({
      name: "dAppSigner",
      status: wallet.dAppSigner ? "success" : "error",
      message: wallet.dAppSigner
        ? "Signer available"
        : "Signer not initialized",
    });

    // Check 4: Network
    results.push({
      name: "Network",
      status: wallet.network ? "success" : "warning",
      message: wallet.network
        ? `Connected to ${wallet.network}`
        : "Network unknown",
    });

    // Check 5: contractWrite
    results.push({
      name: "Contract Write Instance",
      status: factory.contractWrite ? "success" : "error",
      message: factory.contractWrite
        ? `Contract ready at ${factory.contractWrite.address?.slice(0, 10)}...`
        : "Contract not initialized - may need to reconnect wallet",
    });

    // Check 6: contractRead
    results.push({
      name: "Contract Read Instance",
      status: factory.contractRead ? "success" : "error",
      message: factory.contractRead
        ? "Read contract ready"
        : "Read contract not initialized",
    });

    // Check 7: Session Persistence
    const sessionData = localStorage.getItem("hashconnect_session_v023");
    results.push({
      name: "Session Persistence",
      status: sessionData ? "success" : "warning",
      message: sessionData
        ? "Session saved in localStorage"
        : "No saved session found",
    });

    // Check 8: Initialization
    results.push({
      name: "Initialization",
      status: wallet.isInitializing ? "loading" : "success",
      message: wallet.isInitializing
        ? "Still initializing..."
        : "Initialization complete",
    });

    setDiagnostics(results);
  }, [
    wallet.hasExtension,
    wallet.connected,
    wallet.accountId,
    wallet.dAppSigner,
    wallet.network,
    wallet.isInitializing,
    factory.contractWrite,
    factory.contractRead,
  ]);

  // 🔥 FIX: Only run diagnostics when values actually change
  useEffect(() => {
    const currentValues = {
      connected: wallet.connected,
      hasExtension: wallet.hasExtension,
      hasDAppSigner: !!wallet.dAppSigner,
      hasContractWrite: !!factory.contractWrite,
      hasContractRead: !!factory.contractRead,
      isInitializing: wallet.isInitializing,
    };

    // Check if any value actually changed
    const hasChanged = Object.keys(currentValues).some(
      (key) =>
        currentValues[key as keyof typeof currentValues] !==
        prevValuesRef.current[key as keyof typeof currentValues]
    );

    if (hasChanged) {
      console.log("🔄 Diagnostics values changed, running diagnostics");
      runDiagnostics();
      prevValuesRef.current = currentValues;
    }
  }, [
    wallet.connected,
    wallet.hasExtension,
    wallet.dAppSigner,
    factory.contractWrite,
    factory.contractRead,
    wallet.isInitializing,
    runDiagnostics,
  ]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    runDiagnostics();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getIcon = (status: DiagnosticItem["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "loading":
        return (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
    }
  };

  const getStatusColor = (status: DiagnosticItem["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-500/10 border-green-500/30";
      case "error":
        return "bg-red-500/10 border-red-500/30";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/30";
      case "loading":
        return "bg-blue-500/10 border-blue-500/30";
    }
  };

  const hasErrors = diagnostics.some((d) => d.status === "error");

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
          {hasErrors ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          System Diagnostics
        </h3>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {diagnostics.map((item, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${getStatusColor(
              item.status
            )} transition-all`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getIcon(item.status)}</div>
              <div className="flex-1">
                <div className="font-medium text-card-foreground">
                  {item.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.message}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasErrors && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <div className="font-semibold text-red-500">Action Required</div>
              <div className="text-sm text-red-400 mt-1">
                Some components failed initialization. Try:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Disconnect and reconnect your wallet</li>
                  <li>Refresh the page</li>
                  <li>Check that HashPack extension is installed</li>
                  <li>Verify you're on the correct network</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {!hasErrors && diagnostics.length > 0 && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div className="text-sm text-green-400">
              All systems operational! You can create Ajos now.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletDiagnostics;
