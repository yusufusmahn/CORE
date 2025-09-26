module Core::CoreToken {
   
    const E_NOT_AUTHORIZED: u64 = 0;
    const E_EXCEEDS_MAX_SUPPLY: u64 = 1;
    const E_NOT_OWNER: u64 = 2;

    const MAX_SUPPLY: u64 = 1_000_000;

    public struct CORETOKEN has drop {}

    public struct Collection has key {
        id: sui::object::UID,
        owner: address,
        total_supply: u64,
    }

    public struct MintEvent has copy, drop, store {
        recipient: address,
        amount: u64,
    }

    fun init(_: CORETOKEN, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let coll = Collection {
            id: sui::object::new(ctx),
            owner: sender,
            total_supply: 0,
        };
        sui::transfer::share_object(coll);
    }

    public fun mint(coll: &mut Collection, recipient: address, amount: u64, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        assert!(sender == coll.owner, E_NOT_AUTHORIZED);

        assert!(coll.total_supply + amount <= MAX_SUPPLY, E_EXCEEDS_MAX_SUPPLY);

        coll.total_supply = coll.total_supply + amount;

        sui::event::emit(MintEvent { recipient, amount });
    }


    public fun withdraw(coll: &mut Collection, _recipient: address, amount: u64, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        assert!(sender == coll.owner, E_NOT_OWNER);

        assert!(coll.total_supply >= amount, E_EXCEEDS_MAX_SUPPLY);
        coll.total_supply = coll.total_supply - amount;
    }

   /*
        /// Example vulnerable function intentionally left wrong (for analyzer demo)
    /// public fun vulnerable_mint(recipient: address, amount: u64, ctx: &mut TxContext) {
    ///     // No signer check and no max supply check -> should be flagged by analyzer
    /// }
    /// */
    
}
