# Implementation Thinking Process

## Core Design Philosophy

1. **Write Like a High-Clarity Beginner/Intermediate Engineer**
   - No unnecessary classes, no generic abstractions, no DI frameworks, no complex design pattern bloat.
   - Plain TypeScript functions, clear object types, and standard `async/await`.
   - Every file must be explainable in 60 seconds during a technical interview.

2. **The SRE Investigation Mental Model**
   The agent mimics a senior Site Reliability Engineer diagnosing an issue during a 3:00 AM outage:
   - **Triage:** What service is affected? Is it unhealthy?
   - **Metrics:** Is latency elevated? Is error rate high? Are CPU/memory maxed out?
   - **Logs:** What errors or warnings appeared right when latency spiked?
   - **Deployments:** Did someone ship new code or change a configuration in the last 15 minutes?
   - **Synthesize (RCA):** Connect the dots (e.g., "Deployment v42 changed database pooling, leading to connection pool exhaustion and 504 timeouts").
   - **Remediate:** Propose the minimal effective fix (e.g., rollback v42 -> v41).
   - **Safety Gate:** Demand human approval before touching production state.
   - **Verification:** Confirm metrics return to healthy baseline post-action.

3. **Strict Safety Rules**
   - Never allow LLM to run arbitrary bash commands or raw shell strings.
   - All tool invocations map to explicit, typed TypeScript functions with validated arguments.

4. **Progressive Architecture (Bottom-Up)**
   - Don't build the entire architecture on day one.
   - Start with working synchronous endpoints -> simulated data -> tools -> LangGraph agent -> async queues -> databases -> Docker.

5. **Production Hardening & Edge-Case Resilience**
   - **Post-Remediation Verification & Flapping Prevention:** Active health status (`status: "healthy"`) takes precedence over historical log entries and superseded releases to prevent infinite remediation loops.
   - **Precise Telemetry Scoping:** String matching must be scoped to specific tool outputs (e.g. checking the active release in `deployments[0].version` rather than fuzzy substring matches across entire findings).
   - **REST & State Hygiene:** Webhook inputs must be trimmed and validated; non-existent resources return `404`; and in-memory caches and incident states must provide deterministic reset endpoints for clean testing.

