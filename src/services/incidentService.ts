export type Incident = {
  id: string;
  service: string;
  message: string;
  status: "waiting_for_approval" | "approved" | "rejected" | "resolved";
  rootCause?: string;
  confidence?: number;
  confidenceLevel?: "confirmed" | "probable" | "uncertain";
  evidence?: string[];
  remediation?: {
    action?: "rollback" | "restart" | "scale" | "do_nothing";
    targetVersion?: string;
    reason?: string;
  };
  toolsCalled?: string[];
  findings?: string[];
  approvalDecision?: {
    decision: "approved" | "rejected";
    decidedAt: string;
    decidedBy: string;
    reason?: string;
  };
  createdAt: string;
  updatedAt: string;
};

const incidents: Record<string, Incident> = {};

export function saveIncident(incident: Incident): Incident {
  incidents[incident.id] = incident;
  return incident;
}

export function getIncidentById(id: string): Incident | undefined {
  return incidents[id];
}

export function getAllIncidents(): Incident[] {
  return Object.values(incidents);
}

export function approveIncident(id: string, decidedBy: string = "on-call-engineer"): Incident {
  const incident = incidents[id];
  if (!incident) {
    throw new Error(`Incident with id '${id}' not found`);
  }

  if (incident.status !== "waiting_for_approval") {
    throw new Error(`Cannot approve incident in status '${incident.status}'`);
  }

  incident.status = "approved";
  incident.updatedAt = new Date().toISOString();
  incident.approvalDecision = {
    decision: "approved",
    decidedAt: new Date().toISOString(),
    decidedBy
  };

  return incident;
}

export function rejectIncident(id: string, decidedBy: string = "on-call-engineer", reason?: string): Incident {
  const incident = incidents[id];
  if (!incident) {
    throw new Error(`Incident with id '${id}' not found`);
  }

  if (incident.status !== "waiting_for_approval") {
    throw new Error(`Cannot reject incident in status '${incident.status}'`);
  }

  incident.status = "rejected";
  incident.updatedAt = new Date().toISOString();
  incident.approvalDecision = {
    decision: "rejected",
    decidedAt: new Date().toISOString(),
    decidedBy,
    reason: reason || "Rejected by operator"
  };

  return incident;
}
