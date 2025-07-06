// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/// @title ParagonMembership – Single-tier membership paid in USDT
contract ParagonMembership is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;            // Basic ERC-20 operations
    IERC20Metadata public immutable meta;    // To read decimals/name/symbol

    address public treasury;
    uint256 public membershipFeeUSDT;

    uint256 public totalMembers;
    uint256 public totalFeesCollected;

    mapping(address => bool) public isMember;
    mapping(address => uint256) public joinedAt;

    event MemberJoined(address indexed user, uint256 timestamp, uint256 amount);
    event MemberRemoved(address indexed user);
    event FeeUpdated(uint256 newFee);
    event TreasuryUpdated(address newTreasury);

    constructor(
        address _initialOwner,
        address _usdt,
        address _treasury,
        uint256 _fee
    ) Ownable(_initialOwner) {
        require(_usdt != address(0), "Invalid USDT");
        require(_treasury != address(0), "Invalid treasury");
        usdt = IERC20(_usdt);
        meta = IERC20Metadata(_usdt);
        treasury = _treasury;
        membershipFeeUSDT = _fee;
    }

    modifier onlyNonMember() {
        require(!isMember[msg.sender], "Already a member");
        _;
    }

    /// @notice Join by paying the membership fee (caller must approve first)
    function joinCircle() external nonReentrant whenNotPaused onlyNonMember {
        usdt.safeTransferFrom(msg.sender, treasury, membershipFeeUSDT);
        isMember[msg.sender] = true;
        joinedAt[msg.sender] = block.timestamp;
        totalMembers += 1;
        totalFeesCollected += membershipFeeUSDT;
        emit MemberJoined(msg.sender, block.timestamp, membershipFeeUSDT);
    }

    /// @notice Owner can manually add a member without requiring payment
    function manualAddMember(address user) external onlyOwner {
        require(user != address(0), "Invalid address");
        require(!isMember[user], "Already a member");

        isMember[user] = true;
        joinedAt[user] = block.timestamp;
        totalMembers += 1;
        emit MemberJoined(user, block.timestamp, 0);
    }

    /// @notice Owner can revoke a member manually
    function removeMember(address user) external onlyOwner {
        require(isMember[user], "Not a member");
        isMember[user] = false;
        totalMembers -= 1;
        emit MemberRemoved(user);
    }

    /// ---------------------------------------------------------------------
    /// View helpers
    /// ---------------------------------------------------------------------

    /// @notice Returns USDT token decimals (helps frontend determine 6 vs 18)
    function getUSDTDecimals() external view returns (uint8) {
        return meta.decimals();
    }

    /// ---------------------------------------------------------------------
    /// Admin controls
    /// ---------------------------------------------------------------------

    function updateFee(uint256 newFee) external onlyOwner {
        membershipFeeUSDT = newFee;
        emit FeeUpdated(newFee);
    }

    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Zero address");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
