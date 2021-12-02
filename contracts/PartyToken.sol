// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;

// ============ External Imports: Inherited Contracts ============
import {ERC20VotesComp} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20VotesComp.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";

/*
Party Token
by Anna Carroll
*/
contract PartyToken is ERC20VotesComp, Pausable {
    // ============ Immutables ============

    address public immutable partyDAOMultisig;
    address public immutable deprecationContract;

    // ======== Constructor =========

    constructor(address _partyDAOMultisig, address _deprecationContract) ERC20("PartyDAO", "PARTY") ERC20Permit("PartyDAO") {
        // set partyDAO multisig & deprecation contract addresses
        partyDAOMultisig = _partyDAOMultisig;
        deprecationContract = _deprecationContract;
        // mint 10M totalSupply to partyDAO multisig
        _mint(_partyDAOMultisig, 10_000_000 * (10 ** 18));
        // pause transfers; unpaused when lockup ends
        _pause();
    }

    // ======== External Functions =========

    function endLockup() external {
        require(msg.sender == partyDAOMultisig, "only partyDAO");
        _unpause();
    }

    // ======== Public Functions =========

    /**
     * @dev See {IERC20-transfer}.
     * Requirements:
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     * - the contract cannot be paused
     */
    function transfer(address recipient, uint256 amount) public override whenNotPaused returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     * Requirements:
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for ``sender``'s tokens of at least
     * `amount`.
     * - the contract cannot be paused
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override whenNotPaused returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = allowance(sender, _msgSender());
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }

    /**
    * Transfer function that can be called by PartyDAO multisig
    * or Deprecation Contract during the lockup period
    */
    function lockupTransfer(address recipient, uint256 amount) public whenPaused returns (bool) {
        require(msg.sender == partyDAOMultisig || msg.sender == deprecationContract, "only partyDAO or deprecation contract");
        _transfer(_msgSender(), recipient, amount);
        return true;
    }
}
