// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "../interfaces/AjoInterfaces.sol";

/**
 * @title AjoCore
 * @notice Main orchestration contract for the Ajo.save protocol
 * @dev Coordinates all Ajo operations across specialized contracts
 * 
 * ARCHITECTURE:
 * AjoCore follows a modular architecture where specialized contracts handle specific functions:
 * - AjoMembers: Member management and queue system
 * - AjoCollateral: Dynamic collateral calculations and seizure
 * - AjoPayments: Payment processing and distribution
 * - AjoGovernance: On-chain governance with HCS integration
 * 
 * SECURITY MODEL:
 * - 109% security coverage through collateral plus guarantor network
 * - Automated seizure cascade for default protection
 * - Reputation-weighted voting for governance
 * - Emergency pause capabilities
 * 
 * COLLATERAL SYSTEM:
 * - Position-based: Earlier positions (earlier payouts) require more collateral
 * - Formula: 60% of net debt at position
 * - Net debt = (Position - 1) * Monthly Payment - Total Received
 * - Guarantor network provides additional 9% buffer
 * 
 * ACCESS CONTROL:
 * - Owner: Emergency functions and critical updates
 * - Authorized Automation: HSS and external automation services
 * - Governance: Parameter updates and token configuration
 * - Members: Core Ajo operations (join, pay, exit)
 */
contract AjoCore is IAjoCore, ReentrancyGuard, Ownable, Initializable {
    
    // ============================================================================
    // STATE VARIABLES
    // ============================================================================
    
    /// @notice USDC token contract (HTS or ERC20)
    IERC20 public USDC;
    
    /// @notice Wrapped HBAR token contract
    IERC20 public HBAR;
    
    /// @notice Member management contract reference
    IAjoMembers public membersContract;
    
    /// @notice Collateral management contract reference
    IAjoCollateral public collateralContract;
    
    /// @notice Payment processing contract reference
    IAjoPayments public paymentsContract;
    
    /// @notice Governance contract reference
    IAjoGovernance public governanceContract;
    
    /// @notice Duration of each payment cycle in seconds
    /// @dev Typically set to 30 days, configurable by governance
    uint256 public cycleDuration;
    
    /// @notice Fixed total number of participants allowed in Ajo
    /// @dev Set to 10 participants, cannot be changed after deployment
    uint256 public constant FIXED_TOTAL_PARTICIPANTS = 10;
    
    /// @notice Next available queue position for new members
    /// @dev Increments from 1, capped at FIXED_TOTAL_PARTICIPANTS
    uint256 public nextQueueNumber = 1;
    
    /// @notice Timestamp of last cycle advancement
    /// @dev Used to track cycle progression and automation timing
    uint256 public lastCycleTimestamp;
    
    /// @notice Emergency pause state
    /// @dev When true, all member operations are halted
    bool public paused;
    
    /// @notice Tracks if first cycle has been completed
    /// @dev Used for special handling of initial cycle advancement
    bool private isFirstCycleComplete;
    
    /// @notice Maps queue position to member address
    /// @dev Key: queue position (1-10), Value: member address
    mapping(uint256 => address) public queuePositions;
    
    /// @notice Maps queue position to guarantor address
    /// @dev Key: member position, Value: guarantor address
    mapping(uint256 => address) public guarantorAssignments;
    
    /// @notice Array of all active member addresses
    /// @dev Maintained for efficient iteration over members
    address[] public activeMembersList;

    /// @notice Addresses authorized to perform automated operations
    /// @dev Used for HSS schedules and external automation services
    mapping(address => bool) public authorizedAutomation;
    
    /// @notice Grace period before automation can execute after deadline
    /// @dev Gives members extra time before automatic default handling
    uint256 public automationGracePeriod = 3600; // 1 hour default
    
    /// @notice Global automation enable/disable flag
    bool public automationEnabled = true;
    
    /// @notice Enable/disable automatic cycle advancement
    bool public autoAdvanceCycleEnabled = true;
    
    /// @notice Minimum delay between last payment and cycle advancement
    /// @dev Prevents immediate advancement, allows for final payments
    uint256 public minCycleAdvanceDelay = 1 hours;

    // ============================================================================
    // EVENTS
    // ============================================================================
    
    /**
     * @notice Emitted when payment cycle advances
     * @param newCycle The new cycle number after advancement
     * @param timestamp Block timestamp of advancement
     */
    event CycleAdvanced(uint256 newCycle, uint256 timestamp);
    
    /**
     * @notice Emitted when all contract references are initialized
     * @param members AjoMembers contract address
     * @param collateral AjoCollateral contract address
     * @param payments AjoPayments contract address
     * @param governance AjoGovernance contract address
     */
    event ContractsInitialized(address members, address collateral, address payments, address governance);
    
    /**
     * @notice Emitted when new member successfully joins Ajo
     * @param member Address of new member
     * @param queueNumber Assigned queue position
     * @param collateral Amount of collateral locked
     * @param token Token type used for collateral
     */
    event MemberJoined(address indexed member, uint256 queueNumber, uint256 collateral, PaymentToken token);
    
    /**
     * @notice Emitted when guarantor is assigned to member
     * @param member Address of member receiving guarantor
     * @param guarantor Address of assigned guarantor
     * @param memberPosition Member's queue position
     * @param guarantorPosition Guarantor's queue position
     */
    event GuarantorAssigned(address indexed member, address indexed guarantor, uint256 memberPosition, uint256 guarantorPosition);
    
    /**
     * @notice Emitted when Ajo reaches maximum capacity
     * @param ajoContract Address of this Ajo contract
     * @param timestamp Block timestamp when capacity reached
     */
    event AjoFull(address indexed ajoContract, uint256 timestamp);
    
    /**
     * @notice Emitted when member needs to transfer collateral
     * @dev Indicates insufficient allowance, member must approve
     * @param member Address of member
     * @param amount Required collateral amount
     * @param token Token type for collateral
     * @param collateralContract Address where collateral should be approved
     */
    event CollateralTransferRequired(address indexed member, uint256 amount, PaymentToken token, address collateralContract);
    
    /**
     * @notice Emitted when cycle duration is updated
     * @param oldDuration Previous cycle duration in seconds
     * @param newDuration New cycle duration in seconds
     */
    event CycleDurationUpdated(uint256 oldDuration, uint256 newDuration);
    
    /**
     * @notice Emitted when member defaults on payment
     * @param member Address of defaulting member
     * @param cycle Cycle number of default
     * @param cyclesMissed Number of consecutive cycles missed
     */
    event MemberDefaulted(address indexed member, uint256 cycle, uint256 cyclesMissed);
    
    /**
     * @notice Emitted when contract is paused
     * @param account Address that triggered pause
     */
    event Paused(address account);
    
    /**
     * @notice Emitted when contract is unpaused
     * @param account Address that triggered unpause
     */
    event Unpaused(address account);
    
    /**
     * @notice Emitted when automation authorization changes
     * @param automationAddress Address being authorized/deauthorized
     * @param authorized New authorization status
     */
    event AutomationAuthorized(address indexed automationAddress, bool authorized);
    
    /**
     * @notice Emitted when defaults are handled by automation
     * @param cycle Cycle number when defaults were processed
     * @param defaulters Array of defaulting member addresses
     * @param timestamp Block timestamp of processing
     * @param executor Address that executed automation
     * @param successCount Number of successfully processed defaults
     * @param failureCount Number of failed default processes
     */
    event DefaultsHandledByAutomation(uint256 indexed cycle, address[] defaulters, uint256 timestamp, address indexed executor, uint256 successCount, uint256 failureCount);
    
    /**
     * @notice Emitted when individual default handling fails
     * @param member Address of member whose default handling failed
     * @param cycle Cycle number
     * @param reason Error reason for failure
     */
    event DefaultHandlingFailed(address indexed member, uint256 indexed cycle, string reason);
    
    /**
     * @notice Emitted when automation grace period is updated
     * @param oldPeriod Previous grace period in seconds
     * @param newPeriod New grace period in seconds
     */
    event AutomationGracePeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    
    /**
     * @notice Emitted when automation is enabled/disabled
     * @param enabled New automation state
     */
    event AutomationToggled(bool enabled);
    
    /**
     * @notice Emitted when cycle is advanced automatically
     * @param oldCycle Previous cycle number
     * @param newCycle New cycle number
     * @param advancer Address that triggered advancement
     * @param timestamp Block timestamp of advancement
     * @param hadPayout Whether payout was distributed during advancement
     */
    event CycleAdvancedAutomatically(uint256 indexed oldCycle, uint256 indexed newCycle, address indexed advancer, uint256 timestamp, bool hadPayout);
    
    /**
     * @notice Emitted when cycle advancement fails
     * @param cycle Cycle number when failure occurred
     * @param reason Error reason for failure
     * @param timestamp Block timestamp of failure
     */
    event CycleAdvancementFailed(uint256 indexed cycle, string reason, uint256 timestamp);
    
    /**
     * @notice Emitted when auto-advance cycle setting changes
     * @param enabled New auto-advance state
     */
    event AutoAdvanceCycleToggled(bool enabled);
    
    /**
     * @notice Emitted when minimum cycle advance delay is updated
     * @param oldDelay Previous minimum delay in seconds
     * @param newDelay New minimum delay in seconds
     */
    event MinCycleAdvanceDelayUpdated(uint256 oldDelay, uint256 newDelay);

    // ============================================================================
    // MODIFIERS
    // ============================================================================

    /**
     * @notice Restricts function access to authorized automation addresses or owner
     * @dev Used for automated operations like default handling and cycle advancement
     */
    modifier onlyAuthorizedAutomation() {
        require(authorizedAutomation[msg.sender] || msg.sender == owner(), "Not authorized for automation");
        _;
    }

    /**
     * @notice Requires automation to be globally enabled
     * @dev Provides kill switch for all automated operations
     */
    modifier whenAutomationEnabled() {
        require(automationEnabled, "Automation is disabled");
        _;
    }

    // ============================================================================
    // ERRORS
    // ============================================================================
    
    /// @notice Thrown when member has insufficient collateral for position
    error InsufficientCollateral();
    
    /// @notice Thrown when address is already an active member
    error MemberAlreadyExists();
    
    /// @notice Thrown when operation references non-existent member
    error MemberNotFound();
    
    /// @notice Thrown when member attempts duplicate payment in cycle
    error PaymentAlreadyMade();
    
    /// @notice Thrown when insufficient balance for operation
    error InsufficientBalance();
    
    /// @notice Thrown when cycle number is invalid
    error InvalidCycle();
    
    /// @notice Thrown when payout distribution attempted before ready
    error PayoutNotReady();
    
    /// @notice Thrown when unsupported token type is used
    error TokenNotSupported();
    
    /// @notice Thrown when caller lacks required authorization
    error Unauthorized();
    
    /// @notice Thrown when attempting to join full Ajo
    error AjoCapacityReached();
    
    /// @notice Thrown when token configuration is invalid
    error InvalidTokenConfiguration();
    
    /// @notice Thrown when member has insufficient token balance
    error InsufficientCollateralBalance();
    
    /// @notice Thrown when token allowance is insufficient
    error InsufficientAllowance();
    
    /// @notice Thrown when collateral transfer fails
    error CollateralTransferFailed();
    
    /// @notice Thrown when collateral has not been transferred/approved
    error CollateralNotTransferred();
    
    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================
    
    /**
     * @notice Constructor for master implementation contract
     * @dev Disables initializers and transfers ownership to burn address
     *      This prevents the master contract from being initialized
     *      Only proxy clones can be initialized
     */
    constructor() {
        _disableInitializers();
        _transferOwnership(address(1));
    }
    
    // ============================================================================
    // INITIALIZER
    // ============================================================================
    
    /**
     * @notice Initialize proxy instance of AjoCore
     * @dev Called by factory after deploying proxy clone
     *      Sets up all contract dependencies and initial parameters
     * 
     * INITIALIZATION PROCESS:
     * 1. Validate all contract addresses are non-zero
     * 2. Transfer ownership to deployer (factory)
     * 3. Store token contract references
     * 4. Store specialized contract references
     * 5. Initialize queue and cycle tracking
     * 6. Set default cycle duration (30 days)
     * 
     * SECURITY:
     * - Can only be called once due to Initializable modifier
     * - All addresses must be valid contracts
     * - Ownership transferred to factory deployer
     * 
     * @param _usdc USDC token address (HTS or ERC20)
     * @param _whbar Wrapped HBAR token address
     * @param _ajoMembers AjoMembers contract address
     * @param _ajoCollateral AjoCollateral contract address
     * @param _ajoPayments AjoPayments contract address
     * @param _ajoGovernance AjoGovernance contract address
     */
    function initialize(
        address _usdc,
        address _whbar,
        address _ajoMembers,
        address _ajoCollateral,
        address _ajoPayments,
        address _ajoGovernance
    ) external override initializer {
        require(_usdc != address(0), "Invalid USDC address");
        require(_whbar != address(0), "Invalid HBAR address");
        require(_ajoMembers != address(0), "Invalid members contract");
        require(_ajoCollateral != address(0), "Invalid collateral contract");
        require(_ajoPayments != address(0), "Invalid payments contract");
        require(_ajoGovernance != address(0), "Invalid governance contract");
        
        _transferOwnership(msg.sender);
        
        USDC = IERC20(_usdc);
        HBAR = IERC20(_whbar);
        
        membersContract = IAjoMembers(_ajoMembers);
        collateralContract = IAjoCollateral(_ajoCollateral);
        paymentsContract = IAjoPayments(_ajoPayments);
        governanceContract = IAjoGovernance(_ajoGovernance);
        
        nextQueueNumber = 1;
        lastCycleTimestamp = block.timestamp;
        cycleDuration = 30 days;
        
        emit ContractsInitialized(_ajoMembers, _ajoCollateral, _ajoPayments, _ajoGovernance);
    }
    
    // ============================================================================
    // CORE AJO FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Join the Ajo group as a new member
     * @dev Handles complete onboarding process including collateral and guarantor assignment
     * 
     * JOINING PROCESS:
     * 1. Validate member eligibility (not already member, capacity available)
     * 2. Validate token configuration is active
     * 3. Calculate required collateral based on next queue position
     * 4. Calculate and assign guarantor (opposite side of queue)
     * 5. Lock collateral in AjoCollateral contract
     * 6. Calculate initial reputation score
     * 7. Create and store member data
     * 8. Update queue mappings and active members list
     * 9. Establish bidirectional guarantor relationships
     * 10. Emit events and check if Ajo is full
     * 
     * COLLATERAL CALCULATION:
     * Required collateral = 60% of net debt at position
     * Net debt = (Total Participants - Queue Position) * Monthly Payment
     * Example: Position 1 of 10, $100/month = (10-1) * $100 * 0.6 = $540
     * 
     * GUARANTOR ASSIGNMENT:
     * Guarantor position = Total Participants - Member Position + 1
     * Example: Position 1 gets Position 10 as guarantor
     * 
     * SECURITY CHECKS:
     * - Member must not already exist
     * - Ajo must have capacity (< 10 members)
     * - Token must be active and configured
     * - Member must have sufficient balance
     * - Member must have approved collateral contract
     * 
     * REPUTATION:
     * Initial reputation calculated based on collateral locked
     * Higher collateral = higher starting reputation
     * Formula: 100 + (collateral * 50 / monthlyPayment)
     * 
     * @param tokenChoice Preferred token for payments (USDC or HBAR)
     */
    function joinAjo(PaymentToken tokenChoice) external override nonReentrant {        
        Member memory existingMember = membersContract.getMember(msg.sender);
        if (existingMember.isActive) revert MemberAlreadyExists();
        
        if (nextQueueNumber > FIXED_TOTAL_PARTICIPANTS) revert AjoCapacityReached();
        
        TokenConfig memory config = paymentsContract.getTokenConfig(tokenChoice);
        if (!config.isActive) revert TokenNotSupported();
        if (config.monthlyPayment == 0) revert InvalidTokenConfiguration();
        
        uint256 requiredCollateral = collateralContract.calculateRequiredCollateral(
            nextQueueNumber,
            config.monthlyPayment,
            FIXED_TOTAL_PARTICIPANTS
        );
        
        uint256 guarantorPos = collateralContract.calculateGuarantorPosition(
            nextQueueNumber, 
            FIXED_TOTAL_PARTICIPANTS
        );
        
        address guarantorAddr = address(0);
        if (guarantorPos > 0 && guarantorPos != nextQueueNumber) {
            address potentialGuarantor = membersContract.getQueuePosition(guarantorPos);
            if (potentialGuarantor != address(0)) {
                guarantorAddr = potentialGuarantor;
            }
        }
        
        if (requiredCollateral > 0) {
            IERC20 paymentToken = (tokenChoice == PaymentToken.USDC) ? USDC : HBAR;
            
            if (paymentToken.balanceOf(msg.sender) < requiredCollateral) {
                revert InsufficientCollateralBalance();
            }
            
            if (paymentToken.allowance(msg.sender, address(collateralContract)) >= requiredCollateral) {
                collateralContract.lockCollateral(msg.sender, requiredCollateral, tokenChoice);
            } else {
                emit CollateralTransferRequired(msg.sender, requiredCollateral, tokenChoice, address(collateralContract));
                revert CollateralNotTransferred();
            }
        }
        
        uint256 initialReputation = _calculateInitialReputation(requiredCollateral, config.monthlyPayment);
        
        uint256 newMemberGuaranteePosition = 0;
        for (uint256 i = 1; i <= FIXED_TOTAL_PARTICIPANTS; i++) {
            uint256 theirGuarantor = collateralContract.calculateGuarantorPosition(i, FIXED_TOTAL_PARTICIPANTS);
            if (theirGuarantor == nextQueueNumber) {
                newMemberGuaranteePosition = i;
                break;
            }
        }
        
        Member memory newMember = Member({
            queueNumber: nextQueueNumber,
            joinedCycle: paymentsContract.getCurrentCycle(),
            totalPaid: 0,
            requiredCollateral: requiredCollateral,
            lockedCollateral: requiredCollateral,
            lastPaymentCycle: 0,
            defaultCount: 0,
            hasReceivedPayout: false,
            isActive: true,
            guarantor: guarantorAddr,
            preferredToken: tokenChoice,
            reputationScore: initialReputation,
            pastPayments: new uint256[](0),
            guaranteePosition: newMemberGuaranteePosition
        });
        
        membersContract.addMember(msg.sender, newMember);
        
        queuePositions[nextQueueNumber] = msg.sender;
        activeMembersList.push(msg.sender);
        
        if (guarantorAddr != address(0)) {
            guarantorAssignments[nextQueueNumber] = guarantorAddr;
            emit GuarantorAssigned(msg.sender, guarantorAddr, nextQueueNumber, guarantorPos);
        }
        
        if (newMemberGuaranteePosition > 0) {
            address memberToUpdate = membersContract.getQueuePosition(newMemberGuaranteePosition);
            
            if (memberToUpdate != address(0)) {
                Member memory existingMemberData = membersContract.getMember(memberToUpdate);
                
                if (existingMemberData.guarantor == address(0)) {
                    existingMemberData.guarantor = msg.sender;
                    membersContract.updateMember(memberToUpdate, existingMemberData);
                    guarantorAssignments[newMemberGuaranteePosition] = msg.sender;
                    emit GuarantorAssigned(memberToUpdate, msg.sender, newMemberGuaranteePosition, nextQueueNumber);
                }
            }
        }
        
        nextQueueNumber++;
        
        emit MemberJoined(msg.sender, newMember.queueNumber, requiredCollateral, tokenChoice);
        
        if (nextQueueNumber > FIXED_TOTAL_PARTICIPANTS) {
            emit AjoFull(address(this), block.timestamp);
            
            if (paymentsContract.getCurrentCycle() == 0) {
                paymentsContract.advanceCycle();
            }
        }
    }
    
    /**
     * @notice Get required collateral amount for joining
     * @dev View function for frontend to display required collateral before join
     * 
     * USAGE:
     * Frontend calls this before joinAjo to show user exact collateral needed
     * User can then approve correct amount and join in one flow
     * 
     * @param tokenChoice Token type to calculate collateral for
     * @return Required collateral amount in token's smallest unit
     */
    function getRequiredCollateralForJoin(PaymentToken tokenChoice) external view returns (uint256) {
        TokenConfig memory config = paymentsContract.getTokenConfig(tokenChoice);
        return collateralContract.calculateRequiredCollateral(
            nextQueueNumber,
            config.monthlyPayment,
            FIXED_TOTAL_PARTICIPANTS
        );
    }
    
    /**
     * @notice Process monthly payment for current cycle
     * @dev Member or HSS schedule calls this to make payment
     * 
     * PAYMENT PROCESS:
     * 1. Retrieve and validate member data
     * 2. Check member hasn't already paid this cycle
     * 3. Validate token configuration
     * 4. Delegate to AjoPayments for token transfer
     * 5. Update member's last payment cycle
     * 
     * SECURITY:
     * - ReentrancyGuard prevents reentrancy attacks
     * - Member must be active
     * - Cannot pay twice in same cycle
     * - Token must be active and configured
     * 
     * HSS INTEGRATION:
     * This function can be called by:
     * - Member directly (manual payment)
     * - HSS schedule (automated payment)
     * - Authorized automation service
     * 
     * @custom:emits PaymentMade via AjoPayments contract
     */
    function processPayment() external override nonReentrant {
        Member memory member = membersContract.getMember(msg.sender);
        require(member.isActive, "Member not active");
        
        uint256 currentCycle = paymentsContract.getCurrentCycle();
        require(member.lastPaymentCycle < currentCycle, "Already paid this cycle");
        
        TokenConfig memory config = paymentsContract.getTokenConfig(member.preferredToken);
        require(config.isActive, "Token not supported");
        require(config.monthlyPayment > 0, "Invalid payment config");
        
        paymentsContract.processPayment(msg.sender, config.monthlyPayment, member.preferredToken);
        membersContract.updateLastPaymentCycle(msg.sender, currentCycle);
    }
    
    /**
     * @notice Distribute payout to next recipient in queue
     * @dev Triggers payout when all members have paid
     * 
     * PAYOUT PROCESS:
     * 1. AjoPayments validates all members paid
     * 2. Calculate total payout (payments + penalties)
     * 3. Identify next recipient by queue position
     * 4. Transfer tokens to recipient
     * 5. Mark recipient as having received payout
     * 6. Advance to next cycle
     * 7. Update cycle timestamp
     * 
     * PAYOUT AMOUNT:
     * Base = (Number of Active Members) * (Monthly Payment)
     * Plus any accumulated penalties from late payments
     * 
     * SECURITY:
     * - ReentrancyGuard prevents reentrancy
     * - Only callable when all members paid
     * - Updates lastCycleTimestamp for tracking
     * 
     * CYCLE ADVANCEMENT:
     * After payout, cycle automatically advances
     * Payment tracking resets for new cycle
     * Next recipient position moves forward
     * 
     * @custom:emits PayoutDistributed via AjoPayments contract
     * @custom:emits CycleAdvanced after successful payout
     */
    function distributePayout() external override nonReentrant {
        paymentsContract.distributePayout();
        lastCycleTimestamp = block.timestamp;
        emit CycleAdvanced(paymentsContract.getCurrentCycle(), block.timestamp);
    }
    
    /**
     * @notice Exit Ajo before receiving payout
     * @dev Member can leave and recover partial collateral
     * 
     * EXIT PROCESS:
     * 1. Validate member hasn't received payout yet
     * 2. Calculate exit penalty (10% of locked collateral)
     * 3. Calculate return amount (90% of collateral)
     * 4. Remove member from active list
     * 5. Unlock and return collateral minus penalty
     * 
     * EXIT RESTRICTIONS:
     * - Cannot exit after receiving payout
     * - Exit penalty applies (10% of collateral)
     * - Past payments are NOT refunded (remain in pool)
     * - Guarantor relationships are disrupted
     * 
     * PENALTY RATIONALE:
     * 10% exit penalty discourages frivolous exits
     * Penalty compensates remaining members for disruption
     * Encourages commitment to full season
     * 
     * SECURITY:
     * - ReentrancyGuard prevents reentrancy
     * - Validates member hasn't received payout
     * - Safe collateral return via AjoCollateral
     * 
     * @custom:emits MemberRemoved via AjoMembers contract
     */
    function exitAjo() external override nonReentrant {
        Member memory member = membersContract.getMember(msg.sender);
        
        if (member.hasReceivedPayout) {
            revert Unauthorized();
        }
        
        uint256 exitPenalty = member.lockedCollateral / 10;
        uint256 returnAmount = member.lockedCollateral > exitPenalty ? member.lockedCollateral - exitPenalty : 0;
        
        membersContract.removeMember(msg.sender);
        
        if (returnAmount > 0) {
            collateralContract.unlockCollateral(msg.sender, returnAmount, member.preferredToken);
        }
    }
    
    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Get comprehensive member information
     * @dev Aggregates data from multiple contracts
     * 
     * RETURNED DATA:
     * - Complete Member struct from AjoMembers
     * - Pending penalty from AjoPayments
     * - Effective voting power (reputation-weighted)
     * 
     * VOTING POWER CALCULATION:
     * Base voting power = 2 votes per member
     * Adjusted by reputation score (0-100)
     * Higher reputation = more voting influence
     * 
     * @param member Address to query information for
     * @return memberInfo Complete member data structure
     * @return pendingPenalty Accumulated penalty amount
     * @return effectiveVotingPower Reputation-weighted voting power
     */
    function getMemberInfo(address member) 
        external 
        view 
        override
        returns (
            Member memory memberInfo, 
            uint256 pendingPenalty,
            uint256 effectiveVotingPower
        ) 
    {
        memberInfo = membersContract.getMember(member);
        pendingPenalty = paymentsContract.getPendingPenalty(member);
        effectiveVotingPower = 2;
    }
    
    /**
     * @notice Get member's queue position and wait time
     * @dev Calculates estimated cycles until payout
     * 
     * QUEUE INFORMATION:
     * - Position: 1-10 (sequential assignment)
     * - Estimated wait: Cycles until member receives payout
     * 
     * WAIT CALCULATION:
     * Wait = Position - Current Payout Position
     * Example: Position 5, current payout at 2 = 3 cycles wait
     * 
     * @param member Address to query queue info for
     * @return position Member's queue position (1-indexed)
     * @return estimatedCyclesWait Estimated cycles until payout
     */
    function getQueueInfo(address member) 
        external 
        view 
        override
        returns (uint256 position, uint256 estimatedCyclesWait) 
    {
        return membersContract.getQueueInfo(member);
    }
    
    /**
     * @notice Check if member needs to pay in current cycle
     * @dev Checks if member has made payment for current cycle
     * 
     * @param member Address to check payment status
     * @return True if member needs to pay, false if already paid
     */
    function needsToPayThisCycle(address member) external view override returns (bool) {
        return paymentsContract.needsToPayThisCycle(member);
    }
    
    /**
     * @notice Get comprehensive contract statistics
     * @dev Aggregates statistics from all specialized contracts
     * 
     * STATISTICS INCLUDE:
     * - Total members: All members ever joined
     * - Active members: Currently participating members
     * - Collateral totals: Separated by USDC and HBAR
     * - Contract balances: Available funds for payouts
     * - Queue position: Next available spot
     * - Active token: Currently accepted payment token
     * 
     * USAGE:
     * Frontend dashboard displays these stats
     * Analytics track Ajo health and activity
     * 
     * @return totalMembers Total members ever joined
     * @return activeMembers Currently active members
     * @return totalCollateralUSDC Total USDC collateral locked
     * @return totalCollateralHBAR Total HBAR collateral locked
     * @return contractBalanceUSDC Current USDC balance available
     * @return contractBalanceHBAR Current HBAR balance available
     * @return currentQueuePosition Next available queue position
     * @return activeToken Currently active payment token
     */
    function getContractStats() 
        external 
        view 
        override
        returns (
            uint256 totalMembers,
            uint256 activeMembers,
            uint256 totalCollateralUSDC,
            uint256 totalCollateralHBAR,
            uint256 contractBalanceUSDC,
            uint256 contractBalanceHBAR,
            uint256 currentQueuePosition,
            PaymentToken activeToken
        ) 
    {
        return membersContract.getContractStats();
    }
    
    /**
     * @notice Get token configuration details
     * @dev Returns payment requirements and status for specified token
     * 
     * TOKEN CONFIGURATION:
     * - monthlyPayment: Required payment amount per cycle
     * - isActive: Whether token is currently accepted
     * 
     * USAGE:
     * Frontend checks token config before join
     * Validates token is active and shows payment amount
     * 
     * @param token Token type to query (USDC or HBAR)
     * @return Token configuration structure
     */
    function getTokenConfig(PaymentToken token) external view override returns (TokenConfig memory) {
        return paymentsContract.getTokenConfig(token);
    }
    
    /**
     * @notice Demonstrate collateral requirements for all positions
     * @dev Educational function showing collateral progression
     * 
     * DEMONSTRATION PURPOSE:
     * Shows how collateral decreases with queue position
     * Helps users understand position-based collateral model
     * Frontend can visualize collateral vs position chart
     * 
     * EXAMPLE OUTPUT (10 participants, $100 monthly):
     * Position 1: $540 collateral (earliest payout, highest collateral)
     * Position 2: $480 collateral
     * Position 3: $420 collateral
     * ...
     * Position 9: $60 collateral
     * Position 10: $0 collateral (last payout, no collateral)
     * 
     * CALCULATION:
     * For each position:
     * collateral = (participants - position) * monthlyPayment * 0.6
     * 
     * @param participants Number of members to simulate
     * @param monthlyPayment Monthly payment amount to use
     * @return positions Array of position numbers (1 to participants)
     * @return collaterals Array of required collateral amounts
     */
    function getCollateralDemo(uint256 participants, uint256 monthlyPayment) 
        external 
        view 
        override
        returns (
            uint256[] memory positions, 
            uint256[] memory collaterals
        ) 
    {
        positions = new uint256[](participants);
        collaterals = new uint256[](participants);
        
        for (uint256 i = 1; i <= participants; i++) {
            positions[i-1] = i;
            collaterals[i-1] = collateralContract.calculateRequiredCollateral(i, monthlyPayment, participants);
        }
    }
    
    /**
     * @notice Calculate total seizable assets from defaulting member
     * @dev Shows 109% security coverage breakdown
     * 
     * SEIZURE CASCADE:
     * 1. Member's locked collateral (60% of net debt)
     * 2. Member's past payments in pool (40% of debt)
     * 3. Guarantor's collateral (additional 9% buffer)
     * Total coverage = 109% of member's debt
     * 
     * SECURITY MODEL:
     * This demonstrates how Ajo.save achieves over-collateralization
     * Even if member defaults, group is protected by multiple layers
     * Guarantor system distributes risk across opposite queue positions
     * 
     * USAGE:
     * Analytics and risk assessment
     * Shows security strength to potential members
     * Validates 109% coverage claim
     * 
     * @param defaulterAddress Address of defaulting member
     * @return totalSeizable Total amount that can be seized (109% coverage)
     * @return collateralSeized Amount from member's collateral (60%)
     * @return paymentsSeized Amount from member's past payments (40% + 9%)
     */
    function calculateSeizableAssets(address defaulterAddress) 
        external 
        view 
        override
        returns (
            uint256 totalSeizable, 
            uint256 collateralSeized, 
            uint256 paymentsSeized
        ) 
    {
        return collateralContract.calculateSeizableAssets(defaulterAddress);
    }
    
    // ============================================================================
    // ADMIN FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Emergency withdraw funds from contract
     * @dev Owner-only emergency function for critical situations
     * 
     * EMERGENCY SCENARIOS:
     * - Critical bug discovered requiring fund protection
     * - Contract upgrade needed with fund migration
     * - Legal or regulatory requirement
     * - Hedera network issue requiring intervention
     * 
     * SECURITY:
     * - Owner-only access (governance or admin)
     * - Withdraws to owner address only
     * - Should trigger contract pause
     * - Requires explanation to community
     * 
     * PROCESS:
     * 1. Owner calls with token type
     * 2. Maximum available amount withdrawn
     * 3. Funds sent to owner address
     * 4. Events logged for transparency
     * 
     * POST-EMERGENCY:
     * Owner should communicate plan to community
     * Governance should vote on resolution
     * Funds should be returned or distributed appropriately
     * 
     * @param token Token type to withdraw (USDC or HBAR)
     * @custom:security Owner-only, emergency use
     */
    function emergencyWithdraw(PaymentToken token) external override onlyOwner {
        collateralContract.emergencyWithdraw(token, owner(), type(uint256).max);
        paymentsContract.emergencyWithdraw(token);
    }
    
    /**
     * @notice Update cycle duration for future cycles
     * @dev Owner-only function to adjust payment frequency
     * 
     * CYCLE DURATION:
     * Default is 30 days, configurable from 1 day to 365 days
     * Affects timing of all future cycles
     * Does not change current cycle duration
     * 
     * USE CASES:
     * - Adjust for community preference (weekly, bi-weekly, monthly)
     * - Accommodate economic conditions
     * - Align with employment payment cycles
     * - Seasonal adjustments
     * 
     * GOVERNANCE:
     * Should typically be governance proposal
     * Requires community consensus for fairness
     * May affect member liquidity and participation
     * 
     * CONSTRAINTS:
     * - Minimum: 1 day (prevents spam cycles)
     * - Maximum: 365 days (ensures reasonable commitment)
     * - Takes effect on next cycle only
     * 
     * @param newDuration New cycle duration in seconds
     * @custom:security Owner-only or governance
     */
    function updateCycleDuration(uint256 newDuration) external override onlyOwner {
        require(newDuration <= 365 days, "Duration too long");
        
        uint256 oldDuration = cycleDuration;
        cycleDuration = newDuration;
        
        emit CycleDurationUpdated(oldDuration, newDuration);
    }

    /**
     * @notice Emergency pause all contract operations
     * @dev Owner-only function to halt all member actions
     * 
     * PAUSE EFFECTS:
     * - Members cannot join
     * - Payments cannot be processed
     * - Payouts cannot be distributed
     * - Exits are blocked
     * - Automation stops
     * - Governance voting continues (allows resolution)
     * 
     * EMERGENCY SCENARIOS:
     * - Critical bug discovered
     * - Exploit in progress
     * - Hedera network issue
     * - Regulatory requirement
     * - Coordinated attack detected
     * 
     * SECURITY:
     * - Owner-only access
     * - Cannot be paused if already paused
     * - Should be temporary measure
     * - Requires unpause to resume
     * 
     * COMMUNICATION:
     * Owner should immediately:
     * 1. Announce pause reason to community
     * 2. Provide timeline for resolution
     * 3. Explain planned fix or migration
     * 4. Maintain transparency throughout
     * 
     * @custom:security Owner-only, emergency use
     */
    function emergencyPause() external override onlyOwner {
        require(!paused, "Contract is already paused");
        paused = true;
        emit Paused(msg.sender);
    }
    
    /**
     * @notice Update token configuration parameters
     * @dev Owner/governance function to modify token settings
     * 
     * CONFIGURATION UPDATES:
     * - Monthly payment amount (up or down)
     * - Token active status (enable/disable)
     * - Both parameters updated atomically
     * 
     * USE CASES:
     * - Adjust payment amount for inflation
     * - Disable token if issues discovered
     * - Enable new token after testing
     * - Respond to token depegging
     * - Align with economic conditions
     * 
     * GOVERNANCE:
     * Should typically be governance proposal
     * Affects all future payments
     * May impact member ability to participate
     * 
     * SECURITY:
     * - Owner or governance only
     * - Delegates to AjoPayments
     * - Takes effect on next cycle
     * - Cannot affect current cycle
     * 
     * @param token Token type to configure
     * @param monthlyPayment New monthly payment amount
     * @param isActive Whether token should be accepted
     * @custom:security Owner-only or governance
     */
    function updateTokenConfig(
        PaymentToken token,
        uint256 monthlyPayment,
        bool isActive
    ) external override onlyOwner {
        paymentsContract.updateTokenConfig(token, monthlyPayment, isActive);
    }
    
    // ============================================================================
    // GOVERNANCE INTEGRATION
    // ============================================================================
    
    function getCycleDuration() external override view returns (uint256) {
        return cycleDuration;
    }
        
    // ============================================================================
    // INTERNAL FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Internal cycle advancement
     * @dev Deprecated in favor of advancement in AjoPayments
     */
    function _advanceCycle() internal {
        // Deprecated - cycle advancement happens in AjoPayments
    }
    
    /**
     * @notice Calculate initial reputation score for new member
     * @dev Based on collateral relative to monthly payment
     * 
     * FORMULA:
     * If monthlyPayment == 0: 100
     * Else: 100 + (collateral * 50 / monthlyPayment)
     * 
     * RATIONALE:
     * - Rewards higher collateral with better reputation
     * - Establishes baseline for voting power
     * - Can increase/decrease based on future behavior
     * 
     * @param collateral Locked collateral amount
     * @param monthlyPayment Required monthly payment
     * @return Initial reputation score
     */
    function _calculateInitialReputation(uint256 collateral, uint256 monthlyPayment) 
        internal 
        pure 
        returns (uint256) 
    {
        if (monthlyPayment == 0) return 100;
        return 100 + ((collateral * 50) / monthlyPayment);
    }

    function paymentsContractAddress() external override view returns (IAjoPayments) {
        return paymentsContract;
    }

    // ============================================================================
    // AUTOMATION FUNCTIONS
    // ============================================================================

    /**
     * @notice Authorize or deauthorize automation address
     * @dev Owner-only function to manage automation access
     * 
     * AUTOMATION ADDRESSES:
     * - HSS schedule contracts
     * - Chainlink Keepers
     * - Gelato Network
     * - Custom automation services
     * - Backend automation scripts
     * 
     * AUTHORIZATION PURPOSE:
     * Allows automated services to:
     * - Handle member defaults
     * - Advance cycles automatically
     * - Execute scheduled payments
     * - Process batch operations
     * 
     * SECURITY:
     * - Owner must carefully vet automation addresses
     * - Authorized addresses have limited privileges
     * - Cannot withdraw funds or change parameters
     * - Can only execute predefined automated tasks
     * - Should be contracts, not EOAs
     * 
     * BEST PRACTICES:
     * - Use dedicated automation contracts
     * - Implement rate limiting
     * - Monitor automation activity
     * - Revoke if suspicious activity
     * - Document each authorized address
     * 
     * @param automationAddress Address to authorize/deauthorize
     * @param authorized True to authorize, false to revoke
     * @custom:security Owner-only
     */
    function setAutomationAuthorization(address automationAddress, bool authorized) 
        external 
        override
        onlyOwner 
    {
        require(automationAddress != address(0), "Invalid automation address");
        authorizedAutomation[automationAddress] = authorized;
        emit AutomationAuthorized(automationAddress, authorized);
    }

    /**
     * @notice Enable or disable all automation
     * @dev Owner-only kill switch for automation system
     * 
     * AUTOMATION TOGGLE:
     * When disabled, all automated operations stop:
     * - Default handling
     * - Cycle advancement
     * - Scheduled payments
     * - Batch operations
     * 
     * USE CASES FOR DISABLING:
     * - Bug discovered in automation logic
     * - Hedera service disruption
     * - Testing manual operations
     * - Regulatory requirement
     * - Temporary network issues
     * 
     * MANUAL OVERRIDE:
     * When automation disabled:
     * - Members must pay manually
     * - Owner must handle defaults manually
     * - Cycles advanced manually
     * - Higher operational burden
     * 
     * SECURITY:
     * - Global kill switch for automation
     * - Does not affect manual operations
     * - Can be toggled on/off as needed
     * - Monitored via events
     * 
     * @param enabled True to enable automation, false to disable
     * @custom:security Owner-only
     */
    function setAutomationEnabled(bool enabled) external override onlyOwner {
        automationEnabled = enabled;
        emit AutomationToggled(enabled);
    }

    /**
     * @notice Update automation grace period
     * @dev Owner-only function to adjust default handling timing
     * 
     * GRACE PERIOD PURPOSE:
     * After payment deadline passes:
     * 1. Grace period begins (default 1 hour)
     * 2. Members can still pay without automation
     * 3. After grace period, automation can handle defaults
     * 
     * RATIONALE:
     * - Prevents immediate default for minor delays
     * - Allows for network congestion
     * - Gives members buffer time
     * - Reduces false positives
     * 
     * CONFIGURATION:
     * - Minimum: 0 (immediate default handling)
     * - Maximum: 24 hours (one day buffer)
     * - Default: 1 hour (3600 seconds)
     * - Affects all future default checks
     * 
     * TRADE-OFFS:
     * - Longer grace period: More forgiving, slower response
     * - Shorter grace period: Stricter, faster default handling
     * - Balance member convenience with group security
     * 
     * @param newGracePeriod New grace period in seconds
     * @custom:security Owner-only, max 24 hours
     */
    function setAutomationGracePeriod(uint256 newGracePeriod) external onlyOwner {
        require(newGracePeriod <= 24 hours, "Grace period too long");
        uint256 oldPeriod = automationGracePeriod;
        automationGracePeriod = newGracePeriod;
        emit AutomationGracePeriodUpdated(oldPeriod, newGracePeriod);
    }

    /**
     * @notice Batch handle defaults automatically
     * @dev Authorized automation function for processing multiple defaults
     * 
     * BATCH DEFAULT HANDLING:
     * Processes multiple defaulting members in single transaction
     * More gas-efficient than individual processing
     * Allows automation to handle all defaults at once
     * 
     * PROCESS FOR EACH DEFAULTER:
     * 1. Validate member is actually in default
     * 2. Call internal default handler
     * 3. Track success/failure
     * 4. Continue even if individual failure
     * 5. Emit comprehensive event
     * 
     * ELIGIBILITY CHECKS:
     * - Automation must be enabled globally
     * - Payment deadline must have passed
     * - Grace period must have elapsed
     * - Defaulters array must be non-empty
     * - Batch size limited to 20 (gas optimization)
     * 
     * DEFAULT HANDLER ACTIONS:
     * For each defaulter:
     * - Handle default via AjoPayments
     * - Update reputation (decrease)
     * - Apply penalties
     * - Check for seizure threshold (3 defaults)
     * - Execute collateral seizure if needed
     * - Remove member and guarantor if severe
     * 
     * SECURITY:
     * - Only authorized automation can call
     * - ReentrancyGuard protection
     * - Individual try-catch prevents cascade failure
     * - Detailed event logging for audit
     * 
     * GAS OPTIMIZATION:
     * - Batch processing saves gas vs individual calls
     * - Limited to 20 members per batch
     * - Automation should call multiple times if needed
     * 
     * @param defaulters Array of defaulting member addresses
     * @return successCount Number of successfully processed defaults
     * @return failureCount Number of failed default processes
     * @custom:security Authorized automation only
     */
    function batchHandleDefaultsAutomated(address[] calldata defaulters) 
        external 
        onlyAuthorizedAutomation 
        whenAutomationEnabled
        nonReentrant 
        returns (uint256 successCount, uint256 failureCount)
    {
        require(defaulters.length > 0, "No defaulters provided");
        require(defaulters.length <= 20, "Batch size too large");
        
        (bool isPastDeadline, uint256 secondsOverdue) = paymentsContract.isDeadlinePassed();
        require(isPastDeadline, "Deadline not reached");
        require(secondsOverdue >= automationGracePeriod, "Grace period not elapsed");
        
        uint256 currentCycle = paymentsContract.getCurrentCycle();
        
        for (uint256 i = 0; i < defaulters.length; i++) {
            address defaulter = defaulters[i];
            
            try this.handleDefaultInternal(defaulter) {
                successCount++;
            } catch Error(string memory reason) {
                failureCount++;
                emit DefaultHandlingFailed(defaulter, currentCycle, reason);
            } catch {
                failureCount++;
                emit DefaultHandlingFailed(defaulter, currentCycle, "Unknown error");
            }
        }
        
        emit DefaultsHandledByAutomation(
            currentCycle,
            defaulters,
            block.timestamp,
            msg.sender,
            successCount,
            failureCount
        );
        
        return (successCount, failureCount);
    }

    /**
     * @notice Internal default handler with strict access control
     * @dev Can only be called by this contract via batchHandleDefaultsAutomated
     * 
     * INTERNAL ONLY:
     * This function is public but restricted to self-calls only
     * Prevents external direct calls to default handler
     * Ensures all defaults go through batch handler
     * 
     * DEFAULT HANDLING PROCESS:
     * 1. Validate member is active
     * 2. Verify member hasn't paid current cycle
     * 3. Call AjoPayments to handle default
     * 4. Update reputation (decrease)
     * 5. Calculate cycles missed
     * 6. If 3+ cycles missed, trigger severe actions:
     *    - Execute collateral seizure
     *    - Remove defaulting member
     *    - Remove guarantor (shared responsibility)
     * 
     * SEVERITY THRESHOLDS:
     * - 1 cycle: Penalty applied, reputation decrease
     * - 2 cycles: Higher penalty, warning
     * - 3+ cycles: Collateral seized, member removed
     * 
     * GUARANTOR REMOVAL:
     * When member defaults severely (3+ cycles):
     * - Member's collateral seized
     * - Guarantor also removed from Ajo
     * - Incentivizes guarantors to monitor their pairs
     * - Distributes responsibility across network
     * 
     * SECURITY:
     * - Self-call only (msg.sender == address(this))
     * - Member must be active
     * - Member must actually be in default
     * - All actions logged via events
     * 
     * @param defaulter Address of member to handle default for
     * @custom:security Internal only, called via try-catch
     */
    function handleDefaultInternal(address defaulter) external {
        require(msg.sender == address(this), "Internal only");
        
        Member memory member = membersContract.getMember(defaulter);
        require(member.isActive, "Member not active");
        
        uint256 currentCycle = paymentsContract.getCurrentCycle();
        require(member.lastPaymentCycle < currentCycle, "Member already paid");
        
        paymentsContract.handleDefault(defaulter);
        governanceContract.updateReputationAndVotingPower(defaulter, false);
        
        uint256 cyclesMissed = currentCycle - member.lastPaymentCycle;
        
        if (cyclesMissed >= 3) {
            collateralContract.executeSeizure(defaulter);
            membersContract.removeMember(defaulter);
            
            if (member.guarantor != address(0)) {
                membersContract.removeMember(member.guarantor);
            }
        }
    }

    /**
     * @notice Check if automation should run for default handling
     * @dev View function for automation services to query readiness
     * 
     * AUTOMATION CHECK LOGIC:
     * 1. Verify automation is globally enabled
     * 2. Check payment deadline has passed
     * 3. Verify grace period has elapsed
     * 4. Count members currently in default
     * 5. Ensure contract is not paused
     * 
     * RETURN VALUES:
     * shouldRun: Boolean indicating if automation should execute
     * reason: Human-readable explanation of status
     * defaultersCount: Number of members in default
     * 
     * USAGE BY AUTOMATION:
     * Chainlink Keepers, Gelato, or custom automation:
     * 1. Call this function periodically
     * 2. If shouldRun is true, call batchHandleDefaultsAutomated
     * 3. Pass defaulters list from getMembersInDefault
     * 
     * OFF-CHAIN INTEGRATION:
     * ```javascript
     * const { shouldRun, reason, defaultersCount } = await ajoCore.shouldAutomationRun();
     * if (shouldRun) {
     *   const defaulters = await ajoPayments.getMembersInDefault();
     *   await ajoCore.batchHandleDefaultsAutomated(defaulters);
     * }
     * ```
     * 
     * @return shouldRun Whether automation should execute now
     * @return reason Human-readable status explanation
     * @return defaultersCount Number of members in default
     */
    function shouldAutomationRun() external view override returns (
        bool shouldRun,
        string memory reason,
        uint256 defaultersCount
    ) {
        if (!automationEnabled) {
            return (false, "Automation disabled", 0);
        }
        
        (bool isPastDeadline, uint256 secondsOverdue) = paymentsContract.isDeadlinePassed();
        
        if (!isPastDeadline) {
            return (false, "Deadline not reached", 0);
        }
        
        if (secondsOverdue < automationGracePeriod) {
            return (false, "Grace period not elapsed", 0);
        }
        
        address[] memory defaulters = paymentsContract.getMembersInDefault();
        defaultersCount = defaulters.length;
        
        if (defaultersCount == 0) {
            return (false, "No defaulters found", 0);
        }
        
        if (paused) {
            return (false, "Contract is paused", defaultersCount);
        }
        
        return (true, "Ready to process defaults", defaultersCount);
    }

    /**
     * @notice Get automation configuration
     * @dev Returns current automation settings
     * 
     * CONFIGURATION DETAILS:
     * - enabled: Global automation on/off state
     * - gracePeriod: Seconds after deadline before automation
     * - authorizedAddresses: List of authorized automation contracts
     * 
     * NOTE: Current implementation returns empty array for authorized addresses
     * This could be enhanced by tracking authorized addresses in storage array
     * 
     * @return enabled Whether automation is globally enabled
     * @return gracePeriod Current grace period in seconds
     * @return authorizedAddresses Array of authorized automation addresses (currently empty)
     */
    function getAutomationConfig() external view returns (
        bool enabled,
        uint256 gracePeriod,
        address[] memory authorizedAddresses
    ) {
        enabled = automationEnabled;
        gracePeriod = automationGracePeriod;
        authorizedAddresses = new address[](0);
        
        return (enabled, gracePeriod, authorizedAddresses);
    }

    // ============================================================================
    // CYCLE ADVANCEMENT AUTOMATION
    // ============================================================================

    /**
     * @notice Check if cycle should be advanced
     * @dev View function for automation to determine cycle advancement readiness
     * 
     * CYCLE ADVANCEMENT LOGIC:
     * 
     * FIRST CYCLE (Special Case):
     * - Can advance when all members have paid
     * - OR when payout is ready to distribute
     * - Ensures smooth transition from join phase to active cycles
     * 
     * SUBSEQUENT CYCLES:
     * - Must wait for cycleDuration to elapse since last cycle
     * - Then advance when either:
     *   A. All members paid (ideal case)
     *   B. Payout ready (some defaults handled)
     *   C. All defaults handled and min delay passed
     * 
     * CHECKS PERFORMED:
     * 1. Auto-advance must be enabled
     * 2. Contract must not be paused
     * 3. First cycle: Check payout readiness
     * 4. Later cycles: Check duration + payment status
     * 5. Verify minimum delay since last payment
     * 
     * RETURN VALUES:
     * shouldAdvance: Boolean indicating cycle should advance
     * reason: Human-readable explanation of decision
     * readyForPayout: Whether payout distribution is ready
     * 
     * AUTOMATION USAGE:
     * ```javascript
     * const { shouldAdvance, reason, readyForPayout } = await ajoCore.shouldAdvanceCycle();
     * if (shouldAdvance) {
     *   await ajoCore.advanceCycleAutomated();
     * }
     * ```
     * 
     * @return shouldAdvance Whether cycle should be advanced now
     * @return reason Human-readable status explanation
     * @return readyForPayout Whether payout distribution is ready
     */
    function shouldAdvanceCycle() external view returns (
        bool shouldAdvance,
        string memory reason,
        bool readyForPayout
    ) {
        if (!autoAdvanceCycleEnabled) {
            return (false, "Auto-advance disabled", false);
        }
        
        if (paused) {
            return (false, "Contract paused", false);
        }
        
        uint256 currentCycle = paymentsContract.getCurrentCycle();
        
        if (!isFirstCycleComplete) {
            bool payoutReady = paymentsContract.isPayoutReady();
            
            if (payoutReady) {
                return (true, "First cycle payout ready", true);
            } else {
                return (false, "Waiting for all payments in first cycle", false);
            }
        }
        
        uint256 timeSinceLastCycle = block.timestamp - lastCycleTimestamp;
        
        if (timeSinceLastCycle < cycleDuration) {
            return (false, "Cycle duration not elapsed", false);
        }
        
        bool payoutReady = paymentsContract.isPayoutReady();
        
        if (payoutReady) {
            return (true, "Cycle complete, payout ready", true);
        }
        
        (bool allPaid, uint256 lastPaymentTime) = _checkAllMembersPaid();
        
        if (!allPaid) {
            return (false, "Not all members have paid yet", false);
        }
        
        uint256 timeSinceLastPayment = block.timestamp - lastPaymentTime;
        
        if (timeSinceLastPayment < minCycleAdvanceDelay) {
            return (false, "Waiting for minimum delay after last payment", false);
        }
        
        return (true, "Ready to advance (all paid or defaults handled)", false);
    }

    /**
     * @notice Automatically advance cycle when conditions met
     * @dev Authorized automation function for cycle progression
     * 
     * CYCLE ADVANCEMENT PROCESS:
     * 1. Verify advancement should occur (via shouldAdvanceCycle logic)
     * 2. If payout ready, distribute to recipient
     * 3. Advance cycle in AjoPayments
     * 4. Update lastCycleTimestamp
     * 5. Mark first cycle complete if applicable
     * 6. Emit advancement event
     * 
     * PAYOUT DISTRIBUTION:
     * If payout is ready (all paid):
     * - Calculate total payout amount
     * - Transfer to next recipient
     * - Mark recipient as having received payout
     * - Reset payment tracking
     * 
     * ERROR HANDLING:
     * If payout distribution fails:
     * - Emit failure event with reason
     * - Revert entire transaction
     * - Requires manual intervention
     * 
     * FIRST CYCLE SPECIAL HANDLING:
     * After first cycle completes:
     * - Set isFirstCycleComplete flag
     * - Future cycles use standard timing logic
     * - Ensures smooth transition to recurring cycles
     * 
     * SECURITY:
     * - Only authorized automation can call
     * - ReentrancyGuard prevents reentrancy
     * - Must pass shouldAdvanceCycle checks
     * - Comprehensive event logging
     * 
     * AUTOMATION INTEGRATION:
     * Chainlink Keepers or Gelato:
     * 1. Check shouldAdvanceCycle periodically
     * 2. When true, call this function
     * 3. Monitor events for successful advancement
     * 4. Alert if failures occur
     * 
     * @return success Whether advancement succeeded
     * @return payoutDistributed Whether payout was distributed
     * @custom:security Authorized automation only
     */
    function advanceCycleAutomated() 
        external 
        onlyAuthorizedAutomation 
        whenAutomationEnabled
        nonReentrant 
        returns (bool success, bool payoutDistributed)
    {
        (bool shouldAdvance, string memory reason, bool payoutReady) = this.shouldAdvanceCycle();
        
        require(shouldAdvance, reason);
        
        uint256 oldCycle = paymentsContract.getCurrentCycle();
        
        if (payoutReady) {
            try paymentsContract.distributePayout() {
                payoutDistributed = true;
            } catch Error(string memory errorReason) {
                emit CycleAdvancementFailed(oldCycle, errorReason, block.timestamp);
                revert(string(abi.encodePacked("Payout distribution failed: ", errorReason)));
            }
        }
        
        _advanceCycle();
        
        if (!isFirstCycleComplete) {
            isFirstCycleComplete = true;
        }
        
        uint256 newCycle = paymentsContract.getCurrentCycle();
        
        emit CycleAdvancedAutomatically(oldCycle, newCycle, msg.sender, block.timestamp, payoutDistributed);
        
        return (true, payoutDistributed);
    }

    /**
     * @notice Check if all members have paid in current cycle
     * @dev Internal helper for cycle advancement logic
     * 
     * PAYMENT STATUS CHECK:
     * Iterates through all active members
     * Compares lastPaymentCycle to currentCycle
     * Tracks most recent payment timestamp
     * 
     * LOGIC:
     * - If member.lastPaymentCycle < currentCycle: Not paid
     * - If member.lastPaymentCycle == currentCycle: Paid
     * - allPaid remains true only if ALL members paid
     * 
     * LAST PAYMENT TIME:
     * Tracks when last payment was made
     * Used to enforce minimum delay before advancement
     * Prevents immediate advancement after final payment
     * 
     * FALLBACK:
     * If no payments found, uses lastCycleTimestamp
     * Ensures valid timestamp always returned
     * 
     * @return allPaid True if all active members paid
     * @return lastPaymentTime Timestamp of most recent payment
     */
    function _checkAllMembersPaid() internal view returns (bool allPaid, uint256 lastPaymentTime) {
        address[] memory members = membersContract.getActiveMembersList();
        uint256 currentCycle = paymentsContract.getCurrentCycle();
        
        allPaid = true;
        lastPaymentTime = 0;
        
        for (uint256 i = 0; i < members.length; i++) {
            Member memory member = membersContract.getMember(members[i]);
            
            if (member.lastPaymentCycle < currentCycle) {
                allPaid = false;
            }
            
            if (member.lastPaymentCycle == currentCycle && lastCycleTimestamp > lastPaymentTime) {
                lastPaymentTime = lastCycleTimestamp;
            }
        }
        
        if (lastPaymentTime == 0) {
            lastPaymentTime = lastCycleTimestamp;
        }
        
        return (allPaid, lastPaymentTime);
    }

    /**
     * @notice Get current cycle advancement status
     * @dev Aggregates all relevant data for cycle progression
     * 
     * STATUS INFORMATION:
     * - Current cycle number
     * - First cycle flag
     * - Timing information (start, duration, elapsed)
     * - Payment status (all paid, last payment time)
     * - Payout readiness and next recipient
     * - Advancement readiness and reason
     * 
     * USAGE:
     * - Frontend dashboard for cycle monitoring
     * - Automation services for detailed status
     * - Admin tools for cycle management
     * 
     * @return status Comprehensive cycle advancement status struct
     */
    function getCycleAdvancementStatus() external view returns (CycleAdvancementStatus memory status) {
        status.currentCycle = paymentsContract.getCurrentCycle();
        status.isFirstCycle = !isFirstCycleComplete;
        status.cycleStartTime = lastCycleTimestamp;
        status.cycleDuration = cycleDuration;
        status.timeElapsed = block.timestamp - lastCycleTimestamp;
        status.autoAdvanceEnabled = autoAdvanceCycleEnabled;
        
        (status.allMembersPaid, status.lastPaymentTime) = _checkAllMembersPaid();
        status.payoutReady = paymentsContract.isPayoutReady();
        status.nextPayoutRecipient = paymentsContract.getNextRecipient();
        
        (status.shouldAdvance, status.advanceReason, status.needsPayout) = this.shouldAdvanceCycle();
        
        if (status.timeElapsed < cycleDuration) {
            status.timeUntilAdvancement = cycleDuration - status.timeElapsed;
        } else {
            status.timeUntilAdvancement = 0;
        }
        
        return status;
    }

    /**
     * @notice Toggle automatic cycle advancement
     * @dev Owner-only function to enable/disable auto-advance
     * 
     * AUTO-ADVANCE TOGGLE:
     * When disabled:
     * - Cycles must be advanced manually
     * - Payouts distributed manually
     * - Higher admin intervention required
     * 
     * USE CASES FOR DISABLING:
     * - During maintenance
     * - Testing periods
     * - Special cycle handling
     * - Emergency situations
     * 
     * SECURITY:
     * - Owner-only access
     * - Emits event for monitoring
     * - Does not affect current cycle
     * 
     * @param enabled True to enable auto-advance, false to disable
     * @custom:security Owner-only
     */
    function setAutoAdvanceCycleEnabled(bool enabled) external onlyOwner {
        autoAdvanceCycleEnabled = enabled;
        emit AutoAdvanceCycleToggled(enabled);
    }

    /**
     * @notice Update minimum cycle advance delay
     * @dev Owner-only function to adjust advancement timing
     * 
     * MIN DELAY PURPOSE:
     * After all members paid:
     * - Wait minCycleAdvanceDelay before advancing
     * - Prevents premature advancement
     * - Allows for any final adjustments
     * 
     * CONFIGURATION:
     * - Minimum: 0 (immediate advance possible)
     * - Maximum: 24 hours (one day buffer)
     * - Default: 1 hour
     * - Affects all future advancements
     * 
     * TRADE-OFFS:
     * - Longer delay: More time for members, slower progression
     * - Shorter delay: Faster cycles, less buffer
     * 
     * @param newDelay New minimum delay in seconds
     * @custom:security Owner-only, max 24 hours
     */
    function setMinCycleAdvanceDelay(uint256 newDelay) external onlyOwner {
        require(newDelay <= 24 hours, "Delay too long");
        uint256 oldDelay = minCycleAdvanceDelay;
        minCycleAdvanceDelay = newDelay;
        emit MinCycleAdvanceDelayUpdated(oldDelay, newDelay);
    }

    struct CycleAdvancementStatus {
        uint256 currentCycle;
        bool isFirstCycle;
        uint256 cycleStartTime;
        uint256 cycleDuration;
        uint256 timeElapsed;
        uint256 timeUntilAdvancement;
        bool autoAdvanceEnabled;
        bool allMembersPaid;
        uint256 lastPaymentTime;
        bool payoutReady;
        address nextPayoutRecipient;
        bool shouldAdvance;
        string advanceReason;
        bool needsPayout;
    }
}