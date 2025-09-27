module 0x1::SampleContract {
    use std::signer;
    
    struct Counter has key {
        value: u64
    }
    
    public fun init_counter(account: &signer) {
        move_to(account, Counter { value: 0 })
    }
    
    public fun increment(account: &signer) acquires Counter {
        let counter = borrow_global_mut<Counter>(signer::address_of(account));
        // Vulnerability: Unsafe arithmetic without overflow check
        counter.value = counter.value + 1;
    }
    
    public fun get_value(addr: address): u64 acquires Counter {
        // Vulnerability: Missing signer check
        borrow_global<Counter>(addr).value
    }
    
    public fun reset_counter(account: &signer) acquires Counter {
        let counter = borrow_global_mut<Counter>(signer::address_of(account));
        // Vulnerability: Unrestricted public function
        counter.value = 0;
    }
}