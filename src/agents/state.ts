import { Annotation } from "@langchain/langgraph";

export const IncidentAnnotation = Annotation.Root({
  serviceName: Annotation<string>,
  problem: Annotation<string>,
  findings: Annotation<string[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => []
  }),
  nextAction: Annotation<string>
});

export type IncidentState = typeof IncidentAnnotation.State;
