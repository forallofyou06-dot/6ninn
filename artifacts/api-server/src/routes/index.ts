import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import eventsRouter from "./events";
import participationsRouter from "./participations";
import myRouter from "./my";
import reportsRouter from "./reports";
import notificationsRouter from "./notifications";
import feedbacksRouter from "./feedbacks";
import officeRouter from "./office";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/events", eventsRouter);
router.use("/events", participationsRouter);
router.use("/my", myRouter);
router.use("/", reportsRouter);
router.use("/notifications", notificationsRouter);
router.use("/feedbacks", feedbacksRouter);
router.use("/office", officeRouter);

export default router;
