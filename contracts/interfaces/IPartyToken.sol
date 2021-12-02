pragma solidity 0.8.5;

interface IPartyToken {
    function lockupTransfer(address recipient, uint256 amount) external returns (bool);
}
