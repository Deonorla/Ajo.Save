// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../interfaces/AjoInterfaces.sol";
import "../hedera/hedera-token-service/HederaTokenService.sol";
import "../hedera/HederaResponseCodes.sol";

/**
 * @title AjoGovernance
 * @notice Decentralized governance for Ajo ROSCA using Hedera Consensus Service (HCS)
 * @dev Full season lifecycle management, HCS vote tallying, and on-chain execution
 *
 * ARCHITECTURE OVERVIEW:
 * 1. Proposals created on-chain
 * 2. HCS topic used for off-chain voting (low cost: $0.0001/vote)
 * 3. Mirror Node reads votes → anyone submits batched votes on-chain
 * 4. Contract verifies signatures and member status
 * 5. Quorum + majority → proposal executes via AjoCore
 *
 * SEASON LIFECYCLE:
 * - Season: Full rotation where each member receives payout once
 * - Cycle: Monthly contribution/payout slot
 * - Completion → Participation Declaration → Restart
 *
 * KEY FEATURES:
 * - Season completion & restart proposals
 * - Member opt-in/opt-out with declaration period
 * - New member onboarding governance
 * - Carry-over rules (reputation/penalties)
 * - HTS token freeze/unfreeze
 * - Emergency pause
 *
 * @author Ajo.save Protocol Team
 * @custom:security-contact security@ajo.save
 */
contract AjoGovernance is 
    Initializable, 
    IAjoGovernance, 
    Ownable, 
    ReentrancyGuard, 
    Pausable,
    HederaTokenService
{
    using ECDSA for bytes32;
    
    // ============================================================================
    // STATE VARIABLES - CORE INTEGRATIONS
    // ============================================================================

    /**
     * @notice AjoCore contract address
     * @dev Central orchestrator - executes governance decisions
     */
    address public ajoCore;

    /**
     * @notice AjoSchedule contract address
     * @dev Manages payout timing
     */
    address public ajoSchedule;

    /**
     * @notice AjoMembers contract address
     * @dev Stores member data and status
     */
    address public membersContract;

    /**
     * @notice HCS topic ID for off-chain voting
     * @dev Created off-chain via SDK
     */
    bytes32 public hcsTopicId;
    
    // ============================================================================
    // PROPOSAL TRACKING
    // ============================================================================

    /**
     * @notice Total number of proposals created
     */
    uint256 public proposalCount;

    /**
     * @notice Proposal storage
     * @dev proposalId => Proposal
     */
    mapping(uint256 => Proposal) public proposals;
    
    // ============================================================================
    // GOVERNANCE PARAMETERS
    // ============================================================================

    /**
     * @notice Duration of voting period
     * @dev Configurable by AjoCore
     */
    uint256 public votingPeriod;

    /**
     * @notice Minimum voting power to create proposal
     */
    uint256 public proposalThreshold;

    /**
     * @notice Quorum percentage required (e.g., 51%)
     */
    uint256 public quorumPercentage;

    /**
     * @notice Default penalty rate for violations
     */
    uint256 public penaltyRate;
    
    // ============================================================================
    // SEASON MANAGEMENT STATE
    // ============================================================================

    /**
     * @notice Current season number
     */
    uint256 public currentSeason;

    /**
     * @notice Tracks member participation per season
     * @dev season => member => participating
     */
    mapping(uint256 => mapping(address => bool)) public seasonParticipation;

    /**
     * @notice Marks season as completed
     */
    mapping(uint256 => bool) public seasonCompleted;

    /**
     * @notice Timestamp when season ended
     */
    mapping(uint256 => uint256) public seasonEndTime;
    
    /**
     * @notice Member intentions for next season
     */
    mapping(address => bool) public willParticipateInNextSeason;

    /**
     * @notice Deadline for declaring next season participation
     */
    uint256 public participationDeclarationDeadline;
    
    /**
     * @notice Carry-over reputation to next season
     */
    bool public carryReputationToNextSeason;

    /**
     * @notice Carry-over penalties to next season
     */
    bool public carryPenaltiesToNextSeason;
    
    /**
     * @notice Tracks pending new member proposals
     * @dev address => proposalId
     */
    mapping(address => uint256) public pendingNewMembers;
    
    // ============================================================================
    // STRUCTS & ENUMS
    // ============================================================================

    /**
     * @notice Proposal structure
     */
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        bytes proposalData;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool canceled;
        ProposalType proposalType;
    }
    
    /**
     * @notice Types of governance proposals
     */
    enum ProposalType {
        ChangeMonthlyPayment,
        ChangeDuration,
        ChangeCollateralFactor,
        RemoveMember,
        EmergencyPause,
        UpdatePenaltyRate,
        FreezeAccount,
        UnfreezeAccount,
        Custom,
        CompleteCurrentSeason,     
        RestartNewSeason,           
        AddNewMember,              
        UpdateSeasonParameters,     
        SetParticipationDeadline,   
        SetCarryOverRules           
    }
    
    // ============================================================================
    // VOTE TRACKING
    // ============================================================================

    /**
     * @notice Tracks if member has voted on proposal
     */
    mapping(uint256 => mapping(address => bool)) public hasVotedMap;

    /**
     * @notice Stores HCS vote data
     */
    mapping(uint256 => mapping(address => HcsVote)) public votes;
    
    // ============================================================================
    // EVENTS
    // ============================================================================

    event TokenFreezeAttempt(address indexed token, address indexed account, int64 responseCode, bool success);
    event TokenUnfreezeAttempt(address indexed token, address indexed account, int64 responseCode, bool success);
    event TokenPauseAttempt(address indexed token, int64 responseCode, bool success);
    event TokenUnpauseAttempt(address indexed token, int64 responseCode, bool success);
    
    // ============================================================================
    // MODIFIERS
    // ============================================================================

    /**
     * @notice Restricts to AjoCore
     */
    modifier onlyAjoCore() {
        require(msg.sender == ajoCore, "Only AjoCore");
        _;
    }
    
    /**
     * @notice Restricts to active members
     */
    modifier onlyMember() {
        require(_isMember(msg.sender), "Not a member");
        _;
    }
    
    /**
     * @notice Validates proposal exists
     */
    modifier proposalExists(uint256 proposalId) {
        require(proposalId > 0 && proposalId <= proposalCount, "Proposal doesn't exist");
        _;
    }
    
    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    /**
     * @notice Master copy constructor
     */
    constructor() {
        _disableInitializers();
        _transferOwnership(address(1));
    }
    
    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /**
     * @notice Initializes proxy instance
     *
     * @param _ajoCore AjoCore address
     * @param _ajoMembers Members contract
     * @param _ajoSchedule Schedule contract
     * @param _hederaTokenService HTS precompile
     * @param _hcsTopicId HCS topic ID
     */
    function initialize(
        address _ajoCore,
        address _ajoMembers,  
        address _ajoSchedule,
        address _hederaTokenService,
        bytes32 _hcsTopicId
    ) external override initializer {
        require(_ajoCore != address(0), "Invalid AjoCore");
        require(_ajoMembers != address(0), "Invalid Members"); 
        
        _transferOwnership(msg.sender);
        
        ajoCore = _ajoCore;
        membersContract = _ajoMembers;  
        ajoSchedule = _ajoSchedule;
        hcsTopicId = _hcsTopicId;
        proposalCount = 0;
        currentSeason = 1;
        
        // Default governance parameters
        votingPeriod = 1 minutes;  // Testnet default
        proposalThreshold = 1;
        quorumPercentage = 51;
        penaltyRate = 5;
        
        // Default carry-over
        carryReputationToNextSeason = true;
        carryPenaltiesToNextSeason = false;
    }
    
    /**
     * @notice Update members contract (setup phase)
     */
    function setMembersContract(address _membersContract) external onlyOwner {
        require(_membersContract != address(0), "Invalid address");
        membersContract = _membersContract;
    }
    
    /**
     * @notice Verify contract setup
     */
    function verifySetup() external view override returns (bool isValid, string memory reason) {
        if (ajoCore == address(0)) return (false, "AjoCore not set");
        if (membersContract == address(0)) return (false, "Members contract not set");
        if (hcsTopicId == bytes32(0)) return (false, "HCS topic not set");
        return (true, "");
    }
    
    /**
     * @notice Get HCS topic ID
     */
    function getHcsTopicId() external view override returns (bytes32) {
        return hcsTopicId;
    }
    
    /**
     * @notice Update HCS topic (owner only)
     */
    function setHcsTopicId(bytes32 newTopicId) external onlyOwner {
        hcsTopicId = newTopicId;
    }
    
    // ============================================================================
    // INTERNAL HTS HELPERS
    // ============================================================================

    function _getHtsErrorMessage(int responseCode) internal pure returns (string memory) {
        if (responseCode == 22) return "Success";
        if (responseCode == 111) return "Invalid token ID";
        if (responseCode == 15) return "Invalid account ID";
        if (responseCode == 164) return "Insufficient token balance";
        if (responseCode == 167) return "Token not associated to account";
        if (responseCode == 162) return "Account frozen for token";
        if (responseCode == 138) return "Token was deleted";
        if (responseCode == 7) return "Invalid signature";
        if (responseCode == 177) return "Token is paused";
        if (responseCode == 202) return "Invalid freeze key";
        if (responseCode == 203) return "Invalid wipe key";
        return "Unknown error";
    }
    
    function _isHtsSuccess(int responseCode) internal pure returns (bool) {
        return responseCode == HederaResponseCodes.SUCCESS;
    }
    
    // ============================================================================
    // SEASON PARTICIPATION
    // ============================================================================

    /**
     * @notice Declare intent for next season
     * @param participate true to join, false to opt out
     */
    function declareNextSeasonParticipation(bool participate) 
        external 
        onlyMember 
        whenNotPaused
    {
        require(participationDeclarationDeadline > 0, "No declaration period active");
        require(block.timestamp <= participationDeclarationDeadline, "Declaration period ended");
        
        willParticipateInNextSeason[msg.sender] = participate;
        
        emit ParticipationDeclared(msg.sender, participate, currentSeason + 1);
    }
    
    /**
     * @notice Get member participation status
     */
    function getMemberParticipationStatus(address member) 
        external 
        view 
        returns (bool willParticipate) 
    {
        return willParticipateInNextSeason[member];
    }
    
    /**
     * @notice Get current season status
     */
    function getSeasonStatus() external view returns (
        uint256 _currentSeason,
        bool _isSeasonCompleted,
        uint256 _participationDeadline,
        uint256 _declaredParticipants
    ) {
        uint256 participantCount = 0;
        uint256 totalMembers = _getTotalMembers();
        
        for (uint256 i = 0; i < totalMembers; i++) {
            address member = _getMemberAtIndex(i);
            if (willParticipateInNextSeason[member]) {
                participantCount++;
            }
        }
        
        return (
            currentSeason,
            seasonCompleted[currentSeason],
            participationDeclarationDeadline,
            participantCount
        );
    }
    
    // ============================================================================
    // SEASON PROPOSALS
    // ============================================================================

    /**
     * @notice Propose completing current season
     */
    function proposeSeasonCompletion(string memory description) 
        external 
        onlyMember 
        whenNotPaused
        returns (uint256 proposalId) 
    {
        require(!seasonCompleted[currentSeason], "Season already completed");
        
        bytes memory proposalData = abi.encode(currentSeason);
        
        proposalCount++;
        proposalId = proposalCount;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.proposalData = proposalData;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;
        proposal.proposalType = ProposalType.CompleteCurrentSeason;
        
        emit ProposalCreated(proposalId, msg.sender, description, block.timestamp, proposal.endTime);
        return proposalId;
    }
    
    /**
     * @notice Propose restarting with new parameters
     */
    function proposeNewSeasonRestart(
        string memory description,
        uint256 newDuration,
        uint256 newMonthlyContribution,
        address[] memory newMembers
    ) external onlyMember whenNotPaused returns (uint256 proposalId) {
        require(seasonCompleted[currentSeason], "Current season not completed");
        require(newDuration > 0, "Invalid duration");
        require(newMonthlyContribution > 0, "Invalid contribution");
        
        bytes memory proposalData = abi.encode(
            newDuration,
            newMonthlyContribution,
            newMembers
        );
        
        proposalCount++;
        proposalId = proposalCount;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.proposalData = proposalData;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;
        proposal.proposalType = ProposalType.RestartNewSeason;
        
        emit ProposalCreated(proposalId, msg.sender, description, block.timestamp, proposal.endTime);
        return proposalId;
    }
    
    /**
     * @notice Propose adding new member
     */
    function proposeNewMember(
        address newMember,
        string memory description
    ) external onlyMember whenNotPaused returns (uint256 proposalId) {
        require(newMember != address(0), "Invalid member address");
        require(!_isMember(newMember), "Already a member");
        require(pendingNewMembers[newMember] == 0, "Member already proposed");
        
        bytes memory proposalData = abi.encode(newMember);
        
        proposalCount++;
        proposalId = proposalCount;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.proposalData = proposalData;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;
        proposal.proposalType = ProposalType.AddNewMember;
        
        pendingNewMembers[newMember] = proposalId;
        
        emit ProposalCreated(proposalId, msg.sender, description, block.timestamp, proposal.endTime);
        emit NewMemberProposed(newMember, proposalId, msg.sender);
        
        return proposalId;
    }
    
    /**
     * @notice Propose updating season parameters
     */
    function proposeUpdateSeasonParameters(
        string memory description,
        uint256 newDuration,
        uint256 newMonthlyPayment
    ) external onlyMember whenNotPaused returns (uint256 proposalId) {
        require(newDuration > 0, "Invalid duration");
        require(newMonthlyPayment > 0, "Invalid payment");
        
        bytes memory proposalData = abi.encode(newDuration, newMonthlyPayment);
        
        proposalCount++;
        proposalId = proposalCount;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.proposalData = proposalData;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;
        proposal.proposalType = ProposalType.UpdateSeasonParameters;
        
        emit ProposalCreated(proposalId, msg.sender, description, block.timestamp, proposal.endTime);
        return proposalId;
    }
    
    /**
     * @notice Propose carry-over rules
     */
    function proposeCarryOverRules(
        string memory description,
        bool _carryReputation,
        bool _carryPenalties
    ) external onlyMember whenNotPaused returns (uint256 proposalId) {
        bytes memory proposalData = abi.encode(_carryReputation, _carryPenalties);
        
        proposalCount++;
        proposalId = proposalCount;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.proposalData = proposalData;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;
        proposal.proposalType = ProposalType.SetCarryOverRules;
        
        emit ProposalCreated(proposalId, msg.sender, description, block.timestamp, proposal.endTime);
        return proposalId;
    }
    
    // ============================================================================
    // PROPOSAL MANAGEMENT
    // ============================================================================

    /**
     * @notice Create custom proposal
     */
    function createProposal(
        string memory description,
        bytes memory proposalData
    ) external override onlyMember whenNotPaused returns (uint256 proposalId) {
        uint256 votingPower = getVotingPower(msg.sender);
        require(votingPower >= proposalThreshold, "Insufficient voting power");
        
        proposalCount++;
        proposalId = proposalCount;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.proposalData = proposalData;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;
        proposal.proposalType = ProposalType.Custom;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            description,
            proposal.startTime,
            proposal.endTime
        );
        
        return proposalId;
    }
    
    /**
     * @notice Cancel proposal
     */
    function cancelProposal(uint256 proposalId) 
        external 
        override
        proposalExists(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer || msg.sender == ajoCore,
            "Only proposer or governance"
        );
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Already canceled");
        
        proposal.canceled = true;
        
        if (proposal.proposalType == ProposalType.AddNewMember) {
            address newMember = abi.decode(proposal.proposalData, (address));
            delete pendingNewMembers[newMember];
        }
        
        emit ProposalCanceled(proposalId, msg.sender);
    }
    
    /**
     * @notice Get proposal details
     */
    function getProposal(uint256 proposalId) 
        external 
        view 
        override
        proposalExists(proposalId) 
        returns (
            string memory description,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 abstainVotes,
            uint256 startTime,
            uint256 endTime,
            bool executed,
            bool canceled,
            bytes memory proposalData
        ) 
    {
        Proposal storage p = proposals[proposalId];
        return (
            p.description,
            p.forVotes,
            p.againstVotes,
            p.abstainVotes,
            p.startTime,
            p.endTime,
            p.executed,
            p.canceled,
            p.proposalData
        );
    }
    
    /**
     * @notice Get proposal status
     */
    function getProposalStatus(uint256 proposalId) 
        external 
        view 
        override
        proposalExists(proposalId) 
        returns (
            bool isActive,
            bool hasQuorum,
            bool isPassing,
            uint256 votesNeeded
        ) 
    {
        Proposal storage p = proposals[proposalId];
        
        isActive = !p.executed && !p.canceled && block.timestamp <= p.endTime;
        
        uint256 totalVotes = p.forVotes + p.againstVotes + p.abstainVotes;
        uint256 totalMembers = _getTotalMembers();
        uint256 quorumRequired = (totalMembers * quorumPercentage) / 100;
        
        hasQuorum = totalVotes >= quorumRequired;
        isPassing = p.forVotes > p.againstVotes;
        votesNeeded = quorumRequired > totalVotes ? quorumRequired - totalVotes : 0;
        
        return (isActive, hasQuorum, isPassing, votesNeeded);
    }
    
    // ============================================================================
    // VOTING (HCS)
    // ============================================================================

    /**
     * @notice Tally votes from HCS
     */
    function tallyVotesFromHCS(
        uint256 proposalId,
        HcsVote[] memory hcsVotes
    ) external override proposalExists(proposalId) nonReentrant returns (
        uint256 totalForVotes,
        uint256 totalAgainstVotes,
        uint256 totalAbstainVotes
    ) {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Proposal canceled");
        
        for (uint256 i = 0; i < hcsVotes.length; i++) {
            HcsVote memory hcsVote = hcsVotes[i];
            
            if (hasVotedMap[proposalId][hcsVote.voter]) continue;
            if (!_verifyVoteSignature(proposalId, hcsVote)) continue;
            if (!_isMember(hcsVote.voter)) continue;
            
            uint256 actualVotingPower = getVotingPower(hcsVote.voter);
            if (actualVotingPower == 0) continue;
            
            hasVotedMap[proposalId][hcsVote.voter] = true;
            votes[proposalId][hcsVote.voter] = hcsVote;
            
            if (hcsVote.support == 1) {
                proposal.forVotes += actualVotingPower;
            } else if (hcsVote.support == 0) {
                proposal.againstVotes += actualVotingPower;
            } else if (hcsVote.support == 2) {
                proposal.abstainVotes += actualVotingPower;
            }
        }
        
        emit VotesTallied(
            proposalId,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            msg.sender
        );
        
        return (proposal.forVotes, proposal.againstVotes, proposal.abstainVotes);
    }
    
    /**
     * @notice Check if member voted
     */
    function hasVoted(uint256 proposalId, address voter) external view override returns (bool) {
        return hasVotedMap[proposalId][voter];
    }
    
    /**
     * @notice Get voting power (flat 100 per member)
     */
    function getVotingPower(address member) public view override returns (uint256) {
        return _isMember(member) ? 100 : 0;
    }
    
    /**
     * @notice Verify HCS vote signature
     */
    function _verifyVoteSignature(
        uint256 proposalId,
        HcsVote memory hcsVote
    ) internal pure returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(
            proposalId,
            hcsVote.voter,
            hcsVote.support,
            hcsVote.hcsMessageId,
            hcsVote.hcsSequenceNumber
        ));
        
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(hcsVote.signature);
        
        return recovered == hcsVote.voter;
    }
    
    // ============================================================================
    // PROPOSAL EXECUTION
    // ============================================================================

    /**
     * @notice Execute passed proposal
     */
    function executeProposal(uint256 proposalId) 
        external 
        override
        proposalExists(proposalId) 
        nonReentrant 
        returns (bool success) 
    {
        Proposal storage proposal = proposals[proposalId];
        
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Proposal canceled");
        require(block.timestamp > proposal.endTime, "Voting ongoing");
        
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 totalMembers = _getTotalMembers();
        uint256 quorumRequired = (totalMembers * quorumPercentage) / 100;
        
        require(totalVotes >= quorumRequired, "Quorum not reached");
        require(proposal.forVotes > proposal.againstVotes, "Proposal failed");
        
        proposal.executed = true;
        
        bytes memory returnData;
        (success, returnData) = _executeProposalAction(proposalId, proposal);
        
        emit ProposalExecuted(proposalId, success, returnData);
        
        return success;
    }
    
    /**
     * @notice Internal execution router
     */
    function _executeProposalAction(
        uint256 proposalId,
        Proposal storage proposal
    ) internal returns (bool, bytes memory) {
        if (proposal.proposalType == ProposalType.CompleteCurrentSeason) {
            return _executeSeasonCompletion(proposalId);
        }
        
        if (proposal.proposalType == ProposalType.RestartNewSeason) {
            return _executeSeasonRestart(proposalId, proposal);
        }
        
        if (proposal.proposalType == ProposalType.AddNewMember) {
            address newMember = abi.decode(proposal.proposalData, (address));
            delete pendingNewMembers[newMember];
            return ajoCore.call(
                abi.encodeWithSignature("addMemberForNextSeason(address)", newMember)
            );
        }
        
        if (proposal.proposalType == ProposalType.UpdateSeasonParameters) {
            (uint256 newDuration, uint256 newMonthlyPayment) = 
                abi.decode(proposal.proposalData, (uint256, uint256));
            emit SeasonParametersUpdated(newDuration, newMonthlyPayment);
            return ajoCore.call(
                abi.encodeWithSignature("updateSeasonParameters(uint256,uint256)", newDuration, newMonthlyPayment)
            );
        }
        
        if (proposal.proposalType == ProposalType.SetCarryOverRules) {
            (bool _carryReputation, bool _carryPenalties) = 
                abi.decode(proposal.proposalData, (bool, bool));
            carryReputationToNextSeason = _carryReputation;
            carryPenaltiesToNextSeason = _carryPenalties;
            emit CarryOverRulesUpdated(_carryReputation, _carryPenalties);
            return (true, "");
        }
        
        if (proposal.proposalType == ProposalType.UpdatePenaltyRate) {
            uint256 newRate = abi.decode(proposal.proposalData, (uint256));
            require(newRate <= 50, "Rate too high");
            penaltyRate = newRate;
            return (true, "");
        }
        
        if (proposal.proposalType == ProposalType.ChangeMonthlyPayment) {
            return ajoCore.call(proposal.proposalData);
        }
        
        if (proposal.proposalType == ProposalType.RemoveMember) {
            address member = abi.decode(proposal.proposalData, (address));
            return ajoCore.call(
                abi.encodeWithSignature("removeMember(address)", member)
            );
        }
        
        if (proposal.proposalType == ProposalType.EmergencyPause) {
            return ajoCore.call(
                abi.encodeWithSignature("emergencyPause()")
            );
        }
        
        if (proposal.proposalType == ProposalType.Custom) {
            return ajoCore.call(proposal.proposalData);
        }
        
        return (false, "Unknown proposal type");
    }
    
    // ============================================================================
    // SEASON EXECUTION
    // ============================================================================

    function _executeSeasonCompletion(uint256 /* proposalId */) internal returns (bool, bytes memory) {
        seasonCompleted[currentSeason] = true;
        seasonEndTime[currentSeason] = block.timestamp;
        
        participationDeclarationDeadline = block.timestamp + 7 days;
        
        emit SeasonCompleted(currentSeason, block.timestamp);
        emit ParticipationDeadlineSet(participationDeclarationDeadline, currentSeason + 1);
        
        return (true, "");
    }
    
    function _executeSeasonRestart(uint256 /* proposalId */, Proposal storage proposal) 
        internal 
        returns (bool, bytes memory) 
    {
        (uint256 newDuration, uint256 newMonthlyContribution, address[] memory newMembers) = 
            abi.decode(proposal.proposalData, (uint256, uint256, address[]));
        
        address[] memory continuingMembers = _getContinuingMembers();
        address[] memory allMembers = new address[](continuingMembers.length + newMembers.length);
        
        for (uint256 i = 0; i < continuingMembers.length; i++) {
            allMembers[i] = continuingMembers[i];
        }
        
        for (uint256 i = 0; i < newMembers.length; i++) {
            allMembers[continuingMembers.length + i] = newMembers[i];
        }
        
        (bool success, ) = ajoCore.call(
            abi.encodeWithSignature(
                "restartSeason(uint256,uint256,address[])",
                newDuration,
                newMonthlyContribution,
                allMembers
            )
        );
        
        if (success) {
            currentSeason++;
            participationDeclarationDeadline = 0;
            
            for (uint256 i = 0; i < allMembers.length; i++) {
                willParticipateInNextSeason[allMembers[i]] = false;
            }
            
            emit NewSeasonStarted(currentSeason, newDuration, newMonthlyContribution, allMembers);
        }
        
        return (success, "");
    }
    
    function _getContinuingMembers() internal view returns (address[] memory) {
        uint256 continuingCount = 0;
        uint256 totalMembers = _getTotalMembers();
        
        for (uint256 i = 0; i < totalMembers; i++) {
            address member = _getMemberAtIndex(i);
            if (willParticipateInNextSeason[member]) {
                continuingCount++;
            }
        }
        
        address[] memory continuingMembers = new address[](continuingCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < totalMembers; i++) {
            address member = _getMemberAtIndex(i);
            if (willParticipateInNextSeason[member]) {
                continuingMembers[index] = member;
                index++;
            }
        }
        
        return continuingMembers;
    }
    
    // ============================================================================
    // HTS ADMIN
    // ============================================================================

    function freezeMemberToken(
        address token,
        address member
    ) external override onlyAjoCore returns (int64 responseCode) {
        int response = freezeToken(token, member);
        responseCode = int64(response);
        bool success = _isHtsSuccess(response);
        
        emit TokenFrozen(token, member, responseCode);
        emit TokenFreezeAttempt(token, member, responseCode, success);
        
        return responseCode;
    }
    
    function unfreezeMemberToken(
        address token,
        address member
    ) external override onlyAjoCore returns (int64 responseCode) {
        int response = unfreezeToken(token, member);
        responseCode = int64(response);
        bool success = _isHtsSuccess(response);
        
        emit TokenUnfrozen(token, member, responseCode);
        emit TokenUnfreezeAttempt(token, member, responseCode, success);
        
        return responseCode;
    }
    
    // ============================================================================
    // PARAMETER UPDATES
    // ============================================================================

    function updatePenaltyRate(uint256 newPenaltyRate) external override onlyAjoCore {
        require(newPenaltyRate <= 50, "Rate too high");
        penaltyRate = newPenaltyRate;
    }
    
    function updateVotingPeriod(uint256 newVotingPeriod) external override onlyAjoCore {
        require(newVotingPeriod >= 1 days && newVotingPeriod <= 30 days, "Invalid period");
        votingPeriod = newVotingPeriod;
    }
    
    function updateProposalThreshold(uint256 newThreshold) external override onlyAjoCore {
        proposalThreshold = newThreshold;
    }
    
    function updateReputationAndVotingPower(
        address member,
        bool positive
    ) external override onlyAjoCore {
        (bool success,) = membersContract.call(
            abi.encodeWithSignature(
                "updateReputation(address,uint256)",
                member,
                positive ? 10 : 0
            )
        );
        
        require(success, "Reputation update failed");
    }
    
    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    function getGovernanceSettings() 
        external 
        view 
        override
        returns (
            uint256 _proposalThreshold, 
            uint256 _votingPeriod, 
            uint256 _quorumPercentage, 
            uint256 currentPenaltyRate, 
            uint256 totalProposals
        )
    {
        return (
            proposalThreshold,
            votingPeriod,
            quorumPercentage,
            penaltyRate,
            proposalCount
        );
    }
    
    function getAllProposals(uint256 offset, uint256 limit) 
        external 
        view 
        override
        returns (uint256[] memory proposalIds, bool hasMore) 
    {
        uint256 remaining = proposalCount > offset ? proposalCount - offset : 0;
        uint256 size = remaining < limit ? remaining : limit;
        
        proposalIds = new uint256[](size);
        
        for (uint256 i = 0; i < size; i++) {
            proposalIds[i] = offset + i + 1;
        }
        
        hasMore = remaining > limit;
    }
    
    function getActiveProposals() external view override returns (uint256[] memory proposalIds) {
        uint256 activeCount = 0;
        
        for (uint256 i = 1; i <= proposalCount; i++) {
            Proposal storage p = proposals[i];
            if (!p.executed && !p.canceled && block.timestamp <= p.endTime) {
                activeCount++;
            }
        }
        
        proposalIds = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= proposalCount; i++) {
            Proposal storage p = proposals[i];
            if (!p.executed && !p.canceled && block.timestamp <= p.endTime) {
                proposalIds[index] = i;
                index++;
            }
        }
        
        return proposalIds;
    }
    
    function getCarryOverRules() external view returns (bool _carryReputation, bool _carryPenalties) {
        return (carryReputationToNextSeason, carryPenaltiesToNextSeason);
    }
    
    function getContinuingMembersCount() external view returns (uint256) {
        uint256 count = 0;
        uint256 totalMembers = _getTotalMembers();
        
        for (uint256 i = 0; i < totalMembers; i++) {
            address member = _getMemberAtIndex(i);
            if (willParticipateInNextSeason[member]) {
                count++;
            }
        }
        
        return count;
    }
    
    function getContinuingMembersList() external view returns (address[] memory) {
        return _getContinuingMembers();
    }
    
    function getOptOutMembersList() external view returns (address[] memory) {
        uint256 optOutCount = 0;
        uint256 totalMembers = _getTotalMembers();
        
        for (uint256 i = 0; i < totalMembers; i++) {
            address member = _getMemberAtIndex(i);
            if (!willParticipateInNextSeason[member] && participationDeclarationDeadline > 0) {
                optOutCount++;
            }
        }
        
        address[] memory optOutMembers = new address[](optOutCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < totalMembers; i++) {
            address member = _getMemberAtIndex(i);
            if (!willParticipateInNextSeason[member] && participationDeclarationDeadline > 0) {
                optOutMembers[index] = member;
                index++;
            }
        }
        
        return optOutMembers;
    }
    
    // ============================================================================
    // INTERNAL HELPERS
    // ============================================================================

    function _isMember(address account) internal view returns (bool) {
        (bool success, bytes memory data) = membersContract.staticcall(
            abi.encodeWithSignature("isMember(address)", account)
        );
        
        if (!success || data.length == 0) return false;
        return abi.decode(data, (bool));
    }
    
    function _getTotalMembers() internal view returns (uint256) {
        (bool success, bytes memory data) = membersContract.staticcall(
            abi.encodeWithSignature("getTotalActiveMembers()")
        );
        
        if (!success || data.length == 0) return 0;
        return abi.decode(data, (uint256));
    }
    
    function _getMemberAtIndex(uint256 index) internal view returns (address) {
        (bool success, bytes memory data) = membersContract.staticcall(
            abi.encodeWithSignature("getMemberAtIndex(uint256)", index)
        );
        
        if (!success || data.length == 0) return address(0);
        return abi.decode(data, (address));
    }
}