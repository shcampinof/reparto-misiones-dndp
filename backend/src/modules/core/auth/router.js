import { Router } from "express";
import { asyncHandler } from "../../../shared/errors.js";

export function createAuthRouter({ authService, authMiddleware }) {
  const router = Router();

  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      res.json(authService.login(req.body || {}));
    }),
  );

  router.post(
    "/select-account",
    asyncHandler(async (req, res) => {
      res.json(authService.selectAccount(req.body || {}));
    }),
  );

  router.get(
    "/me",
    authMiddleware,
    asyncHandler(async (req, res) => {
      res.json({ profile: authService.getProfile(req.auth) });
    }),
  );

  return router;
}
