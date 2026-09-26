import { StateGraph, START, END } from "@langchain/langgraph";
import { IncidentAnnotation, IncidentState } from "./state";
import { getServiceHealthTool } from "../tools/health";

async function agentNode(state: IncidentState) {
  if (state.findings.length === 0) {
    return { nextAction: "check_health" };
  }
  return { nextAction: "complete" };
}

async function toolNode(state: IncidentState) {
  if (state.nextAction === "check_health") {
    const rawResult = await getServiceHealthTool.invoke({
      serviceName: state.serviceName
    });
    return {
      findings: [`Health tool result: ${rawResult}`]
    };
  }
  return {};
}

function shouldContinue(state: IncidentState) {
  if (state.nextAction === "complete") {
    return END;
  }
  return "tool";
}

export const incidentGraph = new StateGraph(IncidentAnnotation)
  .addNode("agent", agentNode)
  .addNode("tool", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {
    tool: "tool",
    [END]: END
  })
  .addEdge("tool", "agent")
  .compile();

export async function runIncidentGraph(serviceName: string, problem: string) {
  const finalState = await incidentGraph.invoke({
    serviceName,
    problem,
    findings: [],
    nextAction: ""
  });
  return finalState;
}
