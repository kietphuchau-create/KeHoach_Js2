---
description: Create an execution plan for a feature using Hexagonal Architecture
---

Analyze the requirement: "$ARGUMENTS"

## Step 1 — survey with agents before planning

Do not plan from memory or from a guess about where the code lives. Launch **`Explore` ×1–3 in
parallel** to map the area first — one agent per distinct area (existing implementation, the
adapter/security seam, the test patterns). Scale down to a single agent when the files are
already known. Then launch **one `Plan` agent** to stress-test the design against the real code
and surface the constraints this command cannot see from the outside.

Feed the `Plan` agent the concrete decisions you have already made, and ask it to name files and
line numbers. Treat its report as evidence to check, not as an answer to relay.

## Step 2 — the plan must cover

1. **Domain** — the entity/value object and business rules in
   `core/src/main/java/com/eshop/core/domain/{model,vo,exception}`. Records with
   compact-constructor validation; mutators return a new instance.
2. **Application** — the inbound port (use case interface) in `core/application/port/in`, the
   outbound port in `core/application/port/out`, command/result DTOs in `core/application/dto`,
   and the use case implementation in `core/application/usecase`. Plain Java 21 — no Spring, no
   JPA, no Jackson.
3. **Adapters** in `app/src/main/java/com/eshop/app/adapter/{in,out}` — REST controllers with
   `@Valid @RequestBody`, request/response DTO records under `adapter/in/web/dto`, persistence
   adapters with explicit `toDomain`/`toEntity` mappers. Wire `@Bean`s in `app/config/`; never
   annotate a use case.
4. **AI features only** — decide the profile up front: Spring AI (`@Profile("!langchain4j")`),
   LangChain4j (`@Profile("langchain4j")`), or two adapters behind one port as
   `ProductSuggestionPort` does. Prompts go in `app/src/main/resources/prompts/`.
5. **Security** — if the change adds an endpoint, an auth path, or a permission rule, say
   explicitly how it is authorized. Check the `authorizeHttpRequests` matcher order: a route under
   an already-`permitAll` wildcard is public unless a more specific rule precedes it.
6. **Tests** — this repo has two separate test trees with different rules:
   - `core/src/test/java/com/eshop/core/` — JUnit 5 + AssertJ. Collaborators are **hand-written
     fakes** (`core/test/fake/`, or a `private static final class` inside the test). **Mockito is
     not on `core`'s test classpath and will not compile here.**
   - `app/src/test/java/com/eshop/app/` — `@WebMvcTest` + `MockMvc` + `@MockitoBean` for web
     slices; extend `app/support/PostgresIntegrationTest.java` (Testcontainers) for integration.
     `WebTestClient` is not used and `spring-webflux` is not a dependency.
7. **Architecture gate** — the plan must keep `HexagonalArchitectureTest` (8 ArchUnit rules)
   passing. Call out anything that touches a module boundary.

## Step 3 — name the agents the implementation will use

Close the plan with a short delegation table: which steps go to `core-test-author` (core tests),
`ai-adapter-smith` (AI features), `build-doctor` (build failures), and which audits are required
— `hexagon-guard` for anything under `core/` or `app/adapter/`, `security-reviewer` for a new
endpoint or auth change.

State how the change will be verified — `./gradlew build` is the correctness gate.

**DO NOT write implementation code yet.** Output only the structured plan and wait for
confirmation.
