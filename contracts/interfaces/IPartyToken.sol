pragma solidity 0.8.5;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPartyToken is IERC20{
    function lockupTransfer(address recipient, uint256 amount) external returns (bool);
}
