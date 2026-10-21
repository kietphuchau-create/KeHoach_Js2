---
description: Implement a feature based on Hexagonal Architecture rules
---

Implement the feature: "$ARGUMENTS"

## Delegate — do not write the whole thing yourself

This command drives the workflow in `CLAUDE.md` § *Coding workflow*. The agents below are a gate:
the task is not done until step 5 and (when it applies) step 6 have actually run and been
reported. "It was a small change" is not a reason to skip them.

| Step | Action | Who |
|---|---|---|
| 1 | Survey the area before writing anything | `Explore` ×1–3, launched in parallel |
| 2 | Design and get the plan approved | `Plan` ×1 — use `/plan` for anything non-trivial |
| 3 | Write `core` code | main agent |
| 4 | Write `core` tests | **`core-test-author`** — hand-written fakes, no Mockito |
| 5 | AI features (Spring AI, LangChain4j, chat memory, prompts) | **`ai-adapter-smith`** |
| 6 | Build | `./gradlew build`; on any failure hand it to **`build-doctor`** |
| 7 | Boundary audit after changing `core/` or `app/adapter/` | **`hexagon-guard`** (read-only) |
| 8 | Security audit for a new endpoint, auth path, or permission rule | **`security-reviewer`** (read-only) |
| 9 | Declare done | `springboot-verification` skill |

Load the skill that governs the code before writing it, not after: `hexagonal-architecture` for
new domain/application/adapter code, `springboot-security` before touching auth,
`springboot-tdd` before writing tests.

Never hand-debug a red build — `build-doctor` reads the logs so this thread does not have to.

## Architectural rules

1. **Module `core`** — `core/src/main/java/com/eshop/core/`:
    - `domain/{model,vo,exception}` — records with compact-constructor validation, immutable
      (mutators return a new instance).
    - `application/{dto,usecase,port/{in,out}}` — command/result DTO records, plain use case
      classes with constructor injection, and pure interfaces.
    - NO Spring, JPA (`jakarta.persistence.*`), Jackson, servlet API, or jjwt. These are absent
      from `core`'s classpath, so importing them is a compile error, not a style preference.
2. **Module `app`** — `app/src/main/java/com/eshop/app/`:
    - Inbound adapters under `adapter/in/web` (`@RestController`, `@Valid @RequestBody`, response
      records with a static `from(...)` factory); outbound adapters under `adapter/out`.
    - Use `jakarta.*` for validation and persistence here.
    - Wire `@Bean`s in `app/config/`. Never annotate a use case with `@Service`/`@Component`.
    - AI features: decide the profile explicitly — `@Profile("!langchain4j")` for Spring AI,
      `@Profile("langchain4j")` for LangChain4j, or both behind one port. Prompts live in
      `app/src/main/resources/prompts/`.
3. **Execution order**:
    - Write domain logic first, then ports, then adapters and wiring.
    - Then run the tests and the audits above. `HexagonalArchitectureTest` must stay green.

## Report on completion

State which agents and skills actually ran, and their verdicts. Say plainly if you skipped a step
and why — an undeclared skip is the failure mode this command exists to prevent.
