import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getServiceLogs } from "../services/infrastructure";

export const searchLogsTool = tool(
  async ({ serviceName, limit }) => {
    try {
      const logs = await getServiceLogs(serviceName, limit || 5);
      return JSON.stringify(logs);
    } catch (error: any) {
      return JSON.stringify({ error: error.message });
    }
  },
  {
    name: "search_logs",
    description: "Search recent logs for error messages, warnings, and stack traces.",
    schema: z.object({
      serviceName: z.string().describe("The name of the service"),
      limit: z.number().optional().describe("Number of log entries to retrieve (default is 5)")
    })
  }
);
