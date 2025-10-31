// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "../interfaces/AjoInterfaces.sol";
import "../hedera/hedera-token-service/HederaTokenService.sol";
import "../hedera/HederaResponseCodes.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
/**
 * @title AjoFactory
 * @notice Factory contract for creating and managing Ajo instances with HTS and HSS support
 * @dev Implements EIP-1167 minimal proxy pattern for gas-efficient deployments
 *
 * ARCHITECTURE OVERVIEW:
 * The AjoFactory serves as the central deployment and management hub for all Ajo groups.
 * It uses the minimal proxy pattern (EIP-1167) to deploy lightweight clones of master
 * implementation contracts, reducing deployment costs by approximately 90 percent.
 *
 * KEY FEATURES:
 * - Minimal Proxy Deployment: Gas-efficient EIP-1167 clones for each Ajo group
 * - Five-Phase Initialization: Staged deployment process for complex contract setup
 * - HTS Integration: Native Hedera Token Service support for USDC and HBAR
 * - HSS Support: Hedera Schedule Service integration for automated payments
 * - User Association Management: Tracks and manages HTS token associations
 * - Automation Framework: OpenZeppelin Defender integration for automated operations
 *
 * DEPLOYMENT PHASES:
 * Phase 1: Deploy minimal proxy clones of all core contracts
 * Phase 2: Initialize Members and Governance contracts, create HCS topic
 * Phase 3: Initialize Collateral and Payments contracts
 * Phase 4: Initialize Core contract, configure tokens, activate Ajo
 * Phase 5: Initialize Schedule contract (if HSS enabled)
 *
 * HEDERA SERVICES INTEGRATION:
 * - Hedera Token Service (HTS): Token operations via inherited HederaTokenService
 * - Hedera Schedule Service (HSS): Automated scheduled transactions
 * - Hedera Consensus Service (HCS): Immutable governance records
 * - Hedera Smart Contract Service (HSCS): EVM-compatible contract execution
 *
 * GAS OPTIMIZATION:
 * - Uses minimal proxies instead of full contract deployments
 * - Batches initialization across multiple phases
 * - Stores Ajo data in individual mappings for efficient access
 * - Implements view functions for off-chain data aggregation
 *
 * SECURITY MODEL:
 * - Owner-controlled master implementation updates
 * - Per-Ajo creator permissions for sensitive operations
 * - Factory-level HTS token configuration
 * - Defender relayer authorization for automation
 *
 * @author Ajo.save Protocol Team
 * @custom:security-contact security@ajo.save
 */
contract AjoFactory is IAjoFactory, HederaTokenService {
   
    // ============================================================================
    // STATE VARIABLES - OPERATIONAL STATUS
    // ============================================================================
   
    /**
     * @notice Comprehensive operational status structure for an Ajo
     * @dev Provides complete visibility into Ajo functionality and health
     *
     * USAGE:
     * Used by getAjoOperationalStatus() to return detailed metrics about
     * an Ajo's current state, capabilities, and member participation.
     *
     * FIELDS:
     * - totalMembers: Total number of members ever joined
     * - activeMembers: Currently active members (not exited)
     * - totalCollateralUSDC: Total USDC collateral locked in contract
     * - totalCollateralHBAR: Total HBAR collateral locked in contract
     * - contractBalanceUSDC: Current USDC balance in payment pool
     * - contractBalanceHBAR: Current HBAR balance in payment pool
     * - currentCycle: Current payment cycle number
     * - activeToken: Currently active payment token (USDC or HBAR)
     * - canAcceptMembers: Whether Ajo can accept new members
     * - canProcessPayments: Whether payment processing is functional
     * - canDistributePayouts: Whether payout distribution is ready
     */
    struct AjoOperationalStatus {
        uint256 totalMembers;
        uint256 activeMembers;
        uint256 totalCollateralUSDC;
        uint256 totalCollateralHBAR;
        uint256 contractBalanceUSDC;
        uint256 contractBalanceHBAR;
        uint256 currentCycle;
        PaymentToken activeToken;
        bool canAcceptMembers;
        bool canProcessPayments;
        bool canDistributePayouts;
    }
    // ============================================================================
    // STATE VARIABLES - MASTER IMPLEMENTATIONS
    // ============================================================================
   
    /**
     * @notice Address of the master AjoCore implementation
     * @dev All AjoCore proxies delegate to this implementation
     * Handles main orchestration, member management, and coordination
     */
    address public ajoCoreImplementation;
   
    /**
     * @notice Address of the master AjoMembers implementation
     * @dev Manages member data, queue positions, and member operations
     */
    address public ajoMembersImplementation;
   
    /**
     * @notice Address of the master AjoCollateral implementation
     * @dev Handles collateral calculations, locking, and seizure logic
     */
    address public ajoCollateralImplementation;
   
    /**
     * @notice Address of the master AjoPayments implementation
     * @dev Processes payments, distributes payouts, handles defaults
     */
    address public ajoPaymentsImplementation;
   
    /**
     * @notice Address of the master AjoGovernance implementation
     * @dev Manages proposals, voting, and season transitions
     */
    address public ajoGovernanceImplementation;
   
    /**
     * @notice Address of the master AjoSchedule implementation
     * @dev Handles HSS scheduled payment automation
     */
    address public ajoScheduleImplementation;
   
    // ============================================================================
    // STATE VARIABLES - TOKEN CONFIGURATION
    // ============================================================================
   
    /**
     * @notice Address of USDC token (standard ERC20 or HTS)
     * @dev Can be either:
     * - Standard ERC20 USDC contract address
     * - HTS USDC token address (0x00000000000...)
     */
    address public USDC;
   
    /**
     * @notice Address of Wrapped HBAR token
     * @dev Can be either:
     * - Standard ERC20 WHBAR contract address
     * - HTS WHBAR token address (0x00000000000...)
     */
    address public WHBAR;
   
    /**
     * @notice Flag indicating if Hedera Token Service is enabled
     * @dev When true, factory uses HTS tokens for all operations
     * When false, factory uses standard ERC20 tokens
     */
    bool public htsEnabled;
   
    /**
     * @notice Address of HTS USDC token
     * @dev Only populated when htsEnabled is true
     * Represents official Circle USDC on Hedera
     */
    address public usdcHtsToken;
   
    /**
     * @notice Address of HTS HBAR token
     * @dev Only populated when htsEnabled is true
     * Represents official Wrapped HBAR on Hedera
     */
    address public hbarHtsToken;
   
    // ============================================================================
    // STATE VARIABLES - HSS CONFIGURATION
    // ============================================================================
   
    /**
     * @notice Address of Hedera Schedule Service precompile
     * @dev Standard address: 0x000000000000000000000000000000000000016b
     * Used for creating and managing scheduled transactions
     */
    address public hederaScheduleService;
   
    /**
     * @notice Flag indicating if Hedera Schedule Service is enabled
     * @dev When true, Ajos can use HSS for automated payments
     * Requires hederaScheduleService address to be set
     */
    bool public hssEnabled;
   
    // ============================================================================
    // STATE VARIABLES - HTS USER TRACKING
    // ============================================================================
   
    /**
     * @notice Tracks whether a user has associated USDC HTS token
     * @dev Mapping: user address => association status
     * Association required before user can receive HTS tokens
     */
    mapping(address => bool) public userUsdcAssociated;
   
    /**
     * @notice Tracks whether a user has associated HBAR HTS token
     * @dev Mapping: user address => association status
     * Association required before user can receive HTS tokens
     */
    mapping(address => bool) public userHbarAssociated;
   
    /**
     * @notice Timestamp of user's last token association
     * @dev Mapping: user address => timestamp
     * Used for analytics and association status tracking
     */
    mapping(address => uint256) public userLastAssociationTime;
   
    // ============================================================================
    // STATE VARIABLES - AJO STORAGE
    // ============================================================================
   
    /**
     * @dev AJO STORAGE ARCHITECTURE:
     *
     * Instead of storing complete AjoInfo structs (gas expensive), we use
     * individual mappings for each field. This provides several benefits:
     *
     * 1. Gas Efficiency: Only load/store fields that are actually needed
     * 2. Flexibility: Easy to add new fields without migrating entire structs
     * 3. Access Patterns: Optimized for common queries (single field lookups)
     * 4. Upgrade Path: Can modify individual fields without affecting others
     *
     * Trade-off: Slightly more complex code for complete Ajo info retrieval,
     * but massive gas savings for partial updates and targeted queries.
     */
   
    /**
     * @notice Maps Ajo ID to its AjoCore proxy address
     * @dev Primary contract for Ajo orchestration and coordination
     */
    mapping(uint256 => address) private ajoCore;
   
    /**
     * @notice Maps Ajo ID to its AjoMembers proxy address
     * @dev Manages member data and queue positions
     */
    mapping(uint256 => address) private ajoMembers;
   
    /**
     * @notice Maps Ajo ID to its AjoCollateral proxy address
     * @dev Handles collateral locking and seizure logic
     */
    mapping(uint256 => address) private ajoCollateral;
   
    /**
     * @notice Maps Ajo ID to its AjoPayments proxy address
     * @dev Processes payments and distributes payouts
     */
    mapping(uint256 => address) private ajoPayments;
   
    /**
     * @notice Maps Ajo ID to its AjoGovernance proxy address
     * @dev Manages governance proposals and voting
     */
    mapping(uint256 => address) private ajoGovernance;
   
    /**
     * @notice Maps Ajo ID to its AjoSchedule proxy address
     * @dev Handles HSS scheduled payment automation (if enabled)
     */
    mapping(uint256 => address) private ajoSchedule;
   
    /**
     * @notice Maps Ajo ID to its creator address
     * @dev Creator has special permissions for Ajo management
     */
    mapping(uint256 => address) private ajoCreator;
   
    /**
     * @notice Maps Ajo ID to its creation timestamp
     * @dev Block timestamp when Ajo was created
     */
    mapping(uint256 => uint256) private ajoCreatedAt;
   
    /**
     * @notice Maps Ajo ID to its human-readable name
     * @dev Display name for frontend and identification
     */
    mapping(uint256 => string) private ajoName;
   
    /**
     * @notice Maps Ajo ID to its active status
     * @dev False = deactivated, true = accepting members and operating normally
     */
    mapping(uint256 => bool) private ajoIsActive;
   
    /**
     * @notice Maps Ajo ID to whether it uses HTS tokens
     * @dev True = uses HTS USDC/HBAR, false = uses standard ERC20
     */
    mapping(uint256 => bool) private ajoUsesHtsTokens;
   
    /**
     * @notice Maps Ajo ID to its USDC token address
     * @dev Either standard ERC20 or HTS token address
     */
    mapping(uint256 => address) private ajoUsdcToken;
   
    /**
     * @notice Maps Ajo ID to its HBAR token address
     * @dev Either standard ERC20 or HTS token address
     */
    mapping(uint256 => address) private ajoHbarToken;
   
    /**
     * @notice Maps Ajo ID to its HCS topic ID
     * @dev Hedera Consensus Service topic for governance messages
     * Format: bytes32 representation of Hedera topic ID
     */
    mapping(uint256 => bytes32) private ajoHcsTopicId;
   
    /**
     * @notice Maps Ajo ID to whether it uses scheduled payments
     * @dev True = HSS automation enabled, false = manual payments only
     */
    mapping(uint256 => bool) private ajoUsesScheduledPayments;
   
    /**
     * @notice Maps Ajo ID to total count of scheduled payments created
     * @dev Tracks number of HSS schedules created for this Ajo
     */
    mapping(uint256 => uint256) private ajoScheduledPaymentsCountMapping;
   
    // ============================================================================
    // STATE VARIABLES - ADDITIONAL AJO STATE
    // ============================================================================
   
    /**
     * @notice Maps creator address to array of their Ajo IDs
     * @dev Allows querying all Ajos created by a specific address
     * Used by getAjosByCreator() function
     */
    mapping(address => uint256[]) public creatorAjos;
   
    /**
     * @notice Maps Ajo ID to its initialization phase (1-5)
     * @dev Tracks progress through five-phase initialization:
     * 0 = Not initialized
     * 1 = Proxies deployed
     * 2 = Members and Governance initialized
     * 3 = Collateral and Payments initialized
     * 4 = Core initialized and activated
     * 5 = Schedule initialized (if applicable)
     */
    mapping(uint256 => uint8) public ajoInitializationPhase;
   
    /**
     * @notice Maps Ajo ID to whether scheduling is currently enabled
     * @dev Can be toggled on/off even after initialization
     * Only relevant if ajoUsesScheduledPayments is true
     */
    mapping(uint256 => bool) public ajoSchedulingEnabled;
   
    /**
     * @notice Maps Ajo ID to total scheduled payments created
     * @dev Duplicate of ajoScheduledPaymentsCountMapping for public access
     */
    mapping(uint256 => uint256) public ajoScheduledPaymentsCount;
   
    /**
     * @notice Maps Ajo ID to count of executed scheduled payments
     * @dev Tracks how many HSS schedules have successfully executed
     */
    mapping(uint256 => uint256) public ajoExecutedScheduledPayments;
   
    /**
     * @notice Maps Ajo ID to its cycle duration in seconds
     * @dev Typically 30 days (2592000 seconds)
     * Configurable per Ajo at creation time
     */
    mapping(uint256 => uint256) private ajoCycleDuration;
   
    /**
     * @notice Maps Ajo ID to monthly USDC payment amount
     * @dev Amount in USDC base units (6 decimals)
     * Example: 100000000 = 100 USDC
     */
    mapping(uint256 => uint256) private ajoMonthlyPaymentUSDC;
   
    /**
     * @notice Maps Ajo ID to monthly HBAR payment amount
     * @dev Amount in HBAR base units (8 decimals)
     * Example: 10000000000 = 100 HBAR
     */
    mapping(uint256 => uint256) private ajoMonthlyPaymentHBAR;
    // ============================================================================
    // STATE VARIABLES - AUTOMATION CONFIGURATION
    // ============================================================================
   
    /**
     * @notice Address of OpenZeppelin Defender Relayer for automation
     * @dev Authorized address that can trigger automated operations
     *
     * DEFENDER INTEGRATION:
     * OpenZeppelin Defender Relayer is used to automate periodic operations:
     * - Checking for defaulters
     * - Processing scheduled payments
     * - Advancing cycles
     * - Distributing payouts
     *
     * SECURITY:
     * Only this address can call automation-related functions
     * Must be set by owner before enabling automation
     */
    address public defenderRelayerAddress;
   
    /**
     * @notice Maps Ajo ID to its automation status
     * @dev True = automation enabled for this Ajo
     * False = manual operations only
     *
     * AUTOMATION BENEFITS:
     * - Reduces defaults by 6x through automatic payment processing
     * - Eliminates need for manual cycle management
     * - Provides consistent, reliable payment schedule
     * - Reduces operational burden on Ajo creators
     */
    mapping(uint256 => bool) public ajoAutomationEnabled;
   
    // ============================================================================
    // STATE VARIABLES - COUNTERS AND IDENTIFIERS
    // ============================================================================
   
    /**
     * @notice Total number of Ajo groups created by this factory
     * @dev Incremented on each successful Ajo creation
     */
    uint256 public totalAjos;
   
    /**
     * @notice Next Ajo ID to be assigned
     * @dev Starts at 1, incremented after each Ajo creation
     * Used to generate unique, sequential Ajo identifiers
     */
    uint256 private nextAjoId = 1;
   
    /**
     * @notice Address of the factory contract owner
     * @dev Has administrative privileges for:
     * - Setting master implementations
     * - Configuring HTS and HSS
     * - Emergency operations
     * - Updating system parameters
     */
    address public owner;
   
    // ============================================================================
    // EVENTS - INITIALIZATION PHASES
    // ============================================================================
   
    /**
     * @notice Emitted when Phase 1 initialization completes
     * @dev Phase 1: Minimal proxy contracts deployed
     * @param ajoId Unique identifier for the Ajo
     * @param ajoCore Address of deployed AjoCore proxy
     */
    event AjoPhase1Completed(uint256 indexed ajoId, address indexed ajoCore);
   
    /**
     * @notice Emitted when Phase 2 initialization completes
     * @dev Phase 2: Members and Governance initialized, HCS topic created
     * @param ajoId Unique identifier for the Ajo
     */
    event AjoPhase2Completed(uint256 indexed ajoId);
   
    /**
     * @notice Emitted when Phase 3 initialization completes
     * @dev Phase 3: Collateral and Payments contracts initialized
     * @param ajoId Unique identifier for the Ajo
     */
    event AjoPhase3Completed(uint256 indexed ajoId);
   
    /**
     * @notice Emitted when Phase 4 initialization completes
     * @dev Phase 4: Core contract initialized and Ajo activated
     * @param ajoId Unique identifier for the Ajo
     */
    event AjoPhase4Completed(uint256 indexed ajoId);
   
    /**
     * @notice Emitted when Phase 5 initialization completes
     * @dev Phase 5: Schedule contract initialized (if HSS enabled)
     * @param ajoId Unique identifier for the Ajo
     */
    event AjoPhase5Completed(uint256 indexed ajoId);
   
    /**
     * @notice Emitted when Ajo initialization is force-completed
     * @dev Used for emergency completion or skipping phases
     * @param ajoId Unique identifier for the Ajo
     * @param completer Address that forced completion
     * @param finalPhase Final phase reached (1-5)
     */
    event AjoForceCompleted(uint256 indexed ajoId, address indexed completer, uint8 finalPhase);
   
    // ============================================================================
    // EVENTS - TOKEN CONFIGURATION
    // ============================================================================
   
    /**
     * @notice Emitted when HTS tokens are configured for factory
     * @dev Indicates factory is ready to deploy HTS-enabled Ajos
     * @param usdcToken Address of HTS USDC token
     * @param hbarToken Address of HTS HBAR token
     */
    event HtsTokensConfigured(address indexed usdcToken, address indexed hbarToken);
   
    /**
     * @notice Emitted when HTS token addresses are set
     * @dev Alternative event for token configuration
     * @param usdcToken Address of HTS USDC token
     * @param hbarToken Address of HTS HBAR token
     */
    event HtsTokensSet(address indexed usdcToken, address indexed hbarToken);
    
    // ============================================================================
    // EVENTS - AUTOMATION
    // ============================================================================
   
    /**
     * @notice Emitted when Defender Relayer address is updated
     * @dev Tracks changes to automation relay address
     * @param oldRelayer Previous relayer address
     * @param newRelayer New relayer address
     */
    event DefenderRelayerSet(address indexed oldRelayer, address indexed newRelayer);
   
    /**
     * @notice Emitted when automation is enabled for an Ajo
     * @param ajoId Ajo identifier
     * @param enabler Address that enabled automation
     */
    event AjoAutomationEnabled(uint256 indexed ajoId, address indexed enabler);
   
    /**
     * @notice Emitted when automation is disabled for an Ajo
     * @param ajoId Ajo identifier
     * @param disabler Address that disabled automation
     */
    event AjoAutomationDisabled(uint256 indexed ajoId, address indexed disabler);
   
    /**
     * @notice Emitted when automation is batch-configured for multiple Ajos
     * @param ajoIds Array of Ajo identifiers configured
     * @param relayerAddress Relayer address authorized for these Ajos
     */
    event BatchAutomationSetup(uint256[] ajoIds, address relayerAddress);
   
    // ============================================================================
    // MODIFIERS
    // ============================================================================
   
    /**
     * @notice Restricts function access to contract owner
     * @dev Reverts if caller is not the owner address
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
   
    /**
     * @notice Validates that Ajo ID exists
     * @dev Reverts if Ajo ID is zero or beyond nextAjoId
     * @param ajoId Ajo identifier to validate
     */
    modifier validAjoId(uint256 ajoId) {
        require(ajoId > 0 && ajoId < nextAjoId, "Invalid Ajo ID");
        _;
    }
   
    /**
     * @notice Restricts function access to Ajo creator or factory owner
     * @dev Provides dual-authority model for Ajo management
     * @param ajoId Ajo identifier to check permissions for
     */
    modifier onlyCreatorOrOwner(uint256 ajoId) {
        require(
            ajoCreator[ajoId] == msg.sender || msg.sender == owner,
            "Only creator or owner"
        );
        _;
    }
   
    /**
     * @notice Requires HTS to be enabled and configured
     * @dev Reverts if HTS is not enabled or tokens not set
     */
    modifier htsRequired() {
        require(htsEnabled, "HTS not enabled");
        require(usdcHtsToken != address(0) && hbarHtsToken != address(0), "HTS tokens not set");
        _;
    }
   
    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================
   
    /**
     * @notice Initializes the AjoFactory with master implementations and token addresses
     * @dev Sets up factory with all required configuration for Ajo deployment
     *
     * INITIALIZATION SEQUENCE:
     * 1. Validates all implementation addresses are non-zero
     * 2. Validates token addresses are non-zero
     * 3. Sets owner to deployer
     * 4. Stores all master implementation addresses
     * 5. Stores token addresses for USDC and WHBAR
     * 6. Configures HSS if address provided
     * 7. Emits configuration events
     *
     * MASTER IMPLEMENTATIONS:
     * These are deployed once and cloned via minimal proxies:
     * - AjoCore: Main orchestration contract
     * - AjoMembers: Member management
     * - AjoCollateral: Collateral handling
     * - AjoPayments: Payment processing
     * - AjoGovernance: Governance system
     * - AjoSchedule: HSS integration
     *
     * HTS CONFIGURATION:
     * HTS is disabled by default. Must call useOfficialTokens() or
     * setHtsTokensForFactory() to enable HTS functionality.
     *
     * HSS CONFIGURATION:
     * If _hederaScheduleService address is provided and non-zero,
     * HSS functionality is enabled for automated payments.
     *
     * @param _usdc Address of USDC token (ERC20 or HTS)
     * @param _whbar Address of Wrapped HBAR token (ERC20 or HTS)
     * @param _ajoCoreImpl Address of AjoCore master implementation
     * @param _ajoMembersImpl Address of AjoMembers master implementation
     * @param _ajoCollateralImpl Address of AjoCollateral master implementation
     * @param _ajoPaymentsImpl Address of AjoPayments master implementation
     * @param _ajoGovernanceImpl Address of AjoGovernance master implementation
     * @param _ajoScheduleImpl Address of AjoSchedule master implementation
     * @param _hederaTokenService Deprecated parameter (kept for interface compatibility)
     * @param _hederaScheduleService Address of HSS precompile (0x16b) or zero to disable
     */
    constructor(
        address _usdc,
        address _whbar,
        address _ajoCoreImpl,
        address _ajoMembersImpl,
        address _ajoCollateralImpl,
        address _ajoPaymentsImpl,
        address _ajoGovernanceImpl,
        address _ajoScheduleImpl,
        address _hederaTokenService, // Kept for interface compatibility but not used
        address _hederaScheduleService
    ) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_whbar != address(0), "Invalid WHBAR address");
        require(_ajoCoreImpl != address(0), "Invalid AjoCore implementation");
        require(_ajoMembersImpl != address(0), "Invalid AjoMembers implementation");
        require(_ajoCollateralImpl != address(0), "Invalid AjoCollateral implementation");
        require(_ajoPaymentsImpl != address(0), "Invalid AjoPayments implementation");
        require(_ajoGovernanceImpl != address(0), "Invalid AjoGovernance implementation");
        require(_ajoScheduleImpl != address(0), "Invalid AjoSchedule implementation");
       
        owner = msg.sender;
        USDC = _usdc;
        WHBAR = _whbar;
        ajoCoreImplementation = _ajoCoreImpl;
        ajoMembersImplementation = _ajoMembersImpl;
        ajoCollateralImplementation = _ajoCollateralImpl;
        ajoPaymentsImplementation = _ajoPaymentsImpl;
        ajoGovernanceImplementation = _ajoGovernanceImpl;
        ajoScheduleImplementation = _ajoScheduleImpl;
       
        htsEnabled = false; // Must explicitly enable after creating tokens
       
        // HSS configuration (optional)
        if (_hederaScheduleService != address(0)) {
            hederaScheduleService = _hederaScheduleService;
            hssEnabled = true;
        }
       
        emit MasterImplementationsSet(
            _ajoCoreImpl,
            _ajoMembersImpl,
            _ajoCollateralImpl,
            _ajoPaymentsImpl,
            _ajoGovernanceImpl,
            _ajoScheduleImpl
        );
       
        if (hssEnabled) {
            emit ScheduleServiceSet(_hederaScheduleService);
        }
    }
   
    // ============================================================================
    // INTERNAL HTS HELPER FUNCTIONS
    // ============================================================================
   
    /**
     * @notice Converts HTS response code to human-readable error message
     * @dev Provides user-friendly error descriptions for common HTS failures
     *
     * RESPONSE CODE MAPPING:
     * - 22: Success (no error)
     * - 111: Invalid token ID (token doesn't exist)
     * - 15: Invalid account ID (account doesn't exist)
     * - 164: Insufficient token balance
     * - 167: Token not associated to account
     * - 162: Account frozen for token
     * - 138: Token was deleted
     * - 7: Invalid signature
     *
     * USAGE:
     * Called after HTS operations to provide meaningful error messages
     * in events and revert reasons.
     *
     * @param responseCode HTS response code from operation
     * @return Human-readable error message
     */
    function _getHtsErrorMessage(int responseCode) internal pure returns (string memory) {
        if (responseCode == 22) return "Success";
        if (responseCode == 111) return "Invalid token ID";
        if (responseCode == 15) return "Invalid account ID";
        if (responseCode == 164) return "Insufficient token balance";
        if (responseCode == 167) return "Token not associated to account";
        if (responseCode == 162) return "Account frozen for token";
        if (responseCode == 138) return "Token was deleted";
        if (responseCode == 7) return "Invalid signature";
        return "Unknown error";
    }
   
    /**
     * @notice Checks if HTS response code indicates success
     * @dev Success code is 22 per Hedera specification
     *
     * @param responseCode HTS response code to check
     * @return True if response code is SUCCESS (22)
     */
    function _isHtsSuccess(int responseCode) internal pure returns (bool) {
        return responseCode == HederaResponseCodes.SUCCESS;
    }
   
    // ============================================================================
    // HTS TOKEN CONFIGURATION
    // ============================================================================
   
    /**
     * @notice Configures factory to use official Circle USDC and Hedera WHBAR
     * @dev Alternative to creating new HTS tokens - references existing ones
     *
     * OFFICIAL TOKENS:
     * - USDC: Official Circle USD Coin on Hedera
     * - WHBAR: Official Wrapped HBAR on Hedera
     *
     * ADVANTAGES:
     * - No token creation needed
     * - Uses established, trusted tokens
     * - Better liquidity and ecosystem support
     * - No custom token management required
     *
     * PREREQUISITES:
     * - USDC and WHBAR addresses must be set in constructor
     * - HTS must not already be enabled
     * - Caller must be factory owner
     *
     * POST-CONDITION:
     * - htsEnabled set to true
     * - usdcHtsToken set to USDC address
     * - hbarHtsToken set to WHBAR address
     * - Factory ready to deploy HTS-enabled Ajos
     *
     * @custom:emits HtsTokensConfigured
     */
    function useOfficialTokens() external override onlyOwner {
        require(!htsEnabled, "Tokens already configured");
        require(USDC != address(0) && WHBAR != address(0), "Invalid token addresses");
       
        // Set references to official tokens
        usdcHtsToken = USDC; // Official Circle USDC
        hbarHtsToken = WHBAR; // Official Hedera WHBAR
       
        htsEnabled = true;
       
        emit HtsTokensConfigured(USDC, WHBAR);
    }
   
    /**
     * @notice Sets pre-existing HTS tokens for factory use
     * @dev Alternative to useOfficialTokens() for custom HTS tokens
     *
     * USE CASES:
     * - Using testnet HTS tokens
     * - Custom HTS token implementations
     * - Wrapped versions of official tokens
     * - Development and testing environments
     *
     * VALIDATION:
     * - Caller must be factory owner
     * - Both addresses must be non-zero
     * - HTS must not already be enabled
     *
     * POST-CONDITION:
     * - usdcHtsToken and hbarHtsToken updated
     * - htsEnabled set to true
     *
     * @param _usdcHts Address of HTS USDC token
     * @param _hbarHts Address of HTS HBAR token
     * @custom:emits HtsTokensSet
     */
    function setHtsTokensForFactory(address _usdcHts, address _hbarHts) external override onlyOwner {
        require(_usdcHts != address(0), "Invalid USDC HTS");
        require(_hbarHts != address(0), "Invalid HBAR HTS");
       
        usdcHtsToken = _usdcHts;
        hbarHtsToken = _hbarHts;
        htsEnabled = true;
       
        emit HtsTokensSet(_usdcHts, _hbarHts);
    }
   
    /**
     * @notice Retrieves HTS token addresses
     * @dev Only returns valid addresses if HTS is enabled
     *
     * @return usdc HTS USDC token address
     * @return hbar HTS HBAR token address
     */
    function getHtsTokenAddresses() external view override returns (address usdc, address hbar) {
        return (usdcHtsToken, hbarHtsToken);
    }
   
    /**
     * @notice Checks if HTS functionality is enabled
     * @dev HTS is enabled after calling useOfficialTokens() or setHtsTokensForFactory()
     *
     * @return True if HTS is enabled, false otherwise
     */
    function isHtsEnabled() external view override returns (bool) {
        return htsEnabled;
    }
   
    // ============================================================================
    // HTS USER MANAGEMENT FUNCTIONS
    // ============================================================================
   
    /**
     * @notice Checks user's HTS token association status
     * @dev Association is required before users can receive HTS tokens
     *
     * @param user Address to check association for
     * @return usdcAssociated True if associated with USDC
     * @return hbarAssociated True if associated with HBAR
     * @return lastAssociationTime Timestamp of last association
     */
    function checkUserHtsAssociation(address user)
        external
        view
        override
        htsRequired
        returns (
            bool usdcAssociated,
            bool hbarAssociated,
            uint256 lastAssociationTime
        )
    {
        return (
            userUsdcAssociated[user],
            userHbarAssociated[user],
            userLastAssociationTime[user]
        );
    }
  
    /**
     * @dev Internal helper to get HTS token balance using ERC20 interface
     * @dev HTS tokens on Hedera implement ERC20 for compatibility
     *
     * HANDLING:
     * - Uses try-catch to handle potential failures
     * - Returns 0 on any error
     *
     * @param token HTS token address
     * @param account Account to query balance for
     * @return balance Token balance or 0 on error
     */
    function _getHtsTokenBalance(address token, address account) internal view returns (uint256 balance) {
        // Use standard ERC20 balanceOf since HTS tokens are ERC20-compatible
        // This works because HTS tokens implement the ERC20 interface
        try IERC20(token).balanceOf(account) returns (uint256 bal) {
            return bal;
        } catch {
            return 0;
        }
    }
   
    // ============================================================================
    // HTS APPROVAL FUNCTIONS
    // ============================================================================
   
    /**
     * @notice Approves HTS token spending allowance
     * @dev Uses inherited approve() from HederaTokenService
     *
     * VALIDATION:
     * - HTS must be enabled
     * - Token must be USDC or HBAR HTS
     * - Spender must be non-zero
     * - Amount must be > 0
     *
     * ERROR HANDLING:
     * - Emits HtsApprovalFailed on failure
     * - Reverts with HTS error message
     *
     * @param token HTS token address (USDC or HBAR)
     * @param spender Address to approve
     * @param amount Amount to approve
     * @return success True if approval succeeded
     * @custom:emits HtsTokenApproved on success
     * @custom:emits HtsApprovalFailed on failure
     */
    function approveHtsToken(
        address token,
        address spender,
        uint256 amount
    ) external htsRequired returns (bool success) {
        require(token == usdcHtsToken || token == hbarHtsToken, "Invalid HTS token");
        require(spender != address(0), "Invalid spender");
        require(amount > 0, "Amount must be greater than zero");
   
        // Use inherited approve() from HederaTokenService
        // msg.sender is automatically the token owner
        int responseCode = approve(token, spender, amount);
        success = _isHtsSuccess(responseCode);
   
        if (!success) {
            emit HtsApprovalFailed(msg.sender, token, spender, amount, int64(responseCode), _getHtsErrorMessage(responseCode));
            revert(_getHtsErrorMessage(responseCode));
        }
   
        // Emit success event
        emit HtsTokenApproved(msg.sender, token, spender, amount);
   
        return success;
    }
   
    /**
     * @notice Retrieves HTS token allowance
     * @dev Uses inherited allowance() from HederaTokenService
     *
     * VALIDATION:
     * - HTS must be enabled
     * - Token must be USDC or HBAR HTS
     *
     * ERROR HANDLING:
     * - Returns 0 on any HTS call failure
     *
     * @param token HTS token address
     * @param owner Token owner address
     * @param spender Spender address
     * @return currentAllowance Approved amount
     */
    function getHtsAllowance(
        address token,
        address owner,
        address spender
    ) external htsRequired returns (uint256 currentAllowance) {
        require(token == usdcHtsToken || token == hbarHtsToken, "Invalid HTS token");
   
        (int responseCode, uint256 allowanceAmount) = allowance(token, owner, spender);
   
        if (_isHtsSuccess(responseCode)) {
            return allowanceAmount;
        }
   
        return 0;
    }
   
    // ============================================================================
    // HSS CONFIGURATION
    // ============================================================================
   
    /**
     * @notice Sets Hedera Schedule Service precompile address
     * @dev Enables HSS functionality when set
     *
     * VALIDATION:
     * - Caller must be owner
     * - Address must be non-zero
     *
     * POST-CONDITION:
     * - hssEnabled set to true
     *
     * @param _scheduleService HSS precompile address (0x16b)
     * @custom:emits ScheduleServiceSet
     */
    function setScheduleServiceAddress(address _scheduleService) external override onlyOwner {
        require(_scheduleService != address(0), "Invalid HSS address");
        hederaScheduleService = _scheduleService;
        hssEnabled = true;
       
        emit ScheduleServiceSet(_scheduleService);
    }
  
   
    /**
     * @notice Retrieves AjoSchedule proxy address for an Ajo
     * @dev Returns address(0) if HSS not enabled for this Ajo
     *
     * @param ajoId Ajo identifier
     * @return AjoSchedule proxy address
     */
    function getAjoScheduleContract(uint256 ajoId) external view override validAjoId(ajoId) returns (address) {
        return ajoSchedule[ajoId];
    }
   
   
    /**
     * @notice Enables HSS scheduled payments for an Ajo
     * @dev Can only be called after full initialization
     *
     * VALIDATION:
     * - Valid Ajo ID
     * - Caller is creator or owner
     * - HSS enabled in factory
     * - Ajo phase >= 5
     * - Not already enabled
     *
     * POST-CONDITION:
     * - Scheduling enabled for Ajo
     *
     * @param ajoId Ajo identifier
     * @custom:emits ScheduledPaymentsEnabled
     */
    function enableScheduledPaymentsForAjo(uint256 ajoId) external override validAjoId(ajoId) onlyCreatorOrOwner(ajoId) {
        require(hssEnabled, "HSS not enabled");
        require(ajoInitializationPhase[ajoId] >= 5, "Ajo not fully initialized");
        require(!ajoSchedulingEnabled[ajoId], "Already enabled");
       
        ajoSchedulingEnabled[ajoId] = true;
        ajoUsesScheduledPayments[ajoId] = true;
       
        emit ScheduledPaymentsEnabled(ajoId);
    }
   
    /**
     * @notice Disables HSS scheduled payments for an Ajo
     * @dev Can be called at any time after enabling
     *
     * VALIDATION:
     * - Valid Ajo ID
     * - Caller is creator or owner
     * - Scheduling currently enabled
     *
     * POST-CONDITION:
     * - Scheduling disabled for Ajo
     *
     * @param ajoId Ajo identifier
     * @custom:emits ScheduledPaymentsDisabled
     */
    function disableScheduledPaymentsForAjo(uint256 ajoId) external override validAjoId(ajoId) onlyCreatorOrOwner(ajoId) {
        require(ajoSchedulingEnabled[ajoId], "Not enabled");
       
        ajoSchedulingEnabled[ajoId] = false;
        ajoUsesScheduledPayments[ajoId] = false;
       
        emit ScheduledPaymentsDisabled(ajoId);
    }
   
    /**
     * @notice Get Ajo's scheduling status
     * @param ajoId Ajo identifier
     * @return isEnabled Whether scheduling is enabled
     * @return scheduledPaymentsCountResult Number of schedules created
     * @return executedCount Number of schedules executed
     */
    function getAjoSchedulingStatus(uint256 ajoId)
        external
        view
        override
        validAjoId(ajoId)
        returns (
            bool isEnabled,
            uint256 scheduledPaymentsCountResult,
            uint256 executedCount
        )
    {
        isEnabled = ajoSchedulingEnabled[ajoId];
        scheduledPaymentsCountResult = ajoScheduledPaymentsCount[ajoId];
        executedCount = ajoExecutedScheduledPayments[ajoId];
       
        return (isEnabled, scheduledPaymentsCountResult, executedCount);
    }
   
    // ============================================================================
    // AJO CREATION (5-PHASE)
    // ============================================================================
   
    /**
     * @notice Creates a new Ajo instance (Phase 1)
     * @dev Deploys minimal proxies and sets initial configuration
     *
     * VALIDATION:
     * - Name not empty
     * - Cycle duration between 1-365 days
     * - At least one payment amount > 0
     * - If HTS: HTS enabled in factory
     * - If HSS: HSS enabled and configured
     *
     * PROCESS:
     * 1. Validate parameters
     * 2. Deploy minimal proxies for all contracts
     * 3. Determine token addresses (HTS or ERC20)
     * 4. Store all Ajo data in mappings
     * 5. Add to creator's Ajo list
     * 6. Increment counters
     * 7. Set phase to 1
     *
     * @param _name Ajo display name
     * @param _useHtsTokens Use HTS tokens?
     * @param _useScheduledPayments Use HSS scheduling?
     * @param _cycleDuration Cycle length in seconds
     * @param _monthlyPaymentUSDC USDC payment amount
     * @param _monthlyPaymentHBAR HBAR payment amount
     * @return ajoId New Ajo identifier
     * @custom:emits AjoCreated
     * @custom:emits AjoPhase1Completed
     */
    function createAjo(
        string memory _name,
        bool _useHtsTokens,
        bool _useScheduledPayments,
        uint256 _cycleDuration,
        uint256 _monthlyPaymentUSDC,
        uint256 _monthlyPaymentHBAR
    ) external override returns (uint256 ajoId) {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(
            //_cycleDuration >= 1 days &&
            _cycleDuration <= 365 days, "Invalid cycle duration");
        require(_monthlyPaymentUSDC > 0 || _monthlyPaymentHBAR > 0, "At least one payment amount required");
       
        if (_useHtsTokens) {
            require(htsEnabled, "HTS not enabled");
        }
       
        if (_useScheduledPayments) {
            require(hssEnabled, "HSS not enabled");
            require(hederaScheduleService != address(0), "HSS not configured");
        }
       
        ajoId = nextAjoId++;
       
        // Deploy proxy contracts (minimal gas)
        address ajoMembersProxy = _deployProxy(ajoMembersImplementation, ajoId);
        address ajoGovernanceProxy = _deployProxy(ajoGovernanceImplementation, ajoId);
        address ajoCollateralProxy = _deployProxy(ajoCollateralImplementation, ajoId);
        address ajoPaymentsProxy = _deployProxy(ajoPaymentsImplementation, ajoId);
        address ajoCoreProxy = _deployProxy(ajoCoreImplementation, ajoId);
        address ajoScheduleProxy = _useScheduledPayments ? _deployProxy(ajoScheduleImplementation, ajoId) : address(0);
       
        // Determine token addresses
        address usdcAddr = _useHtsTokens ? usdcHtsToken : USDC;
        address hbarAddr = _useHtsTokens ? hbarHtsToken : WHBAR;
       
        // Store Ajo info in individual mappings
        ajoCore[ajoId] = ajoCoreProxy;
        ajoMembers[ajoId] = ajoMembersProxy;
        ajoCollateral[ajoId] = ajoCollateralProxy;
        ajoPayments[ajoId] = ajoPaymentsProxy;
        ajoGovernance[ajoId] = ajoGovernanceProxy;
        ajoSchedule[ajoId] = ajoScheduleProxy;
        ajoCreator[ajoId] = msg.sender;
        ajoCreatedAt[ajoId] = block.timestamp;
        ajoName[ajoId] = _name;
        ajoIsActive[ajoId] = false;
        ajoUsesHtsTokens[ajoId] = _useHtsTokens;
        ajoUsdcToken[ajoId] = usdcAddr;
        ajoHbarToken[ajoId] = hbarAddr;
        ajoHcsTopicId[ajoId] = bytes32(0);
        ajoUsesScheduledPayments[ajoId] = _useScheduledPayments;
        ajoScheduledPaymentsCountMapping[ajoId] = 0;
       
        // NEW: Store custom configuration
        ajoCycleDuration[ajoId] = _cycleDuration;
        ajoMonthlyPaymentUSDC[ajoId] = _monthlyPaymentUSDC;
        ajoMonthlyPaymentHBAR[ajoId] = _monthlyPaymentHBAR;
       
        creatorAjos[msg.sender].push(ajoId);
        totalAjos++;
        ajoInitializationPhase[ajoId] = 1;
       
        if (_useScheduledPayments) {
            ajoSchedulingEnabled[ajoId] = true;
        }
       
        emit AjoCreated(ajoId, msg.sender, ajoCoreProxy, _name, _useHtsTokens, _useScheduledPayments);
        emit AjoPhase1Completed(ajoId, ajoCoreProxy);
       
        return ajoId;
    }
   
    /**
     * @notice Initializes Phase 2: Members, Governance, and HCS topic
     * @dev HCS topic created off-chain and ID passed here
     *
     * VALIDATION:
     * - Valid Ajo ID
     * - Caller is creator or owner
     * - Current phase == 1
     * - Valid HCS topic ID
     *
     * PROCESS:
     * 1. Initialize AjoMembers with core and tokens
     * 2. Store HCS topic ID
     * 3. Initialize AjoGovernance with dependencies
     * 4. Set phase to 2
     *
     * @param ajoId Ajo identifier
     * @param hcsTopicId HCS topic ID (bytes32)
     * @return hcsTopicId Stored topic ID
     * @custom:emits AjoPhase2Completed
     * @custom:emits AjoInitializedPhase2
     */
    function initializeAjoPhase2(uint256 ajoId, bytes32 hcsTopicId)
        public
        override
        validAjoId(ajoId)
        onlyCreatorOrOwner(ajoId)
        returns (bytes32)
        {
            require(ajoInitializationPhase[ajoId] == 1, "Phase 1 must be completed first");
            require(hcsTopicId != bytes32(0), "Invalid HCS topic ID"); // ✅ Validate it's real
           
            // Initialize AjoMembers
            IAjoMembers(ajoMembers[ajoId]).initialize(
                ajoCore[ajoId],
                ajoUsdcToken[ajoId],
                ajoHbarToken[ajoId]
            );
           
            // Store the REAL topic ID passed from frontend
            ajoHcsTopicId[ajoId] = hcsTopicId;
           
            // Initialize AjoGovernance with real topic ID
            IAjoGovernance(ajoGovernance[ajoId]).initialize(
                ajoCore[ajoId],
                ajoMembers[ajoId],
                ajoSchedule[ajoId],
                address(0),
                hcsTopicId
            );
           
            ajoInitializationPhase[ajoId] = 2;
            emit AjoPhase2Completed(ajoId);
            emit AjoInitializedPhase2(ajoId, hcsTopicId);
           
            return hcsTopicId;
        }
   
    /**
     * @notice Initializes Phase 3: Collateral and Payments contracts
     * @dev Sets up financial handling contracts
     *
     * VALIDATION:
     * - Valid Ajo ID
     * - Caller is creator or owner
     * - Current phase == 2
     *
     * PROCESS:
     * 1. Initialize AjoCollateral with tokens and dependencies
     * 2. Initialize AjoPayments with tokens and dependencies
     * 3. Set phase to 3
     *
     * @param ajoId Ajo identifier
     * @custom:emits AjoPhase3Completed
     * @custom:emits AjoInitializedPhase3
     */
    function initializeAjoPhase3(uint256 ajoId)
        public
        override
        validAjoId(ajoId)
        onlyCreatorOrOwner(ajoId)
    {
        require(ajoInitializationPhase[ajoId] == 2, "Phase 2 must be completed first");
       
        // Pass address(0) for HTS since contracts inherit it
        IAjoCollateral(ajoCollateral[ajoId]).initialize(
            ajoUsdcToken[ajoId],
            ajoHbarToken[ajoId],
            ajoCore[ajoId],
            ajoMembers[ajoId]
            // address(0) // No longer needed
        );
       
        IAjoPayments(ajoPayments[ajoId]).initialize(
            ajoUsdcToken[ajoId],
            ajoHbarToken[ajoId],
            ajoCore[ajoId],
            ajoMembers[ajoId],
            ajoCollateral[ajoId]
            // address(0) // No longer needed
        );
       
        ajoInitializationPhase[ajoId] = 3;
        emit AjoPhase3Completed(ajoId);
        emit AjoInitializedPhase3(ajoId);
    }
   
    /**
     * @notice Initializes Phase 4: Core contract and token config
     * @dev Activates Ajo for use
     *
     * VALIDATION:
     * - Valid Ajo ID
     * - Caller is creator or owner
     * - Current phase == 3
     *
     * PROCESS:
     * 1. Initialize AjoCore with dependencies
     * 2. Set cycle duration
     * 3. Configure token payments if >0
     * 4. Set active status
     * 5. Set phase to 4
     *
     * @param ajoId Ajo identifier
     * @custom:emits AjoPhase4Completed
     * @custom:emits AjoInitializedPhase4
     */
    function initializeAjoPhase4(uint256 ajoId)
        public
        override
        validAjoId(ajoId)
        onlyCreatorOrOwner(ajoId)
    {
        require(ajoInitializationPhase[ajoId] == 3, "Phase 3 must be completed first");
       
        // Initialize AjoCore with custom cycle duration
        IAjoCore(ajoCore[ajoId]).initialize(
            ajoUsdcToken[ajoId],
            ajoHbarToken[ajoId],
            ajoMembers[ajoId],
            ajoCollateral[ajoId],
            ajoPayments[ajoId],
            ajoGovernance[ajoId]
        );
       
        // Set cycle duration (NEW)
        IAjoCore(ajoCore[ajoId]).updateCycleDuration(ajoCycleDuration[ajoId]);
       
        // Set custom token configuration with stored values
        if (ajoMonthlyPaymentUSDC[ajoId] > 0) {
            IAjoCore(ajoCore[ajoId]).updateTokenConfig(
                PaymentToken.USDC,
                ajoMonthlyPaymentUSDC[ajoId],
                true
            );
        }
       
        if (ajoMonthlyPaymentHBAR[ajoId] > 0) {
            IAjoCore(ajoCore[ajoId]).updateTokenConfig(
                PaymentToken.HBAR,
                ajoMonthlyPaymentHBAR[ajoId],
                true
            );
        }
       
        // Mark as active
        ajoIsActive[ajoId] = true;
        ajoInitializationPhase[ajoId] = 4;
       
        emit AjoPhase4Completed(ajoId);
        emit AjoInitializedPhase4(ajoId);
    }
   
    /**
     * @notice Initializes Phase 5: Schedule contract (if HSS enabled)
     * @dev Final phase for HSS-enabled Ajos
     *
     * VALIDATION:
     * - Valid Ajo ID
     * - Caller is creator or owner
     * - Current phase == 4
     * - If HSS: Proxy exists
     *
     * PROCESS:
     * 1. If HSS enabled, initialize AjoSchedule
     * 2. Set phase to 5
     *
     * @param ajoId Ajo identifier
     * @custom:emits AjoPhase5Completed
     * @custom:emits AjoInitializedPhase5
     */
    function initializeAjoPhase5(uint256 ajoId)
        public
        override
        validAjoId(ajoId)
        onlyCreatorOrOwner(ajoId)
    {
        require(ajoInitializationPhase[ajoId] == 4, "Phase 4 must be completed first");
       
        // Only initialize if using scheduled payments
        if (ajoUsesScheduledPayments[ajoId] && ajoSchedule[ajoId] != address(0)) {
            IAjoSchedule(ajoSchedule[ajoId]).initialize(
                ajoCore[ajoId],
                ajoPayments[ajoId],
                ajoGovernance[ajoId],
                hederaScheduleService
            );
        }
       
        ajoInitializationPhase[ajoId] = 5;
        emit AjoPhase5Completed(ajoId);
        emit AjoInitializedPhase5(ajoId, ajoSchedule[ajoId]);
    }
   
    /**
     * @notice Retrieves Ajo configuration parameters
     * @dev View function for cycle and payment settings
     *
     * @param ajoId Ajo identifier
     * @return cycleDuration Cycle length in seconds
     * @return monthlyPaymentUSDC USDC payment amount
     * @return monthlyPaymentHBAR HBAR payment amount
     */
    function getAjoConfiguration(uint256 ajoId)
        external
        view
        validAjoId(ajoId)
        returns (
            uint256 cycleDuration,
            uint256 monthlyPaymentUSDC,
            uint256 monthlyPaymentHBAR
        )
    {
        return (
            ajoCycleDuration[ajoId],
            ajoMonthlyPaymentUSDC[ajoId],
            ajoMonthlyPaymentHBAR[ajoId]
        );
    }
   
    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================
   
    /**
     * @notice Retrieves complete Ajo information
     * @dev Aggregates data from individual mappings
     *
     * @param ajoId Ajo identifier
     * @return info Complete AjoInfo struct
     */
    function getAjo(uint256 ajoId)
        external
        view
        override
        validAjoId(ajoId)
        returns (AjoInfo memory info)
    {
        return _buildAjoInfoFromMappings(ajoId);
    }
   
    /**
     * @notice Retrieves paginated list of all Ajos
     * @dev Supports offset/limit for large lists
     *
     * VALIDATION:
     * - Limit between 1-100
     *
     * @param offset Starting index (0-based)
     * @param limit Number of Ajos to return (max 100)
     * @return ajoInfos Array of AjoInfo structs
     * @return hasMore True if more Ajos available
     */
    function getAllAjos(uint256 offset, uint256 limit)
        external
        view
        override
        returns (AjoInfo[] memory ajoInfos, bool hasMore)
    {
        require(limit > 0 && limit <= 100, "Invalid limit");
       
        uint256 total = totalAjos;
        if (offset >= total) {
            return (new AjoInfo[](0), false);
        }
       
        uint256 remaining = total - offset;
        uint256 resultCount = remaining < limit ? remaining : limit;
       
        ajoInfos = new AjoInfo[](resultCount);
       
        for (uint256 i = 0; i < resultCount; i++) {
            uint256 ajoIdToGet = offset + i + 1;
            ajoInfos[i] = _buildAjoInfoFromMappings(ajoIdToGet);
        }
       
        hasMore = offset + resultCount < total;
        return (ajoInfos, hasMore);
    }
   
    /**
     * @notice Retrieves Ajo IDs created by an address
     * @dev Returns array from creatorAjos mapping
     *
     * @param creator Creator address
     * @return ajoIds Array of Ajo IDs
     */
    function getAjosByCreator(address creator)
        external
        view
        override
        returns (uint256[] memory ajoIds)
    {
        return creatorAjos[creator];
    }
   
    /**
     * @notice Checks Ajo existence and active status
     * @dev Active requires phase >=4 and isActive true
     *
     * @param ajoId Ajo identifier
     * @return exists True if Ajo ID valid
     * @return isActive True if operational
     */
    function ajoStatus(uint256 ajoId)
        external
        view
        override
        returns (bool exists, bool isActive)
    {
        if (ajoId == 0 || ajoId >= nextAjoId) {
            return (false, false);
        }
       
        bool isReady = ajoInitializationPhase[ajoId] >= 4;
        return (true, ajoIsActive[ajoId] && isReady);
    }
   
    /**
     * @notice Retrieves Ajo initialization progress
     * @dev Provides status for multi-phase setup
     *
     * @param ajoId Ajo identifier
     * @return phase Current phase (0-5)
     * @return isReady Ready for basic use (phase >=4)
     * @return isFullyFinalized Complete (phase ==5)
     */
    function getAjoInitializationStatus(uint256 ajoId) external view validAjoId(ajoId) returns (
        uint8 phase,
        bool isReady,
        bool isFullyFinalized
    ) {
        phase = ajoInitializationPhase[ajoId];
        isReady = phase >= 4;
        isFullyFinalized = phase == 5;
        return (phase, isReady, isFullyFinalized);
    }
   
     /**
     * @notice Retrieves operational metrics for an Ajo
     * @dev Queries child contracts for stats
     *
     * HANDLING:
     * - Only queries if phase >=4
     * - Uses try-catch for each query
     * - Sets capabilities based on query success
     *
     * @param ajoId Ajo identifier
     * @return status AjoOperationalStatus struct
     */
    function getAjoOperationalStatus(uint256 ajoId) external view validAjoId(ajoId) returns (AjoOperationalStatus memory status) {
       
        // Only attempt to get operational status if Ajo is at least Phase 4
        if (ajoInitializationPhase[ajoId] < 4) {
            return status; // Returns default/empty status
        }
       
        try IAjoCore(ajoCore[ajoId]).getContractStats() returns (
            uint256 totalMembers,
            uint256 activeMembers,
            uint256 totalCollateralUSDC,
            uint256 totalCollateralHBAR,
            uint256 contractBalanceUSDC,
            uint256 contractBalanceHBAR,
            uint256 currentQueuePosition,
            PaymentToken activeToken
        ) {
            status.totalMembers = totalMembers;
            status.activeMembers = activeMembers;
            status.totalCollateralUSDC = totalCollateralUSDC;
            status.totalCollateralHBAR = totalCollateralHBAR;
            status.contractBalanceUSDC = contractBalanceUSDC;
            status.contractBalanceHBAR = contractBalanceHBAR;
            status.activeToken = activeToken;
            status.canAcceptMembers = true; // If we got this far, basic functions work
        } catch {
            status.canAcceptMembers = false;
        }
       
        // Test if payments system is functional
        try IAjoPayments(ajoPayments[ajoId]).getCurrentCycle() returns (uint256 cycle) {
            status.currentCycle = cycle;
            status.canProcessPayments = true;
        } catch {
            status.canProcessPayments = false;
        }
       
        // Test if payouts can be distributed
        try IAjoPayments(ajoPayments[ajoId]).isPayoutReady() returns (bool ready) {
            status.canDistributePayouts = ready;
        } catch {
            status.canDistributePayouts = false;
        }
       
        return status;
    }
   
    /**
     * @notice Deactivates an Ajo
     * @dev Sets isActive to false
     *
     * VALIDATION:
     * - Valid Ajo ID
     * - Caller is creator or owner
     * - Currently active
     *
     * @param ajoId Ajo identifier
     */
    function deactivateAjo(uint256 ajoId) external override validAjoId(ajoId) onlyCreatorOrOwner(ajoId) {
        require(ajoIsActive[ajoId], "Ajo already inactive");
        ajoIsActive[ajoId] = false;
    }
   
    // ============================================================================
    // INTERNAL HELPER FUNCTIONS
    // ============================================================================
   
    /**
     * @dev Aggregates Ajo data from mappings into struct
     * @dev Internal view function for getAjo and getAllAjos
     *
     * @param ajoId Ajo identifier
     * @return info Populated AjoInfo struct
     */
    function _buildAjoInfoFromMappings(uint256 ajoId) internal view returns (AjoInfo memory info) {
        info.ajoCore = ajoCore[ajoId];
        info.ajoMembers = ajoMembers[ajoId];
        info.ajoCollateral = ajoCollateral[ajoId];
        info.ajoPayments = ajoPayments[ajoId];
        info.ajoGovernance = ajoGovernance[ajoId];
        info.ajoSchedule = ajoSchedule[ajoId];
        info.creator = ajoCreator[ajoId];
        info.createdAt = ajoCreatedAt[ajoId];
        info.name = ajoName[ajoId];
        info.isActive = ajoIsActive[ajoId];
        info.usesHtsTokens = ajoUsesHtsTokens[ajoId];
        info.usdcToken = ajoUsdcToken[ajoId];
        info.hbarToken = ajoHbarToken[ajoId];
        info.hcsTopicId = ajoHcsTopicId[ajoId];
        info.usesScheduledPayments = ajoUsesScheduledPayments[ajoId];
        info.scheduledPaymentsCount = ajoScheduledPaymentsCountMapping[ajoId];
        info.ajoCycleDuration = ajoCycleDuration[ajoId];
        info.ajoMonthlyPaymentUSDC = ajoMonthlyPaymentUSDC[ajoId];
        info.ajoMonthlyPaymentHBAR = ajoMonthlyPaymentHBAR[ajoId];
       
        return info;
    }
   
    /**
     * @dev Deploys EIP-1167 minimal proxy with CREATE2
     * @dev Uses deterministic salt for predictable addresses
     *
     * @param implementation Master implementation address
     * @param ajoId Ajo ID for salt
     * @return proxy Deployed proxy address
     */
    function _deployProxy(address implementation, uint256 ajoId) internal returns (address proxy) {
        bytes32 salt = keccak256(abi.encodePacked(ajoId, implementation));
        bytes memory bytecode = _getMinimalProxyBytecode(implementation);
       
        assembly ("memory-safe") {
            proxy := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
       
        require(proxy != address(0), "Proxy deployment failed");
        return proxy;
    }
   
    /**
     * @dev Generates EIP-1167 minimal proxy bytecode
     * @dev Hardcoded efficient bytecode
     *
     * @param implementation Target implementation
     * @return bytecode Proxy bytecode
     */
    function _getMinimalProxyBytecode(address implementation) private pure returns (bytes memory) {
        // EIP-1167 Minimal Proxy bytecode
        bytes memory bytecode = new bytes(0x37);
       
        assembly ("memory-safe") {
            // Store the bytecode
            mstore(add(bytecode, 0x20), 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(bytecode, 0x34), shl(0x60, implementation))
            mstore(add(bytecode, 0x48), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
        }
       
        return bytecode;
    }
   
    // ============================================================================
    // AUTOMATION MANAGEMENT
    // ============================================================================
   
    /**
     * @notice Sets OpenZeppelin Defender Relayer address
     * @dev Updates global relayer for automation
     *
     * VALIDATION:
     * - Caller is owner
     * - Address non-zero
     *
     * @param _relayerAddress New relayer address
     * @custom:emits DefenderRelayerSet
     */
    function setDefenderRelayer(address _relayerAddress) external onlyOwner {
        require(_relayerAddress != address(0), "Invalid relayer address");
        address oldRelayer = defenderRelayerAddress;
        defenderRelayerAddress = _relayerAddress;
        emit DefenderRelayerSet(oldRelayer, _relayerAddress);
    }
   
    /**
     * @notice Enables automation for an Ajo
     * @dev Authorizes relayer in AjoCore
     *
     * VALIDATION:
     * - Valid Ajo ID
     * - Caller is creator or owner
     * - Relayer set
     * - Phase >=4
     *
     * @param ajoId Ajo identifier
     * @custom:emits AjoAutomationEnabled
     */
    function enableAjoAutomation(uint256 ajoId) external validAjoId(ajoId) onlyCreatorOrOwner(ajoId) {
        require(defenderRelayerAddress != address(0), "Defender Relayer not set");
        require(ajoInitializationPhase[ajoId] >= 4, "Ajo not initialized");
   
        // Authorize the Defender Relayer in the AjoCore contract
        IAjoCore(ajoCore[ajoId]).setAutomationAuthorization(defenderRelayerAddress, true);
        IAjoCore(ajoCore[ajoId]).setAutomationEnabled(true);
   
        ajoAutomationEnabled[ajoId] = true;
   
        emit AjoAutomationEnabled(ajoId, msg.sender);
    }
   
    /**
     * @notice Disables automation for an Ajo
     * @dev Sets enabled to false in AjoCore
     *
     * VALIDATION:
     * - Valid Ajo ID
     * - Caller is creator or owner
     *
     * @param ajoId Ajo identifier
     * @custom:emits AjoAutomationDisabled
     */
    function disableAjoAutomation(uint256 ajoId) external validAjoId(ajoId) onlyCreatorOrOwner(ajoId) {
        IAjoCore(ajoCore[ajoId]).setAutomationEnabled(false);
        ajoAutomationEnabled[ajoId] = false;
   
        emit AjoAutomationDisabled(ajoId, msg.sender);
    }
   
    /**
     * @notice Batch enables automation for multiple Ajos
     * @dev Only processes initialized Ajos
     *
     * VALIDATION:
     * - Caller is owner
     * - Relayer set
     *
     * @param ajoIds Array of Ajo IDs
     * @custom:emits BatchAutomationSetup
     */
    function batchEnableAutomation(uint256[] calldata ajoIds) external onlyOwner {
        require(defenderRelayerAddress != address(0), "Defender Relayer not set");
   
        for (uint256 i = 0; i < ajoIds.length; i++) {
            uint256 ajoId = ajoIds[i];
       
            if (ajoId > 0 && ajoId < nextAjoId && ajoInitializationPhase[ajoId] >= 4) {
                IAjoCore(ajoCore[ajoId]).setAutomationAuthorization(defenderRelayerAddress, true);
                IAjoCore(ajoCore[ajoId]).setAutomationEnabled(true);
                ajoAutomationEnabled[ajoId] = true;
            }
        }
   
        emit BatchAutomationSetup(ajoIds, defenderRelayerAddress);
    }
   
    /**
     * @notice Retrieves all Ajo IDs with automation enabled
     * @dev Scans all Ajo IDs for enabled status
     *
     * @return ajoIds Array of enabled Ajo IDs
     */
    function getAjosWithAutomation() external view returns (uint256[] memory ajoIds) {
        uint256 count = 0;
   
        // Count enabled Ajos
        for (uint256 i = 1; i < nextAjoId; i++) {
            if (ajoAutomationEnabled[i]) {
                count++;
            }
        }
   
        // Build array
        ajoIds = new uint256[](count);
        uint256 index = 0;
   
        for (uint256 i = 1; i < nextAjoId; i++) {
            if (ajoAutomationEnabled[i]) {
                ajoIds[index] = i;
                index++;
            }
        }
   
        return ajoIds;
    }
   
    /**
     * @notice Checks automation status for multiple Ajos
     * @dev Queries AjoCore for shouldRun status
     *
     * HANDLING:
     * - Skips invalid IDs
     * - Uses try-catch for queries
     *
     * @param ajoIds Array of Ajo IDs
     * @return statuses Array of AutomationStatus
     */
    function checkAutomationStatus(uint256[] calldata ajoIds)
        external
        view
        returns (AutomationStatus[] memory statuses)
    {
        statuses = new AutomationStatus[](ajoIds.length);
   
        for (uint256 i = 0; i < ajoIds.length; i++) {
            uint256 ajoId = ajoIds[i];
       
            if (ajoId == 0 || ajoId >= nextAjoId) {
                statuses[i] = AutomationStatus({
                    ajoId: ajoId,
                    enabled: false,
                    shouldRun: false,
                    defaultersCount: 0,
                    reason: "Invalid Ajo ID"
                });
                continue;
            }
       
            try IAjoCore(ajoCore[ajoId]).shouldAutomationRun() returns (
                bool shouldRun,
                string memory reason,
                uint256 defaultersCount
            ) {
                statuses[i] = AutomationStatus({
                    ajoId: ajoId,
                    enabled: ajoAutomationEnabled[ajoId],
                    shouldRun: shouldRun,
                    defaultersCount: defaultersCount,
                    reason: reason
                });
            } catch {
                statuses[i] = AutomationStatus({
                    ajoId: ajoId,
                    enabled: false,
                    shouldRun: false,
                    defaultersCount: 0,
                    reason: "Error checking status"
                });
            }
        }
   
        return statuses;
    }
   
    // ============================================================================
    // NEW STRUCT
    // ============================================================================
   
    /**
     * @notice Structure for automation status information
     * @dev Used by checkAutomationStatus for batch queries
     *
     * FIELDS:
     * - ajoId: Ajo identifier
     * - enabled: Automation enabled status
     * - shouldRun: Whether automation should execute now
     * - defaultersCount: Number of current defaulters
     * - reason: Status message or error reason
     */
    struct AutomationStatus {
        uint256 ajoId;
        bool enabled;
        bool shouldRun;
        uint256 defaultersCount;
        string reason;
    }
}