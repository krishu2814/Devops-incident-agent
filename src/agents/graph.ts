import { StateGraph, START, END } from "@langchain/langgraph";
import { IncidentAnnotation, IncidentState } from "./state";
import { investigatorNode, toolsNode } from "./investigator";

function shouldContinue(state: IncidentState) {
  if (state.nextAction === "complete" || (state.toolsCalled && state.toolsCalled.length >= 4)) {
    return END;
  }
  return "tools";
}

export const incidentGraph = new StateGraph(IncidentAnnotation)
  .addNode("investigator", investigatorNode)
  .addNode("tools", toolsNode)
  .addEdge(START, "investigator")
  .addConditionalEdges("investigator", shouldContinue, {
    tools: "tools",
    [END]: END
  })
  .addEdge("tools", "investigator")
  .compile();

export async function runIncidentGraph(serviceName: string, problem: string) {
  const finalState = await incidentGraph.invoke({
    serviceName,
    problem,
    findings: [],
    toolsCalled: [],
    nextAction: ""
  });
  return finalState;
}
