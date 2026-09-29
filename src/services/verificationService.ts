import { getServiceHealth, getServiceMetrics } from "./infrastructure";

export type VerificationResult = {
  verified: boolean;
  status: "healthy" | "unhealthy";
  latencyMs: number;
  errorRatePercent: number;
  verifiedAt: string;
  message: string;
};

export async function verifyServiceRecovery(serviceName: string): Promise<VerificationResult> {
  const now = new Date().toISOString();
  try {
    const health = await getServiceHealth(serviceName);
    const metrics = await getServiceMetrics(serviceName);

    const isHealthy = health.status === "healthy";
    const latencyAcceptable = metrics.latencyMs <= 300;
    const errorRateAcceptable = metrics.errorRatePercent <= 2;

    const recovered = isHealthy && latencyAcceptable && errorRateAcceptable;

    return {
      verified: recovered,
      status: health.status,
      latencyMs: metrics.latencyMs,
      errorRatePercent: metrics.errorRatePercent,
      verifiedAt: now,
      message: recovered
        ? `Service '${serviceName}' successfully recovered. Health: healthy, Latency: ${metrics.latencyMs}ms, Error Rate: ${metrics.errorRatePercent}%.`
        : `Service '${serviceName}' verification failed. Health: ${health.status}, Latency: ${metrics.latencyMs}ms, Error Rate: ${metrics.errorRatePercent}%. Escalation required.`
    };
  } catch (error: any) {
    return {
      verified: false,
      status: "unhealthy",
      latencyMs: -1,
      errorRatePercent: 100,
      verifiedAt: now,
      message: `Verification error: ${error.message}. Escalation required.`
    };
  }
}
