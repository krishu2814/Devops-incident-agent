import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getServiceMetrics } from "../services/infrastructure";

export const getServiceMetricsTool = tool(
  async ({ serviceName }) => {
    try {
      const metrics = await getServiceMetrics(serviceName);
      return JSON.stringify(metrics);
    } catch (error: any) {
      return JSON.stringify({ error: error.message });
    }
  },
  {
    name: "get_service_metrics",
    description: "Get performance metrics such as latency, error rate, CPU, and memory for a service.",
    schema: z.object({
      serviceName: z.string().describe("The name of the service")
    })
  }
);
