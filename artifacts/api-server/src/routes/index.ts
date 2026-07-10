import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import eventsRouter from "./events";
import participationsRouter from "./participations";
import myRouter from "./my";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/events", eventsRouter);
router.use("/events", participationsRouter);
router.use("/my", myRouter);

export default router;
