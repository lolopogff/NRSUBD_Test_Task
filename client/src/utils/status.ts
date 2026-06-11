import { RequestStatus, UserRole } from "../types";

export function getStatusLabel(status: string): string {
  if (status === "new") return "Новый";
  if (status === "in_progress") return "В работе";
  return "Завершен";
}

export function getRoleLabel(role: UserRole): string {
  return role === "specialist" ? "Специалист" : "Пользователь";
}

export function getStatusChipSx(status: RequestStatus) {
  if (status === "new") {
    return {
      bgcolor: "#ffffff",
      color: "text.primary",
      borderColor: "divider",
    };
  }

  if (status === "in_progress") {
    return {
      bgcolor: "primary.main",
      color: "primary.contrastText",
      borderColor: "primary.main",
    };
  }

  return {
    bgcolor: "#2e7d32",
    color: "#ffffff",
    borderColor: "#2e7d32",
  };
}
