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

const services: Record<string, Service> = {
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

const logs: Record<string, LogEntry[]> = {
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

const deployments: Record<string, Deployment[]> = {
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
  const service = services[serviceName];
  if (!service) {
    throw new Error(`Service '${serviceName}' not found`);
  }
  return {
    service: service.name,
    latencyMs: service.latencyMs,
    errorRatePercent: service.errorRatePercent,
    cpuUsagePercent: service.cpuUsagePercent,
    memoryUsagePercent: service.memoryUsagePercent
  };
}

export async function getServiceLogs(serviceName: string, limit: number = 10) {
  const serviceLogs = logs[serviceName];
  if (!serviceLogs) {
    throw new Error(`Logs for service '${serviceName}' not found`);
  }
  return serviceLogs.slice(-limit);
}

export async function getRecentDeployments(serviceName: string) {
  const serviceDeployments = deployments[serviceName];
  if (!serviceDeployments) {
    throw new Error(`Deployments for service '${serviceName}' not found`);
  }
  return serviceDeployments;
}
