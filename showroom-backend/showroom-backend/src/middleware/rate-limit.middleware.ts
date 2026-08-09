import { NextFunction, Request, Response } from 'express';
import { sendError } from '../utils/response';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Lightweight in-memory limiter. Use Redis-backed limiting when running multiple instances. */
export const rateLimit = (name: string, max: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const client = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${name}:${client}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - current.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));

    if (current.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      sendError(res, 'Bạn thao tác quá nhanh, vui lòng thử lại sau', 429);
      return;
    }

    if (buckets.size > 10_000) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    next();
  };
};
