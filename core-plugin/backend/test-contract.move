module 0x1::TestContract {
    use std::signer;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::object::{Self, UID};
    
    struct Counter has key {
        id: UID,
        value: u64
    }
    
    // Vulnerability: Missing signer check
    public fun init_counter(ctx: &mut TxContext) {
        let counter = Counter {
            id: object::new(ctx),
            value: 0
        };
        move_to(ctx, counter)
    }
    
    // Vulnerability: Unsafe arithmetic
    public fun increment(account: &signer) acquires Counter {
        let counter = borrow_global_mut<Counter>(signer::address_of(account));
        counter.value = counter.value + 1;  // Unsafe arithmetic
    }
    
    // Vulnerability: Unrestricted public function
    public fun get_value(addr: address): u64 acquires Counter {
        borrow_global<Counter>(addr).value
    }
    
    // Vulnerability: Unauthorized transfer
    public fun transfer_counter(to: address) acquires Counter {
        let counter = move_from<Counter>(to);
        transfer::public_transfer(counter, to);  // Unauthorized transfer
    }
    
    // Vulnerability: Direct object deletion
    public fun delete_counter(account: &signer) acquires Counter {
        let counter = move_from<Counter>(signer::address_of(account));
        let Counter { id, value: _ } = counter;
        delete(id);  // Direct object deletion
    }
}