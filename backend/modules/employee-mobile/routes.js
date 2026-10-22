import express from "express";
import { punchUser } from "../../lib/punch-regularization.js";
import { createEmployeeMobileSession, refreshEmployeeMobileSession, revokeEmployeeMobileSession, employeeMobileUser, employeeMobileData } from "../../lib/employee-mobile-session.js";

export function employeeMobileRoutes(db) {
  const router = express.Router();
  router.use((_req, res, next) => { res.set("Cache-Control", "private, no-store"); next(); });
  const run = (action) => async (req, res) => {
    try { await action(req, res); }
    catch (error) {
      res.status(error.status || 503).json({ error: error.status ? error.message : ["P2021", "P2022"].includes(error.code) ? "The employee mobile session migration must be deployed." : "Employee sessions are temporarily unavailable. Please retry." });
    }
  };
  router.post("/sessions", run(async (req, res) => res.status(201).json(await createEmployeeMobileSession(db, req.headers.authorization))));
  router.post("/refresh", run(async (req, res) => res.json(await refreshEmployeeMobileSession(db, req.body?.refreshToken))));
  router.post("/logout", run(async (req, res) => { await revokeEmployeeMobileSession(db, req.body?.refreshToken); res.json({ loggedOut: true }); }));
  router.get("/session", run(async (req, res) => res.json(await employeeMobileUser(db, req.headers.authorization))));
  router.get("/hrms", run(async (req, res) => {
    const { employee } = await employeeMobileUser(db, req.headers.authorization);
    res.json(await employeeMobileData(db, employee));
  }));
  return router;
}

// Existing corporate sessions retain their existing middleware. Every valid
// mobile bearer is additionally checked against the live account/device record.
export function validateEmployeeMobileBearer(db) {
  return async (req, res, next) => {
    let user;
    let mobile = false;
    try {
      const encoded = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").split(".")[0];
      mobile = Boolean(JSON.parse(Buffer.from(encoded, "base64url").toString()).user?.employeeMobileSessionId);
    } catch {}
    try { user = punchUser(req.headers.authorization); }
    catch {
      if (!mobile) return next();
      return res.set("Cache-Control", "private, no-store").status(401).json({ error: "Employee access token expired or invalid." });
    }
    if (!user.employeeMobileSessionId) return next();
    res.set("Cache-Control", "private, no-store");
    try { await employeeMobileUser(db, req.headers.authorization); next(); }
    catch (error) { res.status(error.status || 503).json({ error: error.status ? error.message : "Unable to validate employee access. Please retry." }); }
  };
}
