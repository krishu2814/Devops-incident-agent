import { StateGraph, START, END } from "@langchain/langgraph";
import { IncidentAnnotation, IncidentState } from "./state";
import { investigatorNode, toolsNode } from "./investigator";
import { rootCauseNode } from "./rootCause";

function shouldContinue(state: IncidentState) {
  if (state.nextAction === "complete" || (state.toolsCalled && state.toolsCalled.length >= 4)) {
    return "root_cause";
  }
  return "tools";
}

export const incidentGraph = new StateGraph(IncidentAnnotation)
  .addNode("investigator", investigatorNode)
  .addNode("tools", toolsNode)
  .addNode("root_cause", rootCauseNode)
  .addEdge(START, "investigator")
  .addConditionalEdges("investigator", shouldContinue, {
    tools: "tools",
    root_cause: "root_cause"
  })
  .addEdge("tools", "investigator")
  .addEdge("root_cause", END)
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
