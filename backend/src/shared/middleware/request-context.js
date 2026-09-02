import crypto from "node:crypto";

const SAFE_REQUEST_ID = /^[a-zA-Z0-9._:-]{1,100}$/;

export function requestContext(req, res, next) {
  const supplied = req.get("x-request-id");
  req.requestId =
    supplied && SAFE_REQUEST_ID.test(supplied) ? supplied : crypto.randomUUID();
  res.set("x-request-id", req.requestId);
  next();
}
