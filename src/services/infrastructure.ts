import {
  cacheGet,
  cacheSet,
  invalidateServiceCache,
  cacheFlushAll
} from "./redisService";

export type Service = {
  name: string;
  status: "healthy" | "unhealthy";
  latencyMs: number;
  errorRatePercent: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
};

export type LogEntry = {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
};

export type Deployment = {
  version: string;
  deployedAt: string;
  deployedBy: string;
  status: "success" | "failed";
  description: string;
};

const initialServices: Record<string, Service> = {
  "payment-service": {
    name: "payment-service",
    status: "unhealthy",
    latencyMs: 4200,
    errorRatePercent: 18,
    cpuUsagePercent: 88,
    memoryUsagePercent: 74
  },
  "order-service": {
    name: "order-service",
    status: "healthy",
    latencyMs: 120,
    errorRatePercent: 1,
    cpuUsagePercent: 32,
    memoryUsagePercent: 45
  }
};

const initialLogs: Record<string, LogEntry[]> = {
  "payment-service": [
    { timestamp: "2026-09-26T18:00:00Z", level: "INFO", message: "Service started on port 8080" },
    { timestamp: "2026-09-26T18:05:00Z", level: "WARN", message: "Database query time exceeded 3000ms" },
    { timestamp: "2026-09-26T18:07:00Z", level: "ERROR", message: "Database connection pool exhausted" },
    { timestamp: "2026-09-26T18:08:00Z", level: "ERROR", message: "HTTP 504 Gateway Timeout on POST /charge" }
  ],
  "order-service": [
    { timestamp: "2026-09-26T18:00:00Z", level: "INFO", message: "Service started on port 8081" },
    { timestamp: "2026-09-26T18:04:00Z", level: "INFO", message: "Processed 120 orders successfully" }
  ]
};

const initialDeployments: Record<string, Deployment[]> = {
  "payment-service": [
    {
      version: "v42",
      deployedAt: "2026-09-26T18:00:00Z",
      deployedBy: "devops-engineer",
      status: "success",
      description: "Update database connection pooling and indexes"
    },
    {
      version: "v41",
      deployedAt: "2026-09-20T10:00:00Z",
      deployedBy: "lead-dev",
      status: "success",
      description: "Stable production release"
    }
  ],
  "order-service": [
    {
      version: "v15",
      deployedAt: "2026-09-22T14:30:00Z",
      deployedBy: "lead-dev",
      status: "success",
      description: "Add customer order caching"
    }
  ]
};

let services: Record<string, Service> = JSON.parse(JSON.stringify(initialServices));
let logs: Record<string, LogEntry[]> = JSON.parse(JSON.stringify(initialLogs));
let deployments: Record<string, Deployment[]> = JSON.parse(JSON.stringify(initialDeployments));

export async function resetSimulatedInfrastructure() {
  services = JSON.parse(JSON.stringify(initialServices));
  logs = JSON.parse(JSON.stringify(initialLogs));
  deployments = JSON.parse(JSON.stringify(initialDeployments));
  await cacheFlushAll();
  return { message: "Simulated infrastructure reset to initial state" };
}

export async function getServiceHealth(serviceName: string) {
  const service = services[serviceName];
  if (!service) {
    throw new Error(`Service '${serviceName}' not found`);
  }
  return {
    service: service.name,
    status: service.status
  };
}

export async function getServiceMetrics(serviceName: string) {
  const cacheKey = `telemetry:metrics:${serviceName}`;
  const cached = await cacheGet<{
    service: string;
    latencyMs: number;
    errorRatePercent: number;
    cpuUsagePercent: number;
    memoryUsagePercent: number;
  }>(cacheKey);

  if (cached) {
    return cached;
  }

  const service = services[serviceName];
  if (!service) {
    throw new Error(`Service '${serviceName}' not found`);
  }

  const result = {
    service: service.name,
    latencyMs: service.latencyMs,
    errorRatePercent: service.errorRatePercent,
    cpuUsagePercent: service.cpuUsagePercent,
    memoryUsagePercent: service.memoryUsagePercent
  };

  await cacheSet(cacheKey, result, 15);
  return result;
}

export async function getServiceLogs(serviceName: string, limit: number = 10) {
  const safeLimit = Math.max(1, limit || 10);
  const cacheKey = `telemetry:logs:${serviceName}:${safeLimit}`;
  const cached = await cacheGet<LogEntry[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const serviceLogs = logs[serviceName];
  if (!serviceLogs) {
    throw new Error(`Logs for service '${serviceName}' not found`);
  }

  const result = serviceLogs.slice(-safeLimit);
  await cacheSet(cacheKey, result, 15);
  return result;
}

export async function getRecentDeployments(serviceName: string) {
  const serviceDeployments = deployments[serviceName];
  if (!serviceDeployments) {
    throw new Error(`Deployments for service '${serviceName}' not found`);
  }
  return serviceDeployments;
}

export async function rollbackDeployment(serviceName: string, targetVersion: string = "v41") {
  const service = services[serviceName];
  if (!service) {
    throw new Error(`Service '${serviceName}' not found`);
  }

  service.status = "healthy";
  service.latencyMs = 180;
  service.errorRatePercent = 1;
  service.cpuUsagePercent = 28;
  service.memoryUsagePercent = 38;

  const serviceDeployments = deployments[serviceName] || [];
  serviceDeployments.unshift({
    version: targetVersion,
    deployedAt: new Date().toISOString(),
    deployedBy: "devops-incident-agent",
    status: "success",
    description: `Automated rollback to ${targetVersion} to remediate incident`
  });

  const serviceLogs = logs[serviceName] || [];
  serviceLogs.push({
    timestamp: new Date().toISOString(),
    level: "INFO",
    message: `Service rolled back to ${targetVersion}. Connection pool reset and latency normalized.`
  });

  await invalidateServiceCache(serviceName);

  return {
    service: serviceName,
    action: "rollback",
    version: targetVersion,
    status: service.status,
    latencyMs: service.latencyMs,
    errorRatePercent: service.errorRatePercent
  };
}

export async function restartService(serviceName: string) {
  const service = services[serviceName];
  if (!service) {
    throw new Error(`Service '${serviceName}' not found`);
  }

  service.status = "healthy";
  service.latencyMs = 190;
  service.errorRatePercent = 1;
  service.cpuUsagePercent = 30;
  service.memoryUsagePercent = 40;

  const serviceLogs = logs[serviceName] || [];
  serviceLogs.push({
    timestamp: new Date().toISOString(),
    level: "INFO",
    message: "Service restarted. Hung database connections terminated."
  });

  await invalidateServiceCache(serviceName);

  return {
    service: serviceName,
    action: "restart",
    status: service.status,
    latencyMs: service.latencyMs,
    errorRatePercent: service.errorRatePercent
  };
}

export async function scaleService(serviceName: string, replicas: number = 3) {
  const service = services[serviceName];
  if (!service) {
    throw new Error(`Service '${serviceName}' not found`);
  }

  service.status = "healthy";
  service.cpuUsagePercent = 25;
  service.memoryUsagePercent = 32;
  service.latencyMs = 150;
  service.errorRatePercent = 1;

  const serviceLogs = logs[serviceName] || [];
  serviceLogs.push({
    timestamp: new Date().toISOString(),
    level: "INFO",
    message: `Service scaled to ${replicas} replicas. Load distributed.`
  });

  await invalidateServiceCache(serviceName);

  return {
    service: serviceName,
    action: "scale",
    replicas,
    status: service.status,
    latencyMs: service.latencyMs,
    errorRatePercent: service.errorRatePercent
  };
}
