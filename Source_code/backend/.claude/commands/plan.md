---
description: Create an execution plan for a feature using Hexagonal Architecture
---

Analyze the requirement: "$ARGUMENTS"

Please generate a step-by-step execution plan:
1. Identify the domain entity and core business logic needed in `core`.
2. Define Inbound/Outbound Ports (interfaces) in `core`.
3. Identify Inbound/Outbound Adapters needed in `app` (REST Controllers, Spring Data JPA Repositories, or External Client configurations).
4. Outline unit testing requirements (JUnit 5 & Mockito for core, `@SpringBootTest` / WebTestClient for app).

DO NOT write implementation code yet. Output only the structured plan and wait for confirmation.
