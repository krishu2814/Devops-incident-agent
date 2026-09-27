import { IncidentState } from "./state";

export async function remediationNode(state: IncidentState) {
  const rootCause = state.rootCause || "";

  if (rootCause.includes("Recent deployment") || rootCause.includes("v42")) {
    return {
      proposedAction: "rollback" as const,
      targetVersion: "v41",
      remediationReason: "Recent deployment v42 is strongly correlated with database connection pool exhaustion and query timeouts. Rolling back to previous stable release v41 is recommended."
    };
  }

  if (rootCause.includes("Database performance degradation") || rootCause.includes("latency")) {
    return {
      proposedAction: "restart" as const,
      remediationReason: "Restarting the service will reset connection pools and terminate hung database sessions to recover service health."
    };
  }

  if (rootCause.includes("healthy performance thresholds") || state.findings.some(f => f.includes('"status":"healthy"'))) {
    return {
      proposedAction: "do_nothing" as const,
      remediationReason: "Service metrics and health are currently normal. No remediation required."
    };
  }

  return {
    proposedAction: "do_nothing" as const,
    remediationReason: "Investigation is inconclusive. Automatic remediation is not recommended without manual operator inspection."
  };
}
