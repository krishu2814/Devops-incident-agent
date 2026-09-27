import { Annotation } from "@langchain/langgraph";

export const IncidentAnnotation = Annotation.Root({
  serviceName: Annotation<string>,
  problem: Annotation<string>,
  findings: Annotation<string[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => []
  }),
  toolsCalled: Annotation<string[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => []
  }),
  nextAction: Annotation<string>,
  rootCause: Annotation<string | undefined>,
  confidence: Annotation<number | undefined>,
  confidenceLevel: Annotation<"confirmed" | "probable" | "uncertain" | undefined>,
  evidence: Annotation<string[] | undefined>,
  proposedAction: Annotation<"rollback" | "restart" | "scale" | "do_nothing" | undefined>,
  targetVersion: Annotation<string | undefined>,
  remediationReason: Annotation<string | undefined>
});

export type IncidentState = typeof IncidentAnnotation.State;
