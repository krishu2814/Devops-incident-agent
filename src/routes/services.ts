import { Router, Request, Response } from "express";
import {
  getServiceHealth,
  getServiceMetrics,
  getServiceLogs,
  getRecentDeployments
} from "../services/infrastructure";

const router = Router();

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
    const data = await getServiceLogs(req.params.name);
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
