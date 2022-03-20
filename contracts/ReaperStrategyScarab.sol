// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./abstract/ReaperBaseStrategyv1_1.sol";
import "./interfaces/IMasterChef.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";

/**
 * @dev Deposit WANT LP in GScarabRewardsPool. Harvest GSCARAB rewards and recompound.
 */
contract ReaperStrategyScarab is ReaperBaseStrategyv1_1 {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // 3rd-party contract addresses
    address public constant SPIRIT_ROUTER = address(0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52);
    IMasterChef public constant GSCARAB_REWARDS_POOL = IMasterChef(0xc88690163b10521d5fB86c2ECB293261F7771525);

    /**
     * @dev Tokens Used:
     * {WFTM} - Required for liquidity routing when doing swaps.
     * {GSCARAB} - Reward token for depositing LP into GScarabRewardPool.
     * {want} - Address of the want LP token.
     * {lpToken0, lpToken1} - want underlying tokens
     */
    IERC20Upgradeable public constant WFTM = IERC20Upgradeable(0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83);
    IERC20Upgradeable public constant GSCARAB = IERC20Upgradeable(0x6ab5660f0B1f174CFA84e9977c15645e4848F5D6);
    IERC20Upgradeable public want;
    address public lpToken0;
    address public lpToken1;

    /**
     * @dev Paths used to swap tokens:
     * {gscarabToWftmPath} - to swap {GSCARAB} to {WFTM}
     * {wftmToLpToken1Path} - to swap {WFTM} to {lpToken1}
     */
    address[] public gscarabToWftmPath;
    address[] public wftmToLpToken1Path;

    /**
     * @dev Tomb variables
     * {poolId} - ID of pool in which to deposit LP tokens
     */
    uint256 public poolId;

    /**
     * @dev Initializes the strategy. Sets parameters, saves routes, and gives allowances.
     * @notice see documentation for each variable above its respective declaration.
     */
    function initialize(
        address _vault,
        address[] memory _feeRemitters,
        address[] memory _strategists,
        address _want,
        uint256 _poolId
    ) public initializer {
        __ReaperBaseStrategy_init(_vault, _feeRemitters, _strategists);
        want = IERC20Upgradeable(_want);
        poolId = _poolId;

        lpToken0 = IUniswapV2Pair(address(want)).token0();
        lpToken1 = IUniswapV2Pair(address(want)).token1();

        gscarabToWftmPath = [address(GSCARAB), address(WFTM)];
        wftmToLpToken1Path = [address(WFTM), lpToken1];
        _giveAllowances();
    }

    /**
     * @dev Function that puts the funds to work.
     *      It gets called whenever someone deposits in the strategy's vault contract.
     */
    function _deposit() internal override {
        uint256 wantBalance = want.balanceOf(address(this));
        if (wantBalance != 0) {
            GSCARAB_REWARDS_POOL.deposit(poolId, wantBalance);
        }
    }

    /**
     * @dev Withdraws funds and sends them back to the vault.
     */
    function _withdraw(uint256 _amount) internal override {
        uint256 wantBal = want.balanceOf(address(this));
        if (wantBal < _amount) {
            GSCARAB_REWARDS_POOL.withdraw(poolId, _amount - wantBal);
        }

        want.safeTransfer(vault, _amount);
    }

    /**
     * @dev Core function of the strat, in charge of collecting and re-investing rewards.
     *      1. Claims {GSCARAB} from the {GSCARAB_REWARDS_POOL}.
     *      2. Swaps {GSCARAB} to {WFTM} using {SPIRIT_ROUTER}.
     *      3. Claims fees for the harvest caller and treasury.
     *      4. Swaps the {WFTM} token for {lpToken0} and {lpToken1} using {SPIRIT_ROUTER}.
     *      5. Creates new LP tokens and deposits.
     */
    function _harvestCore() internal override {
        GSCARAB_REWARDS_POOL.deposit(poolId, 0); // deposit 0 to claim rewards

        uint256 gscarabBal = GSCARAB.balanceOf(address(this));
        _swap(gscarabBal, gscarabToWftmPath, SPIRIT_ROUTER);

        _chargeFees();

        uint256 wftmBalHalf = WFTM.balanceOf(address(this)) / 2;
        _swap(wftmBalHalf, wftmToLpToken1Path, SPIRIT_ROUTER);

        _addLiquidity();
        deposit();
    }

    /**
     * @dev Helper function to swap tokens given an {_amount}, swap {_path}, and {_router}.
     */
    function _swap(
        uint256 _amount,
        address[] memory _path,
        address _router
    ) internal {
        if (_path.length < 2 || _amount == 0) {
            return;
        }

        IUniswapV2Router02(_router).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            _amount,
            0,
            _path,
            address(this),
            block.timestamp
        );
    }

    /**
     * @dev Core harvest function.
     *      Charges fees based on the amount of WFTM gained from reward
     */
    function _chargeFees() internal {
        uint256 wftmFee = (WFTM.balanceOf(address(this)) * totalFee) / PERCENT_DIVISOR;
        if (wftmFee != 0) {
            uint256 callFeeToUser = (wftmFee * callFee) / PERCENT_DIVISOR;
            uint256 treasuryFeeToVault = (wftmFee * treasuryFee) / PERCENT_DIVISOR;
            uint256 feeToStrategist = (treasuryFeeToVault * strategistFee) / PERCENT_DIVISOR;
            treasuryFeeToVault -= feeToStrategist;

            WFTM.safeTransfer(msg.sender, callFeeToUser);
            WFTM.safeTransfer(treasury, treasuryFeeToVault);
            WFTM.safeTransfer(strategistRemitter, feeToStrategist);
        }
    }

    /**
     * @dev Core harvest function. Adds more liquidity using {lpToken0} and {lpToken1}.
     */
    function _addLiquidity() internal {
        uint256 lp0Bal = IERC20Upgradeable(lpToken0).balanceOf(address(this));
        uint256 lp1Bal = IERC20Upgradeable(lpToken1).balanceOf(address(this));

        if (lp0Bal != 0 && lp1Bal != 0) {
            IUniswapV2Router02(SPIRIT_ROUTER).addLiquidity(
                lpToken0,
                lpToken1,
                lp0Bal,
                lp1Bal,
                0,
                0,
                address(this),
                block.timestamp
            );
        }
    }

    /**
     * @dev Function to calculate the total {want} held by the strat.
     *      It takes into account both the funds in hand, plus the funds in the MasterChef.
     */
    function balanceOf() public view override returns (uint256) {
        (uint256 amount, ) = GSCARAB_REWARDS_POOL.userInfo(poolId, address(this));
        return amount + want.balanceOf(address(this));
    }

    /**
     * @dev Returns the approx amount of profit from harvesting.
     *      Profit is denominated in WFTM, and takes fees into account.
     */
    function estimateHarvest() external view override returns (uint256 profit, uint256 callFeeToUser) {
        uint256 pendingReward = GSCARAB_REWARDS_POOL.pendingShare(poolId, address(this));
        uint256 totalRewards = pendingReward + GSCARAB.balanceOf(address(this));

        if (totalRewards != 0) {
            profit += IUniswapV2Router02(SPIRIT_ROUTER).getAmountsOut(totalRewards, gscarabToWftmPath)[1];
        }

        profit += WFTM.balanceOf(address(this));

        uint256 wftmFee = (profit * totalFee) / PERCENT_DIVISOR;
        callFeeToUser = (wftmFee * callFee) / PERCENT_DIVISOR;
        profit -= wftmFee;
    }

    /**
     * @dev Function to retire the strategy. Claims all rewards and withdraws
     *      all principal from external contracts, and sends everything back to
     *      the vault. Can only be called by strategist or owner.
     *
     * Note: this is not an emergency withdraw function. For that, see panic().
     */
    function _retireStrat() internal override {
        GSCARAB_REWARDS_POOL.deposit(poolId, 0); // deposit 0 to claim rewards

        uint256 gscarabBal = IERC20Upgradeable(GSCARAB).balanceOf(address(this));
        _swap(gscarabBal, gscarabToWftmPath, SPIRIT_ROUTER);

        uint256 wftmBalHalf = WFTM.balanceOf(address(this)) / 2;
        _swap(wftmBalHalf, wftmToLpToken1Path, SPIRIT_ROUTER);

        _addLiquidity();

        (uint256 poolBal, ) = GSCARAB_REWARDS_POOL.userInfo(poolId, address(this));
        GSCARAB_REWARDS_POOL.withdraw(poolId, poolBal);

        uint256 wantBalance = want.balanceOf(address(this));
        want.safeTransfer(vault, wantBalance);
    }

    /**
     * Withdraws all funds leaving rewards behind.
     */
    function _reclaimWant() internal override {
        GSCARAB_REWARDS_POOL.emergencyWithdraw(poolId);
    }

    /**
     * @dev Gives all the necessary allowances to:
     *      - deposit {want} into {GSCARAB_REWARDS_POOL}
     *      - swap {GSCARAB} using {SPIRIT_ROUTER}
     *      - swap {WFTM} using {SPIRIT_ROUTER}
     *      - add liquidity using {lpToken0} and {lpToken1} in {SPIRIT_ROUTER}
     */
    function _giveAllowances() internal override {
        want.safeApprove(address(GSCARAB_REWARDS_POOL), 0);
        want.safeApprove(address(GSCARAB_REWARDS_POOL), type(uint256).max);
        IERC20Upgradeable(GSCARAB).safeApprove(SPIRIT_ROUTER, 0);
        IERC20Upgradeable(GSCARAB).safeApprove(SPIRIT_ROUTER, type(uint256).max);
        WFTM.safeApprove(SPIRIT_ROUTER, 0);
        WFTM.safeApprove(SPIRIT_ROUTER, type(uint256).max);
        IERC20Upgradeable(lpToken0).safeApprove(SPIRIT_ROUTER, 0);
        IERC20Upgradeable(lpToken0).safeApprove(SPIRIT_ROUTER, type(uint256).max);
        IERC20Upgradeable(lpToken1).safeApprove(SPIRIT_ROUTER, 0);
        IERC20Upgradeable(lpToken1).safeApprove(SPIRIT_ROUTER, type(uint256).max);
    }

    /**
     * @dev Removes all the allowances that were given above.
     */
    function _removeAllowances() internal override {
        want.safeApprove(address(GSCARAB_REWARDS_POOL), 0);
        IERC20Upgradeable(GSCARAB).safeApprove(SPIRIT_ROUTER, 0);
        WFTM.safeApprove(SPIRIT_ROUTER, 0);
        IERC20Upgradeable(lpToken0).safeApprove(SPIRIT_ROUTER, 0);
        IERC20Upgradeable(lpToken1).safeApprove(SPIRIT_ROUTER, 0);
    }
}
