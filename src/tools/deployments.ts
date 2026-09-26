import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getRecentDeployments } from "../services/infrastructure";

export const getRecentDeploymentsTool = tool(
  async ({ serviceName }) => {
    try {
      const deployments = await getRecentDeployments(serviceName);
      return JSON.stringify(deployments);
    } catch (error: any) {
      return JSON.stringify({ error: error.message });
    }
  },
  {
    name: "get_recent_deployments",
    description: "Get recent deployment history and changelogs for a service.",
    schema: z.object({
      serviceName: z.string().describe("The name of the service")
    })
  }
);
