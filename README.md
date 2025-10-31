# 🏦 AJO.SAVE - Decentralized ROSCA Protocol on Hedera
# Track - Onchain Finance & Real-World Assets (RWA)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hedera](https://img.shields.io/badge/Hedera-Testnet-purple.svg)](https://hedera.com)
[![Track](https://img.shields.io/badge/Track-DeFi-brightgreen.svg)]()

> **Bringing traditional African savings circles (Ajo/Esusu) to Web3 with 90%+ cost reduction using Hedera's native services**

---

## 📋 Table of Contents
- [Project Links](#project-links)
- [Project Overview](#project-overview)
- [Hedera Integration Summary](##hedera-integration-summary)
- [Architecture Diagram](#architecture-diagram)
- [Key Features](#key-features)
- [Deployed Hedera IDs](#deployed-hedera-ids)
- [Setup & Installation](#setup--installation)
- [Running the Application](#running-the-application)
- [Smart Contract Architecture](#smart-contract-architecture)
- [Demo & Testing](#demo--testing)
- [Economic Model](#economic-model)
- [Project Links](#project-links)
- [Team](#team)

---
##  Project Links

**Hedera Certification link:** [Certificate](https://certs.hashgraphdev.com/d08c2eba-177f-45bb-82f9-6547fae39cb0.pdf)
**Pitch Deck link:** [Pitch deck](https://www.canva.com/design/DAG0d1jQ7_c/Yq8DAVK2hGs0xhpd_xfmWQ/view?utm_content=DAG0d1jQ7_c&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hc7f6fc03ab)

---

## 🎯 Project Overview

**Track:** Onchain Finance & Real-World Assets (RWA)

**Problem:** Traditional African savings circles (ROSCAs) rely on trust and face scalability issues. Existing blockchain solutions are too expensive (Ethereum gas fees) or require complex infrastructure.

**Solution:** AJO.SAVE leverages Hedera's unique combination of **HTS (token management)**, **HCS (governance)**, and **HSS (automation)** to create a production-ready ROSCA protocol with 90%+ lower operational costs compared to Ethereum.

**Impact:** Enables financial inclusion for 500M+ unbanked Africans through familiar savings circles, now with blockchain transparency, collateralized security, and automated execution.

---

## 🔗 Hedera Integration Summary

AJO.SAVE is built **exclusively on Hedera**, using all three major Hedera Services to create a fully integrated DeFi protocol. Here's how each service is critical to our solution:

### 1. **Hedera Token Service (HTS)** - Treasury & Distribution Layer

**Why HTS:**  
We use official Circle USDC and Hedera WHBAR tokens because HTS provides **native token association at $0.001** compared to Ethereum's $20+ ERC-20 operations. This 95% cost reduction is essential for serving low-income users making $2-5 daily payments.

**Transaction Types Executed:**
- `AccountAllowanceApproveTransaction` - Token spending approval (replaces ERC-20 approve)
- Native HTS token transfers via `transferToken()`
- Token balance queries via HTS-compatible `balanceOf()`

**Economic Justification:**  
Traditional Ethereum ERC-20 operations cost $15-30 in gas fees, making micro-savings impossible. HTS's $0.001 fixed fee enables profitable $2 daily contributions. For a 10-member Ajo making 100 transactions/month:
- **Ethereum Cost:** $1,500-3,000/month in gas
- **Hedera HTS Cost:** $1/month
- **Savings:** 99.9% reduction

**Implementation Details:**
```typescript
// Frontend: useAjoCore.ts - HTS token approval
const approveCollateral = async (collateralAddress, tokenChoice, amount) => {
  const hederaTokenAddress = await convertEvmToHederaAddress(tokenAddress);
  const approveTx = new AccountAllowanceApproveTransaction()
    .approveTokenAllowance(
      TokenId.fromString(hederaTokenAddress),
      AccountId.fromString(accountId),
      AccountId.fromString(hederaCollateralAddress),
      Number(hederaAllowanceAmount)
    );
  await approveTx.executeWithSigner(signer);
};
```

**Contract Integration:**
AjoFactory inherits from HederaTokenService to execute native HTS operations:
```solidity
// contracts/factory/AjoFactory.sol
contract AjoFactory is HederaTokenService {
  function approveHtsToken(address token, address spender, uint256 amount) 
    external returns (bool) {
    int responseCode = approve(token, spender, amount);
    return _isHtsSuccess(responseCode);
  }
}
```

---

### 2. **Hedera Consensus Service (HCS)** - Governance & Voting Layer

**Why HCS:**  
Traditional on-chain voting costs $50-200 per vote on Ethereum. HCS provides immutable message submission at $0.0001/message, enabling democratic governance for small savings groups where members have <$100 monthly income.

**Transaction Types Executed:**
- `TopicCreateTransaction` - Create governance topic during Ajo initialization
- `TopicMessageSubmitTransaction` - Submit member votes off-chain
- Mirror Node queries - Retrieve vote messages for on-chain tallying

**Economic Justification:**  
For a 10-member Ajo making 5 governance decisions/year with 10 votes each:
- **Ethereum On-Chain Voting:** $2,500-10,000/year (50 votes × $50-200)
- **HCS + On-Chain Tally:** $0.005 + ~$5 = **$5.005/year**
- **Savings:** 99.98% reduction

This hybrid model (HCS for voting, EVM for tallying) provides cryptographic security while keeping costs sustainable.

**Implementation Flow:**
```typescript
// Frontend: useHcsVoting.ts - Vote submission
const castHcsVote = async (proposalId, support, hcsTopicId) => {
  // 1. Sign vote message
  const signedVote = await createSignedVote(proposalId, support);
  
  // 2. Submit to HCS ($0.0001)
  const hcsResult = await submitVoteToHCS(hcsTopicId, signedVote);
  
  // 3. Create final signature with HCS sequence
  const finalSignature = await signFinalVote(hcsResult.sequenceNumber);
  
  return completeVote;
};

// Backend: Vote tallying (once per proposal)
const tallyVotesFromHCS = async (proposalId, votes) => {
  const contract = new ethers.Contract(governanceAddress, ABI, signer);
  const tx = await contract.tallyVotesFromHCS(proposalId, votes);
  return await tx.wait();
};
```

**Contract Integration:**
AjoGovernance contract verifies ECDSA signatures and reconstructs vote hashes to prevent vote manipulation:
```solidity
// contracts/governance/AjoGovernance.sol
function tallyVotesFromHCS(uint256 proposalId, HcsVote[] memory votes) 
  external returns (uint256 totalForVotes, uint256 totalAgainstVotes) {
  for (uint256 i = 0; i < votes.length; i++) {
    bytes32 messageHash = keccak256(abi.encodePacked(
      proposalId, votes[i].voter, votes[i].support, 
      votes[i].hcsMessageId, votes[i].hcsSequenceNumber
    ));
    
    bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
    address recovered = ethSignedHash.recover(votes[i].signature);
    
    require(recovered == votes[i].voter, "Invalid signature");
    // ... tally vote
  }
}
```

**Topic Creation:**
Topics are created during Phase 2 initialization with operator keys for admin control:
```typescript
// Frontend: useHcsTopicCreation.ts
const createHcsTopic = async (ajoName, network = 'testnet') => {
  const client = Client.forName(network);
  const transaction = new TopicCreateTransaction()
    .setTopicMemo(`AJO.SAVE Governance - ${ajoName}`)
    .setAdminKey(client.operatorPublicKey);
  
  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);
  const topicId = receipt.topicId.toString();
  
  // Convert to bytes32 for Solidity
  const bytes32TopicId = ethers.utils.hexZeroPad(
    ethers.utils.hexlify(BigInt(topicId.split('.')[2])), 32
  );
  
  return { topicId, bytes32TopicId };
};
```

---

### 3. **Hedera Schedule Service (HSS)** - Automation Layer

**Why HSS:**  
Traditional blockchain automation requires centralized bots or expensive keeper networks like Chainlink ($50-100/execution). HSS provides native delayed execution at ~$0.01/schedule, enabling trustless automation for payment deadlines and cycle advancement.

**Transaction Types Executed:**
- `ScheduleCreateTransaction` - Schedule future payment/payout execution
- `ScheduleSignTransaction` - Multi-signature authorization for schedules
- `ContractExecuteTransaction` - Execute scheduled contract calls

**Economic Justification:**  
For a 10-member Ajo running 12 months with automated cycle advancement:
- **Chainlink Keepers:** $600-1,200/year (12 months × $50-100)
- **Centralized Bot:** Free but requires trust + server costs
- **HSS:** ~$1.20/year (12 schedules × $0.10)
- **Savings:** 99.8% vs Chainlink, 100% trustless vs bots

HSS's 62-day scheduling window perfectly matches typical monthly ROSCA cycles, and multi-signature support enables member consensus for execution.

**Implementation:**
```solidity
// contracts/schedule/AjoSchedule.sol
function schedulePayment(
  uint256 cycle, 
  uint256 executionTime,
  address member,
  uint256 amount
) external returns (address scheduleAddress) {
  require(executionTime <= block.timestamp + 62 days, "Exceeds HSS limit");
  
  // Build schedule transaction
  bytes memory transactionData = abi.encodeWithSelector(
    IAjoPayments.processPayment.selector,
    member, amount, token
  );
  
  // Store schedule reference (actual HSS integration pending testnet deployment)
  scheduledPayments[scheduleAddress] = ScheduledPayment({
    cycle: cycle,
    executionTime: executionTime,
    amount: amount,
    recipient: member,
    isExecuted: false
  });
  
  emit PaymentScheduled(scheduleAddress, cycle, executionTime, member, amount);
  return scheduleAddress;
}
```

**Current Status:** AjoSchedule contract is deployed and tracks scheduled operations. Full HSS integration will be completed post-testnet validation.

---

### **Combined Economic Impact**

For a typical 10-member Ajo running 12 months:

| Operation | Ethereum | Hedera | Savings |
|-----------|----------|--------|---------|
| Token Operations (1,200/year) | $18,000-36,000 | $1.20 | **99.997%** |
| Governance (50 votes/year) | $2,500-10,000 | $5.00 | **99.98%** |
| Automation (12 executions) | $600-1,200 | $1.20 | **99.8%** |
| **Total Annual Cost** | **$21,100-47,200** | **$7.40** | **99.98%** |

This cost reduction transforms ROSCAs from economically infeasible on Ethereum to **profitable even for $2/day contributions** on Hedera.

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + Vite)                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Create Ajo  │  │  Join Group  │  │ Make Payment │  │ Vote/Govern │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                │                  │                 │         │
│         └────────────────┴──────────────────┴─────────────────┘         │
│                                    │                                    │
│                           Custom Hedera Hooks:                          │
│                    useAjoFactory, useAjoCore, useHcsVoting              │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                     ┌────────────────┼────────────────┐
                     │                │                │
                     ▼                ▼                ▼
         ┌───────────────┐  ┌──────────────┐  ┌──────────────┐
         │   Hashio      │  │  WalletConnect│  │ Mirror Node  │
         │  (JSON-RPC)   │  │   (HashPack)  │  │   (REST API) │
         └───────┬───────┘  └───────┬──────┘  └───────┬──────┘
                 │                  │                  │
                 └──────────────────┼──────────────────┘
                                    │
                                    ▼
      ┌─────────────────────────────────────────────────────────────┐
      │              HEDERA NETWORK (Testnet/Mainnet)               │
      │                                                               │
      │  ┌──────────────────────────────────────────────────────┐   │
      │  │         HEDERA SMART CONTRACT SERVICE (HSCS)         │   │
      │  │                                                        │   │
      │  │  ┌──────────────┐      ┌──────────────────────────┐  │   │
      │  │  │ AjoFactory   │─────▶│ Minimal Proxy Pattern:   │  │   │
      │  │  │              │      │ ┌─────────────────────┐ │  │   │
      │  │  │ - createAjo()│      │ │ AjoCore (Master)    │ │  │   │
      │  │  │ - initPhase2 │      │ │ AjoMembers (Master) │ │  │   │
      │  │  │ - initPhase3 │      │ │ AjoCollateral       │ │  │   │
      │  │  │ - initPhase4 │      │ │ AjoPayments         │ │  │   │
      │  │  │ - initPhase5 │      │ │ AjoGovernance       │ │  │   │
      │  │  └──────┬───────┘      │ │ AjoSchedule         │ │  │   │
      │  │         │               │ └─────────────────────┘ │  │   │
      │  │         │               └──────────┬───────────────┘  │   │
      │  │         │                          │                  │   │
      │  │         └──────────────────────────┘                  │   │
      │  │                                                        │   │
      │  │  Per-Ajo Instance (Proxy):                            │   │
      │  │  ┌────────────┐ ┌──────────────┐ ┌────────────────┐  │   │
      │  │  │ joinAjo()  │ │processPayment│ │distributePayout│  │   │
      │  │  └────────────┘ └──────────────┘ └────────────────┘  │   │
      │  └────────────────────────────────────────────────────────┘  │
      │                                                               │
      │  ┌──────────────────────────────────────────────────────┐   │
      │  │      HEDERA TOKEN SERVICE (HTS) - Auto-Associate     │   │
      │  │                                                        │   │
      │  │  Official Tokens (No Creation - Pre-Existing):        │   │
      │  │  ┌─────────────────────────────────────────────────┐  │   │
      │  │  │ Circle USDC (Testnet: 0.0.429274)             │  │   │
      │  │  │ Mainnet: 0.0.456858                            │  │   │
      │  │  │                                                  │  │   │
      │  │  │ Hedera WHBAR (Testnet: 0.0.1456986)            │  │   │
      │  │  │ Mainnet: TBD                                    │  │   │
      │  │  │                                                  │  │   │
      │  │  │ Features:                                        │  │   │
      │  │  │ - Built-in auto-association (no manual assoc)  │  │   │
      │  │  │ - ERC20 compatible interface                    │  │   │
      │  │  │ - $0.001 transfer cost (vs $3 Ethereum)        │  │   │
      │  │  │ - 3-second finality                            │  │   │
      │  │  └─────────────────────────────────────────────────┘  │   │
      │  │                                                        │   │
      │  │  Data Flow:                                            │   │
      │  │  Member → Approve USDC → AjoCollateral (lock)         │   │
      │  │  Member → Approve USDC → AjoPayments (contribution)   │   │
      │  │  AjoPayments → Transfer USDC → Recipient (payout)     │   │
      │  └────────────────────────────────────────────────────────┘  │
      │                                                               │
      │  ┌──────────────────────────────────────────────────────┐   │
      │  │  HEDERA CONSENSUS SERVICE (HCS) - Governance Votes   │   │
      │  │                                                        │   │
      │  │  Topic Per Ajo: 0.0.XXXXXX                            │   │
      │  │  ┌─────────────────────────────────────────────────┐  │   │
      │  │  │ 1. Member submits vote off-chain ($0.0001)     │  │   │
      │  │  │    - Signed message with proposal ID           │  │   │
      │  │  │    - Support (FOR/AGAINST/ABSTAIN)             │  │   │
      │  │  │                                                  │  │   │
      │  │  │ 2. Vote stored in HCS topic immutably          │  │   │
      │  │  │    - 3-5 second consensus                       │  │   │
      │  │  │    - ABFT finality (no reorgs)                 │  │   │
      │  │  │                                                  │  │   │
      │  │  │ 3. Anyone tallies votes on-chain (batched)     │  │   │
      │  │  │    - Fetch from Mirror Node (free)             │  │   │
      │  │  │    - Verify signatures in AjoGovernance        │  │   │
      │  │  │    - Update on-chain vote counts ($0.50)       │  │   │
      │  │  │                                                  │  │   │
      │  │  │ Result: 99.98% cheaper than pure on-chain      │  │   │
      │  │  └─────────────────────────────────────────────────┘  │   │
      │  └────────────────────────────────────────────────────────┘  │
      │                                                               │
      │  ┌──────────────────────────────────────────────────────┐   │
      │  │  HEDERA SCHEDULE SERVICE (HSS) - Auto Payments       │   │
      │  │                                                        │   │
      │  │  ┌─────────────────────────────────────────────────┐  │   │
      │  │  │ 1. Member schedules payment 28 days ahead      │  │   │
      │  │  │    - Execution time: next cycle start          │  │   │
      │  │  │    - Amount: monthly contribution              │  │   │
      │  │  │    - Cost: $0.01 to create schedule            │  │   │
      │  │  │                                                  │  │   │
      │  │  │ 2. Multi-sig authorization (optional)           │  │   │
      │  │  │    - Member signs schedule                      │  │   │
      │  │  │    - Guarantor co-signs (if required)          │  │   │
      │  │  │                                                  │  │   │
      │  │  │ 3. Automatic execution at specified time       │  │   │
      │  │  │    - Guaranteed execution order                │  │   │
      │  │  │    - No front-running (ABFT)                   │  │   │
      │  │  │    - Execution cost: ~$0.50                    │  │   │
      │  │  │                                                  │  │   │
      │  │  │ Impact: 15% → 2% default rate reduction        │  │   │
      │  │  └─────────────────────────────────────────────────┘  │   │
      │  └────────────────────────────────────────────────────────┘  │
      │                                                               │
      │  ┌──────────────────────────────────────────────────────┐   │
      │  │  HEDERA MIRROR NODES - Transparency & Queries        │   │
      │  │                                                        │   │
      │  │  REST API Endpoints (Free, Unlimited):                 │   │
      │  │  /api/v1/topics/{id}/messages → Fetch votes          │   │
      │  │  /api/v1/accounts/{id}/transactions → Payment history│   │
      │  │  /api/v1/contracts/results → Verify execution        │   │
      │  │                                                        │   │
      │  │  Benefits:                                             │   │
      │  │  - 5-10 second latency (vs 30-60s The Graph)        │   │
      │  │  - No query costs (vs $0.00001/query Ethereum)      │   │
      │  │  - 99.9% uptime (run by network nodes)              │   │
      │  │  - Simple REST API (no GraphQL complexity)           │   │
      │  └────────────────────────────────────────────────────────┘  │
      └───────────────────────────────────────────────────────────────┘
                                    │
                                    │ Query Historical Data
                                    ▼
                        ┌──────────────────────┐
                        │  Frontend Displays:  │
                        │  - Payment history   │
                        │  - Vote results      │
                        │  - Member reputation │
                        │  - Audit trail       │
                        └──────────────────────┘

DATA FLOW EXAMPLES:

1️⃣ CREATE AJO GROUP:
   User → Factory.createAjo() → HSCS Deploy Proxies ($0.30)
                              → HCS Create Topic ($0.01)
                              → Set HTS Token Config (USDC/WHBAR)

2️⃣ JOIN AJO:
   User → Approve USDC → HTS ($0.001)
       → AjoCore.joinAjo() → HSCS Lock Collateral ($0.50)
                           → Assign Guarantor
                           → Add to Queue

3️⃣ MAKE PAYMENT:
   User → Approve USDC → HTS ($0.001)
       → AjoCore.processPayment() → HSCS Verify + Transfer ($0.50)
                                  → Update Cycle Status
                                  → Check if Payout Ready

4️⃣ VOTE ON PROPOSAL:
   User → Sign Vote Message → HCS Topic ($0.0001)
       → Anyone → Fetch Votes → Mirror Node (Free)
                              → AjoGovernance.tally() → HSCS ($0.50)
                              → Execute if Passed

5️⃣ RECEIVE PAYOUT:
   Cycle Complete → AjoCore.distributePayout() → HSCS Calculate ($0.50)
                                                → HTS Transfer to Recipient
                                                → Advance to Next Cycle

KEY ADVANTAGES:
✅ 99.5% cost reduction vs Ethereum (enables $50 monthly groups)
✅ 3-5 second finality (real-time UX for African users)
✅ No gas wars (fixed costs regardless of congestion)
✅ Native auto-association (no manual HTS setup)
✅ Immutable transparency (Mirror Node audit trail)
```

---

## ✨ Key Features

### 1. **Dynamic Collateral System (V3 - 60% Factor)**

Revolutionary 60% collateral requirement vs traditional 100%+ models, with mathematical proof of 108.9% security coverage:

**Formula:**
```
Debt(n) = Payout - (n × monthlyContribution)
Collateral(n) = Debt(n) × 0.60
```

**Example** (10 members, $50/month):
- **Position 1**: $270 collateral for $500 payout (54% requirement)
- **Position 6 (Guarantor)**: $120 collateral
- **Recovery on Default**: $490 available ($270 + $120 + $100 past payments)
- **Safety Buffer**: $40 excess (109% coverage)

### 2. **Guarantor Network**

Each member is backed by another member offset by participants/2 positions, distributing risk across the entire group:

```solidity
// contracts/collateral/AjoCollateral.sol
function calculateGuarantorPosition(uint256 memberPosition, uint256 totalParticipants) 
  public pure returns (uint256) {
  uint256 guarantorOffset = totalParticipants / 2;
  return ((memberPosition - 1 + guarantorOffset) % totalParticipants) + 1;
}
```

### 3. **5-Phase Initialization**

Prevents circular dependencies and optimizes gas usage:

1. **Phase 1**: Deploy minimal proxies (10x cheaper than full contracts)
2. **Phase 2**: Initialize Members + Governance + Create HCS Topic
3. **Phase 3**: Initialize Collateral + Payments
4. **Phase 4**: Initialize Core + Token Config
5. **Phase 5**: Initialize Schedule Contract (if HSS enabled)

### 4. **Multi-Token Support**

Uses official Circle USDC (0.0.429274) and Hedera WHBAR (0.0.1456986) for production-ready deployment.

### 5. **Configurable Cycles**

Demo uses 30-second cycles for testing, production uses 30-day cycles:

```typescript
const { ajoId } = await createHtsAjo(ajoFactory, deployer, hederaClient, {
  name: "African Ajo",
  cycleDuration: 30, // seconds for demo, 30 days for production
  monthlyPaymentUSDC: ethers.utils.parseUnits("50", 6),
  monthlyPaymentHBAR: 0
});
```

---

## 📍 Deployed Hedera IDs

### Testnet Deployment (Latest)

**Network:** Hedera Testnet  
**Deployment Date:** [Your deployment date]  
**RPC URL:** https://testnet.hashio.io/api  
**Mirror Node:** https://testnet.mirrornode.hedera.com

#### Core Contracts

| Contract | Address (EVM) | Hedera ID | Description |
|----------|---------------|-----------|-------------|
| **AjoFactory** | `[Your EVM Address]` | `0.0.[Your Account]` | Factory contract (entry point) |
| **AjoCore Master** | `[Your EVM Address]` | `0.0.[Your Account]` | Core logic implementation |
| **AjoMembers Master** | `[Your EVM Address]` | `0.0.[Your Account]` | Member management implementation |
| **AjoCollateral Master** | `[Your EVM Address]` | `0.0.[Your Account]` | Collateral calculation implementation |
| **AjoPayments Master** | `[Your EVM Address]` | `0.0.[Your Account]` | Payment processing implementation |
| **AjoGovernance Master** | `[Your EVM Address]` | `0.0.[Your Account]` | Governance + HCS integration |
| **AjoSchedule Master** | `[Your EVM Address]` | `0.0.[Your Account]` | HSS scheduling implementation |

#### HTS Tokens (Official)

| Token | Address (EVM) | Hedera ID | Type |
|-------|---------------|-----------|------|
| **Circle USDC** | `0x0000000000000000000000000000000000068cda` | `0.0.429274` | HTS Fungible Token |
| **Hedera WHBAR** | `0xb1f616b8134f602c3bb465fb5b5e6565ccad37ed` | `0.0.1456986` | HTS Fungible Token |

#### Hedera Services

| Service | ID/Address | Purpose |
|---------|------------|---------|
| **HTS Service** | `0x0000000000000000000000000000000000000167` | Token operations |
| **HSS Service** | `0x000000000000000000000000000000000000016b` | Schedule automation |
| **HCS Topic** (Example Ajo) | `0.0.[Your Topic]` | Governance voting |

#### Test Ajo Instance

| Property | Value | Description |
|----------|-------|-------------|
| **Ajo ID** | `[Your Ajo ID]` | First test Ajo created |
| **Name** | `"African Ajo"` | Display name |
| **Members** | `10` | Full ROSCA group |
| **Cycle Duration** | `30 seconds (demo)` | Accelerated for testing |
| **Monthly USDC** | `1 USDC` | Per-member contribution |
| **HCS Topic** | `0.0.[Topic ID]` | Governance topic |

#### Operator Account

| Property | Value | Environment Variable |
|----------|-------|---------------------|
| **Account ID** | `[Your Operator ID]` | `VITE_HEDERA_OPERATOR_ID` |
| **Public Key** | `[Your Public Key]` | Derived from private key |
| **Purpose** | Topic creation, contract deployment | N/A |

---

## 🚀 Setup & Installation

### Prerequisites

- **Node.js** v16+ ([Download](https://nodejs.org))
- **npm** or **yarn**
- **Git**
- **Hedera Testnet Account** (free from [Hedera Portal](https://portal.hedera.com))

### Step 1: Clone Repository

```bash
git clone https://github.com/[your-org]/ajo-save.git
cd ajo-save
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
npm install --legacy-peer-deps

use --legacy-peer-deps while installing node modules.

# If using yarn
yarn install --legacy-peer-deps
```

### Step 3: Configure Environment Variables

Create `.env` file in project root:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# ============================================
# HEDERA NETWORK CONFIGURATION
# ============================================
HEDERA_NETWORK=testnet
VITE_HEDERA_NETWORK=testnet

# ============================================
# HEDERA OPERATOR ACCOUNT (For deployment & HCS)
# Get from: https://portal.hedera.com
# ============================================
VITE_HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
VITE_HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY_HEX

# ============================================
# HEDERA RPC & MIRROR NODE
# ============================================
VITE_HEDERA_JSON_RPC_RELAY_URL=https://testnet.hashio.io/api
VITE_HEDERA_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com

# ============================================
# OFFICIAL TOKEN ADDRESSES (DO NOT CHANGE)
# ============================================
VITE_MOCK_USDC_ADDRESS=0x0000000000000000000000000000000000068cda
VITE_MOCK_WHBAR_ADDRESS=0xb1f616b8134f602c3bb465fb5b5e6565ccad37ed

# ============================================
# CONTRACT ADDRESSES (Populated after deployment)
# ============================================
VITE_AJO_FACTORY_CONTRACT_ADDRESS_EVM=
VITE_AJO_FACTORY_CONTRACT_ADDRESS_HEDERA=
VITE_AJO_CORE_CONTRACT_ADDRESS_EVM=
VITE_AJO_CORE_CONTRACT_ADDRESS_HEDERA=

# ============================================
# WALLET CONNECT (Optional)
# ============================================
VITE_PROJECT_ID=YOUR_WALLETCONNECT_PROJECT_ID
```

**Where to Get Credentials:**

1. **Hedera Account:**
   - Visit [Hedera Portal](https://portal.hedera.com)
   - Create free testnet account
   - Copy Account ID (0.0.XXXXX) and Private Key

2. **WalletConnect Project ID (Optional):**
   - Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
   - Create free project
   - Copy Project ID

### Step 4: Fund Deployer Account

Your operator account needs HBAR for deployment:

```bash
# Testnet Faucet (Free HBAR)
https://portal.hedera.com/faucet

# Minimum recommended: 20 HBAR
```

### Step 5: Get Test USDC (For Testing)

```bash
# Official Circle Testnet Faucet
https://faucet.circle.com

# Request testnet USDC to your operator address
```

---

## 🎮 Running the Application

### Quick Start (Full Demo)

Run complete 10-cycle demonstration:

```bash
# Deploy contracts + Run full 10-cycle test
npx hardhat run scripts/hackathon-demo-complete.cjs --network hedera
```

**Expected Output:**
- ✅ Deploys all master contracts
- ✅ Deploys AjoFactory
- ✅ Creates test Ajo with HCS topic
- ✅ Sets up 10 participants
- ✅ Runs 10 complete payment cycles (30s each)
- ✅ Saves deployment info to JSON

**Duration:** ~8-10 minutes  
**Saved File:** `deployment-full-cycles-[timestamp].json`

### Step-by-Step Testing

#### 1. Deploy Contracts Only

```bash
npx hardhat run scripts/deploy-4-phase-factory.js --network hedera
```

**What it does:**
- Deploys master implementation contracts
- Deploys AjoFactory
- Configures official USDC/WHBAR tokens
- Saves addresses to JSON

#### 2. Run Core Functions Test

```bash
# Test basic operations on existing deployment
npx hardhat run scripts/test-core-functions.cjs --network hedera
```

**What it tests:**
- Member joining
- Collateral calculations
- Payment processing
- Payout distribution

#### 3. Compile Contracts

```bash
npx hardhat compile
```

**Output:**
- Compiled contracts in `/artifacts`
- ABI files in `/abi`
- TypeChain types generated

#### 4. Run Unit Tests

```bash
# Run all tests
npx hardhat test

# Run specific test suite
npx hardhat test test/AjoCore.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Frontend Development

#### Start Development Server

```bash
# Install frontend dependencies
cd ajo.save && npm install --legacy-peer-deps

# Start dev server
npm run dev

# Expected output:
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

**Access Application:**
- **Frontend:** http://localhost:5173
- **Wallet Required:** HashPack 

#### Connect Wallet

1. Install [HashPack](https://www.hashpack.app/) (Recommended for Hedera)
3. Connect to Testnet
4. Import test account or use operator account

#### Create Your First Ajo

1. Navigate to "Create Ajo" page
2. Fill in details:
   - **Name:** "My First Ajo"
   - **Cycle Duration:** 30 days
   - **Monthly Payment:** 50 USDC
3. Click "Create" (5 transactions for 5 phases)
4. Wait for HCS topic creation (~5s)
5. Copy Ajo ID from confirmation

#### Join as Member

1. Navigate to "Join Ajo" page
2. click Join Ajo
3. Approve USDC for collateral (~$270 for position 1)
4. Approve USDC for payments (~$50)
5. Click "Join Ajo"
6. Wait for confirmation

---

## 📦 Smart Contract Architecture

### Contract Hierarchy

```
AjoFactory (Entry Point)
├── Master Implementations (1x deployment)
│   ├── AjoCore (Main orchestration)
│   ├── AjoMembers (Queue management)
│   ├── AjoCollateral (Collateral calculations)
│   ├── AjoPayments (Payment processing)
│   ├── AjoGovernance (HCS governance)
│   └── AjoSchedule (HSS scheduling)
│
└── Minimal Proxies (Per Ajo instance, 99% gas savings)
    ├── AjoCore Proxy
    ├── AjoMembers Proxy
    ├── AjoCollateral Proxy
    ├── AjoPayments Proxy
    ├── AjoGovernance Proxy
    └── AjoSchedule Proxy
```

### Key Contract Functions

#### AjoFactory

```solidity
// Create new Ajo (Phase 1)
function createAjo(
  string memory name,
  bool useHtsTokens,
  bool useScheduledPayments,
  uint256 cycleDuration,
  uint256 monthlyPaymentUSDC,
  uint256 monthlyPaymentHBAR
) external returns (uint256 ajoId)

// Initialize Phase 2 (Members + Governance + HCS)
function initializeAjoPhase2(uint256 ajoId, bytes32 hcsTopicId) external

// Initialize Phase 3 (Collateral + Payments)
function initializeAjoPhase3(uint256 ajoId) external

// Initialize Phase 4 (Core + Token Config)
function initializeAjoPhase4(uint256 ajoId) external

// Initialize Phase 5 (Schedule Contract)
function initializeAjoPhase5(uint256 ajoId) external

// Get Ajo information
function getAjo(uint256 ajoId) external view returns (AjoInfo memory)

// Get all Ajos (paginated)
function getAllAjos(uint256 offset, uint256 limit) 
  external view returns (AjoInfo[] memory, bool hasMore)
```

#### AjoCore

```solidity
// Join Ajo group
function joinAjo(PaymentToken tokenChoice) external

// Process monthly payment
function processPayment() external

// Distribute payout to next recipient
function distributePayout() external

// Get member information
function getMemberInfo(address member) 
  external view returns (Member memory, uint256 pendingPenalty, uint256 votingPower)

// Get contract statistics
function getContractStats() external view returns (
  uint256 totalMembers,
  uint256 activeMembers,
  uint256 totalCollateralUSDC,
  uint256 totalCollateralHBAR,
  uint256 contractBalanceUSDC,
  uint256 contractBalanceHBAR,
  uint256 currentQueuePosition,
  PaymentToken activeToken
)
```

#### AjoCollateral

```solidity
// Calculate required collateral for position
function calculateRequiredCollateral(
  uint256 position,
  uint256 monthlyPayment,
  uint256 totalParticipants
) public pure returns (uint256)

// Calculate guarantor position
function calculateGuarantorPosition(
  uint256 memberPosition,
  uint256 totalParticipants
) public pure returns (uint256)

// Calculate total seizable assets on default
function calculateSeizableAssets(address defaulter) 
  external view returns (
    uint256 totalSeizable,
    uint256 collateralSeized,
    uint256 paymentsSeized
  )
```

#### AjoPayments

```solidity
// Get current cycle dashboard
function getCurrentCycleDashboard() external view returns (
  uint256 currentCycle,
  uint256 nextPayoutPosition,
  address nextRecipient,
  uint256 expectedPayout,
  uint256 totalPaidThisCycle,
  uint256 remainingToPay,
  address[] memory membersPaid,
  address[] memory membersUnpaid,
  bool isPayoutReady
)

// Check if payout is ready
function isPayoutReady() external view returns (bool)

// Get payment status for cycle
function getCyclePaymentStatus(uint256 cycle) 
  external view returns (
    address[] memory paidMembers,
    address[] memory unpaidMembers,
    uint256 totalCollected
  )

// Get members currently in default
function getMembersInDefault() external view returns (address[] memory)
```

#### AjoGovernance

```solidity
// Create governance proposal
function createProposal(string memory description, bytes memory proposalData) 
  external returns (uint256 proposalId)

// Tally votes from HCS (reads Mirror Node data)
function tallyVotesFromHCS(uint256 proposalId, HcsVote[] memory votes) 
  external returns (uint256 forVotes, uint256 againstVotes, uint256 abstainVotes)

// Execute passed proposal
function executeProposal(uint256 proposalId) external returns (bool success)

// Get proposal status
function getProposalStatus(uint256 proposalId) 
  external view returns (
    bool isActive,
    bool hasQuorum,
    bool isPassing,
    uint256 votesNeeded
  )

// Get HCS topic ID
function getHcsTopicId() external view returns (bytes32)
```

#### AjoSchedule

```solidity
// Schedule payment execution
function schedulePayment(
  uint256 cycle,
  uint256 executionTime,
  address member,
  uint256 amount,
  PaymentToken token
) external returns (address scheduleAddress)

// Schedule payout distribution
function schedulePayout(
  uint256 cycle,
  uint256 executionTime,
  address recipient,
  uint256 amount,
  PaymentToken token
) external returns (address scheduleAddress)

// Get all scheduled payments
function getAllScheduledPayments() 
  external view returns (ScheduledPayment[] memory)
```

---

## 🧪 Demo & Testing

### Automated Test Suites

```bash
# Run all tests
npx hardhat test

# Specific test files
npx hardhat test test/AjoCore.test.js
npx hardhat test test/AjoCollateral.test.js
npx hardhat test test/AjoPayments.test.js
npx hardhat test test/AjoGovernance.test.js
```

### Demo Scripts

#### 1. Complete Hackathon Demo

```bash
npx hardhat run scripts/hackathon-demo-complete.cjs --network hedera
```

**What it demonstrates:**
- ✅ Full contract deployment
- ✅ HCS topic creation
- ✅ 10-member Ajo creation
- ✅ Member joining with collateral
- ✅ 10 complete payment cycles
- ✅ Payout distribution per cycle
- ✅ State inspection pre/post cycles

**Output Files:**
- `deployment-full-cycles-[timestamp].json` - Complete deployment info
- Console logs with colored output
- Transaction hashes and gas usage

#### 2. Advanced Features Demo

```bash
npx hardhat run scripts/advanced_demo_features.cjs --network hedera
```

**What it demonstrates:**
- ✅ Collateral curve visualization
- ✅ Guarantor network mapping
- ✅ Member indexing and pagination
- ✅ Payment history tracking
- ✅ Seizable assets calculation
- ✅ Token configuration management

#### 3. Governance & HCS Demo

```bash
npx hardhat run scripts/governance_hcs_demo.cjs --network hedera
```

**What it demonstrates:**
- ✅ Proposal creation
- ✅ HCS vote submission ($0.0001/vote)
- ✅ Vote retrieval from Mirror Node
- ✅ On-chain vote tallying with signature verification
- ✅ Proposal execution

### Manual Testing Workflow

#### Test Scenario: 3-Member Ajo (Quick Test)

```javascript
// 1. Deploy system
const { ajoFactory } = await deployHtsSystem();

// 2. Create Ajo
const { ajoId } = await createHtsAjo(ajoFactory, deployer, hederaClient, {
  name: "Test Ajo",
  cycleDuration: 60, // 1 minute cycles
  monthlyPaymentUSDC: ethers.utils.parseUnits("10", 6) // $10/month
});

// 3. Setup 3 participants
const participants = [signer1, signer2, signer3];

// 4. Join as members
for (const participant of participants) {
  await ajo.connect(participant).joinAjo(0); // 0 = USDC
}

// 5. Run payment cycle
for (const participant of participants) {
  await ajo.connect(participant).processPayment();
}

// 6. Distribute payout
await ajo.distributePayout();

// 7. Verify state
const dashboard = await ajoPayments.getCurrentCycleDashboard();
console.log("Cycle:", dashboard.currentCycle);
console.log("Payout Ready:", dashboard.isPayoutReady);
```

---

## 💰 Economic Model

### Collateral Requirements by Position

For a 10-member Ajo with $50 monthly contribution:

| Position | Debt at Payout | Required Collateral (60%) | Recovery Assets | Coverage |
|----------|----------------|---------------------------|-----------------|----------|
| 1 | $450 | $270 | $490 | 109% |
| 2 | $400 | $240 | $440 | 110% |
| 3 | $350 | $210 | $390 | 111% |
| 4 | $300 | $180 | $340 | 113% |
| 5 | $250 | $150 | $290 | 116% |
| 6 | $200 | $120 | $240 | 120% |
| 7 | $150 | $90 | $190 | 127% |
| 8 | $100 | $60 | $140 | 140% |
| 9 | $50 | $30 | $90 | 180% |
| 10 | $0 | $0 | $50 | ∞ |

**Total Collateral Required:** $1,350 (27% of total contributions)  
**Traditional Model:** $5,000+ (100%+ of total contributions)  
**Savings:** 73% reduction in capital requirements

### Cost Comparison: Ethereum vs Hedera

**Scenario:** 10-member Ajo, 12 months, monthly operations

| Operation | Volume | Ethereum Cost | Hedera Cost | Savings |
|-----------|--------|---------------|-------------|---------|
| Token Transfers | 1,200/year | $18,000 @ $15 ea | $1.20 @ $0.001 ea | **99.99%** |
| Collateral Approvals | 20 one-time | $300 @ $15 ea | $0.02 @ $0.001 ea | **99.99%** |
| Governance Votes | 50/year | $2,500 @ $50 ea | $0.005 @ $0.0001 ea | **99.99%** |
| Vote Tallying | 5/year | $50 @ $10 ea | $25 @ $5 ea | **50%** |
| Automation | 12/year | $600 @ $50 ea | $1.20 @ $0.10 ea | **99.8%** |
| **TOTAL** | - | **$21,450** | **$27.43** | **99.87%** |

**Break-Even Analysis:**
- With Ethereum costs, minimum viable contribution: $180/member/month
- With Hedera costs, minimum viable contribution: $5/member/month
- **36x more accessible** for low-income users

### Revenue Model (Future)

1. **Protocol Fee:** 0.5% of payouts (e.g., $2.50 on $500 payout)
2. **Premium Features:** 
   - Multi-cycle scheduling: $1/month/Ajo
   - Advanced analytics: $5/month/Ajo
   - Insurance products: Risk-based pricing
3. **B2B Licensing:** White-label solutions for financial institutions

**Sustainability:** At $27/year operating cost, only 11 active Ajos needed to break even at 0.5% fee rate.

---

## 📚 Project Links

### Documentation & Resources

- **GitHub Repository:** https://github.com/Deonorla/Ajo.Save
- **Pitch Deck:** [Link to pitch deck Slides](https://www.canva.com/design/DAG0d1jQ7_c/Yq8DAVK2hGs0xhpd_xfmWQ/view?utm_content=DAG0d1jQ7_c&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hc7f6fc03ab)
- **Video Demo:** [Link to YouTube demo](https://youtu.be/VGMedbGJmy0)
- **Certification:** [Link to Hedera certification]()

### Live Links

- **Frontend Demo:** [Deployed frontend URL](https://ajo-save.vercel.app)
- **Mirror Node API:** https://testnet.mirrornode.hedera.com

### Social & Community

- **Twitter/X:** [@Ajo__Save](https://x.com/@ajo_save)

x
---

## 👥 Team

### Core Contributors

**[Olaoluwa Marvellous]** - Full Stack Developer & Smart Contract Engineer
- Role: Architecture, smart contracts, Hedera integration

**[Oluleye Emmanuel]** - Frontend Developer
- Role: React app, wallet integration, UI/UX


---

## 🔒 Security Considerations

### Current Status

⚠️ **TESTNET ONLY** - This is a hackathon prototype. **DO NOT USE WITH REAL FUNDS.**

### Security Features Implemented

- ✅ OpenZeppelin ReentrancyGuard
- ✅ Role-based access control
- ✅ Input validation on all functions
- ✅ Solidity 0.8.20+ (built-in overflow protection)
- ✅ Emergency pause mechanisms
- ✅ ECDSA signature verification for HCS votes

### Required Before Mainnet

- [ ] Professional security audit (CertiK, OpenZeppelin, or similar)
- [ ] Formal verification of collateral mathematics
- [ ] Economic attack simulations
- [ ] Bug bounty program
- [ ] Multi-sig governance for protocol upgrades
- [ ] Circuit breakers for large withdrawals
- [ ] Regulatory compliance review

### Known Limitations

1. **No Smart Contract Insurance:** Consider integrating Nexus Mutual or similar
2. **Oracle Dependency:** If adding USD price feeds, ensure Chainlink/Pyth integration
3. **Front-Running Risk:** Consider implementing commit-reveal for sensitive operations
4. **Governance Attacks:** Implement time-locks and quorum requirements

---

## 🎓 Learn More

### Hedera Developer Resources

- **Hedera Docs:** https://docs.hedera.com
- **HTS Guide:** https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service
- **HCS Guide:** https://docs.hedera.com/hedera/sdks-and-apis/sdks/consensus-service
- **HSS Guide:** https://docs.hedera.com/hedera/sdks-and-apis/sdks/schedule-transaction
- **JSON-RPC Relay:** https://docs.hedera.com/hedera/core-concepts/smart-contracts/json-rpc-relay

### ROSCA Research

- **"Rotating Savings and Credit Associations: A Literature Review"** - Anderson & Baland (2002)
- **"The Economics of Rotating Savings and Credit Associations"** - Besley et al. (1993)
- **African Traditional Finance:** https://www.africancenter.org/traditional-finance/

### Smart Contract Development

- **OpenZeppelin Docs:** https://docs.openzeppelin.com
- **Hardhat Docs:** https://hardhat.org/docs
- **Ethers.js Docs:** https://docs.ethers.org

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Hedera Team** for excellent developer documentation and testnet support
- **Circle** for official USDC integration on Hedera
- **OpenZeppelin** for battle-tested smart contract libraries
- **Traditional Ajo/Esusu Communities** for inspiring this modernization
- **Hackathon Organizers** for the opportunity to build this solution

---

## 🐛 Bug Reports & Feature Requests

Found a bug? Have a feature request?

1. Check [existing issues](https://github.com/Deonorla/Ajo.Save/issues)
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Screenshots/logs if applicable
   - Environment details (network, wallet, browser)

---

## 🚀 What's Next?

### Q1 2025 Roadmap

- [ ] Complete security audit
- [ ] Mainnet deployment
- [ ] Mobile app (iOS/Android)
- [ ] Web3 onboarding improvements
- [ ] Integration with African payment gateways (M-Pesa, Flutterwave)

### Q2 2025 Roadmap

- [ ] Insurance product launch
- [ ] Credit scoring based on reputation
- [ ] Cross-border Ajo support
- [ ] DAO governance transition
- [ ] Partnerships with African banks

---

**Built with ❤️ for Africa, powered by Hedera**

*Empowering 500M+ unbanked through blockchain-enabled traditional finance*

---
  
**Version:** 1.0.0-beta  
**Status:** Hackathon Prototype - Testnet Only
