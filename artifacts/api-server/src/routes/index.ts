import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import eventsRouter from "./events";
import applicationsRouter from "./applications";
import reportsRouter from "./reports";
import myRouter from "./my";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/events", eventsRouter);
router.use("/events", applicationsRouter);
router.use("/events", reportsRouter);
router.use("/my", myRouter);

export default router;
