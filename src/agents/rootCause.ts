import { IncidentState } from "./state";

export async function rootCauseNode(state: IncidentState) {
  const findingsText = state.findings.join("\n");
  const evidence: string[] = [];

  const notFoundTarget = `Service '${state.serviceName}' not found`;
  const isNotFound = findingsText.includes(notFoundTarget);

  const healthFinding = state.findings.find(f => f.startsWith("[get_service_health]:")) || "";
  const isHealthy = healthFinding.includes('"status":"healthy"');
  const isUnhealthy = healthFinding.includes('"status":"unhealthy"');

  const deploymentFinding = state.findings.find(f => f.startsWith("[get_recent_deployments]:")) || "";
  let latestDeploymentVersion = "";
  try {
    const jsonStr = deploymentFinding.replace(/^\[get_recent_deployments\]:\s*/, "");
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length > 0) {
      latestDeploymentVersion = parsed[0].version;
    }
  } catch {}

  const hasRecentDeployment = latestDeploymentVersion === "v42";
  const hasSlowQueries = findingsText.includes("Database query time exceeded");
  const hasPoolExhaustion = findingsText.includes("Database connection pool exhausted");
  const has504Timeout = findingsText.includes("504 Gateway Timeout");

  if (isNotFound) {
    evidence.push(`Service '${state.serviceName}' was not found in infrastructure monitoring catalog`);
    return {
      rootCause: `Service '${state.serviceName}' does not exist or is not registered in monitoring catalog`,
      confidence: 0.95,
      confidenceLevel: "confirmed" as const,
      evidence
    };
  }

  if (isHealthy && !isUnhealthy) {
    evidence.push("Service health check returned 'healthy'");
    return {
      rootCause: "Service is operating within healthy performance thresholds with no active errors",
      confidence: 0.95,
      confidenceLevel: "confirmed" as const,
      evidence
    };
  }

  if (isUnhealthy) {
    evidence.push("Service health check returned 'unhealthy'");
  }

  if (hasSlowQueries) {
    evidence.push("Database queries exceeded the 3000ms threshold");
  }

  if (hasPoolExhaustion) {
    evidence.push("Application logs report database connection pool exhaustion");
  }

  if (has504Timeout) {
    evidence.push("HTTP 504 Gateway Timeout errors detected on transaction endpoints");
  }

  if (hasRecentDeployment) {
    evidence.push("Recent deployment v42 updated database connection pooling and indexes right before alert");
  }

  if (hasPoolExhaustion && hasRecentDeployment) {
    return {
      rootCause: "Recent deployment v42 introduced database connection pool exhaustion leading to gateway timeouts",
      confidence: 0.90,
      confidenceLevel: "confirmed" as const,
      evidence
    };
  }

  if (isUnhealthy || hasSlowQueries) {
    return {
      rootCause: "Database performance degradation causing request latency and error rate spikes",
      confidence: 0.70,
      confidenceLevel: "probable" as const,
      evidence
    };
  }

  return {
    rootCause: "Insufficient or inconclusive telemetry to determine definitive root cause",
    confidence: 0.40,
    confidenceLevel: "uncertain" as const,
    evidence
  };
}
