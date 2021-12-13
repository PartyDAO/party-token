// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;

// ============ External Imports: Inherited Contracts ============
import {ERC20VotesComp} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20VotesComp.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/*
Party Token
by Anna Carroll
*/
contract PartyToken is ERC20VotesComp {
    // ============ Events ==============
    
    event Unpaused(address account);

    // ============ Immutables ============

    address public immutable partyDAOMultisig;
    address public immutable deprecationContract;

    // ======== State =========

    bool lockupPeriod = true;

    // ======== Constructor =========

    constructor(address _partyDAOMultisig, address _deprecationContract) ERC20("PartyDAO", "PARTY") ERC20Permit("PartyDAO") {
        // set partyDAO multisig & deprecation contract addresses
        partyDAOMultisig = _partyDAOMultisig;
        deprecationContract = _deprecationContract;
        // mint 10M totalSupply to partyDAO multisig
        _mint(_partyDAOMultisig, 10_000_000 * (10 ** 18));
    }

    // ======== External Functions =========

    function endLockup() external {
        require(msg.sender == partyDAOMultisig, "only partyDAO");
        require(lockupPeriod, "already unlocked");
        lockupPeriod = false;
        emit Unpaused(msg.sender);
    }

    // ======== Public Functions =========

    /**
     * @dev See {IERC20-transfer}.
     * Requirements:
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     * - the lockup period cannot be active unless being called from the deprecation contract
     */
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(!lockupPeriod || msg.sender == deprecationContract, "lockup period");
        super.transfer(recipient, amount);
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
     * - the lockup period cannot be active unless being called from the deprecation contract
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        require(!lockupPeriod, "lockup period");
        super.transferFrom(sender, recipient, amount);
    }

    /**
    * Transfer function that can be called by PartyDAO multisig
    * during the lockup period
    */
    function lockupTransfer(address recipient, uint256 amount) public returns (bool) {
        require(msg.sender == partyDAOMultisig, "only partyDAO");
        super.transfer(recipient, amount);
    }
}
