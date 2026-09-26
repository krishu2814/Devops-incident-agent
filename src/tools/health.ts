import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getServiceHealth } from "../services/infrastructure";

export const getServiceHealthTool = tool(
  async ({ serviceName }) => {
    try {
      const health = await getServiceHealth(serviceName);
      return JSON.stringify(health);
    } catch (error: any) {
      return JSON.stringify({ error: error.message });
    }
  },
  {
    name: "get_service_health",
    description: "Check if a service is healthy or unhealthy.",
    schema: z.object({
      serviceName: z.string().describe("The name of the service to check")
    })
  }
);
