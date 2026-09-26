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

---

## 3. LangChain Tools (Phase 3)

### Q: "What is a LangChain Tool, and what role does Zod schema validation play?"
**Answer:**
"A tool in LangChain is a callable function combined with a name, a natural language description, and an input schema (defined using Zod in TypeScript). 
The description explains *when and why* the LLM should call the tool. The Zod schema generates JSON Schema definitions that the LLM's function-calling engine uses to guarantee that input parameters (like `serviceName` or `limit`) adhere to expected types before our code executes."

### Q: "Why do LangChain tools return strings (like JSON strings) rather than raw objects?"
**Answer:**
"LLMs are text-in, text-out neural networks. When an agent decides to call a tool, the tool execution result is packaged into a `ToolMessage` that is appended to the chat context sent back to the model. Returning a JSON string ensures the LLM receives structured, token-efficient observations it can parse and reason about directly."

### Q: "What happens if a tool throws an exception during an investigation?"
**Answer:**
"If a tool throws an uncaught error, the entire agent execution would crash. In our implementation, each tool wraps its logic in a `try/catch` block and returns a stringified error message (e.g. `JSON.stringify({ error: error.message })`). This allows the LLM to observe the failure (e.g. 'Service not found'), reason about it, and either retry with different parameters or fall back to alternative diagnostics."

---

## 4. Basic LangGraph Agent (Phase 4)

### Q: "What is LangGraph and what are its core building blocks?"
**Answer:**
"LangGraph is an orchestration framework for building stateful, multi-actor applications with LLMs as graphs. Its key building blocks are:
1. **State:** The central schema that holds data and messages throughout the entire execution.
2. **Nodes:** Normal JavaScript/TypeScript functions that take the current state as input, perform work (like reasoning or executing a tool), and return updates to the state.
3. **Edges:** Directed connections defining the execution path between nodes.
4. **Conditional Edges:** Dynamic routers that inspect the updated state to decide which node should execute next or whether to stop at `END`.
5. **Graph:** The compiled state machine connecting all nodes and edges."

### Q: "How does State Reducer work in LangGraph?"
**Answer:**
"By default, when a node returns a field update, it overwrites the previous value in the state. However, for arrays like `findings` or message histories, we use a **Reducer function** (e.g., `(curr, update) => curr.concat(update)`). This allows each node to append newly discovered diagnostic findings without accidentally wiping out past discoveries."

### Q: "How does the `agent -> tool -> agent` loop work?"
**Answer:**
"1. **Agent Node:** Looks at the current state. If `findings` are empty, it sets `nextAction = 'check_health'`.
2. **Conditional Edge:** Checks `nextAction`. Because it is not 'complete', it routes to the `tool` node.
3. **Tool Node:** Runs the selected tool (`get_service_health`), appends the observation into `findings`, and routes back to `agent`.
4. **Agent Node (2nd pass):** Reads the updated findings. Since the needed evidence is gathered, it sets `nextAction = 'complete'`.
5. **Conditional Edge:** Detects `complete` and routes to `END`."

---

## 5. Investigation Agent (Phase 5)

### Q: "How does the Investigation Agent decide which tools to call?"
**Answer:**
"The agent mimics an SRE triage hierarchy:
1. **Health Check:** First checks if the service is marked unhealthy.
2. **Metrics:** If degraded or investigating an alert, fetches latency, error rates, and CPU/memory to measure the severity of the impact.
3. **Logs:** Queries logs around the incident window to find specific stack traces, error codes (like HTTP 504), or warnings (like database query timeouts).
4. **Deployments:** Queries recent deployment history to see if a release or configuration change immediately preceded the spike in errors.
Once this chain of diagnostic evidence is compiled into the state, the agent transitions to `complete`."

### Q: "How do you prevent the agent from calling the same tool repeatedly or getting stuck in infinite loops?"
**Answer:**
"We track a `toolsCalled` array in the LangGraph state. Before selecting an action, the investigator node checks if that tool has already been invoked. In addition, our conditional edge includes a hard circuit breaker: if `toolsCalled.length >= 4`, it terminates the investigation loop immediately and routes to `END`, preventing infinite recursion."
