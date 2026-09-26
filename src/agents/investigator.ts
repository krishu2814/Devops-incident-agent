import { IncidentState } from "./state";
import {
  getServiceHealthTool,
  getServiceMetricsTool,
  searchLogsTool,
  getRecentDeploymentsTool
} from "../tools";

export async function investigatorNode(state: IncidentState) {
  const called = state.toolsCalled || [];

  if (!called.includes("get_service_health")) {
    return { nextAction: "get_service_health" };
  }

  if (!called.includes("get_service_metrics")) {
    return { nextAction: "get_service_metrics" };
  }

  if (!called.includes("search_logs")) {
    return { nextAction: "search_logs" };
  }

  if (!called.includes("get_recent_deployments")) {
    return { nextAction: "get_recent_deployments" };
  }

  return { nextAction: "complete" };
}

export async function toolsNode(state: IncidentState) {
  const action = state.nextAction;
  let result = "";

  if (action === "get_service_health") {
    result = await getServiceHealthTool.invoke({ serviceName: state.serviceName });
  } else if (action === "get_service_metrics") {
    result = await getServiceMetricsTool.invoke({ serviceName: state.serviceName });
  } else if (action === "search_logs") {
    result = await searchLogsTool.invoke({ serviceName: state.serviceName, limit: 5 });
  } else if (action === "get_recent_deployments") {
    result = await getRecentDeploymentsTool.invoke({ serviceName: state.serviceName });
  }

  return {
    findings: [`[${action}]: ${result}`],
    toolsCalled: [action]
  };
}
