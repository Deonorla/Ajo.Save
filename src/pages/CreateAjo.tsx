/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Coins,
  Info,
  CheckCircle,
  AlertCircle,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAjoFactory } from "@/hooks/useAjoFactory";
import { toast } from "sonner";
import { useWalletInterface } from "@/services/wallets/useWalletInterface";

const CreateAjo = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const {
    createAjo,
    initializeAjoPhase2,
    initializeAjoPhase3,
    initializeAjoPhase4,
    initializeAjoPhase5,
  } = useAjoFactory();
  const { accountId } = useWalletInterface();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Ajo name is required";
    } else if (formData.name.length < 3) {
      errors.name = "Name must be at least 3 characters";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (!accountId) throw new Error("Wallet not connected");

      // ✅ Phase 1 - Create with required parameters
      setCurrentPhase(1);
      const { ajoId, receipt } = await createAjo(
        formData.name,
        true, // useHtsTokens (required as per backend script)
        true // useScheduledPayments (recommended)
      );
      console.log("✅ Phase 1 complete. Ajo ID:", ajoId);
      toast.success("Phase 1: Ajo core created!");

      // Phase 2 - Initialize Members + Governance + HCS
      setCurrentPhase(2);
      await initializeAjoPhase2(ajoId);
      console.log("✅ Phase 2 complete");
      toast.success("Phase 2: Members & Governance initialized!");

      // Phase 3 - Initialize Collateral + Payments
      setCurrentPhase(3);
      await initializeAjoPhase3(ajoId);
      console.log("✅ Phase 3 complete");
      toast.success("Phase 3: Collateral & Payments initialized!");

      // Phase 4 - Initialize Core + Cross-link
      setCurrentPhase(4);
      await initializeAjoPhase4(ajoId);
      console.log("✅ Phase 4 complete");
      toast.success("Phase 4: Cross-linking complete!");

      // Phase 5 - Finalize (if using scheduled payments)
      setCurrentPhase(5);
      await initializeAjoPhase5(ajoId);
      console.log("✅ Phase 5 complete - Ajo active");
      toast.success("Phase 5: Ajo fully initialized!");

      setIsSubmitting(false);
      setCurrentPhase(0);
      toast.success("🎉 Ajo created successfully!");
      setShowSuccess(true);

      // Reset form after success
      setTimeout(() => {
        setShowSuccess(false);
        setFormData({ name: "" });
        // navigate(`/ajo/${ajoId}`); // Navigate to the new Ajo
      }, 3000);
    } catch (err: any) {
      console.error("Failed to create Ajo:", err);
      toast.error(err?.message || "Failed to create Ajo.");
      setCurrentPhase(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-2">
            <Coins className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-foreground">Ajo.Save</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div
          className={`text-center mb-8 transform transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
          }`}
        >
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
            Digital Ajo Platform
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
            Create a transparent, blockchain-powered savings group. Build wealth
            with your community.
          </p>
        </div>

        {/* Tab Content */}
        <div
          className={`transform transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
          }`}
        >
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Create Form */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-card-foreground">
                    Create Your Ajo Group
                  </h2>
                </div>

                {showSuccess && (
                  <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center space-x-3">
                    <CheckCircle className="w-6 h-6 text-primary" />
                    <div>
                      <h3 className="font-semibold text-primary">
                        Ajo Created Successfully!
                      </h3>
                      <p className="text-primary/80">
                        Your Ajo group is now live and accepting members.
                      </p>
                    </div>
                  </div>
                )}

                {/* Phase Progress Indicator */}
                {isSubmitting && currentPhase > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Initialization Progress
                      </span>
                      <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                        Phase {currentPhase}/5
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(currentPhase / 5) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
                      Please approve each transaction in your wallet
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-card-foreground flex items-center space-x-2">
                      <Info className="w-5 h-5 text-accent" />
                      <span>Basic Information</span>
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        Ajo Group Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g., Tech Bros Savings Circle"
                        className={`w-full px-4 py-3 bg-background border rounded-lg focus:ring-0 outline-none focus:ring-primary focus:border-primary transition-colors text-foreground ${
                          formErrors.name
                            ? "border-destructive"
                            : "border-border"
                        }`}
                        disabled={isSubmitting}
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-destructive flex items-center space-x-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>{formErrors.name}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 border-t border-border">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                          <span>
                            {currentPhase > 0
                              ? `Processing Phase ${currentPhase}/5...`
                              : "Creating Ajo..."}
                          </span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          <span>Create Ajo Group</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* How It Works */}
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg p-6 text-primary-foreground">
                <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
                  <Info className="w-5 h-5" />
                  <span>How Digital Ajo Works</span>
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary-foreground/20 rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div>
                      <div className="font-semibold">Create or Join</div>
                      <div className="text-primary-foreground/80">
                        Set up your Ajo with transparent rules
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary-foreground/20 rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <div>
                      <div className="font-semibold">Lock Collateral</div>
                      <div className="text-primary-foreground/80">
                        Smart contract calculates required collateral
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary-foreground/20 rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div>
                      <div className="font-semibold">Monthly Payments</div>
                      <div className="text-primary-foreground/80">
                        Automated payments via blockchain
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary-foreground/20 rounded-full flex items-center justify-center text-xs font-bold">
                      4
                    </div>
                    <div>
                      <div className="font-semibold">Receive Payout</div>
                      <div className="text-primary-foreground/80">
                        Get your turn in the rotation
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
                <h3 className="text-lg font-bold text-card-foreground mb-4">
                  Why Choose Digital Ajo?
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      100% transparent on blockchain
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Smart contract automation
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Lower collateral requirements
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Yield generation on idle funds
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Community governance
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAjo;
