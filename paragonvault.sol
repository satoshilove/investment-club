// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IMembership {
    function isMember(address user) external view returns (bool);
}

contract ParagonVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;
    IMembership public membership;
    address public treasury;
    bool public emergencyUnlock;

    struct Deposit {
        uint256 amount;
        uint256 unlockTime;
        uint256 poolId;
    }

    struct Pool {
        string name;
        uint256 lockDuration;
        uint8 feePercent;
        bool active;
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 totalProfit;
        uint256 capitalSentOut;
    }

    uint256 public totalDeposited;
    uint256 public totalProfits;
    uint256 public poolCount;

    mapping(uint256 => Pool) public pools;
    mapping(address => uint256) public userPrincipal;
    mapping(address => mapping(uint256 => uint256)) public userPoolProfits;
    mapping(address => Deposit[]) public deposits;
    mapping(address => bool) public approvedInvestmentPools;
    address[] public allUsers;
    mapping(address => bool) internal knownUsers;

    event PoolCreated(uint256 indexed id, string name, uint256 duration, uint8 fee);
    event PoolStatusUpdated(uint256 indexed id, bool active);
    event Deposited(address indexed user, uint256 amount, uint256 unlock, uint256 poolId);
    event Withdrawn(address indexed user, uint256 principal, uint256 profit, uint256 fee, uint256 payout, uint256 poolId);
    event ProfitAdded(address indexed user, uint256 amount, uint256 poolId);
    event ProfitDistributed(uint256 indexed poolId, uint256 amount);
    event CapitalMoved(uint256 indexed poolId, address to, uint256 amount);
    event PoolApprovalUpdated(address indexed pool, bool approved);
    event MembershipUpdated(address indexed newMembership);
    event EmergencyUnlockToggled(bool enabled);

    constructor(address _owner, address _usdt, address _membership, address _treasury) Ownable(_owner) {
        require(_usdt != address(0) && _membership != address(0) && _treasury != address(0), "Zero address");
        usdt = IERC20(_usdt);
        membership = IMembership(_membership);
        treasury = _treasury;
    }

    modifier onlyMember() {
        require(membership.isMember(msg.sender), "Not member");
        _;
    }

    function createPool(string memory name, uint256 duration, uint8 feePercent) external onlyOwner {
        require(duration >= 1 days && duration <= 5 * 365 days, "Bad duration");
        require(feePercent <= 20, "Fee too high");

        pools[poolCount] = Pool(name, duration, feePercent, true, 0, 0, 0, 0);
        emit PoolCreated(poolCount, name, duration, feePercent);
        poolCount++;
    }

    function setPoolStatus(uint256 id, bool status) external onlyOwner {
        require(id < poolCount, "Bad id");
        pools[id].active = status;
        emit PoolStatusUpdated(id, status);
    }

    function deposit(uint256 amount, uint256 poolId) external onlyMember nonReentrant whenNotPaused {
        require(amount > 0 && poolId < poolCount, "Invalid");
        Pool storage p = pools[poolId];
        require(p.active, "Inactive");

        uint256 unlock = block.timestamp + p.lockDuration;
        usdt.safeTransferFrom(msg.sender, address(this), amount);

        deposits[msg.sender].push(Deposit(amount, unlock, poolId));
        userPrincipal[msg.sender] += amount;
        totalDeposited += amount;
        p.totalDeposited += amount;

        if (!knownUsers[msg.sender]) {
            knownUsers[msg.sender] = true;
            allUsers.push(msg.sender);
        }

        emit Deposited(msg.sender, amount, unlock, poolId);
    }

    function withdraw(uint256 index) external nonReentrant whenNotPaused {
        require(index < deposits[msg.sender].length, "Bad index");
        Deposit memory d = deposits[msg.sender][index];
        require(emergencyUnlock || block.timestamp >= d.unlockTime, "Locked");

        Pool storage p = pools[d.poolId];
        uint256 principal = d.amount;
        uint256 profit = userPoolProfits[msg.sender][d.poolId];
        uint256 fee = (profit * p.feePercent) / 100;
        uint256 payout = principal + profit - fee;

        require(usdt.balanceOf(address(this)) >= payout + fee, "Insufficient balance");

        userPoolProfits[msg.sender][d.poolId] = 0;
        deposits[msg.sender][index] = deposits[msg.sender][deposits[msg.sender].length - 1];
        deposits[msg.sender].pop();

        userPrincipal[msg.sender] -= principal;
        totalDeposited -= principal;
        p.totalWithdrawn += principal;

        usdt.safeTransfer(msg.sender, payout);
        if (fee > 0) usdt.safeTransfer(treasury, fee);

        emit Withdrawn(msg.sender, principal, profit, fee, payout, d.poolId);
    }

    function returnFromInvestment(uint256 poolId, uint256 amount) external onlyOwner {
        require(poolId < poolCount && amount > 0, "Invalid");
        Pool storage p = pools[poolId];
        uint256 expected = p.capitalSentOut;
        require(expected > 0, "Nothing sent");

        uint256 profit = amount > expected ? amount - expected : 0;
        p.capitalSentOut = 0;

        if (profit == 0) return;

        p.totalProfit += profit;
        totalProfits += profit;

        uint256 totalPoolPrincipal = p.totalDeposited - p.totalWithdrawn;
        require(totalPoolPrincipal > 0, "No principal");

        for (uint256 i = 0; i < allUsers.length; i++) {
            address u = allUsers[i];
            uint256 userTotal = 0;
            for (uint256 j = 0; j < deposits[u].length; j++) {
                if (deposits[u][j].poolId == poolId) {
                    userTotal += deposits[u][j].amount;
                }
            }
            if (userTotal > 0) {
                uint256 userProfit = (profit * userTotal) / totalPoolPrincipal;
                userPoolProfits[u][poolId] += userProfit;
                emit ProfitAdded(u, userProfit, poolId);
            }
        }
        emit ProfitDistributed(poolId, profit);
    }

    function moveToInvestment(uint256 poolId, address to, uint256 amount) external onlyOwner whenNotPaused {
        require(poolId < poolCount && approvedInvestmentPools[to], "Bad input");
        require(amount <= usdt.balanceOf(address(this)), "Insufficient vault balance");

        pools[poolId].capitalSentOut += amount;
        usdt.safeTransfer(to, amount);
        emit CapitalMoved(poolId, to, amount);
    }

    function addApprovedPool(address pool) external onlyOwner {
        approvedInvestmentPools[pool] = true;
        emit PoolApprovalUpdated(pool, true);
    }

    function removeApprovedPool(address pool) external onlyOwner {
        approvedInvestmentPools[pool] = false;
        emit PoolApprovalUpdated(pool, false);
    }

    function toggleEmergencyUnlock(bool enable) external onlyOwner {
        emergencyUnlock = enable;
        emit EmergencyUnlockToggled(enable);
    }

    function setMembership(address m) external onlyOwner {
        require(m != address(0), "Zero address");
        membership = IMembership(m);
        emit MembershipUpdated(m);
    }

    function setTreasury(address t) external onlyOwner {
        require(t != address(0), "Zero address");
        treasury = t;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getUserDeposits(address user) external view returns (Deposit[] memory) {
        return deposits[user];
    }

    function vaultBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    function getUserPoolProfit(address user, uint256 poolId) external view returns (uint256) {
        return userPoolProfits[user][poolId];
    }

    function getAllUsers() external view returns (address[] memory) {
        return allUsers;
    }

    function getPoolTVL(uint256 poolId) external view returns (uint256) {
        require(poolId < poolCount, "Invalid pool");
        Pool storage p = pools[poolId];
        return p.totalDeposited - p.totalWithdrawn;
    }

    function getAllTVLs() external view returns (uint256[] memory) {
        uint256[] memory tvls = new uint256[](poolCount);
        for (uint256 i = 0; i < poolCount; i++) {
            Pool storage p = pools[i];
            tvls[i] = p.totalDeposited - p.totalWithdrawn;
        }
        return tvls;
    }
}
