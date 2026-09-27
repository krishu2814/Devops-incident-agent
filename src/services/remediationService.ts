import {
  rollbackDeployment,
  restartService,
  scaleService
} from "./infrastructure";

export type RemediationExecution = {
  executed: boolean;
  action: string;
  details: any;
  executedAt: string;
};

export async function executeRemediation(
  action: string,
  serviceName: string,
  targetVersion?: string
): Promise<RemediationExecution> {
  const now = new Date().toISOString();

  if (action === "rollback") {
    const details = await rollbackDeployment(serviceName, targetVersion || "v41");
    return {
      executed: true,
      action: "rollback",
      details,
      executedAt: now
    };
  }

  if (action === "restart") {
    const details = await restartService(serviceName);
    return {
      executed: true,
      action: "restart",
      details,
      executedAt: now
    };
  }

  if (action === "scale") {
    const details = await scaleService(serviceName, 3);
    return {
      executed: true,
      action: "scale",
      details,
      executedAt: now
    };
  }

  return {
    executed: false,
    action: "do_nothing",
    details: { message: "No action required" },
    executedAt: now
  };
}
