import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Coins,
  Shield,
  Users,
  Calendar,
  DollarSign,
  Info,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  Star,
  Eye,
  ChevronRight,
  Plus,
  Zap,
  Award,
  Target,
  Calculator,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// interface CreateAjoPageProps {
//   onBack: () => void;
// }

const CreateAjo = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    monthlyPayment: "",
    totalMembers: "",
    paymentToken: "USDC" as "USDC" | "HBAR",
    cycleLength: "30",
    isPrivate: false,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [calculatedCollateral, setCalculatedCollateral] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Calculate collateral based on smart contract logic
  useEffect(() => {
    if (formData.monthlyPayment && formData.totalMembers) {
      const monthlyPayment = parseFloat(formData.monthlyPayment) * 1000; // Convert to actual amount
      const totalMembers = parseInt(formData.totalMembers);

      if (monthlyPayment > 0 && totalMembers > 0) {
        // Using the smart contract's calculateRequiredCollateral logic
        // Assuming user will be in position 1 (worst case for collateral)
        const payout = totalMembers * monthlyPayment;
        const potentialDebt = payout - 1 * monthlyPayment;
        const collateral = (potentialDebt * 55) / 100; // 55% collateral factor

        setCalculatedCollateral(collateral);
      }
    }
  }, [formData.monthlyPayment, formData.totalMembers]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    } else if (formData.description.length < 10) {
      errors.description = "Description must be at least 10 characters";
    }

    if (!formData.monthlyPayment) {
      errors.monthlyPayment = "Monthly payment is required";
    } else if (parseFloat(formData.monthlyPayment) < 10) {
      errors.monthlyPayment = "Minimum payment is ₦10,000";
    }

    if (!formData.totalMembers) {
      errors.totalMembers = "Number of members is required";
    } else if (parseInt(formData.totalMembers) < 3) {
      errors.totalMembers = "Minimum 3 members required";
    } else if (parseInt(formData.totalMembers) > 50) {
      errors.totalMembers = "Maximum 50 members allowed";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsSubmitting(false);
    setShowSuccess(true);

    // Reset form after success
    setTimeout(() => {
      setShowSuccess(false);
      setFormData({
        name: "",
        description: "",
        monthlyPayment: "",
        totalMembers: "",
        paymentToken: "USDC",
        cycleLength: "30",
        isPrivate: false,
      });
    }, 3000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate("/ajo")}
            className="flex items-center space-x-2 text-gray-700 hover:text-green-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-2">
            <Coins className="w-6 h-6 text-green-600" />
            <span className="text-xl font-bold text-gray-900">Digital Ajo</span>
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Digital Ajo Platform
          </h1>
          <p className="text-sm text-gray-600 max-w-3xl mx-auto">
            Create or join transparent, blockchain-powered savings groups. Build
            wealth with your community.
          </p>
        </div>

        {/* Tab Navigation */}
        {/* <div
          className={`bg-white rounded-xl shadow-lg mb-8 transform transition-all duration-1000 delay-200 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
          }`}
        >
          <div className="flex">
            <button
              onClick={() => setActiveTab("create")}
              className={`flex items-center space-x-2 px-8 py-4 font-semibold transition-all ${
                activeTab === "create"
                  ? "text-green-600 border-b-2 border-green-600 bg-green-50"
                  : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>Create New Ajo</span>
            </button>
            <button
              onClick={() => setActiveTab("browse")}
              className={`flex items-center space-x-2 px-8 py-4 font-semibold transition-all ${
                activeTab === "browse"
                  ? "text-green-600 border-b-2 border-green-600 bg-green-50"
                  : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
              }`}
            >
              <Eye className="w-5 h-5" />
              <span>Browse Existing Ajos</span>
            </button>
          </div>
        </div> */}

        {/* Tab Content */}
        <div
          className={`transform transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
          }`}
        >
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Create Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Create Your Ajo Group
                  </h2>
                </div>

                {showSuccess && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800">
                        Ajo Created Successfully!
                      </h3>
                      <p className="text-green-700">
                        Your Ajo group is now live and accepting members.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <Info className="w-5 h-5 text-blue-600" />
                      <span>Basic Information</span>
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ajo Group Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g., Tech Bros Savings Circle"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                          formErrors.name ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>{formErrors.name}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Describe your Ajo group's purpose and goals..."
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none ${
                          formErrors.description
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {formErrors.description && (
                        <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>{formErrors.description}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Financial Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span>Financial Settings</span>
                    </h3>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monthly Payment (₦'000) *
                        </label>
                        <input
                          type="number"
                          name="monthlyPayment"
                          value={formData.monthlyPayment}
                          onChange={handleInputChange}
                          placeholder="50"
                          min="10"
                          max="1000"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                            formErrors.monthlyPayment
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                        />
                        {formErrors.monthlyPayment && (
                          <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                            <AlertCircle className="w-4 h-4" />
                            <span>{formErrors.monthlyPayment}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Token *
                        </label>
                        <select
                          name="paymentToken"
                          value={formData.paymentToken}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        >
                          <option value="USDC">USDC (Stable)</option>
                          <option value="HBAR">HBAR (Native)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total Members *
                        </label>
                        <input
                          type="number"
                          name="totalMembers"
                          value={formData.totalMembers}
                          onChange={handleInputChange}
                          placeholder="12"
                          min="3"
                          max="50"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                            formErrors.totalMembers
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                        />
                        {formErrors.totalMembers && (
                          <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                            <AlertCircle className="w-4 h-4" />
                            <span>{formErrors.totalMembers}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cycle Length (Days)
                        </label>
                        <select
                          name="cycleLength"
                          value={formData.cycleLength}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        >
                          <option value="30">30 Days (Monthly)</option>
                          <option value="14">14 Days (Bi-weekly)</option>
                          <option value="7">7 Days (Weekly)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Privacy Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      <span>Privacy Settings</span>
                    </h3>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        name="isPrivate"
                        checked={formData.isPrivate}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <label className="text-sm text-gray-700">
                        Make this Ajo private (invite-only)
                      </label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Creating Ajo...</span>
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
              {/* Collateral Calculator */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span>Collateral Calculator</span>
                </h3>

                {calculatedCollateral > 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {formatCurrency(calculatedCollateral)}
                      </div>
                      <div className="text-sm text-green-700">
                        Required collateral (55% factor)
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 space-y-2">
                      <div className="flex justify-between">
                        <span>Total Pool:</span>
                        <span className="font-semibold">
                          {formData.monthlyPayment && formData.totalMembers
                            ? formatCurrency(
                                parseFloat(formData.monthlyPayment) *
                                  parseInt(formData.totalMembers) *
                                  1000
                              )
                            : "₦0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Your Position:</span>
                        <span className="font-semibold">1st (Worst case)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Collateral Factor:</span>
                        <span className="font-semibold">55%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>
                      Enter payment amount and member count to calculate
                      collateral
                    </p>
                  </div>
                )}
              </div>

              {/* How It Works */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
                  <Info className="w-5 h-5" />
                  <span>How Digital Ajo Works</span>
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div>
                      <div className="font-semibold">Create or Join</div>
                      <div className="text-green-100">
                        Set up your Ajo with transparent rules
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <div>
                      <div className="font-semibold">Lock Collateral</div>
                      <div className="text-green-100">
                        Smart contract calculates required collateral
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div>
                      <div className="font-semibold">Monthly Payments</div>
                      <div className="text-green-100">
                        Automated payments via blockchain
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                      4
                    </div>
                    <div>
                      <div className="font-semibold">Receive Payout</div>
                      <div className="text-green-100">
                        Get your turn in the rotation
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Why Choose Digital Ajo?
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-700">
                      100% transparent on blockchain
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-700">
                      Smart contract automation
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-700">
                      Lower collateral requirements
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-700">
                      Yield generation on idle funds
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-700">
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
