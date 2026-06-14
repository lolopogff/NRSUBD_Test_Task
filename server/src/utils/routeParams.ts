/**
 * Express 5 типизирует req.params как string | string[].
 * Для одиночных сегментов маршрута берём первое значение.
 */
export function getRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}
