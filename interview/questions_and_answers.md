# DevOps Incident Agent — Interview Questions & Answers

This document prepares you for technical and architectural interview questions based directly on the actual code we build.

---

## 1. Project Overview & Pitch

### Q: "Can you describe your DevOps Incident Agent project?"
**Answer:**
"DevOps Incident Agent is an autonomous investigation system built with TypeScript, Node.js, and LangGraph. When an alert or incident occurs, an on-call engineer normally has to manually inspect dashboards, tail logs, and check recent code deployments. 

My system acts like an automated SRE investigator:
1. It ingests the incident alert via an API.
2. An agentic workflow decides which diagnostic tools to run (fetching service health, querying metrics, filtering logs, and checking deployment changelogs).
3. It performs Root Cause Analysis (RCA) with confidence ratings based on gathered evidence.
4. It formulates a remediation proposal (e.g. rollback, restart, or scale).
5. Crucially, it incorporates Human-in-the-Loop approval before any remediation action is executed.
6. Once approved and executed, it automatically verifies that service health and latency recover to normal thresholds."

---

## 2. Core Architectural Questions

### Q: "What is the difference between an Agent and a traditional automation script or LLM prompt?"
**Answer:**
- **Traditional Script:** Follows a static, rigid sequence of `if/else` checks. If logs are in a different format or a new error appears, the script breaks.
- **Single LLM Prompt:** Gives you text advice based only on whatever text you pasted into the prompt, without real-time data or the ability to take actions.
- **Agent:** The model perceives its environment, makes reasoning decisions on what information it still needs, autonomously chooses and calls external tools (like checking logs or metrics), evaluates the tool output, and loops until it satisfies its goal.

---

### Q: "Why did you build simulated infrastructure in Phase 2 instead of connecting directly to AWS or Datadog?"
**Answer:**
"Starting with an in-memory simulation isolates the agent reasoning and orchestration logic from external network instability, rate limits, and API keys. It allowed us to test deterministic edge cases—like sudden latency spikes, database connection pool exhaustion, and buggy deployments—before adding complex LangGraph layers. Because all diagnostic functions are decoupled behind clear TypeScript contracts, switching from simulated data to real Prometheus or CloudWatch APIs only requires replacing the internal implementation of the tool functions."

---

### Q: "Why use LangGraph instead of a simple linear chain?"
**Answer:**
"Real incident triage is not a linear waterfall. An engineer checks metrics, sees an anomaly, decides to look at logs, finds a slow query, and then checks deployment history to see what changed. 

LangGraph provides a state-machine graph where:
- State is explicitly tracked across every step.
- Nodes represent discrete operations (Investigation, RCA, Remediation, Verification).
- Conditional edges allow the agent to decide dynamically whether to gather more evidence, ask for human intervention, or conclude.
- It provides native support for state persistence and Human-in-the-Loop checkpoints (pausing execution until an operator approves)."

---

### Q: "Why should an AI agent NEVER execute arbitrary shell commands directly?"
**Answer:**
"Allowing an LLM to generate and execute raw bash or terminal commands (`rm`, `sudo`, `kubectl delete`, `DROP TABLE`) introduces catastrophic prompt injection and hallucination risks. 

In this project, we enforce strict **Deterministic Tool Calling**:
The LLM can only select from predefined, safe application functions with typed parameters (e.g. `rollbackDeployment({ serviceName: 'payment-service' })`). The LLM decides *intent*, but our verified application code controls the *execution*."

---

### Q: "How does Human-in-the-Loop (HITL) work in this system?"
**Answer:**
"Automated remediation can cause secondary outages if executed blindly. In our workflow, the agent is allowed to autonomously investigate, inspect logs, and propose fixes. However, when it comes to state-modifying actions (restarting a service, rolling back a deployment, or scaling pods), the LangGraph execution enters an approval gate. The incident state is paused with status `waiting_for_approval`. Only when an authorized operator calls `POST /incidents/:id/approve` or `POST /incidents/:id/reject` does the graph resume."

---

### Q: "How do you prevent infinite loops if the agent gets confused?"
**Answer:**
1. **Recursion Limit:** LangGraph has built-in execution step limits (e.g. max 10 steps).
2. **Tool Call Deduplication:** Tracking previously called tools in the state so the agent cannot call the exact same tool with the exact same arguments repeatedly.
3. **Hard Verification Cap:** After executing a remediation, verification runs once or twice. If health does not recover, the agent transitions to an escalated `manual_intervention_required` state rather than attempting random actions."

---

### Q: "Why add Redis, BullMQ, and PostgreSQL later in the project?"
**Answer:**
- **Redis + BullMQ:** Incident triage can take 30–60 seconds of LLM reasoning and tool calls. A client should not keep an HTTP request hanging. BullMQ moves the investigation into asynchronous background workers.
- **Redis Cache:** Avoids repeated queries to metric servers if multiple alerts fire for the same incident.
- **PostgreSQL + Prisma:** Maintains a durable historical log of all incidents, evidence, RCA findings, human approvals, and audit trails for compliance."

---

### Q: "How would you handle 1,000 simultaneous incidents?"
**Answer:**
1. **Deduplication:** Many alerts stem from the same root issue. An alert grouper/fingerprinter groups related alerts by service and time window.
2. **Horizontal Queue Workers:** BullMQ workers scale horizontally across multiple instances or pods.
3. **Rate Limiting & LLM Concurrency:** Throttling concurrent LLM requests to avoid hitting provider token rate limits.
4. **Caching:** Storing recent metrics and log searches in Redis so identical queries within a 60-second window don't hammer observability backends."
