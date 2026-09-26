import { Router, Request, Response } from "express";

const router = Router();

type CreateIncidentBody = {
  service: string;
  message: string;
};

router.post("/", (req: Request, res: Response) => {
  const { service, message } = req.body as CreateIncidentBody;

  if (!service || !message) {
    res.status(400).json({
      error: "Both 'service' and 'message' fields are required"
    });
    return;
  }

  const incident = {
    id: Date.now().toString(),
    service,
    message,
    status: "open",
    createdAt: new Date().toISOString()
  };

  res.status(201).json({
    message: "Incident received",
    incident
  });
});

export default router;
