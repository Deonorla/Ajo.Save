// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ============================================================================
// AJO.SAVE UNIFIED INTERFACE DOCUMENTATION
// ============================================================================
//
// PROJECT: Ajo.save - Decentralized ROSCA Protocol on Hedera
//
// DESCRIPTION:
// This file contains all interface definitions for the Ajo.save protocol,
// which implements a secure Rotating Savings and Credit Association (ROSCA)
// system using Hedera's native services (HTS, HSS, HCS, HSCS).
//
// KEY FEATURES:
// - Position-based collateral system (60% of net debt)
// - Guarantor network for distributed risk
// - Automated payments via Hedera Schedule Service
// - Immutable governance via Hedera Consensus Service
// - Native USDC and HBAR support via Hedera Token Service
//
// ARCHITECTURE:
// The protocol consists of six core contracts:
// 1. AjoCore: Main orchestration and coordination
// 2. AjoMembers: Member management and queue system
// 3. AjoCollateral: Dynamic collateral calculations and seizure
// 4. AjoPayments: Payment processing and distribution
// 5. AjoGovernance: On-chain governance with HCS integration
// 6. AjoSchedule: HSS automated scheduling (dedicated contract)
//
// HEDERA SERVICES INTEGRATION:
// - Hedera Token Service (HTS): 0x0000000000000000000000000000000000000167
// - Hedera Schedule Service (HSS): 0x000000000000000000000000000000000000016b
// - Hedera Consensus Service (HCS): Topic-based message submission
// - Hedera Smart Contract Service (HSCS): EVM-compatible smart contracts
//
// SECURITY MODEL:
// - 109% security coverage through collateral + guarantor network
// - Automated seizure cascade for default protection
// - Reputation-weighted voting for governance
// - Freeze/unfreeze capabilities for token control
//
// ============================================================================

// ============================================================================
// CORE ENUMS
// ============================================================================

/**
 * @title PaymentToken
 * @notice Supported payment token types in the Ajo protocol
 * @dev Used throughout the system to specify which token is being used for payments
 */
enum PaymentToken { 
    USDC,  // Circle USDC stablecoin
    HBAR   // Wrapped HBAR (Hedera native token)
}

// ============================================================================
// HTS HELPER STRUCTS
// ============================================================================
// These structs are used by the HTSHelper library to handle Hedera Token Service
// operations and responses. They provide structured error handling and status
// reporting for token operations.
// ============================================================================

/**
 * @title HtsTransferResult
 * @notice Result structure for HTS token transfer operations
 * @dev Used to return detailed information about token transfer attempts
 * @param responseCode The Hedera response code from the transfer operation
 * @param success Boolean indicating if the transfer was successful
 * @param errorMessage Human-readable error message if transfer failed
 */
struct HtsTransferResult {
    int64 responseCode;
    bool success;
    string errorMessage;
}

/**
 * @title HtsAssociationResult
 * @notice Result structure for HTS token association operations
 * @dev Used when associating accounts with HTS tokens
 * @param responseCode The Hedera response code from the association operation
 * @param success Boolean indicating if the association was successful
 * @param alreadyAssociated Boolean indicating if account was already associated
 * @param errorMessage Human-readable error message if association failed
 */
struct HtsAssociationResult {
    int64 responseCode;
    bool success;
    bool alreadyAssociated;
    string errorMessage;
}

/**
 * @title HtsFreezeResult
 * @notice Result structure for HTS token freeze operations
 * @dev Used when freezing/unfreezing token accounts
 * @param responseCode The Hedera response code from the freeze operation
 * @param success Boolean indicating if the freeze was successful
 * @param alreadyFrozen Boolean indicating if account was already frozen
 * @param errorMessage Human-readable error message if freeze failed
 */
struct HtsFreezeResult {
    int64 responseCode;
    bool success;
    bool alreadyFrozen;
    string errorMessage;
}

// ============================================================================
// CORE MEMBER STRUCTS
// ============================================================================

/**
 * @title Member
 * @notice Complete member data structure for Ajo participants
 * @dev Central data structure containing all member-related information
 * 
 * QUEUE SYSTEM:
 * - Members are assigned sequential queue numbers (1, 2, 3, ...)
 * - Queue number determines payout order and collateral requirements
 * - Lower queue numbers = earlier payouts = higher collateral
 *
 * COLLATERAL SYSTEM:
 * - requiredCollateral: Calculated as 60% of net debt based on position
 * - lockedCollateral: Actual amount locked by member
 * - Must maintain requiredCollateral <= lockedCollateral
 *
 * GUARANTOR SYSTEM:
 * - Each member has one guarantor (opposite side of queue)
 * - guarantor: Address of member's guarantor
 * - guaranteePosition: Queue position of the guarantor
 *
 * REPUTATION SYSTEM:
 * - reputationScore: 0-100, affects voting power
 * - Increases with on-time payments
 * - Decreases with defaults
 * - Used for governance participation
 *
 * @param queueNumber Sequential position in payout queue (1-indexed)
 * @param joinedCycle The cycle when member joined the Ajo
 * @param totalPaid Cumulative amount paid by member across all cycles
 * @param requiredCollateral Minimum collateral needed based on position
 * @param lockedCollateral Actual collateral locked by member
 * @param lastPaymentCycle Most recent cycle where payment was made
 * @param defaultCount Number of times member has defaulted
 * @param hasReceivedPayout Boolean indicating if member has received payout
 * @param isActive Boolean indicating if member is currently active
 * @param guarantor Address of member's assigned guarantor
 * @param preferredToken Token choice for payments (USDC or HBAR)
 * @param reputationScore Reputation score (0-100) for governance
 * @param pastPayments Array of historical payment amounts
 * @param guaranteePosition Queue position of the guarantor
 */
struct Member {
    uint256 queueNumber;
    uint256 joinedCycle;
    uint256 totalPaid;
    uint256 requiredCollateral;
    uint256 lockedCollateral;
    uint256 lastPaymentCycle;
    uint256 defaultCount;
    bool hasReceivedPayout;
    bool isActive;
    address guarantor;
    PaymentToken preferredToken;
    uint256 reputationScore;
    uint256[] pastPayments;
    uint256 guaranteePosition;
}

/**
 * @title TokenConfig
 * @notice Configuration for supported payment tokens
 * @dev Stores monthly payment amounts and activation status per token
 * @param monthlyPayment Required monthly payment amount for this token
 * @param isActive Boolean indicating if token is currently accepted
 */
struct TokenConfig {
    uint256 monthlyPayment;
    bool isActive;
}

/**
 * @title PayoutRecord
 * @notice Historical record of payout distributions
 * @dev Immutable record created each time a payout is distributed
 * @param recipient Address that received the payout
 * @param amount Total amount distributed in the payout
 * @param cycle Cycle number when payout was distributed
 * @param timestamp Block timestamp of payout distribution
 */
struct PayoutRecord {
    address recipient;
    uint256 amount;
    uint256 cycle;
    uint256 timestamp;
}

/**
 * @title MemberDetails
 * @notice Comprehensive member information for frontend display
 * @dev Aggregated view combining Member struct with calculated fields
 * @param userAddress Member's wallet address
 * @param hasReceivedPayout Whether member has received their payout
 * @param queuePosition Position in payout queue (1-indexed)
 * @param hasPaidThisCycle Payment status for current cycle
 * @param collateralLocked Amount of collateral currently locked
 * @param guarantorAddress Address of member's guarantor
 * @param guarantorQueuePosition Queue position of guarantor
 * @param totalPaid Cumulative payments made
 * @param defaultCount Number of defaults
 * @param reputationScore Current reputation (0-100)
 */
struct MemberDetails {
    address userAddress;
    bool hasReceivedPayout;
    uint256 queuePosition;
    bool hasPaidThisCycle;
    uint256 collateralLocked;
    address guarantorAddress;
    uint256 guarantorQueuePosition;
    uint256 totalPaid;
    uint256 defaultCount;
    uint256 reputationScore;
}

/**
 * @title GlobalStats
 * @notice Protocol-wide statistics for analytics and monitoring
 * @dev Aggregated data across all Ajo groups in the factory
 * @param totalAjos Total number of Ajo groups created
 * @param activeAjos Number of currently active Ajo groups
 * @param totalMembers Total members across all groups
 * @param totalCollateralUSDC Total USDC collateral locked
 * @param totalCollateralHBAR Total HBAR collateral locked
 * @param totalPaymentsProcessed Total number of payments processed
 * @param totalPayoutsDistributed Total number of payouts distributed
 * @param totalHtsTokensCreated Total HTS tokens created for Ajos
 * @param totalScheduledPayments Total HSS scheduled payments created
 */
struct GlobalStats {
    uint256 totalAjos;
    uint256 activeAjos;
    uint256 totalMembers;
    uint256 totalCollateralUSDC;
    uint256 totalCollateralHBAR;
    uint256 totalPaymentsProcessed;
    uint256 totalPayoutsDistributed;
    uint256 totalHtsTokensCreated;
    uint256 totalScheduledPayments;
}

/**
 * @title PaymentStatus
 * @notice Detailed payment information for a specific cycle
 * @dev Tracks individual payment events with penalties and timestamps
 * @param cycle The cycle number for this payment
 * @param hasPaid Boolean indicating if payment was made
 * @param amountPaid Actual amount paid (base + penalty)
 * @param penaltyApplied Late payment penalty amount
 * @param timestamp Block timestamp of payment
 */
struct PaymentStatus {
    uint256 cycle;
    bool hasPaid;
    uint256 amountPaid;
    uint256 penaltyApplied;
    uint256 timestamp;
}

/**
 * @title CycleDashboard
 * @notice Complete dashboard data for the current cycle
 * @dev Aggregated view for frontend cycle management interface
 * 
 * PAYOUT LOGIC:
 * - nextPayoutPosition: Queue number of next recipient
 * - nextRecipient: Address of next recipient
 * - expectedPayout: Calculated payout amount (sum of payments)
 * - isPayoutReady: True when all members have paid
 *
 * PAYMENT TRACKING:
 * - totalPaidThisCycle: Sum of all payments received
 * - remainingToPay: Number of members who haven't paid
 * - membersPaid: Array of addresses who have paid
 * - membersUnpaid: Array of addresses who haven't paid
 *
 * HSS INTEGRATION:
 * - hasScheduledPayment: True if HSS is enabled for this cycle
 * - scheduledPaymentAddress: Address of HSS schedule contract
 *
 * @param currentCycle Current cycle number
 * @param nextPayoutPosition Queue number receiving next payout
 * @param nextRecipient Address receiving next payout
 * @param expectedPayout Calculated payout amount
 * @param totalPaidThisCycle Total payments collected this cycle
 * @param remainingToPay Number of unpaid members
 * @param membersPaid Array of members who have paid
 * @param membersUnpaid Array of members who haven't paid
 * @param isPayoutReady Boolean indicating all payments collected
 * @param hasScheduledPayment Boolean indicating HSS scheduling active
 * @param scheduledPaymentAddress Address of HSS schedule if active
 */
struct CycleDashboard {
    uint256 currentCycle;
    uint256 nextPayoutPosition;
    address nextRecipient;
    uint256 expectedPayout;
    uint256 totalPaidThisCycle;
    uint256 remainingToPay;
    address[] membersPaid;
    address[] membersUnpaid;
    bool isPayoutReady;
    bool hasScheduledPayment;
    address scheduledPaymentAddress;
}

/**
 * @title MemberActivity
 * @notice Historical activity summary for a member
 * @dev Tracks participation metrics and financial position
 * 
 * PARTICIPATION METRICS:
 * - cyclesParticipated: Total cycles member has been active
 * - paymentsCompleted: Number of on-time payments
 * - paymentsMissed: Number of missed/late payments
 * - consecutivePayments: Current streak of on-time payments
 *
 * FINANCIAL METRICS:
 * - totalPaid: Cumulative amount paid into Ajo
 * - totalReceived: Cumulative amount received from payouts
 * - netPosition: Net financial position (received - paid)
 *
 * @param cyclesParticipated Total cycles member has been part of
 * @param paymentsCompleted Count of successful payments
 * @param paymentsMissed Count of missed payments
 * @param totalPaid Total amount contributed
 * @param totalReceived Total amount received from payouts
 * @param netPosition Net position (positive = received more, negative = paid more)
 * @param consecutivePayments Current streak of consecutive payments
 * @param lastActiveTimestamp Most recent activity timestamp
 */
struct MemberActivity {
    uint256 cyclesParticipated;
    uint256 paymentsCompleted;
    uint256 paymentsMissed;
    uint256 totalPaid;
    uint256 totalReceived;
    uint256 netPosition;
    uint256 consecutivePayments;
    uint256 lastActiveTimestamp;
}

/**
 * @title AjoSummary
 * @notice High-level summary of an Ajo group
 * @dev Used for displaying Ajo lists and group overviews
 * @param ajoId Unique identifier for the Ajo group
 * @param name Human-readable name of the Ajo
 * @param currentCycle Current cycle number
 * @param totalMembers Total number of members
 * @param activeMembers Number of currently active members
 * @param totalCollateral Total collateral locked in group
 * @param monthlyPayment Required monthly payment amount
 * @param isAcceptingMembers Whether group is accepting new members
 * @param creator Address of Ajo creator
 * @param createdAt Block timestamp of creation
 * @param usesHtsTokens Whether group uses HTS tokens
 * @param usesScheduledPayments Whether group uses HSS automation
 */
struct AjoSummary {
    uint256 ajoId;
    string name;
    uint256 currentCycle;
    uint256 totalMembers;
    uint256 activeMembers;
    uint256 totalCollateral;
    uint256 monthlyPayment;
    bool isAcceptingMembers;
    address creator;
    uint256 createdAt;
    bool usesHtsTokens;
    bool usesScheduledPayments;
}

/**
 * @title UpcomingEvent
 * @notice Future event notification for members
 * @dev Used to display timeline of upcoming actions
 * 
 * EVENT TYPES:
 * - 0: Payment due
 * - 1: Payout distribution
 * - 2: Governance vote deadline
 * - 3: Schedule execution
 * - 4: Cycle advancement
 *
 * @param eventType Type of upcoming event (see above)
 * @param timestamp When event will occur
 * @param affectedMember Member address affected by event
 * @param amount Amount involved in event (if applicable)
 */
struct UpcomingEvent {
    uint256 eventType;
    uint256 timestamp;
    address affectedMember;
    uint256 amount;
}

// ============================================================================
// HTS-SPECIFIC STRUCTS
// ============================================================================
// Structures for managing Hedera Token Service operations, including token
// creation, configuration, and administrative key management.
// ============================================================================

/**
 * @title HtsTokenInfo
 * @notice Complete information about an HTS token
 * @dev Returned when querying HTS token details
 * @param tokenAddress EVM-compatible address of token
 * @param tokenId Hedera-native token ID
 * @param name Token name
 * @param symbol Token symbol
 * @param decimals Number of decimal places
 * @param totalSupply Total token supply
 * @param hasFreezeKey Whether token has freeze key capability
 * @param hasWipeKey Whether token has wipe key capability
 * @param hasSupplyKey Whether token has supply key capability
 * @param hasPauseKey Whether token has pause key capability
 * @param treasury Treasury account address
 */
struct HtsTokenInfo {
    address tokenAddress;
    bytes32 tokenId;
    string name;
    string symbol;
    uint8 decimals;
    uint256 totalSupply;
    bool hasFreezeKey;
    bool hasWipeKey;
    bool hasSupplyKey;
    bool hasPauseKey;
    address treasury;
}

/**
 * @title HtsAdminKeys
 * @notice Administrative keys for HTS token management
 * @dev Contains all admin key addresses for token control
 * @param adminKey Key for general token administration
 * @param freezeKey Key for freezing accounts
 * @param supplyKey Key for minting/burning supply
 * @param pauseKey Key for pausing token transfers
 */
struct HtsAdminKeys {
    address adminKey;
    address freezeKey;
    address supplyKey;
    address pauseKey;
}

/**
 * @title HcsVote
 * @notice Vote record submitted to Hedera Consensus Service
 * @dev Immutable vote record with HCS verification
 * 
 * VOTE SUPPORT VALUES:
 * - 0: Against
 * - 1: For
 * - 2: Abstain
 *
 * HCS FIELDS:
 * - hcsMessageId: Unique message ID from HCS submission
 * - hcsSequenceNumber: Sequence number in HCS topic
 * - signature: Cryptographic signature of vote
 *
 * @param voter Address of voting member
 * @param support Vote direction (0=against, 1=for, 2=abstain)
 * @param votingPower Reputation-weighted voting power
 * @param timestamp Block timestamp of vote
 * @param hcsMessageId HCS message identifier
 * @param hcsSequenceNumber HCS topic sequence number
 * @param signature Cryptographic signature
 */
struct HcsVote {
    address voter;
    uint8 support;
    uint256 votingPower;
    uint256 timestamp;
    bytes32 hcsMessageId;
    uint256 hcsSequenceNumber;
    bytes signature;
}

// ============================================================================
// HSS-SPECIFIC STRUCTS (Hedera Schedule Service)
// ============================================================================
// Structures for managing automated scheduled transactions via Hedera
// Schedule Service, enabling automated payments and governance actions.
// ============================================================================

/**
 * @title ScheduledPayment
 * @notice Complete information about a scheduled payment
 * @dev Tracks HSS-scheduled payment execution and status
 * 
 * SCHEDULE LIFECYCLE:
 * 1. Created: scheduleAddress assigned, isExecuted=false
 * 2. Authorized: signaturesCollected reaches signaturesRequired
 * 3. Executed: isExecuted=true after execution time
 * 4. Or Canceled: isCanceled=true if manually canceled
 * 5. Or Expired: isExpired=true if not executed before expiration
 *
 * SIGNATURE REQUIREMENTS:
 * - signaturesRequired: Number of signatures needed (usually 1 for single-sig)
 * - signaturesCollected: Current number of authorizations
 * - Schedule executes automatically when requirements met
 *
 * @param scheduleAddress Address of HSS schedule contract
 * @param cycle Cycle number for this payment
 * @param executionTime Unix timestamp when payment should execute
 * @param amount Payment amount
 * @param recipient Payment recipient address
 * @param token Token type for payment
 * @param isExecuted Whether schedule has executed
 * @param isCanceled Whether schedule was canceled
 * @param isExpired Whether schedule expired without execution
 * @param signaturesCollected Current number of authorizations
 * @param signaturesRequired Required number of authorizations
 * @param createdAt Block timestamp of schedule creation
 * @param creator Address that created the schedule
 */
struct ScheduledPayment {
    address scheduleAddress;
    uint256 cycle;
    uint256 executionTime;
    uint256 amount;
    address recipient;
    PaymentToken token;
    bool isExecuted;
    bool isCanceled;
    bool isExpired;
    uint256 signaturesCollected;
    uint256 signaturesRequired;
    uint256 createdAt;
    address creator;
}

/**
 * @title ScheduleSignature
 * @notice Record of a signature/authorization on a schedule
 * @dev Tracks who has authorized a scheduled transaction
 * @param signer Address that provided authorization
 * @param timestamp When authorization was provided
 * @param isContractKey Whether authorization was from contract key
 */
struct ScheduleSignature {
    address signer;
    uint256 timestamp;
    bool isContractKey;
}

/**
 * @title ScheduleInfo
 * @notice Detailed information from HSS about a schedule
 * @dev Returned by getScheduleInfo HSS precompile call
 * @param scheduleId Schedule identifier
 * @param scheduledTransactionId Transaction ID when executed
 * @param payerAccountId Account paying for execution
 * @param creatorAccountId Account that created schedule
 * @param scheduledTransactionBody Encoded transaction body
 * @param signatories List of required signatories
 * @param adminKey Admin key for schedule management
 * @param memo Human-readable memo
 * @param expirationTime When schedule expires
 * @param executedTime When schedule was executed (0 if not executed)
 * @param deletedTime When schedule was deleted (0 if not deleted)
 * @param waitForExpiry Whether to wait until expiry to execute
 */
struct ScheduleInfo {
    address scheduleId;
    address scheduledTransactionId;
    address payerAccountId;
    address creatorAccountId;
    bytes32 scheduledTransactionBody;
    KeyList signatories;
    address adminKey;
    string memo;
    int64 expirationTime;
    int64 executedTime;
    int64 deletedTime;
    bool waitForExpiry;
}

/**
 * @title KeyList
 * @notice List of keys for HSS schedule authorization
 * @dev Simple wrapper for array of key addresses
 * @param keys Array of key addresses
 */
struct KeyList {
    address[] keys;
}

/**
 * @title ScheduledGovernanceAction
 * @notice Governance proposal scheduled for future execution
 * @dev Links governance proposals to HSS scheduled execution
 * @param proposalId Governance proposal identifier
 * @param scheduleAddress HSS schedule address
 * @param executionTime When action should execute
 * @param isExecuted Whether action has executed
 * @param isCanceled Whether action was canceled
 */
struct ScheduledGovernanceAction {
    uint256 proposalId;
    address scheduleAddress;
    uint256 executionTime;
    bool isExecuted;
    bool isCanceled;
}

/**
 * @title ScheduleStatistics
 * @notice Aggregate statistics for HSS scheduling
 * @dev Used for analytics and monitoring of scheduling system
 * @param totalScheduled Total schedules created
 * @param totalExecuted Total schedules executed
 * @param totalCanceled Total schedules canceled
 * @param totalExpired Total schedules expired
 * @param pendingSchedules Currently pending schedules
 * @param upcomingIn24Hours Schedules executing within 24 hours
 * @param upcomingInWeek Schedules executing within 7 days
 */
struct ScheduleStatistics {
    uint256 totalScheduled;
    uint256 totalExecuted;
    uint256 totalCanceled;
    uint256 totalExpired;
    uint256 pendingSchedules;
    uint256 upcomingIn24Hours;
    uint256 upcomingInWeek;
}

// ============================================================================
// HEDERA TOKEN SERVICE STRUCTS
// ============================================================================
// Native Hedera structures for token creation and management via HTS
// ============================================================================

/**
 * @title HederaToken
 * @notice Token creation parameters for HTS
 * @dev Used when creating new fungible tokens via HTS
 * @param name Token name
 * @param symbol Token symbol
 * @param treasury Treasury account address
 * @param memo Token memo
 * @param tokenSupplyType Supply type (finite or infinite)
 * @param maxSupply Maximum supply if finite
 * @param freezeDefault Default freeze status for new accounts
 * @param tokenKeys Array of token administrative keys
 * @param expiry Token expiry configuration
 */
struct HederaToken {
    string name;
    string symbol;
    address treasury;
    string memo;
    bool tokenSupplyType;
    int64 maxSupply;
    bool freezeDefault;
    TokenKey[] tokenKeys;
    Expiry expiry;
}

/**
 * @title TokenKey
 * @notice Administrative key for HTS token
 * @dev Defines a single administrative key and its type
 * 
 * KEY TYPES:
 * - 1: Admin key
 * - 2: KYC key
 * - 4: Freeze key
 * - 8: Wipe key
 * - 16: Supply key
 * - 32: Fee schedule key
 * - 64: Pause key
 *
 * @param keyType Type of key (see above)
 * @param key Key value structure
 */
struct TokenKey {
    uint256 keyType;
    KeyValue key;
}

/**
 * @title KeyValue
 * @notice Key value specification for HTS
 * @dev Flexible key specification supporting multiple key types
 * @param inheritAccountKey Whether to use account's key
 * @param contractId Contract address if contract key
 * @param ed25519 Ed25519 public key bytes
 * @param ECDSA_secp256k1 ECDSA secp256k1 public key bytes
 * @param delegatableContractId Delegatable contract address
 */
struct KeyValue {
    bool inheritAccountKey;
    address contractId;
    bytes ed25519;
    bytes ECDSA_secp256k1;
    address delegatableContractId;
}

/**
 * @title Expiry
 * @notice Token expiry configuration for HTS
 * @dev Defines when and how token expires
 * @param second Expiry timestamp in seconds
 * @param autoRenewAccount Account for auto-renewal
 * @param autoRenewPeriod Auto-renewal period in seconds
 */
struct Expiry {
    int64 second;
    address autoRenewAccount;
    int64 autoRenewPeriod;
}

/**
 * @title FixedFee
 * @notice Fixed fee configuration for HTS token
 * @dev Applied per transaction as fixed amount
 * @param amount Fee amount
 * @param tokenId Token for fee (address(0) for HBAR)
 * @param useHbarsForPayment Whether to use HBAR for fee
 * @param useCurrentTokenForPayment Whether to use current token for fee
 * @param feeCollector Account collecting fees
 */
struct FixedFee {
    int64 amount;
    address tokenId;
    bool useHbarsForPayment;
    bool useCurrentTokenForPayment;
    address feeCollector;
}

/**
 * @title FractionalFee
 * @notice Fractional fee configuration for HTS token
 * @dev Applied as percentage of transaction amount
 * @param numerator Fee numerator
 * @param denominator Fee denominator
 * @param minimumAmount Minimum fee amount
 * @param maximumAmount Maximum fee amount
 * @param netOfTransfers Whether fee is net of transfers
 * @param feeCollector Account collecting fees
 */
struct FractionalFee {
    int64 numerator;
    int64 denominator;
    int64 minimumAmount;
    int64 maximumAmount;
    bool netOfTransfers;
    address feeCollector;
}

/**
 * @title TokenInfo
 * @notice Complete token information from HTS
 * @dev Returned by getTokenInfo HTS precompile call
 * @param token Basic token information
 * @param totalSupply Current total supply
 * @param deleted Whether token is deleted
 * @param defaultKycStatus Default KYC status
 * @param pauseStatus Current pause status
 * @param fixedFees Array of fixed fees
 * @param fractionalFees Array of fractional fees
 * @param ledgerId Ledger identifier
 */
struct TokenInfo {
    HederaToken token;
    int64 totalSupply;
    bool deleted;
    bool defaultKycStatus;
    bool pauseStatus;
    FixedFee[] fixedFees;
    FractionalFee[] fractionalFees;
    string ledgerId;
}

/**
 * @title TopicInfo
 * @notice Information about HCS topic
 * @dev Returned by getTopicInfo HCS precompile call
 * @param memo Topic memo
 * @param runningHash Current running hash
 * @param sequenceNumber Current sequence number
 * @param autoRenewAccount Auto-renewal account configuration
 * @param adminKey Admin key for topic
 * @param submitKey Submit key for topic
 */
struct TopicInfo {
    string memo;
    bytes32 runningHash;
    uint64 sequenceNumber;
    Expiry autoRenewAccount;
    address adminKey;
    address submitKey;
}

/**
 * @title TransferList
 * @notice List of HBAR transfers
 * @dev Used for crypto transfer operations
 * @param transfers Array of account/amount pairs
 */
struct TransferList {
    AccountAmount[] transfers;
}

/**
 * @title AccountAmount
 * @notice Single account transfer amount
 * @dev Pair of account and amount for transfers
 * @param accountID Account address
 * @param amount Transfer amount (positive for credit, negative for debit)
 */
struct AccountAmount {
    address accountID;
    int64 amount;
}

/**
 * @title TokenTransferList
 * @notice List of token transfers
 * @dev Used for HTS token transfer operations
 * @param token Token address being transferred
 * @param transfers Array of fungible token transfers
 * @param nftTransfers Array of NFT transfers
 */
struct TokenTransferList {
    address token;
    AccountAmount[] transfers;
    NftTransfer[] nftTransfers;
}

/**
 * @title NftTransfer
 * @notice Single NFT transfer record
 * @dev Used for transferring HTS NFTs
 * @param senderAccountID Sender account
 * @param receiverAccountID Receiver account
 * @param serialNumber NFT serial number
 */
struct NftTransfer {
    address senderAccountID;
    address receiverAccountID;
    int64 serialNumber;
}

// ============================================================================
// HEDERA CONSENSUS SERVICE INTERFACE
// ============================================================================

/**
 * @title IHederaConsensusService
 * @notice Interface for Hedera Consensus Service operations
 * @dev Used for immutable message submission and topic management
 * 
 * USAGE IN AJO.SAVE:
 * -Governance votes submitted to HCS for immutability
 * - Proposal creation recorded on HCS
 * - Parameter changes logged to HCS
 * - Provides tamper-proof audit trail
 */
interface IHederaConsensusService {
    /**
     * @notice Create a new HCS topic
     * @dev Creates a topic for submitting consensus messages
     * @param token Token configuration (unused for topics)
     * @param adminKey Admin key for topic management
     * @param submitKey Key required to submit messages
     * @param autoRenewPeriod Auto-renewal period in seconds
     * @param autoRenewAccount Account for auto-renewal fees
     * @param memo Human-readable topic description
     * @return responseCode Hedera response code
     * @return topicId Created topic identifier
     */
    function createTopic(
        HederaToken memory token,
        address adminKey,
        address submitKey,
        uint256 autoRenewPeriod,
        address autoRenewAccount,
        string memory memo
    ) external payable returns (int64 responseCode, bytes32 topicId);
    
    /**
     * @notice Submit a message to an HCS topic
     * @dev Messages are immutable once submitted
     * @param topicId Target topic identifier
     * @param message Message bytes to submit
     * @return responseCode Hedera response code
     * @return sequenceNumber Message sequence number in topic
     */
    function submitMessage(bytes32 topicId, bytes memory message) external payable returns (int64 responseCode, uint64 sequenceNumber);
    
    /**
     * @notice Update topic metadata
     * @dev Can update memo and auto-renewal settings
     * @param topicId Topic to update
     * @param memo New topic memo
     * @param autoRenewPeriod New auto-renewal period
     * @return responseCode Hedera response code
     */
    function updateTopic(bytes32 topicId, string memory memo, uint256 autoRenewPeriod) external returns (int64 responseCode);
    
    /**
     * @notice Delete an HCS topic
     * @dev Requires admin key authorization
     * @param topicId Topic to delete
     * @return responseCode Hedera response code
     */
    function deleteTopic(bytes32 topicId) external returns (int64 responseCode);
    
    /**
     * @notice Get information about a topic
     * @dev Returns topic metadata and configuration
     * @param topicId Topic to query
     * @return responseCode Hedera response code
     * @return info Topic information structure
     */
    function getTopicInfo(bytes32 topicId) external returns (int64 responseCode, TopicInfo memory info);
}

// ============================================================================
// AJO SCHEDULE INTERFACE (HEDERA SCHEDULE SERVICE INTEGRATION)
// ============================================================================

/**
 * @title IAjoSchedule
 * @notice Dedicated contract interface for HSS (Hedera Schedule Service) integration
 * @dev Separates scheduling logic from core payment processing
 * 
 * PURPOSE:
 * The AjoSchedule contract provides automated payment execution using HSS,
 * reducing defaults by 6x through scheduled transactions. It handles:
 * - Payment scheduling for future cycles
 * - Payout distribution scheduling
 * - Governance action scheduling
 * - Schedule authorization and execution
 * 
 * HSS BENEFITS:
 * - Automatic execution at specified times
 * - Multi-signature support
 * - Eliminates manual payment processing
 * - Reduces human error and defaults
 * - Provides predictable payment timeline
 * 
 * AUTHORIZATION FLOW:
 * 1. Schedule created with future execution time
 * 2. Required signatures collected via authorizeSchedule
 * 3. HSS automatically executes when time reached and signatures met
 * 4. Execution result recorded for audit trail
 */
interface IAjoSchedule {
    /**
     * @notice Initialize the AjoSchedule contract
     * @dev Must be called after deployment, sets up contract dependencies
     * @param _ajoCore Address of AjoCore contract
     * @param _ajoPayments Address of AjoPayments contract
     * @param _ajoGovernance Address of AjoGovernance contract
     * @param _hederaScheduleService Address of HSS precompile (0x16b)
     */
    function initialize(
        address _ajoCore,
        address _ajoPayments,
        address _ajoGovernance,
        address _hederaScheduleService
    ) external;
    
    // ========================================================================
    // PAYMENT SCHEDULING FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Schedule a single payment for future execution
     * @dev Creates HSS schedule for automated payment collection
     * @param cycle Cycle number for this payment
     * @param executionTime Unix timestamp when payment should execute
     * @param member Member address making the payment
     * @param amount Payment amount
     * @param token Token type for payment (USDC or HBAR)
     * @return scheduleAddress Address of created HSS schedule
     */
    function schedulePayment(
        uint256 cycle,
        uint256 executionTime,
        address member,
        uint256 amount,
        PaymentToken token
    ) external returns (address scheduleAddress);
    
    /**
     * @notice Schedule multiple payments in a single transaction
     * @dev More gas-efficient than multiple individual schedules
     * @param cycles Array of cycle numbers
     * @param executionTimes Array of execution timestamps
     * @param members Array of member addresses
     * @param amounts Array of payment amounts
     * @param token Token type for all payments
     * @return scheduleAddresses Array of created schedule addresses
     */
    function scheduleMultiplePayments(
        uint256[] calldata cycles,
        uint256[] calldata executionTimes,
        address[] calldata members,
        uint256[] calldata amounts,
        PaymentToken token
    ) external returns (address[] memory scheduleAddresses);
    
    /**
     * @notice Schedule recurring payments over multiple cycles
     * @dev Automates payment scheduling for consistent intervals
     * @param startCycle First cycle to schedule
     * @param numberOfCycles How many cycles to schedule
     * @param intervalDays Days between each payment
     * @param member Member address
     * @param amount Payment amount per cycle
     * @param token Token type
     * @return scheduleAddresses Array of created schedule addresses
     */
    function scheduleRollingPayments(
        uint256 startCycle,
        uint256 numberOfCycles,
        uint256 intervalDays,
        address member,
        uint256 amount,
        PaymentToken token
    ) external returns (address[] memory scheduleAddresses);
    
    /**
     * @notice Schedule a payout distribution
     * @dev Automates payout to recipient at specified time
     * @param cycle Cycle number for payout
     * @param executionTime When to distribute payout
     * @param recipient Payout recipient address
     * @param amount Payout amount
     * @param token Token type
     * @return scheduleAddress Address of created schedule
     */
    function schedulePayout(
        uint256 cycle,
        uint256 executionTime,
        address recipient,
        uint256 amount,
        PaymentToken token
    ) external returns (address scheduleAddress);
    
    // ========================================================================
    // GOVERNANCE SCHEDULING FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Schedule governance proposal execution
     * @dev Executes approved proposal at specified time
     * @param proposalId Governance proposal identifier
     * @param executionTime When to execute proposal
     * @return scheduleAddress Address of created schedule
     */
    function scheduleProposalExecution(
        uint256 proposalId,
        uint256 executionTime
    ) external returns (address scheduleAddress);
    
    /**
     * @notice Schedule generic governance action
     * @dev Allows scheduling of any governance action with encoded data
     * @param proposalId Proposal identifier
     * @param executionTime Execution timestamp
     * @param actionData Encoded action data
     * @return scheduleAddress Address of created schedule
     */
    function scheduleGovernanceAction(
        uint256 proposalId,
        uint256 executionTime,
        bytes memory actionData
    ) external returns (address scheduleAddress);
    
    // ========================================================================
    // AUTHORIZATION & EXECUTION FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Authorize a schedule for execution
     * @dev Provides contract signature to HSS schedule
     * @param scheduleAddress Schedule to authorize
     * @return responseCode HSS response code
     */
    function authorizeSchedule(address scheduleAddress) external returns (int64 responseCode);
    
    /**
     * @notice Manually execute a schedule (if authorized)
     * @dev Fallback for manual execution if HSS auto-execution fails
     * @param scheduleAddress Schedule to execute
     * @return success Whether execution succeeded
     * @return returnData Return data from execution
     */
    function executeSchedule(address scheduleAddress) external returns (bool success, bytes memory returnData);
    
    /**
     * @notice Cancel a scheduled transaction
     * @dev Prevents future execution of schedule
     * @param scheduleAddress Schedule to cancel
     */
    function cancelSchedule(address scheduleAddress) external;
    
    /**
     * @notice Delete a schedule permanently
     * @dev Removes schedule from HSS (requires admin key)
     * @param scheduleAddress Schedule to delete
     */
    function deleteSchedule(address scheduleAddress) external;
    
    // ========================================================================
    // BATCH OPERATIONS
    // ========================================================================
    
    /**
     * @notice Authorize multiple schedules in one transaction
     * @dev Gas-efficient batch authorization
     * @param scheduleAddresses Array of schedules to authorize
     * @return responseCodes Array of HSS response codes
     */
    function batchAuthorizeSchedules(address[] calldata scheduleAddresses) external returns (int64[] memory responseCodes);
    
    /**
     * @notice Cancel multiple schedules in one transaction
     * @dev Gas-efficient batch cancellation
     * @param scheduleAddresses Array of schedules to cancel
     */
    function batchCancelSchedules(address[] calldata scheduleAddresses) external;
    
    // ========================================================================
    // QUERY FUNCTIONS - PAYMENT SCHEDULES
    // ========================================================================
    
    /**
     * @notice Get details of a scheduled payment
     * @param scheduleAddress Schedule to query
     * @return Scheduled payment details
     */
    function getScheduledPayment(address scheduleAddress) external view returns (ScheduledPayment memory);
    
    /**
     * @notice Get all scheduled payments
     * @return Array of all scheduled payments
     */
    function getAllScheduledPayments() external view returns (ScheduledPayment[] memory);
    
    /**
     * @notice Get only active (not executed/canceled) scheduled payments
     * @return Array of active scheduled payments
     */
    function getActiveScheduledPayments() external view returns (ScheduledPayment[] memory);
    
    /**
     * @notice Get scheduled payments for a specific cycle
     * @param cycle Cycle number
     * @return Array of scheduled payments for cycle
     */
    function getScheduledPaymentsForCycle(uint256 cycle) external view returns (ScheduledPayment[] memory);
    
    /**
     * @notice Get all scheduled payments for a member
     * @param member Member address
     * @return Array of member's scheduled payments
     */
    function getScheduledPaymentsForMember(address member) external view returns (ScheduledPayment[] memory);
    
    /**
     * @notice Get schedules executing within timeframe
     * @param timeframe Seconds from now
     * @return Array of upcoming scheduled payments
     */
    function getUpcomingSchedules(uint256 timeframe) external view returns (ScheduledPayment[] memory);
    
    /**
     * @notice Get all pending (authorized but not executed) schedules
     * @return Array of pending scheduled payments
     */
    function getPendingSchedules() external view returns (ScheduledPayment[] memory);
    
    /**
     * @notice Get executed schedules with pagination
     * @param offset Starting index
     * @param limit Maximum number to return
     * @return Array of executed scheduled payments
     */
    function getExecutedSchedules(uint256 offset, uint256 limit) external view returns (ScheduledPayment[] memory);
    
    // ========================================================================
    // QUERY FUNCTIONS - GOVERNANCE SCHEDULES
    // ========================================================================
    
    /**
     * @notice Get scheduled governance action details
     * @param scheduleAddress Schedule to query
     * @return Scheduled governance action details
     */
    function getScheduledProposal(address scheduleAddress) external view returns (ScheduledGovernanceAction memory);
    
    /**
     * @notice Get all scheduled governance actions
     * @return Array of all scheduled governance actions
     */
    function getAllScheduledProposals() external view returns (ScheduledGovernanceAction[] memory);
    
    /**
     * @notice Get scheduled actions for a specific proposal
     * @param proposalId Proposal identifier
     * @return Array of scheduled actions for proposal
     */
    function getScheduledProposalsForProposalId(uint256 proposalId) external view returns (ScheduledGovernanceAction[] memory);
    
    // ========================================================================
    // QUERY FUNCTIONS - SCHEDULE DETAILS
    // ========================================================================
    
    /**
     * @notice Get detailed HSS information about a schedule
     * @param scheduleAddress Schedule to query
     * @return HSS schedule information
     */
    function getScheduleInfo(address scheduleAddress) external view returns (ScheduleInfo memory);
    
    /**
     * @notice Check if schedule has all required signatures
     * @param scheduleAddress Schedule to check
     * @return True if ready for execution
     */
    function isScheduleReady(address scheduleAddress) external view returns (bool);
    
    /**
     * @notice Check if schedule has expired
     * @param scheduleAddress Schedule to check
     * @return True if schedule is expired
     */
    function isScheduleExpired(address scheduleAddress) external view returns (bool);
    
    /**
     * @notice Check if cycle has any schedules
     * @param cycle Cycle number
     * @return True if cycle has schedules
     */
    function hasScheduleForCycle(uint256 cycle) external view returns (bool);
    
    /**
     * @notice Get all signatures on a schedule
     * @param scheduleAddress Schedule to query
     * @return Array of schedule signatures
     */
    function getScheduleSignatures(address scheduleAddress) external view returns (ScheduleSignature[] memory);
    
    /**
     * @notice Get signature progress for a schedule
     * @param scheduleAddress Schedule to check
     * @return collected Number of signatures collected
     * @return required Number of signatures required
     * @return isReady Whether schedule is ready for execution
     */
    function getScheduleProgress(address scheduleAddress) external view returns (uint256 collected, uint256 required, bool isReady);
    
    // ========================================================================
    // STATISTICS & ANALYTICS
    // ========================================================================
    
    /**
     * @notice Get overall scheduling statistics
     * @return Schedule statistics structure
     */
    function getScheduleStatistics() external view returns (ScheduleStatistics memory);
    
    /**
     * @notice Get total scheduled amount for a token
     * @param token Token to query
     * @return Total amount scheduled in token
     */
    function getTotalScheduledAmount(PaymentToken token) external view returns (uint256);
    
    /**
     * @notice Get schedules within date range
     * @param startTime Range start timestamp
     * @param endTime Range end timestamp
     * @return Array of schedules in range
     */
    function getSchedulesByDateRange(uint256 startTime, uint256 endTime) external view returns (ScheduledPayment[] memory);
    
    /**
     * @notice Get complete schedule history for a member
     * @param member Member address
     * @return Array of member's schedule history
     */
    function getMemberScheduleHistory(address member) external view returns (ScheduledPayment[] memory);
    
    // ========================================================================
    // CONFIGURATION FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Update HSS precompile address
     * @dev Admin only, for upgrades or testnet/mainnet switching
     * @param newAddress New HSS address
     */
    function updateScheduleServiceAddress(address newAddress) external;
    
    /**
     * @notice Set maximum schedules per cycle
     * @dev Prevents spam and resource exhaustion
     * @param maxSchedules Maximum schedules allowed per cycle
     */
    function setMaxSchedulesPerCycle(uint256 maxSchedules) external;
    
    /**
     * @notice Set minimum execution delay
     * @dev Prevents immediate execution, allows time for review
     * @param minDelay Minimum seconds before execution
     */
    function setMinExecutionDelay(uint256 minDelay) external;
    
    /**
     * @notice Set maximum execution delay
     * @dev Prevents scheduling too far in future (HSS 62-day limit)
     * @param maxDelay Maximum seconds before execution
     */
    function setMaxExecutionDelay(uint256 maxDelay) external;
    
    /**
     * @notice Pause all scheduling operations
     * @dev Emergency function to halt new schedule creation
     */
    function pauseScheduling() external;
    
    /**
     * @notice Unpause scheduling operations
     * @dev Resume normal schedule creation
     */
    function unpauseScheduling() external;
    
    // ========================================================================
    // HEALTH & STATUS FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Check if scheduling is currently enabled
     * @return True if scheduling is active
     */
    function isSchedulingEnabled() external view returns (bool);
    
    /**
     * @notice Get comprehensive schedule service status
     * @return isEnabled Whether service is enabled
     * @return serviceAddress Current HSS address
     * @return totalScheduled Total schedules created
     * @return totalExecuted Total schedules executed
     */
    function getScheduleServiceStatus() external view returns (bool isEnabled, address serviceAddress, uint256 totalScheduled, uint256 totalExecuted);
    
    /**
     * @notice Validate if schedule address is legitimate
     * @param scheduleAddress Schedule to validate
     * @return isValid True if schedule is valid
     * @return reason Reason if invalid
     */
    function validateScheduleAddress(address scheduleAddress) external view returns (bool isValid, string memory reason);
    
    // ========================================================================
    // EVENTS
    // ========================================================================
    
    event PaymentScheduled(address indexed scheduleAddress, uint256 cycle, uint256 executionTime, address member, uint256 amount, PaymentToken token);
    event PayoutScheduled(address indexed scheduleAddress, uint256 cycle, uint256 executionTime, address recipient, uint256 amount, PaymentToken token);
    event ProposalScheduled(uint256 indexed proposalId, address indexed scheduleAddress, uint256 executionTime);
    event GovernanceActionScheduled(uint256 indexed proposalId, address indexed scheduleAddress, uint256 executionTime);
    event ScheduleAuthorized(address indexed scheduleAddress, address indexed authorizer, uint256 signaturesCollected, uint256 signaturesRequired);
    event ScheduleExecuted(address indexed scheduleAddress, bool success, bytes returnData);
    event ScheduleCanceled(address indexed scheduleAddress, address indexed canceler, string reason);
    event ScheduleExpired(address indexed scheduleAddress, uint256 expirationTime);
    event ScheduleDeleted(address indexed scheduleAddress, address indexed deleter);
    event SchedulingPaused(address indexed admin);
    event SchedulingUnpaused(address indexed admin);
    event ScheduleServiceUpdated(address indexed oldAddress, address indexed newAddress);
}

// ============================================================================
// AJO CORE INTERFACE
// ============================================================================

/**
 * @title IAjoCore
 * @notice Main orchestration contract for Ajo.save protocol
 * @dev Central coordination point for all Ajo operations
 * 
 * RESPONSIBILITIES:
 * - Member onboarding and exit
 * - Payment processing coordination
 * - Payout distribution triggering
 * - Contract statistics aggregation
 * - Emergency functions
 * 
 * ARCHITECTURE PATTERN:
 * AjoCore follows a modular architecture where specialized contracts
 * handle specific functions (members, collateral, payments, governance, schedule).
 * AjoCore orchestrates calls between these modules while maintaining
 * minimal state to reduce gas costs and improve upgradability.
 * 
 * ACCESS CONTROL:
 * - Only factory can initialize
 * - Only authorized contracts can call internal functions
 * - Admin functions restricted to governance
 * - Emergency functions restricted to owner
 */
interface IAjoCore {
    /**
     * @notice Initialize the AjoCore contract
     * @dev Called by factory after deployment, sets up all contract dependencies
     * @param _usdc Address of USDC token (HTS or ERC20)
     * @param _whbar Address of Wrapped HBAR token
     * @param _ajoMembers Address of AjoMembers contract
     * @param _ajoCollateral Address of AjoCollateral contract
     * @param _ajoPayments Address of AjoPayments contract
     * @param _ajoGovernance Address of AjoGovernance contract
     */
    function initialize(
        address _usdc,
        address _whbar,
        address _ajoMembers,
        address _ajoCollateral,
        address _ajoPayments,
        address _ajoGovernance
    ) external;
    
    // ========================================================================
    // CORE AJO FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Join the Ajo group
     * @dev Member must have sufficient balance and approve token spending
     * 
     * JOINING PROCESS:
     * 1. Check member eligibility (not already member)
     * 2. Calculate required collateral based on next queue position
     * 3. Assign guarantor (opposite side of queue)
     * 4. Lock collateral in AjoCollateral contract
     * 5. Add member to AjoMembers contract
     * 6. Emit MemberJoined event
     * 
     * COLLATERAL CALCULATION:
     * Collateral = 60% of net debt at position
     * Net debt = (Position - 1) * MonthlyPayment - TotalReceived
     * 
     * @param tokenChoice Preferred token for payments (USDC or HBAR)
     */
    function joinAjo(PaymentToken tokenChoice) external;
    
    /**
     * @notice Process monthly payment for current cycle
     * @dev Callable by member or via HSS scheduled execution
     * 
     * PAYMENT PROCESS:
     * 1. Verify member hasn't paid this cycle
     * 2. Calculate payment amount (base + any penalties)
     * 3. Transfer tokens from member to contract
     * 4. Update member payment record
     * 5. Check if all members paid (trigger payout if ready)
     * 6. Emit PaymentMade event
     * 
     * PENALTY SYSTEM:
     * - Late payments incur penalty fee
     * - Penalty rate set by governance
     * - Penalties added to pool for distribution
     */
    function processPayment() external;
    
    /**
     * @notice Distribute payout to next recipient
     * @dev Automatically called when all members have paid for cycle
     * 
     * PAYOUT PROCESS:
     * 1. Verify all members have paid
     * 2. Calculate total payout (sum of payments)
     * 3. Identify next recipient (by queue position)
     * 4. Transfer payout to recipient
     * 5. Mark recipient as having received payout
     * 6. Advance to next cycle
     * 7. Emit PayoutDistributed event
     * 
     * PAYOUT AMOUNT:
     * Total = (Number of Members * Monthly Payment) + Accumulated Penalties
     */
    function distributePayout() external;
    
    /**
     * @notice Exit the Ajo group
     * @dev Member can exit if they haven't received payout yet
     * 
     * EXIT PROCESS:
     * 1. Verify member is active
     * 2. Verify member hasn't received payout
     * 3. Calculate refund amount (payments made - received)
     * 4. Unlock and return collateral
     * 5. Remove member from active list
     * 6. Reassign guarantor relationships
     * 7. Emit MemberRemoved event
     * 
     * EXIT RESTRICTIONS:
     * - Cannot exit after receiving payout
     * - Cannot exit if currently defaulting
     * - May incur exit penalty (governance controlled)
     */
    function exitAjo() external;
    
    // ========================================================================
    // VIEW FUNCTIONS - MEMBER INFORMATION
    // ========================================================================
    
    /**
     * @notice Get complete member information
     * @param member Member address to query
     * @return memberInfo Complete member data structure
     * @return pendingPenalty Any accumulated penalties
     * @return effectiveVotingPower Reputation-weighted voting power
     */
    function getMemberInfo(address member) external view returns (
        Member memory memberInfo, 
        uint256 pendingPenalty,
        uint256 effectiveVotingPower
    );
    
    /**
     * @notice Get member's queue information
     * @param member Member address
     * @return position Queue position (1-indexed)
     * @return estimatedCyclesWait Estimated cycles until payout
     */
    function getQueueInfo(address member) external view returns (
        uint256 position, 
        uint256 estimatedCyclesWait
    );
    
    /**
     * @notice Get configured cycle duration
     * @return Cycle duration in seconds (typically 30 days)
     */
    function getCycleDuration() external view returns (uint256);
    
    /**
     * @notice Check if member needs to pay this cycle
     * @param member Member address
     * @return True if payment required this cycle
     */
    function needsToPayThisCycle(address member) external view returns (bool);
    
    /**
     * @notice Get payments contract address
     * @return AjoPayments contract interface
     */
    function paymentsContractAddress() external view returns (IAjoPayments);
    
    // ========================================================================
    // VIEW FUNCTIONS - CONTRACT STATISTICS
    // ========================================================================
    
    /**
     * @notice Get comprehensive contract statistics
     * @return totalMembers Total members ever joined
     * @return activeMembers Currently active members
     * @return totalCollateralUSDC Total USDC collateral locked
     * @return totalCollateralHBAR Total HBAR collateral locked
     * @return contractBalanceUSDC Current USDC balance
     * @return contractBalanceHBAR Current HBAR balance
     * @return currentQueuePosition Next queue position to assign
     * @return activeToken Currently active payment token
     */
    function getContractStats() external view returns (
        uint256 totalMembers,
        uint256 activeMembers,
        uint256 totalCollateralUSDC,
        uint256 totalCollateralHBAR,
        uint256 contractBalanceUSDC,
        uint256 contractBalanceHBAR,
        uint256 currentQueuePosition,
        PaymentToken activeToken
    );
    
    // ========================================================================
    // VIEW FUNCTIONS - TOKEN CONFIGURATION
    // ========================================================================
    
    /**
     * @notice Get token configuration
     * @param token Token to query (USDC or HBAR)
     * @return Token configuration (monthly payment and active status)
     */
    function getTokenConfig(PaymentToken token) external view returns (TokenConfig memory);
    
    // ========================================================================
    // VIEW FUNCTIONS - COLLATERAL DEMONSTRATION
    // ========================================================================
    
    /**
     * @notice Demonstrate collateral requirements for different positions
     * @dev Used for frontend education and visualization
     * 
     * EXAMPLE OUTPUT (10 participants, $100 monthly):
     * Position 1: $540 (highest collateral, first payout)
     * Position 2: $480
     * Position 3: $420
     * ...
     * Position 10: $0 (no collateral, last payout)
     * 
     * @param participants Number of members in simulation
     * @param monthlyPayment Monthly payment amount
     * @return positions Array of position numbers
     * @return collaterals Array of required collateral amounts
     */
    function getCollateralDemo(uint256 participants, uint256 monthlyPayment) external view returns (
        uint256[] memory positions, 
        uint256[] memory collaterals
    );
    
    // ========================================================================
    // VIEW FUNCTIONS - SECURITY MODEL
    // ========================================================================
    
    /**
     * @notice Calculate total seizable assets from defaulter
     * @dev Shows 109% security coverage in action
     * 
     * SEIZURE CASCADE:
     * 1. Defaulter's locked collateral (60% of net debt)
     * 2. Defaulter's past payments in pool (40% of debt)
     * 3. Guarantor's collateral (additional 9% buffer)
     * Total = 109% coverage
     * 
     * @param defaulterAddress Address of defaulting member
     * @return totalSeizable Total amount that can be seized
     * @return collateralSeized Amount from collateral
     * @return paymentsSeized Amount from payment pool
     */
    function calculateSeizableAssets(address defaulterAddress) external view returns (
        uint256 totalSeizable, 
        uint256 collateralSeized, 
        uint256 paymentsSeized
    );
    
    /**
     * @notice Authorize address for automated operations
     * @dev Used for HSS and external automation services
     * @param automationAddress Address to authorize
     * @param authorized Whether to grant authorization
     */
    function setAutomationAuthorization(address automationAddress, bool authorized) external;
    
    /**
     * @notice Enable or disable automation system
     * @param enabled Whether automation is enabled
     */
    function setAutomationEnabled(bool enabled) external;
    
    /**
     * @notice Check if automation should run
     * @dev Used by external automation services (Chainlink, Gelato, HSS)
     * @return shouldRun Whether automation should execute
     * @return reason Human-readable reason
     * @return defaultersCount Number of members in default
     */
    function shouldAutomationRun() external view returns (
        bool shouldRun,
        string memory reason,
        uint256 defaultersCount
    );
    
    // ========================================================================
    // ADMIN FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Emergency withdraw funds
     * @dev Admin only, for emergency situations
     * @param token Token to withdraw
     */
    function emergencyWithdraw(PaymentToken token) external;
    
    /**
     * @notice Update cycle duration
     * @dev Governance only, affects future cycles
     * @param newDuration New duration in seconds
     */
    function updateCycleDuration(uint256 newDuration) external;
    
    /**
     * @notice Emergency pause all operations
     * @dev Admin only, stops all member actions
     */
    function emergencyPause() external;
    
    /**
     * @notice Update token configuration
     * @dev Governance only, updates payment requirements
     * @param token Token to configure
     * @param monthlyPayment New monthly payment amount
     * @param isActive Whether token is accepted
     */
    function updateTokenConfig(
        PaymentToken token,
        uint256 monthlyPayment,
        bool isActive
    ) external;
}

// ============================================================================
// AJO GOVERNANCE INTERFACE
// ============================================================================

/**
 * @title IAjoGovernance
 * @notice On-chain governance system with HCS integration
 * @dev Manages proposals, voting, and season transitions
 * 
 * SEASON TERMINOLOGY:
 * - Season: Complete period where all members receive payout once
 * - Cycle: Individual monthly payment slot within a season
 * - Example: 10 members = 1 season of 10 cycles
 * 
 * GOVERNANCE FEATURES:
 * - Reputation-weighted voting
 * - HCS-recorded votes for immutability
 * - Season management (completion, restart, carry-over rules)
 * - Parameter updates via proposals
 * - Token freeze/unfreeze controls
 * 
 * VOTING POWER CALCULATION:
 * Voting Power = Base Power * (Reputation Score / 100)
 * Base Power = 1 vote per member
 * Reputation Score = 0-100 based on payment history
 * 
 * PROPOSAL LIFECYCLE:
 * 1. Create: Member submits proposal
 * 2. Vote: Members vote (recorded on HCS)
 * 3. Tally: Votes counted from HCS messages
 * 4. Execute: If passed, proposal executes
 * 5. Or Cancel: Proposer can cancel before execution
 */
interface IAjoGovernance {
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    
    /**
     * @notice Initialize the AjoGovernance contract
     * @dev Called by factory after deployment
     * @param _ajoCore Address of AjoCore contract
     * @param _ajoMembers Address of AjoMembers contract
     * @param _ajoSchedule Address of AjoSchedule contract
     * @param _hederaTokenService Address of HTS precompile
     * @param _hcsTopicId HCS topic for governance messages
     */
    function initialize(
        address _ajoCore, 
        address _ajoMembers,  
        address _ajoSchedule, 
        address _hederaTokenService, 
        bytes32 _hcsTopicId
    ) external;
    
    /**
     * @notice Verify governance setup is complete
     * @return isValid Whether setup is valid
     * @return reason Reason if invalid
     */
    function verifySetup() external view returns (bool isValid, string memory reason);
    
    /**
     * @notice Get HCS topic ID for governance
     * @return HCS topic identifier
     */
    function getHcsTopicId() external view returns (bytes32);
    
    // ========================================================================
    // CORE PROPOSAL FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Create a new governance proposal
     * @dev Any active member can create proposals
     * 
     * PROPOSAL TYPES (encoded in proposalData):
     * - Parameter changes (cycle duration, payment amounts)
     * - Member actions (add, remove, penalties)
     * - Season management (completion, restart)
     * - Token configuration
     * - Emergency actions
     * 
     * REQUIREMENTS:
     * - Caller must be active member
     * - Must meet proposal threshold (reputation-based)
     * - Description must not be empty
     * 
     * @param description Human-readable proposal description
     * @param proposalData ABI-encoded proposal parameters
     * @return proposalId Unique proposal identifier
     */
    function createProposal(string memory description, bytes memory proposalData) external returns (uint256 proposalId);
    
    /**
     * @notice Cancel a proposal before execution
     * @dev Only proposer can cancel
     * @param proposalId Proposal to cancel
     */
    function cancelProposal(uint256 proposalId) external;
    
    /**
     * @notice Get proposal details
     * @param proposalId Proposal to query
     * @return description Proposal description
     * @return forVotes Votes in favor
     * @return againstVotes Votes against
     * @return abstainVotes Abstain votes
     * @return startTime Voting start timestamp
     * @return endTime Voting end timestamp
     * @return executed Whether proposal executed
     * @return canceled Whether proposal canceled
     * @return proposalData Encoded proposal data
     */
    function getProposal(uint256 proposalId) external view returns (
        string memory description, 
        uint256 forVotes, 
        uint256 againstVotes, 
        uint256 abstainVotes, 
        uint256 startTime, 
        uint256 endTime, 
        bool executed, 
        bool canceled, 
        bytes memory proposalData
    );
    
    /**
     * @notice Get proposal voting status
     * @param proposalId Proposal to query
     * @return isActive Whether voting is active
     * @return hasQuorum Whether quorum reached
     * @return isPassing Whether currently passing
     * @return votesNeeded Additional votes needed to pass
     */
    function getProposalStatus(uint256 proposalId) external view returns (
        bool isActive, 
        bool hasQuorum, 
        bool isPassing, 
        uint256 votesNeeded
    );
    
    // ========================================================================
    // SEASON MANAGEMENT PROPOSALS
    // ========================================================================
    
    /**
     * @notice Propose marking current season as complete
     * @dev Triggered when all members have received payout
     * 
     * SEASON COMPLETION PROCESS:
     * 1. Verify all payouts distributed
     * 2. Calculate final statistics
     * 3. Open participation declarations for next season
     * 4. Set deadline for declarations (typically 7-14 days)
     * 
     * @param description Reason for season completion
     * @return proposalId Created proposal ID
     */
    function proposeSeasonCompletion(string memory description) external returns (uint256 proposalId);
    
    /**
     * @notice Propose starting a new season with updated parameters
     * @dev Allows reconfiguration between seasons
     * 
     * NEW SEASON FEATURES:
     * - Adjust cycle duration
     * - Change monthly contribution amounts
     * - Add new members (if approved)
     * - Apply carry-over rules (reputation, penalties)
     * 
     * PARTICIPATION RULES:
     * - Previous members can opt-in or opt-out
     * - New members can join if approved
     * - Queue positions reassigned based on participation
     * 
     * @param description Season restart description
     * @param newDuration New cycle duration
     * @param newMonthlyContribution New payment amount
     * @param newMembers Addresses of new members to add
     * @return proposalId Created proposal ID
     */
    function proposeNewSeasonRestart(
        string memory description,
        uint256 newDuration,
        uint256 newMonthlyContribution,
        address[] memory newMembers
    ) external returns (uint256 proposalId);
    
    /**
     * @notice Propose adding a new member to the Ajo
     * @dev Requires governance approval
     * 
     * NEW MEMBER VETTING:
     * - Reputation check (if known from other Ajos)
     * - Collateral verification
     * - Community vote for acceptance
     * 
     * @param newMember Address of proposed member
     * @param description Reason for addition
     * @return proposalId Created proposal ID
     */
    function proposeNewMember(
        address newMember,
        string memory description
    ) external returns (uint256 proposalId);
    
    /**
     * @notice Propose updating season parameters
     * @dev Changes take effect in next season
     * @param description Update description
     * @param newDuration New cycle duration (seconds)
     * @param newMonthlyPayment New payment amount
     * @return proposalId Created proposal ID
     */
    function proposeUpdateSeasonParameters(
        string memory description,
        uint256 newDuration,
        uint256 newMonthlyPayment
    ) external returns (uint256 proposalId);
    
    /**
     * @notice Propose carry-over rules for next season
     * @dev Determines what carries between seasons
     * 
     * CARRY-OVER OPTIONS:
     * - Reputation scores (reward good actors)
     * - Penalty records (track bad actors)
     * - Neither (fresh start)
     * - Both (full history)
     * 
     * @param description Rules description
     * @param _carryReputation Whether to carry reputation
     * @param _carryPenalties Whether to carry penalties
     * @return proposalId Created proposal ID
     */
    function proposeCarryOverRules(
        string memory description,
        bool _carryReputation,
        bool _carryPenalties
    ) external returns (uint256 proposalId);
    
    // ========================================================================
    // MEMBER PARTICIPATION
    // ========================================================================
    
    /**
     * @notice Declare participation in next season
     * @dev Must be called before participation deadline
     * 
     * PARTICIPATION IMPLICATIONS:
     * - True: Member joins next season (retains/improves queue position)
     * - False: Member opts out (can join later as new member)
     * 
     * DEADLINE:
     * - Set when season completes
     * - Typically 7-14 days
     * - No participation = assumed opt-out
     * 
     * @param participate Whether to participate in next season
     */
    function declareNextSeasonParticipation(bool participate) external;
    
    /**
     * @notice Get member's participation status for next season
     * @param member Member address
     * @return willParticipate Whether member will participate
     */
    function getMemberParticipationStatus(address member) external view returns (bool willParticipate);
    
    // ========================================================================
    // VOTING FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Tally votes from HCS messages
     * @dev Processes votes submitted to HCS topic
     * 
     * HCS VOTING PROCESS:
     * 1. Member submits vote to HCS topic (off-chain)
     * 2. HCS returns message ID and sequence number
     * 3. Vote tallier calls this function with HCS data
     * 4. Contract verifies signatures and tallies votes
     * 
     * VOTE VERIFICATION:
     * - Check signature validity
     * - Verify voter is active member
     * - Calculate reputation-weighted power
     * - Prevent double voting
     * 
     * @param proposalId Proposal to tally votes for
     * @param votes Array of HCS vote records
     * @return totalForVotes Total votes in favor
     * @return totalAgainstVotes Total votes against
     * @return totalAbstainVotes Total abstain votes
     */
    function tallyVotesFromHCS(uint256 proposalId, HcsVote[] memory votes) external returns (
        uint256 totalForVotes, 
        uint256 totalAgainstVotes, 
        uint256 totalAbstainVotes
    );
    
    /**
     * @notice Check if member has voted on proposal
     * @param proposalId Proposal ID
     * @param voter Member address
     * @return True if member has voted
     */
    function hasVoted(uint256 proposalId, address voter) external view returns (bool);
    
    /**
     * @notice Get member's voting power
     * @dev Based on reputation score
     * @param member Member address
     * @return Reputation-weighted voting power
     */
    function getVotingPower(address member) external view returns (uint256);
    
    /**
     * @notice Execute approved proposal
     * @dev Can only execute if passed and voting period ended
     * 
     * EXECUTION REQUIREMENTS:
     * - Voting period ended
     * - Quorum reached
     * - More for votes than against
     * - Not already executed
     * - Not canceled
     * 
     * EXECUTION PROCESS:
     * 1. Verify proposal passed
     * 2. Decode proposal data
     * 3. Execute proposed action
     * 4. Emit execution event
     * 5. Mark as executed
     * 
     * @param proposalId Proposal to execute
     * @return success Whether execution succeeded
     */
    function executeProposal(uint256 proposalId) external returns (bool success);
    
    // ========================================================================
    // TOKEN CONTROL FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Freeze member's token account
     * @dev Governance action to prevent token transfers
     * 
     * USE CASES:
     * - Member under investigation
     * - Dispute resolution
     * - Pending penalty collection
     * - Emergency situations
     * 
     * EFFECTS:
     * - Member cannot transfer tokens
     * - Can still receive tokens
     * - Reversible via unfreeze
     * 
     * @param token Token to freeze (USDC or HBAR)
     * @param member Member to freeze
     * @return responseCode HTS response code
     */
    function freezeMemberToken(address token, address member) external returns (int64 responseCode);
    
    /**
     * @notice Unfreeze member's token account
     * @dev Restores normal token transfer capability
     * @param token Token to unfreeze
     * @param member Member to unfreeze
     * @return responseCode HTS response code
     */
    function unfreezeMemberToken(address token, address member) external returns (int64 responseCode);
    
    // ========================================================================
    // SETTINGS FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Update penalty rate for late payments
     * @dev Governance-controlled parameter
     * @param newPenaltyRate New penalty percentage (basis points, e.g., 500 = 5%)
     */
    function updatePenaltyRate(uint256 newPenaltyRate) external;
    
    /**
     * @notice Update voting period duration
     * @dev How long proposals remain open for voting
     * @param newVotingPeriod New duration in seconds
     */
    function updateVotingPeriod(uint256 newVotingPeriod) external;
    
    /**
     * @notice Update proposal threshold
     * @dev Minimum reputation needed to create proposals
     * @param newThreshold New threshold (0-100)
     */
    function updateProposalThreshold(uint256 newThreshold) external;
    
    /**
     * @notice Update member's reputation and voting power
     * @dev Called by payment system after payments/defaults
     * @param member Member to update
     * @param positive Whether to increase (true) or decrease (false) reputation
     */
    function updateReputationAndVotingPower(address member, bool positive) external;
    
    // ========================================================================
    // QUERY FUNCTIONS - GOVERNANCE
    // ========================================================================
    
    /**
     * @notice Get governance configuration
     * @return proposalThreshold Minimum reputation to create proposals
     * @return votingPeriod Voting duration in seconds
     * @return quorumPercentage Quorum requirement (e.g., 51 = 51%)
     * @return currentPenaltyRate Current late payment penalty
     * @return totalProposals Total proposals created
     */
    function getGovernanceSettings() external view returns (
        uint256 proposalThreshold, 
        uint256 votingPeriod, 
        uint256 quorumPercentage, 
        uint256 currentPenaltyRate, 
        uint256 totalProposals
    );
    
    /**
     * @notice Get paginated list of all proposals
     * @param offset Starting index
     * @param limit Maximum number to return
     * @return proposalIds Array of proposal IDs
     * @return hasMore Whether more proposals exist
     */
    function getAllProposals(uint256 offset, uint256 limit) external view returns (
        uint256[] memory proposalIds, 
        bool hasMore
    );
    
    /**
     * @notice Get currently active proposals
     * @return proposalIds Array of active proposal IDs
     */
    function getActiveProposals() external view returns (uint256[] memory proposalIds);
    
    // ========================================================================
    // QUERY FUNCTIONS - SEASON MANAGEMENT
    // ========================================================================
    
    /**
     * @notice Get current season status
     * @return _currentSeason Current season number
     * @return _isSeasonCompleted Whether season is complete
     * @return _participationDeadline Deadline for next season declarations
     * @return _declaredParticipants Number of members who declared
     */
    function getSeasonStatus() external view returns (
        uint256 _currentSeason,
        bool _isSeasonCompleted,
        uint256 _participationDeadline,
        uint256 _declaredParticipants
    );
    
    /**
     * @notice Get carry-over rules for next season
     * @return _carryReputation Whether reputation carries over
     * @return _carryPenalties Whether penalties carry over
     */
    function getCarryOverRules() external view returns (
        bool _carryReputation, 
        bool _carryPenalties
    );
    
    /**
     * @notice Get count of members continuing to next season
     * @return Number of continuing members
     */
    function getContinuingMembersCount() external view returns (uint256);
    
    /**
     * @notice Get list of members continuing to next season
     * @return Array of continuing member addresses
     */
    function getContinuingMembersList() external view returns (address[] memory);
    
    /**
     * @notice Get list of members opting out of next season
     * @return Array of opt-out member addresses
     */
    function getOptOutMembersList() external view returns (address[] memory);
    
    // ========================================================================
    // EVENTS - CORE GOVERNANCE
    // ========================================================================
    
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description, uint256 startTime, uint256 endTime);
    event VoteSubmittedToHCS(uint256 indexed proposalId, address indexed voter, uint8 support, uint256 votingPower, bytes32 hcsMessageId, uint64 sequenceNumber);
    event VotesTallied(uint256 indexed proposalId, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, address indexed tallier);
    event ProposalExecuted(uint256 indexed proposalId, bool success, bytes returnData);
    event ProposalCanceled(uint256 indexed proposalId, address indexed canceler);
    
    // ========================================================================
    // EVENTS - TOKEN CONTROL
    // ========================================================================
    
    event TokenFrozen(address indexed token, address indexed account, int64 responseCode);
    event TokenUnfrozen(address indexed token, address indexed account, int64 responseCode);
    event TokenPaused(address indexed token, int64 responseCode);
    event TokenUnpaused(address indexed token, int64 responseCode);
    
    // ========================================================================
    // EVENTS - SEASON MANAGEMENT
    // ========================================================================
    
    event ParticipationDeclared(address indexed member, bool willParticipate, uint256 indexed nextSeason);
    event SeasonCompleted(uint256 indexed season, uint256 timestamp);
    event NewSeasonStarted(uint256 indexed season, uint256 duration, uint256 monthlyContribution, address[] members);
    event ParticipationDeadlineSet(uint256 deadline, uint256 season);
    event CarryOverRulesUpdated(bool carryReputation, bool carryPenalties);
    event NewMemberProposed(address indexed newMember, uint256 indexed proposalId, address indexed proposer);
    event SeasonParametersUpdated(uint256 newDuration, uint256 newMonthlyPayment);
}

// ============================================================================
// AJO COLLATERAL INTERFACE
// ============================================================================

/**
 * @title IAjoCollateral
 * @notice Manages collateral calculations, locking, and seizure
 * @dev Implements position-based collateral model with guarantor network
 * 
 * COLLATERAL MODEL:
 * - Position-based: Higher positions (earlier payouts) require more collateral
 * - Formula: 60% of net debt at position
 * - Net debt = (Position - 1) * Monthly Payment - Total Received
 * 
 * GUARANTOR SYSTEM:
 * - Each member has one guarantor
 * - Guarantor position = opposite side of queue
 * - Example (10 members): Position 1's guarantor is Position 10
 * - Provides additional 9% security buffer
 * 
 * TOTAL SECURITY COVERAGE:
 * - Member collateral: 60% of net debt
 * - Past payments in pool: 40% of debt
 * - Guarantor collateral: 9% buffer
 * - Total: 109% coverage
 */
interface IAjoCollateral {
    /**
     * @notice Initialize the AjoCollateral contract
     * @param _usdc USDC token address
     * @param _whbar Wrapped HBAR address
     * @param _ajoCore AjoCore contract address
     * @param _ajoMembers AjoMembers contract address
     */
    function initialize(
        address _usdc,
        address _whbar,
        address _ajoCore,
        address _ajoMembers
    ) external;
    
    // ========================================================================
    // COLLATERAL CALCULATION FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Calculate required collateral for a position
     * @dev Pure calculation based on position and parameters
     * 
     * CALCULATION LOGIC:
     * 1. Calculate net debt at position:
     *    netDebt = (position - 1) * monthlyPayment
     * 2. Apply 60% collateral rate:
     *    collateral = netDebt * 0.6
     * 
     * EXAMPLES (monthlyPayment = $100, totalParticipants = 10):
     * - Position 1: (1-1) * $100 * 0.6 = $0... wait, Position 1 gets paid first
     *   Actually: (10-1) * $100 * 0.6 = $540
     * - Position 5: (10-5) * $100 * 0.6 = $300
     * - Position 10: (10-10) * $100 * 0.6 = $0
     * 
     * @param position Member's queue position (1-indexed)
     * @param monthlyPayment Monthly payment amount
     * @param totalParticipants Total number of participants
     * @return Required collateral amount
     */
    function calculateRequiredCollateral(
        uint256 position,
        uint256 monthlyPayment,
        uint256 totalParticipants
    ) external view returns (uint256);
    
    /**
     * @notice Calculate guarantor position for a member
     * @dev Guarantor is on opposite side of queue
     * 
     * GUARANTOR ASSIGNMENT LOGIC:
     * - Early positions guaranteed by late positions
     * - Late positions guaranteed by early positions
     * - Formula: guarantorPos = totalParticipants - memberPos + 1
     * 
     * EXAMPLES (totalParticipants = 10):
     * - Member Position 1 → Guarantor Position 10
     * - Member Position 3 → Guarantor Position 8
     * - Member Position 10 → Guarantor Position 1
     * 
     * @param memberPosition Member's queue position
     * @param totalParticipants Total number of participants
     * @return Guarantor's queue position
     */
    function calculateGuarantorPosition(
        uint256 memberPosition,
        uint256 totalParticipants
    ) external pure returns (uint256);
    
    // ========================================================================
    // VIEW FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Get total collateral locked in contract
     * @return totalUSDC Total USDC collateral
     * @return totalHBAR Total HBAR collateral
     */
    function getTotalCollateral() external view returns (uint256 totalUSDC, uint256 totalHBAR);
    
    /**
     * @notice Calculate total seizable assets from defaulter
     * @dev Shows complete seizure cascade
     * 
     * SEIZURE CASCADE:
     * 1. Defaulter's collateral (60% of debt)
     * 2. Defaulter's past payments (40% of debt)
     * 3. Guarantor's collateral (9% buffer)
     * 
     * @param defaulterAddress Address of defaulting member
     * @return totalSeizable Total amount that can be seized
     * @return collateralSeized Amount from defaulter's collateral
     * @return paymentsSeized Amount from defaulter's payments
     */
    function calculateSeizableAssets(address defaulterAddress) external view returns (
        uint256 totalSeizable, 
        uint256 collateralSeized, 
        uint256 paymentsSeized
    );
    
    // ========================================================================
    // COLLATERAL MANAGEMENT FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Lock collateral for a member
     * @dev Called when member joins or increases collateral
     * @param member Member address
     * @param amount Amount to lock
     * @param token Token type (USDC or HBAR)
     */
    function lockCollateral(address member, uint256 amount, PaymentToken token) external;
    
    /**
     * @notice Unlock collateral for a member
     * @dev Called when member exits or after payout received
     * @param member Member address
     * @param amount Amount to unlock
     * @param token Token type
     */
    function unlockCollateral(address member, uint256 amount, PaymentToken token) external;
    
    /**
     * @notice Execute seizure cascade for defaulter
     * @dev Seizes assets according to cascade rules
     * 
     * SEIZURE PROCESS:
     * 1. Identify defaulter and guarantor
     * 2. Calculate amounts from each source
     * 3. Transfer seized assets to pool
     * 4. Update member records
     * 5. Emit seizure events
     * 
     * @param defaulter Address of defaulting member
     */
    function executeSeizure(address defaulter) external;
    
    /**
     * @notice Emergency withdraw collateral
     * @dev Admin only, for emergency situations
     * @param token Token to withdraw
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(PaymentToken token, address to, uint256 amount) external;
    
    // ========================================================================
    // EVENTS
    // ========================================================================
    
    event CollateralLiquidated(address indexed member, uint256 amount, PaymentToken token);
    event PaymentSeized(address indexed member, uint256 amount, string reason);
    event GuarantorAssigned(address indexed member, address indexed guarantor, uint256 memberPosition, uint256 guarantorPosition);
    event CollateralCalculated(address indexed member, uint256 requiredAmount, uint256 actualAmount);
    event CollateralSeized(
       address indexed defaulter, 
       address indexed guarantor, 
       uint256 totalAmount, 
       PaymentToken token
   );
}

// ============================================================================
// AJO PAYMENTS INTERFACE
// ============================================================================

/**
 * @title IAjoPayments
 * @notice Handles payment processing, payout distribution, and default management
 * @dev Core financial operations contract
 * 
 * PAYMENT CYCLE:
 * 1. Members make monthly payments
 * 2. All payments collected into pool
 * 3. When all paid, distribute to next recipient
 * 4. Advance to next cycle
 * 5. Repeat until all members receive payout
 * 
 * DEFAULT HANDLING:
 * - Late payments incur penalties
 * - Repeated defaults trigger seizure
 * - Seized assets protect remaining members
 * - Reputation decreases affect voting power
 */
interface IAjoPayments {
    /**
     * @notice Initialize the AjoPayments contract
     * @param _usdc USDC token address
     * @param _whbar Wrapped HBAR address
     * @param _ajoCore AjoCore contract address
     * @param _ajoMembers AjoMembers contract address
     * @param _ajoCollateral AjoCollateral contract address
     */
    function initialize(
        address _usdc,
        address _whbar,
        address _ajoCore,
        address _ajoMembers,
        address _ajoCollateral
    ) external;
    
    // ========================================================================
    // CORE PAYMENT FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Process payment from a member
     * @dev Transfers payment from member to contract pool
     * 
     * PAYMENT PROCESS:
     * 1. Verify member hasn't paid this cycle
     * 2. Calculate total amount (base + penalties)
     * 3. Transfer tokens from member
     * 4. Record payment
     * 5. Update member statistics
     * 6. Check if payout ready
     * 
     * @param member Member making payment
     * @param amount Base payment amount
     * @param token Token type
     */
    function processPayment(address member, uint256 amount, PaymentToken token) external;
    
    /**
     * @notice Distribute payout to next recipient
     * @dev Called when all members have paid
     * 
     * PAYOUT PROCESS:
     * 1. Verify all members paid
     * 2. Calculate total payout amount
     * 3. Identify next recipient
     * 4. Transfer payout
     * 5. Mark recipient as paid out
     * 6. Advance cycle
     * 7. Reset payment tracking
     * 
     * PAYOUT AMOUNT:
     * Base = Members * Monthly Payment
     * + Penalties collected this cycle
     * + Any surplus from previous cycles
     */
    function distributePayout() external;
    
    /**
     * @notice Handle member default
     * @dev Triggers penalty and potential seizure
     * 
     * DEFAULT CONSEQUENCES:
     * 1. Reputation decrease
     * 2. Penalty applied
     * 3. If severe, trigger collateral seizure
     * 4. Guarantor may be called upon
     * 5. Default recorded permanently
     * 
     * @param defaulter Address of defaulting member
     */
    function handleDefault(address defaulter) external;
    
    /**
     * @notice Handle multiple defaults in batch
     * @dev Gas-efficient batch default processing
     * @param defaulters Array of defaulting member addresses
     */
    function batchHandleDefaults(address[] calldata defaulters) external;
    
    /**
     * @notice Update token configuration
     * @dev Changes payment requirements
     * @param token Token to configure
     * @param monthlyPayment New monthly payment amount
     * @param isActive Whether token is accepted
     */
    function updateTokenConfig(
        PaymentToken token,
        uint256 monthlyPayment,
        bool isActive
    ) external;
    
    /**
     * @notice Advance to next cycle
     * @dev Moves payment period forward
     */
    function advanceCycle() external;
    
    /**
     * @notice Emergency withdraw funds
     * @dev Admin only, emergency situations
     * @param token Token to withdraw
     */
    function emergencyWithdraw(PaymentToken token) external;
    
    /**
     * @notice Update penalty rate
     * @dev Governance-controlled parameter
     * @param newPenaltyRate New penalty percentage (basis points)
     */
    function updatePenaltyRate(uint256 newPenaltyRate) external;
    
    /**
     * @notice Update next payout position
     * @dev Admin function for corrections
     * @param position New payout position
     */
    function updateNextPayoutPosition(uint256 position) external;
    
    // ========================================================================
    // VIEW FUNCTIONS - EXISTING
    // ========================================================================
    
    /**
     * @notice Check if member needs to pay this cycle
     * @param member Member address
     * @return True if payment required
     */
    function needsToPayThisCycle(address member) external view returns (bool);
    
    /**
     * @notice Get token configuration
     * @param token Token to query
     * @return Token configuration
     */
    function getTokenConfig(PaymentToken token) external view returns (TokenConfig memory);
    
    /**
     * @notice Get current cycle number
     * @return Current cycle
     */
    function getCurrentCycle() external view returns (uint256);
    
    /**
     * @notice Get next payout queue position
     * @return Next payout position
     */
    function getNextPayoutPosition() external view returns (uint256);
    
    /**
     * @notice Get active payment token
     * @return Active token type
     */
    function getActivePaymentToken() external view returns (PaymentToken);
    
    /**
     * @notice Get pending penalty for member
     * @param member Member address
     * @return Pending penalty amount
     */
    function getPendingPenalty(address member) external view returns (uint256);
    
    /**
     * @notice Get current penalty rate
     * @return Penalty rate (basis points)
     */
    function getPenaltyRate() external view returns (uint256);
    
    /**
     * @notice Get contract balance
     * @param token Token to query
     * @return Current balance
     */
    function getContractBalance(PaymentToken token) external view returns (uint256);
    
    /**
     * @notice Get total payouts distributed
     * @return Total payout count
     */
    function getTotalPayouts() external view returns (uint256);
    
    /**
     * @notice Check if payout is ready to distribute
     * @return True if all members paid
     */
    function isPayoutReady() external view returns (bool);
    
    /**
     * @notice Get payout record for a cycle
     * @param cycle Cycle number
     * @return Payout record details
     */
    function getPayout(uint256 cycle) external view returns (PayoutRecord memory);
    
    /**
     * @notice Calculate expected payout amount
     * @return Expected payout amount for next distribution
     */
    function calculatePayout() external view returns (uint256);
    
    /**
     * @notice Get next payout recipient
     * @return Address of next recipient
     */
    function getNextRecipient() external view returns (address);
    
    /**
     * @notice Check if member has paid in current cycle
     * @param member Member address
     * @return True if member has paid
     */
    function hasMemberPaidInCycle(address member) external view returns (bool);
    
    /**
     * @notice Batch check payment status for multiple members
     * @param members Array of member addresses
     * @return statuses Array of payment statuses (true if paid)
     */
    function batchCheckPaymentStatus(address[] calldata members) 
        external 
        view 
        returns (bool[] memory statuses);
    
    /**
     * @notice Get payment status for all members
     * @return members Array of all member addresses
     * @return statuses Array of payment statuses
     */
    function getAllMembersPaymentStatus() 
        external 
        view 
        returns (address[] memory members, bool[] memory statuses);
    
    // ========================================================================
    // VIEW FUNCTIONS - FRONTEND DASHBOARD
    // ========================================================================
    
    /**
     * @notice Get complete payment history for a member
     * @dev Returns all payment records across all cycles
     * @param member Member address
     * @return Array of payment status records
     */
    function getMemberPaymentHistory(address member) external view returns (PaymentStatus[] memory);
    
    /**
     * @notice Get list of members currently in default
     * @dev Members who haven't paid and deadline passed
     * @return defaulters Array of defaulting member addresses
     */
    function getMembersInDefault() external view returns (address[] memory defaulters);
    
    /**
     * @notice Get payment status summary for a cycle
     * @param cycle Cycle number to query
     * @return paidMembers Array of members who paid
     * @return unpaidMembers Array of members who haven't paid
     * @return totalCollected Total amount collected in cycle
     */
    function getCyclePaymentStatus(uint256 cycle) external view returns (
        address[] memory paidMembers,
        address[] memory unpaidMembers,
        uint256 totalCollected
    );
    
    /**
     * @notice Check if payment deadline has passed
     * @return isPastDeadline True if deadline passed
     * @return secondsOverdue Seconds past deadline (0 if not overdue)
     */
    function isDeadlinePassed() external view returns (bool isPastDeadline, uint256 secondsOverdue);
    
    // ========================================================================
    // VIEW FUNCTIONS - CYCLE DASHBOARD
    // ========================================================================
    
    /**
     * @notice Get complete dashboard data for current cycle
     * @dev Aggregated view for frontend cycle management
     * @return Complete cycle dashboard structure
     */
    function getCurrentCycleDashboard() external view returns (CycleDashboard memory);
    
    // ========================================================================
    // VIEW FUNCTIONS - TIMELINE & EVENTS
    // ========================================================================
    
    /**
     * @notice Get upcoming events for a member
     * @dev Returns timeline of future actions
     * @param member Member address
     * @return Array of upcoming events
     */
    function getUpcomingEvents(address member) external view returns (UpcomingEvent[] memory);
    
    /**
     * @notice Get next payment deadline timestamp
     * @return timestamp Unix timestamp of next payment deadline
     */
    function getNextPaymentDeadline() external view returns (uint256 timestamp);
    
    // ========================================================================
    // EVENTS
    // ========================================================================
    
    event PaymentMade(address indexed member, uint256 amount, uint256 cycle, PaymentToken token);
    event PayoutDistributed(address indexed recipient, uint256 amount, uint256 cycle, PaymentToken token);
    event MemberDefaulted(address indexed member, uint256 cycle, uint256 penalty);
    event CycleAdvanced(uint256 newCycle, uint256 timestamp);
    event TokenSwitched(PaymentToken oldToken, PaymentToken newToken);
    event PaymentPulled(address indexed member, uint256 amount, uint256 cycle, PaymentToken token);
    event PaymentProcessed(address indexed member, uint256 baseAmount, uint256 penalty, uint256 total);
}

// ============================================================================
// AJO MEMBERS INTERFACE
// ============================================================================

/**
 * @title IAjoMembers
 * @notice Manages member data, queue positions, and member operations
 * @dev Central repository for all member-related information
 * 
 * MEMBER LIFECYCLE:
 * 1. Join: Member added with queue position and collateral
 * 2. Active: Member makes payments and participates in governance
 * 3. Payout: Member receives payout when their turn comes
 * 4. Exit: Member can exit (if hasn't received payout) or season ends
 * 
 * QUEUE MANAGEMENT:
 * - Sequential queue positions (1, 2, 3, ...)
 * - Positions determine payout order and collateral requirements
 * - Cannot change position within a season
 * - New season = new queue assignments
 */
interface IAjoMembers {
    /**
     * @notice Initialize the AjoMembers contract
     * @param _ajoCore AjoCore contract address
     * @param _usdc USDC token address
     * @param _whbar Wrapped HBAR address
     */
    function initialize(
        address _ajoCore,
        address _usdc,
        address _whbar
    ) external;
    
    /**
     * @notice Set additional contract addresses
     * @dev Called after all contracts are deployed
     * @param _ajoCollateral AjoCollateral contract address
     * @param _ajoPayments AjoPayments contract address
     */
    function setContractAddresses(
        address _ajoCollateral,
        address _ajoPayments
    ) external;
    
    // ========================================================================
    // CORE MEMBER MANAGEMENT FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Add a new member to the Ajo
     * @dev Called by AjoCore during join process
     * @param member Member address
     * @param memberData Complete member data structure
     */
    function addMember(address member, Member memory memberData) external;
    
    /**
     * @notice Remove a member from the Ajo
     * @dev Called when member exits or is removed by governance
     * @param member Member address to remove
     */
    function removeMember(address member) external;
    
    /**
     * @notice Update member data
     * @dev General purpose update function
     * @param member Member address
     * @param memberData Updated member data
     */
    function updateMember(address member, Member memory memberData) external;
    
    // ========================================================================
    // MEMBER DATA UPDATE FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Update member's reputation score
     * @dev Called by governance or payment system
     * @param member Member address
     * @param newReputation New reputation score (0-100)
     */
    function updateReputation(address member, uint256 newReputation) external;
    
    /**
     * @notice Update member's collateral amount
     * @dev Called by collateral contract
     * @param member Member address
     * @param newAmount New collateral amount
     */
    function updateCollateral(address member, uint256 newAmount) external;
    
    /**
     * @notice Add payment to member's history
     * @dev Records payment in member's pastPayments array
     * @param member Member address
     * @param payment Payment amount to record
     */
    function addPastPayment(address member, uint256 payment) external;
    
    /**
     * @notice Update member's last payment cycle
     * @dev Tracks most recent payment cycle
     * @param member Member address
     * @param cycle Cycle number
     */
    function updateLastPaymentCycle(address member, uint256 cycle) external;
    
    /**
     * @notice Increment member's default count
     * @dev Called when member defaults on payment
     * @param member Member address
     */
    function incrementDefaultCount(address member) external;
    
    /**
     * @notice Update member's total paid amount
     * @dev Accumulates total contributions
     * @param member Member address
     * @param amount Amount to add to total
     */
    function updateTotalPaid(address member, uint256 amount) external;
    
    /**
     * @notice Mark member as having received payout
     * @dev Called when payout is distributed to member
     * @param member Member address
     */
    function markPayoutReceived(address member) external;
    
    // ========================================================================
    // VIEW FUNCTIONS - BASIC MEMBER INFO
    // ========================================================================
    
    /**
     * @notice Get complete member data
     * @param member Member address
     * @return Complete Member structure
     */
    function getMember(address member) external view returns (Member memory);
    
    /**
     * @notice Get total number of active members
     * @return Count of active members
     */
    function getTotalActiveMembers() external view returns (uint256);
    
    /**
     * @notice Get detailed member information with calculations
     * @param member Member address
     * @return memberInfo Complete member data
     * @return pendingPenalty Any accumulated penalties
     * @return effectiveVotingPower Reputation-weighted voting power
     */
    function getMemberInfo(address member) external view returns (
        Member memory memberInfo, 
        uint256 pendingPenalty,
        uint256 effectiveVotingPower
    );
    
    /**
     * @notice Get member's queue information
     * @param member Member address
     * @return position Queue position (1-indexed)
     * @return estimatedCyclesWait Cycles until payout
     */
    function getQueueInfo(address member) external view returns (
        uint256 position, 
        uint256 estimatedCyclesWait
    );
    
    /**
     * @notice Get contract-wide statistics
     * @return totalMembers Total members ever joined
     * @return activeMembers Currently active members
     * @return totalCollateralUSDC Total USDC collateral
     * @return totalCollateralHBAR Total HBAR collateral
     * @return contractBalanceUSDC Current USDC balance
     * @return contractBalanceHBAR Current HBAR balance
     * @return currentQueuePosition Next available queue position
     * @return activeToken Currently active payment token
     */
    function getContractStats() external view returns (
        uint256 totalMembers,
        uint256 activeMembers,
        uint256 totalCollateralUSDC,
        uint256 totalCollateralHBAR,
        uint256 contractBalanceUSDC,
        uint256 contractBalanceHBAR,
        uint256 currentQueuePosition,
        PaymentToken activeToken
    );
    
    /**
     * @notice Get member address at queue position
     * @param position Queue position (1-indexed)
     * @return Member address at position
     */
    function queuePositions(uint256 position) external view returns (address);
    
    /**
     * @notice Get member address at active members list index
     * @param index Array index
     * @return Member address at index
     */
    function activeMembersList(uint256 index) external view returns (address);
    
    // ========================================================================
    // VIEW FUNCTIONS - ADDITIONAL QUERIES
    // ========================================================================
    
    /**
     * @notice Check if address is a member
     * @param member Address to check
     * @return True if address is active member
     */
    function isMember(address member) external view returns (bool);
    
    /**
     * @notice Get list of all active members
     * @return Array of active member addresses
     */
    function getActiveMembersList() external view returns (address[] memory);
    
    /**
     * @notice Get member at specific queue position
     * @param queueNumber Queue position (1-indexed)
     * @return Member address at position
     */
    function getQueuePosition(uint256 queueNumber) external view returns (address);
    
    /**
     * @notice Get guarantor for a queue position
     * @param position Queue position
     * @return Guarantor address for position
     */
    function getGuarantorForPosition(uint256 position) external view returns (address);
    
    /**
     * @notice Get amount of collateral locked by member
     * @param member Member address
     * @return Locked collateral amount
     */
    function getLockedCollateral(address member) external view returns (uint256);
    
    /**
     * @notice Get member at array index
     * @param index Array index in active members list
     * @return Member address at index
     */
    function getMemberAtIndex(uint256 index) external view returns (address);
    
    // ========================================================================
    // VIEW FUNCTIONS - FRONTEND DASHBOARD
    // ========================================================================
    
    /**
     * @notice Get detailed information for all members
     * @dev Returns comprehensive data for member list display
     * @return Array of MemberDetails structures
     */
    function getAllMembersDetails() external view returns (MemberDetails[] memory);
    
    /**
     * @notice Get paginated member details
     * @dev For efficient loading of large member lists
     * @param offset Starting index
     * @param limit Maximum number to return
     * @return Member details array
     * @return hasMore Whether more members exist
     */
    function getMembersDetailsPaginated(uint256 offset, uint256 limit) external view returns (
        MemberDetails[] memory,
        bool hasMore
    );
    
    /**
     * @notice Get member activity summary
     * @dev Historical participation and performance metrics
     * @param member Member address
     * @return MemberActivity structure
     */
    function getMemberActivity(address member) external view returns (MemberActivity memory);
    
    // ========================================================================
    // VIEW FUNCTIONS - SEARCH & FILTER
    // ========================================================================
    
    /**
     * @notice Get members by active status
     * @param isActive True for active members, false for inactive
     * @return Array of member addresses
     */
    function getMembersByStatus(bool isActive) external view returns (address[] memory);
    
    /**
     * @notice Get members who need to make payments
     * @dev Members who haven't paid current cycle
     * @return Array of member addresses
     */
    function getMembersNeedingPayment() external view returns (address[] memory);
    
    /**
     * @notice Get members with default history
     * @dev Members with defaultCount > 0
     * @return Array of member addresses
     */
    function getMembersWithDefaults() external view returns (address[] memory);
    
    /**
     * @notice Get top members by reputation
     * @dev Returns highest reputation members
     * @param limit Maximum number to return
     * @return members Array of member addresses
     * @return reputations Array of reputation scores
     */
    function getTopMembersByReputation(uint256 limit) external view returns (
        address[] memory members,
        uint256[] memory reputations
    );
    
    // ========================================================================
    // EVENTS
    // ========================================================================
    
    event MemberJoined(address indexed member, uint256 queueNumber, uint256 collateral, PaymentToken token);
    event MemberRemoved(address indexed member);
    event MemberUpdated(address indexed member);
    event GuarantorAssigned(address indexed member, address indexed guarantor, uint256 memberPosition, uint256 guarantorPosition);
}

// ============================================================================
// AJO FACTORY INTERFACE
// ============================================================================

/**
 * @title IAjoFactory
 * @notice Factory contract for deploying and managing Ajo groups
 * @dev Uses minimal proxy pattern for gas-efficient deployments
 * 
 * FACTORY PATTERN:
 * - Master implementations deployed once
 * - Each Ajo group is a minimal proxy clone
 * - Saves ~90% gas on deployments
 * - Centralizes upgrades to master implementations
 * 
 * DEPLOYMENT PHASES:
 * 1. Deploy core contracts (Core, Members, Collateral, Payments, Governance)
 * 2. Initialize with HCS topic
 * 3. Set up cross-contract references
 * 4. Configure governance parameters
 * 5. Deploy and configure Schedule contract (if HSS enabled)
 * 
 * HTS INTEGRATION:
 * - Factory manages official USDC and HBAR token addresses
 * - Handles HTS association for users
 * - Provides token approval utilities
 * - Tracks HTS token balances and associations
 */
interface IAjoFactory {
    /**
     * @title AjoInfo
     * @notice Complete information about an Ajo group
     * @dev Returned by getAjo and getAllAjos functions
     */
    struct AjoInfo {
        address ajoCore;
        address ajoMembers;
        address ajoCollateral;
        address ajoPayments;
        address ajoGovernance;
        address ajoSchedule;
        address creator;
        uint256 createdAt;
        string name;
        bool isActive;
        bool usesHtsTokens;
        address usdcToken;
        address hbarToken;
        bytes32 hcsTopicId;
        bool usesScheduledPayments;
        uint256 scheduledPaymentsCount;
        uint256 ajoCycleDuration;
        uint256 ajoMonthlyPaymentUSDC;
        uint256 ajoMonthlyPaymentHBAR;
    }

    // ========================================================================
    // HTS TOKEN MANAGEMENT
    // ========================================================================
    
    /**
     * @notice Set official HTS tokens for factory
     * @dev Admin only, sets USDC and HBAR addresses
     * @param _usdcHts Official USDC HTS token address
     * @param _hbarHts Official Wrapped HBAR address
     */
    function setHtsTokensForFactory(address _usdcHts, address _hbarHts) external;
    
    /**
     * @notice Get configured HTS token addresses
     * @return usdc USDC token address
     * @return hbar HBAR token address
     */
    function getHtsTokenAddresses() external view returns (address usdc, address hbar);
    
    /**
     * @notice Check if HTS is enabled in factory
     * @return True if HTS tokens are configured
     */
    function isHtsEnabled() external view returns (bool);
    
    // ========================================================================
    // HTS USER MANAGEMENT
    // ========================================================================
    
    /**
     * @notice Check user's HTS token associations
     * @dev Verifies if user has associated USDC and HBAR tokens
     * @param user User address to check
     * @return usdcAssociated True if USDC associated
     * @return hbarAssociated True if HBAR associated
     * @return lastAssociationTime Timestamp of last association
     */
    function checkUserHtsAssociation(address user) external view returns (bool usdcAssociated, bool hbarAssociated, uint256 lastAssociationTime);
    
    // ========================================================================
    // AJO CREATION FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Create a new Ajo group
     * @dev Deploys all contracts and initializes configuration
     * 
     * CREATION PROCESS:
     * 1. Deploy minimal proxy clones of master contracts
     * 2. Create HCS topic for governance
     * 3. Initialize all contracts with addresses
     * 4. Set up cross-contract references
     * 5. Configure initial parameters
     * 6. Deploy Schedule contract if HSS enabled
     * 
     * GAS OPTIMIZATION:
     * - Uses minimal proxy pattern (EIP-1167)
     * - Batch initialization where possible
     * - Optimized storage layout
     * 
     * @param _name Human-readable Ajo name
     * @param _useHtsTokens Whether to use HTS tokens
     * @param _useScheduledPayments Whether to enable HSS
     * @param _cycleDuration Duration of each cycle in seconds
     * @param _monthlyPaymentUSDC Monthly USDC payment amount
     * @param _monthlyPaymentHBAR Monthly HBAR payment amount
     * @return ajoId Unique identifier for created Ajo
     */
    function createAjo(
        string memory _name,
        bool _useHtsTokens,
        bool _useScheduledPayments,
        uint256 _cycleDuration,
        uint256 _monthlyPaymentUSDC,
        uint256 _monthlyPaymentHBAR
    ) external returns (uint256 ajoId);
    
    /**
     * @notice Initialize Ajo Phase 2: HCS topic creation
     * @dev Must be called after Phase 1 (contract deployment)
     * @param ajoId Ajo identifier
     * @param hcsTopicId Created HCS topic ID
     * @return HCS topic ID
     */
    function initializeAjoPhase2(uint256 ajoId, bytes32 hcsTopicId) external returns (bytes32);
    
    /**
     * @notice Initialize Ajo Phase 3: Cross-contract setup
     * @dev Links contracts together
     * @param ajoId Ajo identifier
     */
    function initializeAjoPhase3(uint256 ajoId) external;
    
    /**
     * @notice Initialize Ajo Phase 4: Governance configuration
     * @dev Sets up governance parameters
     * @param ajoId Ajo identifier
     */
    function initializeAjoPhase4(uint256 ajoId) external;
    
    /**
     * @notice Initialize Ajo Phase 5: Schedule contract deployment
     * @dev Deploys and configures HSS integration
     * @param ajoId Ajo identifier
     */
    function initializeAjoPhase5(uint256 ajoId) external;
    
    // ========================================================================
    // HSS INTEGRATION
    // ========================================================================
    
    /**
     * @notice Enable scheduled payments for an Ajo
     * @dev Admin or governance function
     * @param ajoId Ajo identifier
     */
    function enableScheduledPaymentsForAjo(uint256 ajoId) external;
    
    /**
     * @notice Disable scheduled payments for an Ajo
     * @param ajoId Ajo identifier
     */
    function disableScheduledPaymentsForAjo(uint256 ajoId) external;
    
    /**
     * @notice Get Ajo's scheduling status
     * @param ajoId Ajo identifier
     * @return isEnabled Whether scheduling is enabled
     * @return scheduledPaymentsCount Number of schedules created
     * @return executedCount Number of schedules executed
     */
    function getAjoSchedulingStatus(uint256 ajoId) external view returns (bool isEnabled, uint256 scheduledPaymentsCount, uint256 executedCount);
    
    /**
     * @notice Set HSS precompile address
     * @dev Admin only, for testnet/mainnet switching
     * @param _scheduleService HSS precompile address (0x16b)
     */
    function setScheduleServiceAddress(address _scheduleService) external;
    
    /**
     * @notice Get AjoSchedule contract for an Ajo
     * @param ajoId Ajo identifier
     * @return Address of AjoSchedule contract
     */
    function getAjoScheduleContract(uint256 ajoId) external view returns (address);
    
    /**
     * @notice Use official Circle USDC and Hedera WHBAR
     * @dev Sets factory to use mainnet official tokens
     */
    function useOfficialTokens() external;
    
    /**
     * @notice Get Ajo configuration parameters
     * @param ajoId Ajo identifier
     * @return cycleDuration Cycle duration in seconds
     * @return monthlyPaymentUSDC USDC payment amount
     * @return monthlyPaymentHBAR HBAR payment amount
     */
    function getAjoConfiguration(uint256 ajoId) 
        external 
        view 
        returns (
            uint256 cycleDuration,
            uint256 monthlyPaymentUSDC,
            uint256 monthlyPaymentHBAR
        );
    
    // ========================================================================
    // AJO MANAGEMENT FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Deactivate an Ajo group
     * @dev Stops new member joins, governance continues
     * @param ajoId Ajo to deactivate
     */
    function deactivateAjo(uint256 ajoId) external;
    
    /**
     * @notice Get complete Ajo information
     * @param ajoId Ajo identifier
     * @return info Complete AjoInfo structure
     */
    function getAjo(uint256 ajoId) external view returns (AjoInfo memory info);
    
    /**
     * @notice Get paginated list of all Ajos
     * @param offset Starting index
     * @param limit Maximum number to return
     * @return ajoInfos Array of Ajo information
     * @return hasMore Whether more Ajos exist
     */
    function getAllAjos(uint256 offset, uint256 limit) external view returns (AjoInfo[] memory ajoInfos, bool hasMore);
    
    // ========================================================================
    // HTS APPROVAL FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Approve HTS token spending
     * @dev Wrapper for HTS approval operations
     * @param token Token address
     * @param spender Spender address
     * @param amount Approval amount
     * @return success Whether approval succeeded
     */
    function approveHtsToken(
        address token,
        address spender,
        uint256 amount
    ) external returns (bool success);

    /**
     * @notice Get HTS token allowance
     * @param token Token address
     * @param owner Owner address
     * @param spender Spender address
     * @return currentAllowance Current approved amount
     */
    function getHtsAllowance(
        address token,
        address owner,
        address spender
    ) external returns (uint256 currentAllowance);
    
    // ========================================================================
    // QUERY FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Get Ajos created by a specific creator
     * @param creator Creator address
     * @return ajoIds Array of Ajo IDs
     */
    function getAjosByCreator(address creator) external view returns (uint256[] memory ajoIds);
    
    /**
     * @notice Get Ajo status
     * @param ajoId Ajo identifier
     * @return exists Whether Ajo exists
     * @return isActive Whether Ajo is active
     */
    function ajoStatus(uint256 ajoId) external view returns (bool exists, bool isActive);
    
    // ========================================================================
    // EVENTS
    // ========================================================================
    
    event AjoCreated(uint256 indexed ajoId, address indexed creator, address ajoCore, string name, bool usesHtsTokens, bool usesScheduledPayments);
    event AjoInitializedPhase2(uint256 indexed ajoId, bytes32 hcsTopicId);
    event AjoInitializedPhase3(uint256 indexed ajoId);
    event AjoInitializedPhase4(uint256 indexed ajoId);
    event AjoInitializedPhase5(uint256 indexed ajoId, address ajoSchedule);
    event ScheduledPaymentsEnabled(uint256 indexed ajoId);
    event ScheduledPaymentsDisabled(uint256 indexed ajoId);
    event MasterImplementationsSet(address ajoCore, address ajoMembers, address ajoCollateral, address ajoPayments, address ajoGovernance, address ajoSchedule);
    event ScheduleServiceSet(address indexed scheduleService);
    event UserHtsAssociated(address indexed user, address indexed usdcToken, address indexed hbarToken, int64 usdcResponse, int64 hbarResponse);
    event UserHtsTokenAssociated(address indexed user, address indexed token, bool success);
    event UserHtsFunded(address indexed user, uint256 usdcAmount, uint256 hbarAmount, int64 usdcResponse, int64 hbarResponse);
    event UserHtsTokenFunded(address indexed user, address indexed token, int64 amount, bool success);
    event BatchAssociationCompleted(uint256 successCount, uint256 failCount);
    event BatchFundingCompleted(uint256 successCount, uint256 failCount);
    event FactoryBalanceCheck(uint256 usdcBalance, uint256 hbarBalance);
    event HtsTransferFailed(address indexed user, address indexed token, uint256 amount, int64 responseCode, string reason);
    event HtsAssociationFailed(address indexed user, address indexed token, int64 responseCode, string reason);
    event HtsTokenApproved(address indexed owner, address indexed token, address indexed spender, uint256 amount);
    event HtsApprovalFailed(address indexed owner, address indexed token, address indexed spender, uint256 amount, int64 responseCode, string reason);
}

// ============================================================================
// HTS RESPONSE CODES LIBRARY
// ============================================================================

/**
 * @title HtsResponseCodes
 * @notice Standard Hedera Token Service response codes
 * @dev Used for error handling and status checking in HTS operations
 * 
 * RESPONSE CODE REFERENCE:
 * - 22: SUCCESS - Operation completed successfully
 * - 7: INVALID_SIGNATURE - Signature validation failed
 * - 15: INVALID_ACCOUNT_ID - Account does not exist
 * - 35: ACCOUNT_DELETED - Account has been deleted
 * - 111: INVALID_TOKEN_ID - Token does not exist
 * - 138: TOKEN_WAS_DELETED - Token has been deleted
 * - 147: TOKEN_ALREADY_ASSOCIATED - Account already associated with token
 * - 167: TOKEN_NOT_ASSOCIATED - Account not associated with token
 * - 184: TOKENS_PER_ACCOUNT_LIMIT_EXCEEDED - Too many token associations
 * - 162: ACCOUNT_FROZEN_FOR_TOKEN - Account is frozen for this token
 * - 164: INSUFFICIENT_TOKEN_BALANCE - Insufficient token balance
 * - 177: TOKEN_IS_PAUSED - Token transfers are paused
 * - 202: INVALID_FREEZE_KEY - Invalid freeze key for operation
 * - 203: INVALID_WIPE_KEY - Invalid wipe key for operation
 */
library HtsResponseCodes {
    int64 public constant SUCCESS = 22;
    int64 public constant INVALID_SIGNATURE = 7;
    int64 public constant INVALID_ACCOUNT_ID = 15;
    int64 public constant ACCOUNT_DELETED = 35;
    int64 public constant INVALID_TOKEN_ID = 111;
    int64 public constant TOKEN_WAS_DELETED = 138;
    int64 public constant TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT = 147;
    int64 public constant TOKEN_NOT_ASSOCIATED_TO_ACCOUNT = 167;
    int64 public constant TOKENS_PER_ACCOUNT_LIMIT_EXCEEDED = 184;
    int64 public constant ACCOUNT_FROZEN_FOR_TOKEN = 162;
    int64 public constant INSUFFICIENT_TOKEN_BALANCE = 164;
    int64 public constant TOKEN_IS_PAUSED = 177;
    int64 public constant INVALID_FREEZE_KEY = 202;
    int64 public constant INVALID_WIPE_KEY = 203;
}

// ============================================================================
// HSS RESPONSE CODES LIBRARY
// ============================================================================

/**
 * @title HssResponseCodes
 * @notice Standard Hedera Schedule Service response codes
 * @dev Used for error handling in HSS scheduling operations
 * 
 * RESPONSE CODE REFERENCE:
 * - 22: SUCCESS - Schedule operation successful
 * - 201: INVALID_SCHEDULE_ID - Schedule does not exist
 * - 202: SCHEDULE_ALREADY_DELETED - Schedule was already deleted
 * - 203: SCHEDULE_ALREADY_EXECUTED - Schedule was already executed
 * - 204: INVALID_SCHEDULE_ACCOUNT_ID - Invalid account in schedule
 * - 223: SCHEDULE_IS_IMMUTABLE - Schedule cannot be modified
 * - 7: INVALID_SIGNATURE - Signature validation failed
 * - 225: SCHEDULED_TRANSACTION_NOT_IN_WHITELIST - Transaction type not allowed
 * - 226: SOME_SIGNATURES_WERE_INVALID - One or more signatures invalid
 * - 227: TRANSACTION_ID_FIELD_NOT_ALLOWED - Transaction ID not permitted
 * - 228: IDENTICAL_SCHEDULE_ALREADY_CREATED - Duplicate schedule exists
 * - 229: INVALID_ZERO_BYTE_IN_STRING - Invalid string format
 * - 230: SCHEDULE_EXPIRED - Schedule has expired
 * - 231: NO_NEW_VALID_SIGNATURES - No new valid signatures provided
 * - 232: UNRESOLVABLE_REQUIRED_SIGNERS - Cannot determine required signers
 * - 233: SCHEDULED_MESSAGE_SIZE_EXCEEDED - Message too large
 * - 234: UNPARSEABLE_SCHEDULED_TRANSACTION - Cannot parse transaction
 */
library HssResponseCodes {
    int64 public constant SUCCESS = 22;
    int64 public constant INVALID_SCHEDULE_ID = 201;
    int64 public constant SCHEDULE_ALREADY_DELETED = 202;
    int64 public constant SCHEDULE_ALREADY_EXECUTED = 203;
    int64 public constant INVALID_SCHEDULE_ACCOUNT_ID = 204;
    int64 public constant SCHEDULE_IS_IMMUTABLE = 223;
    int64 public constant INVALID_SIGNATURE = 7;
    int64 public constant SCHEDULED_TRANSACTION_NOT_IN_WHITELIST = 225;
    int64 public constant SOME_SIGNATURES_WERE_INVALID = 226;
    int64 public constant TRANSACTION_ID_FIELD_NOT_ALLOWED = 227;
    int64 public constant IDENTICAL_SCHEDULE_ALREADY_CREATED = 228;
    int64 public constant INVALID_ZERO_BYTE_IN_STRING = 229;
    int64 public constant SCHEDULE_EXPIRED = 230;
    int64 public constant NO_NEW_VALID_SIGNATURES = 231;
    int64 public constant UNRESOLVABLE_REQUIRED_SIGNERS = 232;
    int64 public constant SCHEDULED_MESSAGE_SIZE_EXCEEDED = 233;
    int64 public constant UNPARSEABLE_SCHEDULED_TRANSACTION = 234;
}

// ============================================================================
// HSS HELPER LIBRARY
// ============================================================================

/**
 * @title HssHelper
 * @notice Utility functions for Hedera Schedule Service operations
 * @dev Provides validation and error handling for HSS operations
 * 
 * PURPOSE:
 * Simplifies HSS integration by providing:
 * - Response code validation
 * - Schedule state checking
 * - Human-readable error messages
 * - Common validation patterns
 * 
 * USAGE:
 * Import and use static functions throughout scheduling code
 * to ensure consistent error handling and validation.
 */
library HssHelper {
    /**
     * @notice Check if HSS response indicates success
     * @dev Compares response code to SUCCESS constant
     * @param responseCode HSS response code to check
     * @return True if response code is SUCCESS (22)
     */
    function isSuccess(int64 responseCode) internal pure returns (bool) {
        return responseCode == HssResponseCodes.SUCCESS;
    }
    
    /**
     * @notice Check if schedule is still valid for operations
     * @dev Verifies schedule hasn't been deleted, executed, or expired
     * 
     * VALID SCHEDULE:
     * - Not deleted
     * - Not executed
     * - Not expired
     * 
     * USAGE:
     * Call before attempting to authorize or cancel a schedule
     * 
     * @param responseCode HSS response code from operation
     * @return True if schedule can still be operated on
     */
    function isScheduleValid(int64 responseCode) internal pure returns (bool) {
        return responseCode != HssResponseCodes.SCHEDULE_ALREADY_DELETED &&
               responseCode != HssResponseCodes.SCHEDULE_ALREADY_EXECUTED &&
               responseCode != HssResponseCodes.SCHEDULE_EXPIRED;
    }
    
    /**
     * @notice Get human-readable error message for response code
     * @dev Converts HSS response codes to descriptive error strings
     * 
     * ERROR MESSAGES:
     * Provides user-friendly descriptions for all HSS response codes
     * Used in events, reverts, and frontend error display
     * 
     * @param responseCode HSS response code
     * @return Human-readable error message
     */
    function getErrorMessage(int64 responseCode) internal pure returns (string memory) {
        if (responseCode == HssResponseCodes.SUCCESS) return "Success";
        if (responseCode == HssResponseCodes.INVALID_SCHEDULE_ID) return "Invalid schedule ID";
        if (responseCode == HssResponseCodes.SCHEDULE_ALREADY_DELETED) return "Schedule already deleted";
        if (responseCode == HssResponseCodes.SCHEDULE_ALREADY_EXECUTED) return "Schedule already executed";
        if (responseCode == HssResponseCodes.INVALID_SCHEDULE_ACCOUNT_ID) return "Invalid schedule account ID";
        if (responseCode == HssResponseCodes.SCHEDULE_IS_IMMUTABLE) return "Schedule is immutable";
        if (responseCode == HssResponseCodes.INVALID_SIGNATURE) return "Invalid signature";
        if (responseCode == HssResponseCodes.SCHEDULE_EXPIRED) return "Schedule expired";
        if (responseCode == HssResponseCodes.NO_NEW_VALID_SIGNATURES) return "No new valid signatures";
        return "Unknown error";
    }
}

// ============================================================================
// SCHEDULE TRANSACTION BUILDER LIBRARY
// ============================================================================

/**
 * @title ScheduleTransactionBuilder
 * @notice Utility library for building HSS scheduled transactions
 * @dev Provides helpers for creating and validating scheduled transactions
 * 
 * PURPOSE:
 * Simplifies schedule creation by providing:
 * - Transaction data encoding
 * - Execution time calculations
 * - Validation of schedule parameters
 * - Batch schedule generation
 * 
 * HSS CONSTRAINTS:
 * - Maximum execution delay: 62 days (Hedera limit)
 * - Minimum execution delay: Should be > current time
 * - Transaction size limits apply
 * - Certain transaction types not schedulable
 */
library ScheduleTransactionBuilder {
    /**
     * @notice Build contract execute transaction data for scheduling
     * @dev Encodes function call for HSS execution
     * 
     * ENCODING PROCESS:
     * 1. Combine function selector with parameters
     * 2. Create ABI-encoded call data
     * 3. Return bytes for HSS schedule creation
     * 
     * USAGE:
     * Used when creating schedules for contract function calls
     * (e.g., processPayment, distributePayout)
     * 
     * @param contractAddress Target contract address
     * @param functionSelector Function selector (first 4 bytes of keccak256)
     * @param params ABI-encoded function parameters
     * @return Encoded transaction data
     */
    function buildPaymentExecutionData(
        address contractAddress,
        bytes4 functionSelector,
        bytes memory params
    ) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(functionSelector, params);
    }
    
    /**
     * @notice Calculate execution time for future cycle
     * @dev Computes timestamp for scheduled execution
     * 
     * CALCULATION:
     * executionTime = currentTime + (cycleDuration * cyclesAhead)
     * 
     * EXAMPLES:
     * - Schedule 1 cycle ahead: currentTime + cycleDuration
     * - Schedule 3 cycles ahead: currentTime + (3 * cycleDuration)
     * 
     * @param currentTime Current block timestamp
     * @param cycleDuration Duration of one cycle in seconds
     * @param cyclesAhead Number of cycles in the future
     * @return Calculated execution timestamp
     */
    function calculateExecutionTime(
        uint256 currentTime,
        uint256 cycleDuration,
        uint256 cyclesAhead
    ) internal pure returns (uint256) {
        return currentTime + (cycleDuration * cyclesAhead);
    }
    
    /**
     * @notice Validate execution time is within HSS limits
     * @dev Ensures execution time meets HSS constraints
     * 
     * VALIDATION RULES:
     * 1. Execution time must be in the future
     * 2. Execution time must be within 62 days (HSS limit)
     * 
     * HEDERA CONSTRAINT:
     * HSS enforces maximum 62-day scheduling window
     * This prevents indefinite pending schedules
     * 
     * @param executionTime Proposed execution timestamp
     * @param currentTime Current block timestamp
     * @return True if execution time is valid
     */
    function isValidExecutionTime(uint256 executionTime, uint256 currentTime) internal pure returns (bool) {
        uint256 maxFutureTime = currentTime + 62 days;
        return executionTime > currentTime && executionTime <= maxFutureTime;
    }
    
    /**
     * @notice Build multiple execution times for rolling schedule
     * @dev Creates array of evenly-spaced execution times
     * 
     * ROLLING SCHEDULE:
     * Automates recurring payments by pre-scheduling multiple cycles
     * 
     * EXAMPLE (startTime=now, numberOfCycles=3, intervalDays=30):
     * - Cycle 1: now + 30 days
     * - Cycle 2: now + 60 days
     * - Cycle 3: now + 90 days
     * 
     * LIMITATIONS:
     * Cannot exceed 62-day HSS limit for any individual schedule
     * 
     * @param startTime Starting timestamp
     * @param numberOfCycles Number of cycles to schedule
     * @param intervalDays Days between each execution
     * @return executionTimes Array of execution timestamps
     */
    function buildRollingSchedule(
        uint256 startTime,
        uint256 numberOfCycles,
        uint256 intervalDays
    ) internal pure returns (uint256[] memory executionTimes) {
        executionTimes = new uint256[](numberOfCycles);
        for (uint256 i = 0; i < numberOfCycles; i++) {
            executionTimes[i] = startTime + (intervalDays * 1 days * (i + 1));
        }
        return executionTimes;
    }
    
    /**
     * @notice Validate schedule parameters before creation
     * @dev Comprehensive validation of schedule inputs
     * 
     * VALIDATION CHECKS:
     * 1. Recipient address is not zero
     * 2. Amount is greater than zero
     * 3. Execution time is within valid range
     * 
     * USAGE:
     * Call before creating HSS schedule to ensure parameters are valid
     * Prevents failed schedule creation and wasted gas
     * 
     * @param executionTime Proposed execution timestamp
     * @param amount Payment amount
     * @param recipient Payment recipient
     * @return isValid True if all parameters valid
     * @return reason Error reason if invalid
     */
    function validateScheduleParams(
        uint256 executionTime,
        uint256 amount,
        address recipient
    ) internal view returns (bool isValid, string memory reason) {
        if (recipient == address(0)) {
            return (false, "Invalid recipient address");
        }
        if (amount == 0) {
            return (false, "Amount must be greater than zero");
        }
        if (!isValidExecutionTime(executionTime, block.timestamp)) {
            return (false, "Invalid execution time");
        }
        return (true, "");
    }
    
    /**
     * @notice Calculate optimal batch size for multiple schedules
     * @dev Determines how many schedules can be created in one transaction
     * 
     * GAS OPTIMIZATION:
     * - Estimates gas per schedule creation (~150,000 gas)
     * - Divides available gas by per-schedule cost
     * - Returns safe batch size to avoid out-of-gas
     * 
     * USAGE:
     * When creating many schedules, split into optimal batches
     * to maximize efficiency while avoiding gas limits
     * 
     * @param totalSchedules Total number of schedules to create
     * @param gasLimit Maximum gas available for transaction
     * @return Optimal number of schedules per batch
     */
    function calculateOptimalBatchSize(uint256 totalSchedules, uint256 gasLimit) internal pure returns (uint256) {
        uint256 gasPerSchedule = 150000; // Approximate gas per schedule creation
        uint256 maxBatchSize = gasLimit / gasPerSchedule;
        return maxBatchSize > totalSchedules ? totalSchedules : maxBatchSize;
    }
}

// ============================================================================
// END OF UNIFIED INTERFACE
// ============================================================================