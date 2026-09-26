import { getServiceHealthTool } from "./health";
import { getServiceMetricsTool } from "./metrics";
import { searchLogsTool } from "./logs";
import { getRecentDeploymentsTool } from "./deployments";

export {
  getServiceHealthTool,
  getServiceMetricsTool,
  searchLogsTool,
  getRecentDeploymentsTool
};

export const allTools = [
  getServiceHealthTool,
  getServiceMetricsTool,
  searchLogsTool,
  getRecentDeploymentsTool
];
