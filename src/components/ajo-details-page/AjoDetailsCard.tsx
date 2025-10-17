import { useWallet } from "@/auth/WalletContext";
import { useAjoCore } from "@/hooks/useAjoCore";
// import { useAjoFactory } from "@/hooks/useAjoFactory";
import useAjoPayment from "@/hooks/useAjoPayment";
import { useAjoDetailsStore } from "@/store/ajoDetailsStore";
import { usePaymentStore } from "@/store/ajoPaymentStore";
import { useAjoStore, type AjoInfo } from "@/store/ajoStore";
import { useMemberStore } from "@/store/memberInfoStore";
import { useTokenStore } from "@/store/tokenStore";
import { ajoData } from "@/temp-data";
import formatCurrency from "@/utils/formatCurrency";
import { formatAddress, formatTimestamp } from "@/utils/utils";
import {
  Bell,
  CheckCircle,
  Clock,
  Clock3Icon,
  CreditCard,
  Database,
  ExternalLink,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

interface AjoDetailsCardProps {
  ajo: AjoInfo | null | undefined;
  isVisible?: boolean;
  lastUpdated: Date;
  monthlyPayment: string | undefined;
}

const AjoDetailsCard = ({
  ajo,
  isVisible,
  monthlyPayment,
}: AjoDetailsCardProps) => {
  const { memberData, needsToPayThisCycle: needTo } = useMemberStore();
  const { cycleConfig } = usePaymentStore();
  const { nairaRate } = useTokenStore();
  const { ajoInfos } = useAjoStore();
  const [loading, setLoading] = useState(false);
  const [makingPayment, setMakingPayment] = useState(false);
  const [collateralRequired, setCollateralRequired] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const { ajoCore } = useParams<{ ajoId: string; ajoCore: string }>();
  const cycle = memberData?.memberInfo.queueNumber;
  const {
    joinAjo,
    getContractStats,
    getMemberInfo,
    getRequiredCollateral,
    distributePayout,
    // makePayment,
  } = useAjoCore(ajoCore ? ajoCore : "");
  const { getPayOut, getCurrentCycle } = useAjoPayment(
    ajo ? ajo?.ajoPayments : ""
  );
  const { address } = useWallet();
  const [paidAddress, setPaidAddress] = useState("");
  const [cycleCount, setCycleCount] = useState(0);
  const { totalMembers } = useAjoDetailsStore();

  const getFunctions = useCallback(async () => {
    try {
      const collateralRequired = await getRequiredCollateral(0);
      console.log("collateral---", collateralRequired);
      setCollateralRequired(Number(collateralRequired?.toString()) / 1000000);
      const queueNumber = Number(cycle);
      const PayCycle = await getPayOut(queueNumber);
      setPaidAddress(PayCycle?.recipient);
      const count = await getCurrentCycle();
      if (!count) return null;
      setCycleCount(count);
    } catch (err) {
      console.log("error getting collateral", err);
    }
  }, [getPayOut]);

  useEffect(() => {
    getFunctions();
    // console.log("Total members:", totalMembers);
    console.log(
      "locked collateral",
      Number(memberData?.memberInfo.lockedCollateral)
    );
    // console.log("Ajo name", ajo?.name);
  }, [getFunctions, memberData?.memberInfo.lockedCollateral]);

  const _joinAjo = async () => {
    try {
      setLoading(true);
      if (!address) {
        toast.error("Wallet address not found");
        setLoading(false);
        return;
      }
      if (!ajo) return null;
      console.log("ajoCollateral", ajo.ajoCollateral);
      console.log("ajoPayments", ajo.ajoPayments);

      // const join = await joinAjo(
      //   0,
      //   import.meta.env.VITE_MOCK_USDC_ADDRESS,
      //   ajo?.ajoCollateral,
      //   ajo?.ajoPayments
      // );

      // join is a receipt (ethers v5 transaction receipt)
      // console.log("✅ Joined Ajo, tx hash:", join.transactionHash);
      // Check logs
      // console.log("📜 Logs:", join.logs);
      toast.success("Collateral Locked and Ajo joined Successfully");
      // Step 2: refresh global stats
      const stats = await getContractStats();
      console.log("📊 Updated stats:", stats);

      // Step 3: fetch this user’s details
      if (address) {
        const member = await getMemberInfo(address);
        console.log("🙋 Member details:", member);
      }
      setLoading(false);
      window.location.reload();
    } catch (err) {
      console.log("Error joining:", err);
      toast.error("Failed to join");
    } finally {
      setLoading(false);
    }
  };

  const _processPayment = async () => {
    try {
      setMakingPayment(true);
      toast.info("Processing monthly fee");
      // const receipt = await makePayment(ajo ? ajo?.ajoPayments : "");
      // console.log("receipt:", receipt);
      // window.location.reload();
    } catch (err) {
      console.log("Error making monthly payment:", err);
    } finally {
      setMakingPayment(false);
    }
  };

  const _requestPayout = async () => {
    try {
      setRequesting(true);
      toast.info("Requesting payout");
      const payout = distributePayout();
      console.log("receipt:", payout);
    } catch (err) {
      console.log("Error distributing payment", err);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div
      className={`mb-8 transform transition-all duration-1000 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      }`}
    >
      <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-6 h-6 lg:w-12 lg:h-12 bg-gradient-to-br p-4 from-primary to-accent rounded-xl flex items-center justify-center text-sm lg:text-xl font-bold text-primary-foreground">
                  {ajo?.name.charAt(0)}
                </div>
                <div>
                  <h1 className=" text-sm lg:text-xl font-bold text-card-foreground mb-1">
                    {ajo?.name}
                  </h1>
                  <div className="flex items-center space-x-4">
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(
                        totalMembers == "10" ? "active" : "forming"
                      )}`}
                    >
                      {getStatusIcon(
                        totalMembers == "10" ? "active" : "forming"
                      )}
                      <span className="capitalize">
                        {totalMembers == "10" ? "Active" : "Forming"}
                      </span>
                    </div>
                    <div className="text-xs mx-2">
                      by {formatAddress(ajo ? ajo?.creator : "")}
                    </div>
                  </div>
                </div>
              </div>
              {/* Desktop */}
              <div className=" hidden sm:flex flex-col sm:flex-row gap-3">
                {memberData?.memberInfo.isActive == false ? (
                  totalMembers == "10" ? (
                    <></>
                  ) : (
                    <button
                      onClick={_joinAjo}
                      className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                          <span>Joining Ajo...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          <span>Join Ajo</span>
                        </>
                      )}
                    </button>
                  )
                ) : totalMembers !== "10" ? (
                  <div className="text-xs flex text-primary">
                    Total ajo members incomplete for ajo to start
                  </div>
                ) : Number(memberData?.memberInfo.lastPaymentCycle) == 0 ? (
                  <button
                    onClick={_processPayment}
                    className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {makingPayment ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing payment...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        <span>Process payment</span>
                      </>
                    )}
                  </button>
                ) : cycleCount > Number(cycle) ? (
                  <div className="text-xs flex text-primary">
                    you have been paid for this cycle
                  </div>
                ) : cycleCount < Number(cycle) ? (
                  <div className="text-xs flex text-primary">
                    You will be able to request for payout in the{" "}
                    {cycle === "1"
                      ? `${cycle}st`
                      : cycle === "2"
                      ? `${cycle}nd`
                      : cycle === "3"
                      ? `${cycle}rd`
                      : `${cycle}th`}{" "}
                    month of this ajo cycle
                  </div>
                ) : cycleCount == Number(cycle) ? (
                  address == paidAddress ? (
                    <div className="text-xs flex text-primary">
                      you have been paid for this cycle
                    </div>
                  ) : (
                    <button
                      onClick={_requestPayout}
                      className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {requesting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                          <span>Processing payment...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          <span>Request payout</span>
                        </>
                      )}
                    </button>
                  )
                ) : (
                  <></>
                )}
              </div>
            </div>
            {/* <p className="text-muted-foreground leading-relaxed">
              {ajoData.description}
            </p> */}
            {/* {totalMembers == "10" ? (
              <div className="mb-6 p-4 text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg flex flex-col space-y-3 sm:w-50%">
                Not taking in members
              </div>
            ) : ( */}

            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg flex flex-col space-y-3 sm:w-50%">
              {/* Collateral Section */}
              {totalMembers == "10" && (
                <div className="mb-6 p-4 text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg flex flex-col space-y-3 sm:w-50%">
                  Not taking in members
                </div>
              )}
              {totalMembers !== "10" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary font-medium ">
                    Collateral Required:
                  </span>
                  <span className=" ml-4 font-semibold text-primary text-sm">
                    {collateralRequired
                      ? `${collateralRequired} USDC `
                      : "Loading..."}
                  </span>
                </div>
              )}

              {Number(memberData?.memberInfo.lastPaymentCycle) == 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary font-medium ">
                    Monthly Contribution:
                  </span>
                  <span className=" ml-4 font-semibold text-primary text-sm">
                    $50 USDC
                  </span>
                </div>
              )}

              {/* Collateral Lock Status */}
              <div
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-2 w-fit ${
                  memberData?.memberInfo.isActive == true
                    ? "bg-[#111E18] text-[#3DB569] "
                    : " bg-[#211416] text-[#EA4343] "
                }`}
              >
                {memberData?.memberInfo.isActive == true ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Collateral Locked</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Collateral Not Locked</span>
                  </>
                )}
              </div>

              {/* Monthly Payment / Join Status */}
              <div
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-2 w-fit ${
                  Number(memberData?.memberInfo.lastPaymentCycle) !== 0
                    ? "bg-[#111E18] text-[#3DB569]"
                    : "bg-[#211416] text-[#EA4343]"
                }`}
              >
                {Number(memberData?.memberInfo.lastPaymentCycle) !== 0 ? (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Monthly Payment Paid</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Monthly payment pending</span>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row items-center space-x-2 text-sm">
              <div className="flex items-center">
                <Database className="w-4 h-4 text-primary mx-1" />
                <span className="text-xs text-muted-foreground">
                  Smart Contract:
                </span>
                <span className="font-mono text-primary mx-1">
                  {ajo
                    ? formatAddress(ajo?.ajoCore)
                    : formatAddress(
                        import.meta.env.VITE_AJO_CORE_CONTRACT_ADDRESS
                      )}
                </span>
              </div>
              <div className="flex items-center">
                <Clock3Icon className="w-4 h-4 text-primary ml-2 mr-1" />
                <p className="text-xs text-muted-foreground">
                  {" "}
                  Created:{" "}
                  <span className="font-mono text-primary">
                    {formatTimestamp(ajo ? ajo?.createdAt : "")}
                  </span>{" "}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile view */}
          <div className="flex sm:hidden flex-col sm:flex-row  gap-3">
            {memberData?.memberInfo.isActive == false ? (
              totalMembers == "10" ? (
                <></>
              ) : (
                <button
                  onClick={_joinAjo}
                  className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      <span>Joining Ajo...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Join Ajo</span>
                    </>
                  )}
                </button>
              )
            ) : totalMembers !== "10" ? (
              <div className="text-xs flex text-primary">
                Total ajo members incomplete for ajo to start
              </div>
            ) : Number(memberData?.memberInfo.lastPaymentCycle) == 0 ? (
              <button
                onClick={_processPayment}
                className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
              >
                {makingPayment ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>Process payment</span>
                  </>
                )}
              </button>
            ) : cycleCount > Number(cycle) ? (
              <div className="text-xs flex text-primary">
                you have been paid for this cycle
              </div>
            ) : cycleCount < Number(cycle) ? (
              <div className="text-xs flex text-primary">
                You will be able to request for payout in the{" "}
                {cycle === "1"
                  ? `${cycle}st`
                  : cycle === "2"
                  ? `${cycle}nd`
                  : cycle === "3"
                  ? `${cycle}rd`
                  : `${cycle}th`}{" "}
                month of this ajo cycle
              </div>
            ) : cycleCount == Number(cycle) ? (
              address == paidAddress ? (
                <div className="text-xs flex text-primary">
                  you have been paid for this cycle
                </div>
              ) : (
                <button
                  onClick={_requestPayout}
                  className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {requesting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing payment...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Request payout</span>
                    </>
                  )}
                </button>
              )
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AjoDetailsCard;

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active":
      return <Zap className="w-4 h-4" />;
    case "forming":
      return <Users className="w-4 h-4" />;
    case "completed":
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-600 text-white border border-green-500";
    case "forming":
      return "bg-accent/20 text-accent border border-accent/30";
    case "completed":
      return "bg-secondary/20 text-secondary-foreground border border-secondary/30";
    default:
      return "bg-muted/20 text-muted-foreground border border-muted/30";
  }
};
