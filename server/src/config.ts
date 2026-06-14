/** Переменные окружения backend. Значения по умолчанию — для локальной разработки. */
export const port = Number(process.env.PORT ?? 4000);
export const jwtSecret = process.env.JWT_SECRET ?? "dev_secret_change_me";
