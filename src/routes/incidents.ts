import { Router, Request, Response } from "express";
import { runIncidentGraph } from "../agents/graph";

const router = Router();

type CreateIncidentBody = {
  service: string;
  message: string;
};

router.post("/", async (req: Request, res: Response) => {
  const { service, message } = req.body as CreateIncidentBody;

  if (!service || !message) {
    res.status(400).json({
      error: "Both 'service' and 'message' fields are required"
    });
    return;
  }

  try {
    const graphResult = await runIncidentGraph(service, message);

    const incident = {
      id: Date.now().toString(),
      service: graphResult.serviceName,
      message: graphResult.problem,
      status: "investigated",
      rootCause: graphResult.rootCause,
      confidence: graphResult.confidence,
      confidenceLevel: graphResult.confidenceLevel,
      evidence: graphResult.evidence,
      toolsCalled: graphResult.toolsCalled,
      findings: graphResult.findings,
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      message: "Incident investigated and root cause analyzed by LangGraph agent",
      incident
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to process incident",
      details: error.message
    });
  }
});

export default router;
