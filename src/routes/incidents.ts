import { Router, Request, Response } from "express";
import { runIncidentGraph } from "../agents/graph";
import {
  saveIncident,
  getIncidentById,
  getAllIncidents,
  approveIncident,
  rejectIncident,
  getIncidentAuditLogs,
  Incident
} from "../services/incidentService";
import { verifyServiceRecovery } from "../services/verificationService";
import { getAgentSession } from "../services/redisService";

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
  const { service, message } = (req.body || {}) as CreateIncidentBody;

  if (
    !service ||
    !message ||
    typeof service !== "string" ||
    typeof message !== "string" ||
    service.trim().length === 0 ||
    message.trim().length === 0
  ) {
    res.status(400).json({
      error: "Both 'service' and 'message' fields are required non-empty strings"
    });
    return;
  }

  const cleanService = service.trim();
  const cleanMessage = message.trim();

  try {
    const incidentId = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const graphResult = await runIncidentGraph(cleanService, cleanMessage, incidentId);
    const now = new Date().toISOString();

    const requiresApproval =
      graphResult.proposedAction && graphResult.proposedAction !== "do_nothing";

    const incident: Incident = {
      id: incidentId,
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

    await saveIncident(incident);

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

router.get("/", async (_req: Request, res: Response) => {
  const all = await getAllIncidents();
  res.json({ incidents: all });
});

router.get("/sessions/:id", async (req: Request, res: Response) => {
  const session = await getAgentSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: `Session for incident '${req.params.id}' not found in cache` });
    return;
  }
  res.json({ session });
});

router.get("/:id", async (req: Request, res: Response) => {
  const incident = await getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({ error: `Incident with id '${req.params.id}' not found` });
    return;
  }
  res.json({ incident });
});

router.get("/:id/audit", async (req: Request, res: Response) => {
  const incident = await getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({ error: `Incident with id '${req.params.id}' not found` });
    return;
  }

  const auditLogs = await getIncidentAuditLogs(req.params.id);
  res.json({
    incidentId: req.params.id,
    auditLogs
  });
});

router.post("/:id/approve", async (req: Request, res: Response) => {
  const incident = await getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({ error: `Incident with id '${req.params.id}' not found` });
    return;
  }

  const { decidedBy } = (req.body || {}) as ApprovalBody;
  try {
    const updated = await approveIncident(req.params.id, decidedBy);
    const isResolved = updated.status === "resolved";
    res.json({
      message: isResolved
        ? "Remediation plan approved, executed, and service recovery verified successfully"
        : "Remediation plan executed, but verification failed. Incident escalated for manual intervention",
      incident: updated
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/:id/reject", async (req: Request, res: Response) => {
  const incident = await getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({ error: `Incident with id '${req.params.id}' not found` });
    return;
  }

  const { decidedBy, reason } = (req.body || {}) as ApprovalBody;
  try {
    const updated = await rejectIncident(req.params.id, decidedBy, reason);
    res.json({
      message: "Remediation plan rejected by operator. Execution halted safely.",
      incident: updated
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/:id/verify", async (req: Request, res: Response) => {
  const incident = await getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({ error: `Incident with id '${req.params.id}' not found` });
    return;
  }

  const verification = await verifyServiceRecovery(incident.service);
  incident.verification = verification;
  incident.status = verification.verified ? "resolved" : "recovery_failed";
  incident.updatedAt = new Date().toISOString();
  await saveIncident(incident);

  res.json({
    message: verification.verified
      ? `Service '${incident.service}' recovery verified successfully`
      : `Service '${incident.service}' verification failed. Escalation required`,
    incident
  });
});

export default router;
