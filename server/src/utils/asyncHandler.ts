/** Обёртка для async-обработчиков Express: пробрасывает ошибки в error middleware. */
import express from "express";

export const asyncHandler =
  (
    handler: (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => Promise<void>,
  ) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    void handler(req, res, next).catch(next);
  };
