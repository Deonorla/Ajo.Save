// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/AjoInterfaces.sol";
import "../core/LockableContract.sol";

/**
 * @title AjoCollateral
 * @notice Handles collateral management for Ajo savings groups
 * @dev Implements collateral locking, seizure, and calculation logic
 *
 * ARCHITECTURE OVERVIEW:
 * AjoCollateral manages the financial security deposits (collateral) for Ajo participants.
 * It integrates with AjoCore and AjoMembers to enforce payment obligations through
 * collateral requirements based on queue positions.
 *
 * KEY FEATURES:
 * - Position-based Collateral Calculation: Higher positions require more collateral
 * - Guarantor System: Circular guarantor assignment for mutual accountability
 * - Token Support: Handles USDC and HBAR tokens
 * - Seizure Mechanism: Automated collateral and payment seizure on default
 * - Reputation Integration: Initial reputation based on collateral commitment
 *
 * COLLATERAL MODEL:
 * - Required Collateral = (Potential Debt * 60%)
 * - Potential Debt = Payout - (Position * Monthly Payment)
 * - Guarantor Offset = Total Participants / 2
 * - Seizure: Defaulter + Guarantor collateral + past payments
 *
 * INTEGRATION POINTS:
 * - AjoCore: Orchestrates calls to lock/unlock/seize
 * - AjoMembers: Retrieves member data and positions
 * - AjoPayments: Receives seized funds
 *
 * SECURITY MODEL:
 * - Only AjoCore can perform sensitive operations
 * - Initializable proxy pattern for upgrades
 * - Ownable with setup phase locking
 * - Emergency withdrawal restricted to AjoCore
 *
 * @author Ajo.save Protocol Team
 * @custom:security-contact security@ajo.save
 */
contract AjoCollateral is IAjoCollateral, Ownable, Initializable, LockableContract {
    
    // ============================================================================
    // CONSTANTS
    // ============================================================================
    
    /**
     * @notice Collateral requirement factor (60%)
     * @dev Accounts for partial coverage from past payment seizures
     */
    uint256 public constant COLLATERAL_FACTOR = 60; // 60% collateral factor
    
    /**
     * @notice Divisor for guarantor position offset
     * @dev Creates circular guarantor relationships
     */
    uint256 public constant GUARANTOR_OFFSET_DIVISOR = 2; // Guarantor is participants/2 positions away
    
    // ============================================================================
    // STATE VARIABLES - TOKEN CONFIGURATION
    // ============================================================================
    
    /**
     * @notice USDC token contract interface
     * @dev Handles USDC collateral operations
     */
    IERC20 public USDC;
    
    /**
     * @notice HBAR token contract interface
     * @dev Handles HBAR collateral operations
     */
    IERC20 public HBAR;
    
    /**
     * @notice Address of the AjoCore contract
     * @dev Central orchestrator - only caller for sensitive functions
     */
    address public ajoCore;
    
    /**
     * @notice Interface to AjoMembers contract
     * @dev Used for member data and position queries
     */
    IAjoMembers public membersContract;
    
    /**
     * @notice Tracks collateral balances per token per member
     * @dev Mapping: token => member => balance
     */
    mapping(PaymentToken => mapping(address => uint256)) public tokenBalances;
    
    // ============================================================================
    // EVENTS
    // ============================================================================
    
    /**
     * @notice Emitted when collateral is locked
     * @param member Member address
     * @param amount Amount locked
     * @param token Token type
     */
    event CollateralLocked(address indexed member, uint256 amount, PaymentToken token);
    
    /**
     * @notice Emitted when collateral is unlocked
     * @param member Member address
     * @param amount Amount unlocked
     * @param token Token type
     */
    event CollateralUnlocked(address indexed member, uint256 amount, PaymentToken token);
    
    /**
     * @notice Emitted when AjoCore address is updated
     * @param oldCore Previous address
     * @param newCore New address
     */
    event AjoCoreUpdated(address indexed oldCore, address indexed newCore);
    
    // ============================================================================
    // MODIFIERS
    // ============================================================================
    
    /**
     * @notice Restricts access to AjoCore contract
     * @dev Ensures only orchestrator can call
     */
    modifier onlyAjoCore() {
        require(msg.sender == ajoCore, "Only AjoCore");
        _;
    }
    
    // ============================================================================
    // CONSTRUCTOR (for master copy)
    // ============================================================================
    
    /**
     * @notice Master copy constructor
     * @dev Disables initializers and sets dummy owner
     */
    constructor() {
        // Disable initializers on the master copy
        _disableInitializers();
        _transferOwnership(address(1));
    }
    
    // ============================================================================
    // INITIALIZER (for proxy instances)
    // ============================================================================
    
    /**
     * @notice Initializes proxy instance
     * @dev Sets up tokens and dependencies
     *
     * VALIDATION:
     * - All addresses non-zero
     *
     * @param _usdc USDC token address
     * @param _hbar HBAR token address
     * @param _ajoCore AjoCore address
     * @param _ajoMembers AjoMembers address
     */
    function initialize(
        address _usdc,
        address _hbar,
        address _ajoCore,
        address _ajoMembers
    ) external override initializer {
        require(_usdc != address(0), "Invalid USDC address");
        require(_hbar != address(0), "Invalid HBAR address");
        require(_ajoCore != address(0), "Invalid AjoCore address");
        require(_ajoMembers != address(0), "Invalid AjoMembers address");
        
        _transferOwnership(msg.sender);
        
        USDC = IERC20(_usdc);
        HBAR = IERC20(_hbar);
        ajoCore = _ajoCore;
        membersContract = IAjoMembers(_ajoMembers);
    }
    
    /**
     * @notice Updates AjoCore address during setup
     * @dev Only callable by owner in setup phase
     *
     * VALIDATION:
     * - Non-zero address
     * - Different from current
     *
     * @param _ajoCore New AjoCore address
     * @custom:emits AjoCoreUpdated
     */
    function setAjoCore(address _ajoCore) external onlyOwner onlyDuringSetup {
        require(_ajoCore != address(0), "Cannot set zero address");
        require(_ajoCore != ajoCore, "Already set to this address");
        
        address oldCore = ajoCore;
        ajoCore = _ajoCore;
        
        emit AjoCoreUpdated(oldCore, _ajoCore);
    }
    
    /**
     * @notice Verifies contract setup
     * @dev Checks AjoCore is set
     *
     * @return isValid Setup validity
     * @return reason Failure reason if invalid
     */
    function verifySetup() external view override returns (bool isValid, string memory reason) {
        if (ajoCore == address(0)) {
            return (false, "AjoCore not set");
        }
        return (true, "Setup is valid");
    }

    // ============================================================================
    // COLLATERAL CALCULATION FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Calculates required collateral for position
     * @dev Formula: (Payout - Position * Monthly) * 60%
     *
     * RATIONALE:
     * - Early positions have higher potential debt
     * - 60% factor assumes 40% from past payments
     * - Last position: 0 collateral
     *
     * @param position 1-indexed queue position
     * @param monthlyPayment Payment amount
     * @param totalParticipants Total members
     * @return Required collateral
     */
    function calculateRequiredCollateral(
        uint256 position,
        uint256 monthlyPayment,
        uint256 totalParticipants
    ) public view override returns (uint256) {
        // Last person has no debt after payout, no collateral needed
        if (position >= totalParticipants) {
            return 0;
        }
        
        // Calculate potential debt: Payout - (position * monthlyPayment)
        uint256 payout = totalParticipants * monthlyPayment;
        uint256 potentialDebt = payout - (position * monthlyPayment);
        
        // Apply collateral factor (60% due to seizure of past payments)
        uint256 requiredCollateral = (potentialDebt * COLLATERAL_FACTOR) / 100;
        
        return requiredCollateral;
    }
    
    /**
     * @notice Calculates guarantor position
     * @dev Circular offset: position + (total/2) mod total
     *
     * SPECIAL CASES:
     * - Odd total: Last position has no guarantor
     * - Even total: Perfect pairing
     *
     * @param memberPosition Member's position
     * @param totalParticipants Total members
     * @return Guarantor position (0 if none)
     */
    function calculateGuarantorPosition(
        uint256 memberPosition,
        uint256 totalParticipants
    ) public pure override returns (uint256) {
        uint256 guarantorOffset = totalParticipants / GUARANTOR_OFFSET_DIVISOR;
        uint256 guarantorPosition = ((memberPosition - 1 + guarantorOffset) % totalParticipants) + 1;
        
        // For odd numbers, the last person has no guarantor relationship
        // They don't guarantee anyone, and no one guarantees them
        if (totalParticipants % 2 == 1) {
            // If calculating for the last position, return 0 (no guarantor)
            if (memberPosition == totalParticipants) {
                return 0;
            }
            // If the calculated guarantor would be the last position, return 0 instead
            if (guarantorPosition == totalParticipants) {
                return 0;
            }
        }
        
        return guarantorPosition;
    }
    
    /**
     * @notice Calculates total seizable assets
     * @dev Collateral + past payments from defaulter + guarantor
     *
     * @param defaulterAddress Defaulter address
     * @return totalSeizable Total seizable amount
     * @return collateralSeized Collateral portion
     * @return paymentsSeized Payments portion
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
        Member memory defaulter = membersContract.getMember(defaulterAddress);
        address guarantorAddr = defaulter.guarantor;
        
        if (guarantorAddr == address(0)) {
            return (0, 0, 0);
        }
        
        Member memory guarantor = membersContract.getMember(guarantorAddr);
        
        // 1. Calculate collateral seizure (both tokens, both parties)
        collateralSeized = tokenBalances[PaymentToken.USDC][defaulterAddress] + 
                          tokenBalances[PaymentToken.HBAR][defaulterAddress] +
                          tokenBalances[PaymentToken.USDC][guarantorAddr] + 
                          tokenBalances[PaymentToken.HBAR][guarantorAddr];
        
        // 2. Calculate past payments seizure
        paymentsSeized = 0;
        
        // Defaulter's past payments
        for (uint256 i = 0; i < defaulter.pastPayments.length; i++) {
            paymentsSeized += defaulter.pastPayments[i];
        }
        
        // Guarantor's past payments
        for (uint256 i = 0; i < guarantor.pastPayments.length; i++) {
            paymentsSeized += guarantor.pastPayments[i];
        }
        
        totalSeizable = collateralSeized + paymentsSeized;
    }
    
    // ============================================================================
    // COLLATERAL MANAGEMENT FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Locks member collateral
     * @dev Transfers from member to contract
     *
     * @param member Member address
     * @param amount Amount to lock
     * @param token Token type
     * @custom:emits CollateralLocked
     */
    function lockCollateral(address member, uint256 amount, PaymentToken token) external override onlyAjoCore {
        IERC20 tokenContract = token == PaymentToken.USDC ? USDC : HBAR;
        
        if (amount > 0) {
            tokenContract.transferFrom(member, address(this), amount);
            tokenBalances[token][member] += amount;
        }
        
        emit CollateralLocked(member, amount, token);
    }
    
    /**
     * @notice Unlocks member collateral
     * @dev Transfers back to member
     *
     * VALIDATION:
     * - Sufficient balance
     *
     * @param member Member address
     * @param amount Amount to unlock
     * @param token Token type
     * @custom:emits CollateralUnlocked
     */
    function unlockCollateral(address member, uint256 amount, PaymentToken token) external override onlyAjoCore {
        IERC20 tokenContract = token == PaymentToken.USDC ? USDC : HBAR;
        
        require(tokenBalances[token][member] >= amount, "Insufficient collateral balance");
        
        if (amount > 0) {
            tokenBalances[token][member] -= amount;
            tokenContract.transfer(member, amount);
        }
        
        emit CollateralUnlocked(member, amount, token);
    }
    
    /**
     * @notice Executes asset seizure on default
     * @dev Seizes collateral and records payments
     *
     * PROCESS:
     * 1. Get members
     * 2. Seize collaterals
     * 3. Transfer to payments
     * 4. Sum payments (accounting)
     * 5. Emit events
     *
     * @param defaulter Defaulter address
     * @custom:emits CollateralLiquidated
     * @custom:emits PaymentSeized
     * @custom:emits CollateralSeized
     */
    function executeSeizure(address defaulter) external override onlyAjoCore {
        Member memory defaulterMember = membersContract.getMember(defaulter);
        address guarantorAddr = defaulterMember.guarantor;
        
        if (guarantorAddr == address(0)) return; // No guarantor assigned yet
        
        Member memory guarantorMember = membersContract.getMember(guarantorAddr);
        
        // Determine which token is being used (both members use same token)
        PaymentToken activeToken = defaulterMember.preferredToken;
        IERC20 tokenContract = activeToken == PaymentToken.USDC ? USDC : HBAR;
        
        // 1. Seize defaulter's collateral
        uint256 defaulterCollateral = tokenBalances[activeToken][defaulter];
        tokenBalances[activeToken][defaulter] = 0;
        
        // 2. Seize guarantor's collateral  
        uint256 guarantorCollateral = tokenBalances[activeToken][guarantorAddr];
        tokenBalances[activeToken][guarantorAddr] = 0;
        
        // 3. Calculate total seized collateral
        uint256 totalSeizedCollateral = defaulterCollateral + guarantorCollateral;
        
        // 4. Transfer seized collateral to AjoPayments contract
        if (totalSeizedCollateral > 0) {
            address paymentsContract = address(IAjoCore(ajoCore).paymentsContractAddress());
            tokenContract.transfer(paymentsContract, totalSeizedCollateral);
        }
        
        // 5. Calculate seized payments (for accounting/events only)
        uint256 defaulterPayments = 0;
        uint256 guarantorPayments = 0;
        
        // Sum defaulter's past payments
        for (uint256 i = 0; i < defaulterMember.pastPayments.length; i++) {
            defaulterPayments += defaulterMember.pastPayments[i];
        }
        
        // Sum guarantor's past payments  
        for (uint256 i = 0; i < guarantorMember.pastPayments.length; i++) {
            guarantorPayments += guarantorMember.pastPayments[i];
        }
        
        // 6. Emit liquidation events
        if (defaulterCollateral > 0) {
            emit CollateralLiquidated(defaulter, defaulterCollateral, activeToken);
        }
        if (guarantorCollateral > 0) {
            emit CollateralLiquidated(guarantorAddr, guarantorCollateral, activeToken);
        }
        
        // Emit payment seizure events (accounting only)
        emit PaymentSeized(defaulter, defaulterPayments, "Defaulter past payments seized");
        emit PaymentSeized(guarantorAddr, guarantorPayments, "Guarantor past payments seized");
        
        // Optional: Emit total seizure summary event
        emit CollateralSeized(defaulter, guarantorAddr, totalSeizedCollateral, activeToken);
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Gets member's collateral balance
     * @param member Member address
     * @param token Token type
     * @return Balance amount
     */
    function getTokenBalance(address member, PaymentToken token) external view returns (uint256) {
        return tokenBalances[token][member];
    }
    
    /**
     * @notice Gets total locked collateral
     * @dev Sums across all active members
     *
     * @return totalUSDC Total USDC
     * @return totalHBAR Total HBAR
     */
    function getTotalCollateral() external view override returns (uint256 totalUSDC, uint256 totalHBAR) {
        uint256 totalMembers = membersContract.getTotalActiveMembers();
        
        for (uint256 i = 0; i < totalMembers; i++) {
            address member = membersContract.activeMembersList(i);
            totalUSDC += tokenBalances[PaymentToken.USDC][member];
            totalHBAR += tokenBalances[PaymentToken.HBAR][member];
        }
    }
    
    /**
     * @notice Generates collateral demo data
     * @dev For frontend visualization
     *
     * @param participants Number of participants
     * @param monthlyPayment Payment amount
     * @return positions Position array
     * @return collaterals Collateral array
     */
    function getCollateralDemo(uint256 participants, uint256 monthlyPayment) 
        external 
        view 
        returns (uint256[] memory positions, uint256[] memory collaterals) 
    {
        positions = new uint256[](participants);
        collaterals = new uint256[](participants);
        
        for (uint256 i = 1; i <= participants; i++) {
            positions[i-1] = i;
            collaterals[i-1] = calculateRequiredCollateral(i, monthlyPayment, participants);
        }
    }
    
    /**
     * @notice Calculates initial reputation
     * @dev Based on collateral commitment
     *
     * FORMULA:
     * - Base: 600
     * - Bonus: min(400, collateral / monthly * 100)
     * - Zero collateral: 800
     *
     * @param collateral Collateral amount
     * @param monthlyPayment Payment amount
     * @return Reputation score (600-1000)
     */
    function calculateInitialReputation(uint256 collateral, uint256 monthlyPayment) 
        external 
        pure 
        returns (uint256) 
    {
        if (collateral == 0) return 800; // High reputation for last position (no collateral needed)
        
        // Base reputation of 600, up to 1000 based on collateral vs monthly payment ratio
        uint256 ratio = (collateral * 100) / monthlyPayment; // How many months of payments is collateral worth
        uint256 bonus = ratio > 400 ? 400 : ratio; // Cap bonus at 400 points
        return 600 + bonus;
    }
    
    // ============================================================================
    // EMERGENCY FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Emergency token withdrawal
     * @dev Only callable by AjoCore
     *
     * @param token Token type
     * @param to Recipient
     * @param amount Amount
     */
    function emergencyWithdraw(PaymentToken token, address to, uint256 amount) external override onlyAjoCore {
        IERC20 tokenContract = token == PaymentToken.USDC ? USDC : HBAR;
        tokenContract.transfer(to, amount);
    }
}