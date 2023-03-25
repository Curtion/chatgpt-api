import type { Request } from 'express';

export function getClientIp(req: Request) {
  let ipAddress;
  let forwardedIpsStr = req.header('x-forwarded-for');
  if (forwardedIpsStr) {
    let forwardedIps = forwardedIpsStr.split(',');
    ipAddress = forwardedIps[0];
  }
  if (!ipAddress) {
    ipAddress = req.connection.remoteAddress;
  }
  return ipAddress;
}