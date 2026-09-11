---
description: Implement a feature based on Hexagonal Architecture rules
---

Implement the feature: "$ARGUMENTS"

Adhere strictly to the following architectural rules:
1. **Module `core`**:
    - Write pure Java 21 business logic, domain models, and port interfaces.
    - NO Spring Framework, JPA (`jakarta.persistence.*`), or Jackson annotations allowed here.
2. **Module `app`**:
    - Implement Inbound Adapters (e.g., `@RestController`) and Outbound Adapters (e.g., Spring Data JPA repositories).
    - Use `jakarta.*` packages for validation and persistence.
3. **Execution**:
    - Write domain logic first, followed by adapter wiring.
    - Run unit tests with `./gradlew test` upon completion to ensure no build or boundary regressions.
