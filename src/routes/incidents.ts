import { Router, Request, Response } from "express";
import { runIncidentGraph } from "../agents/graph";
import {
  saveIncident,
  getIncidentById,
  getAllIncidents,
  approveIncident,
  rejectIncident,
  Incident
} from "../services/incidentService";

const router = Router();

type CreateIncidentBody = {
  service: string;
  message: string;
};

type ApprovalBody = {
  decidedBy?: string;
  reason?: string;
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
    const now = new Date().toISOString();

    const requiresApproval =
      graphResult.proposedAction && graphResult.proposedAction !== "do_nothing";

    const incident: Incident = {
      id: Date.now().toString(),
      service: graphResult.serviceName,
      message: graphResult.problem,
      status: requiresApproval ? "waiting_for_approval" : "resolved",
      rootCause: graphResult.rootCause,
      confidence: graphResult.confidence,
      confidenceLevel: graphResult.confidenceLevel,
      evidence: graphResult.evidence,
      remediation: {
        action: graphResult.proposedAction,
        targetVersion: graphResult.targetVersion,
        reason: graphResult.remediationReason
      },
      toolsCalled: graphResult.toolsCalled,
      findings: graphResult.findings,
      createdAt: now,
      updatedAt: now
    };

    saveIncident(incident);

    res.status(201).json({
      message: requiresApproval
        ? "Incident investigated. Remediation plan requires human approval."
        : "Incident investigated. No remediation action required.",
      incident
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to process incident",
      details: error.message
    });
  }
});

router.get("/", (_req: Request, res: Response) => {
  const all = getAllIncidents();
  res.json({ incidents: all });
});

router.get("/:id", (req: Request, res: Response) => {
  const incident = getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({ error: `Incident with id '${req.params.id}' not found` });
    return;
  }
  res.json({ incident });
});

router.post("/:id/approve", (req: Request, res: Response) => {
  const { decidedBy } = req.body as ApprovalBody;
  try {
    const updated = approveIncident(req.params.id, decidedBy);
    res.json({
      message: "Remediation plan approved by operator",
      incident: updated
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/:id/reject", (req: Request, res: Response) => {
  const { decidedBy, reason } = req.body as ApprovalBody;
  try {
    const updated = rejectIncident(req.params.id, decidedBy, reason);
    res.json({
      message: "Remediation plan rejected by operator. Execution halted safely.",
      incident: updated
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
