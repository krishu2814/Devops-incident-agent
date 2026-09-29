import { Router, Request, Response } from "express";
import {
  getServiceHealth,
  getServiceMetrics,
  getServiceLogs,
  getRecentDeployments,
  resetSimulatedInfrastructure
} from "../services/infrastructure";
import { resetIncidents } from "../services/incidentService";

const router = Router();

router.post("/reset", (_req: Request, res: Response) => {
  resetIncidents();
  const result = resetSimulatedInfrastructure();
  res.json({
    ...result,
    incidents: "Incidents history cleared"
  });
});

router.get("/:name/health", async (req: Request, res: Response) => {
  try {
    const data = await getServiceHealth(req.params.name);
    res.json(data);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.get("/:name/metrics", async (req: Request, res: Response) => {
  try {
    const data = await getServiceMetrics(req.params.name);
    res.json(data);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.get("/:name/logs", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const data = await getServiceLogs(req.params.name, isNaN(limit) ? 10 : limit);
    res.json(data);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.get("/:name/deployments", async (req: Request, res: Response) => {
  try {
    const data = await getRecentDeployments(req.params.name);
    res.json(data);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
