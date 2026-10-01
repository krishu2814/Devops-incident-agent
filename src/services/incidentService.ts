import { prisma } from "./db";
import { executeRemediation, RemediationExecution } from "./remediationService";
import { verifyServiceRecovery, VerificationResult } from "./verificationService";

export type Incident = {
  id: string;
  service: string;
  message: string;
  status: "waiting_for_approval" | "approved" | "rejected" | "resolved" | "recovery_failed" | "executed";
  rootCause?: string;
  confidence?: number;
  confidenceLevel?: "confirmed" | "probable" | "uncertain";
  evidence?: string[];
  remediation?: {
    action?: "rollback" | "restart" | "scale" | "do_nothing";
    targetVersion?: string;
    reason?: string;
  };
  remediationExecution?: RemediationExecution;
  verification?: VerificationResult;
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

function mapPrismaToIncident(record: any): Incident {
  return {
    id: record.id,
    service: record.service,
    message: record.message,
    status: record.status,
    rootCause: record.rootCause ?? undefined,
    confidence: record.confidence ?? undefined,
    confidenceLevel: record.confidenceLevel ?? undefined,
    evidence: record.evidence ? record.evidence.map((e: any) => e.finding) : undefined,
    remediation: record.remediation ? {
      action: record.remediation.action,
      targetVersion: record.remediation.targetVersion ?? undefined,
      reason: record.remediation.reason ?? undefined
    } : undefined,
    remediationExecution: record.remediation?.executed ? {
      executed: record.remediation.executed,
      action: record.remediation.action,
      details: record.remediation.executionDetails ? JSON.parse(record.remediation.executionDetails) : undefined,
      executedAt: record.remediation.executedAt ?? ""
    } : undefined,
    verification: record.verification ? {
      verified: record.verification.verified,
      status: record.verification.status,
      latencyMs: record.verification.latencyMs,
      errorRatePercent: record.verification.errorRatePercent,
      verifiedAt: record.verification.verifiedAt,
      message: record.verification.message
    } : undefined,
    approvalDecision: record.decision ? {
      decision: record.decision.decision,
      decidedAt: record.decision.decidedAt,
      decidedBy: record.decision.decidedBy,
      reason: record.decision.reason ?? undefined
    } : undefined,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt),
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : String(record.updatedAt)
  };
}

export async function saveIncident(incident: Incident): Promise<Incident> {
  const existing = await prisma.incident.findUnique({
    where: { id: incident.id }
  });

  if (!existing) {
    await prisma.incident.create({
      data: {
        id: incident.id,
        service: incident.service,
        message: incident.message,
        status: incident.status,
        rootCause: incident.rootCause,
        confidence: incident.confidence,
        confidenceLevel: incident.confidenceLevel,
        createdAt: new Date(incident.createdAt),
        updatedAt: new Date(incident.updatedAt),
        evidence: incident.evidence ? {
          create: incident.evidence.map((finding) => ({ finding }))
        } : undefined,
        remediation: incident.remediation?.action ? {
          create: {
            action: incident.remediation.action,
            targetVersion: incident.remediation.targetVersion,
            reason: incident.remediation.reason,
            executed: incident.remediationExecution?.executed ?? false,
            executedAt: incident.remediationExecution?.executedAt,
            executionDetails: incident.remediationExecution?.details
              ? JSON.stringify(incident.remediationExecution.details)
              : undefined
          }
        } : undefined,
        auditLogs: {
          create: {
            action: "created",
            details: JSON.stringify({
              status: incident.status,
              action: incident.remediation?.action
            })
          }
        }
      }
    });
  } else {
    await prisma.incident.update({
      where: { id: incident.id },
      data: {
        status: incident.status,
        rootCause: incident.rootCause,
        confidence: incident.confidence,
        confidenceLevel: incident.confidenceLevel,
        updatedAt: new Date(incident.updatedAt)
      }
    });

    if (incident.remediation) {
      await prisma.remediation.upsert({
        where: { incidentId: incident.id },
        create: {
          incidentId: incident.id,
          action: incident.remediation.action || "do_nothing",
          targetVersion: incident.remediation.targetVersion,
          reason: incident.remediation.reason,
          executed: incident.remediationExecution?.executed ?? false,
          executedAt: incident.remediationExecution?.executedAt,
          executionDetails: incident.remediationExecution?.details
            ? JSON.stringify(incident.remediationExecution.details)
            : undefined
        },
        update: {
          action: incident.remediation.action || "do_nothing",
          targetVersion: incident.remediation.targetVersion,
          reason: incident.remediation.reason,
          executed: incident.remediationExecution?.executed ?? false,
          executedAt: incident.remediationExecution?.executedAt,
          executionDetails: incident.remediationExecution?.details
            ? JSON.stringify(incident.remediationExecution.details)
            : undefined
        }
      });
    }

    if (incident.verification) {
      await prisma.verification.upsert({
        where: { incidentId: incident.id },
        create: {
          incidentId: incident.id,
          verified: incident.verification.verified,
          status: incident.verification.status,
          latencyMs: incident.verification.latencyMs,
          errorRatePercent: incident.verification.errorRatePercent,
          verifiedAt: incident.verification.verifiedAt,
          message: incident.verification.message
        },
        update: {
          verified: incident.verification.verified,
          status: incident.verification.status,
          latencyMs: incident.verification.latencyMs,
          errorRatePercent: incident.verification.errorRatePercent,
          verifiedAt: incident.verification.verifiedAt,
          message: incident.verification.message
        }
      });
    }

    if (incident.approvalDecision) {
      await prisma.approvalDecision.upsert({
        where: { incidentId: incident.id },
        create: {
          incidentId: incident.id,
          decision: incident.approvalDecision.decision,
          decidedBy: incident.approvalDecision.decidedBy,
          decidedAt: incident.approvalDecision.decidedAt,
          reason: incident.approvalDecision.reason
        },
        update: {
          decision: incident.approvalDecision.decision,
          decidedBy: incident.approvalDecision.decidedBy,
          decidedAt: incident.approvalDecision.decidedAt,
          reason: incident.approvalDecision.reason
        }
      });
    }
  }

  const saved = await getIncidentById(incident.id);
  return saved || incident;
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  const found = await prisma.incident.findUnique({
    where: { id },
    include: {
      evidence: true,
      remediation: true,
      verification: true,
      decision: true,
      auditLogs: true
    }
  });

  if (!found) return null;
  return mapPrismaToIncident(found);
}

export async function getAllIncidents(): Promise<Incident[]> {
  const list = await prisma.incident.findMany({
    include: {
      evidence: true,
      remediation: true,
      verification: true,
      decision: true
    },
    orderBy: { createdAt: "desc" }
  });

  return list.map(mapPrismaToIncident);
}

export async function resetIncidents(): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.remediation.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.approvalDecision.deleteMany();
  await prisma.incident.deleteMany();
}

export async function approveIncident(id: string, decidedBy: string = "on-call-engineer"): Promise<Incident> {
  const incident = await getIncidentById(id);
  if (!incident) {
    throw new Error(`Incident with id '${id}' not found`);
  }

  if (incident.status !== "waiting_for_approval") {
    throw new Error(`Cannot approve incident in status '${incident.status}'`);
  }

  const action = incident.remediation?.action || "do_nothing";
  const targetVersion = incident.remediation?.targetVersion;

  const execution = await executeRemediation(action, incident.service, targetVersion);
  const verification = await verifyServiceRecovery(incident.service);

  incident.status = verification.verified ? "resolved" : "recovery_failed";
  incident.updatedAt = new Date().toISOString();
  incident.approvalDecision = {
    decision: "approved",
    decidedAt: new Date().toISOString(),
    decidedBy
  };
  incident.remediationExecution = execution;
  incident.verification = verification;

  await saveIncident(incident);

  await prisma.auditLog.create({
    data: {
      incidentId: id,
      action: "approved",
      details: JSON.stringify({
        decidedBy,
        action,
        verified: verification.verified,
        status: incident.status
      })
    }
  });

  return incident;
}

export async function rejectIncident(id: string, decidedBy: string = "on-call-engineer", reason?: string): Promise<Incident> {
  const incident = await getIncidentById(id);
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

  await saveIncident(incident);

  await prisma.auditLog.create({
    data: {
      incidentId: id,
      action: "rejected",
      details: JSON.stringify({
        decidedBy,
        reason: incident.approvalDecision.reason
      })
    }
  });

  return incident;
}

export async function getIncidentAuditLogs(id: string) {
  return prisma.auditLog.findMany({
    where: { incidentId: id },
    orderBy: { timestamp: "asc" }
  });
}
