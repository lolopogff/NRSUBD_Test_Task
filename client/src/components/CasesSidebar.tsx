/** Боковая панель: список кейсов, переключение между чатами, форма создания нового. */
import { FormEvent } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { LegalRequest, UserRole } from "../types";
import { getStatusChipSx, getStatusLabel } from "../utils/status";

interface CasesSidebarProps {
  userRole: UserRole;
  requests: LegalRequest[];
  selectedRequestId: string | null;
  newRequestTitle: string;
  newRequestDescription: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCreateRequest: (event: FormEvent) => void;
  onSelectRequest: (requestId: string) => void;
}

export default function CasesSidebar(props: CasesSidebarProps) {
  const {
    userRole,
    requests,
    selectedRequestId,
    newRequestTitle,
    newRequestDescription,
    onTitleChange,
    onDescriptionChange,
    onCreateRequest,
    onSelectRequest,
  } = props;

  return (
    <Paper
      sx={{
        width: { xs: "100%", md: 360 },
        p: 2,
        display: "flex",
        flexDirection: "column",
        height: { xs: "auto", md: "calc(100vh - 120px)" },
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Правовые запросы
      </Typography>
      {userRole === "user" ? (
        <Box component="form" onSubmit={onCreateRequest} sx={{ mb: 2 }}>
          <Stack spacing={1.5}>
            <TextField
              label="Тема запроса"
              value={newRequestTitle}
              onChange={(event) => onTitleChange(event.target.value)}
              size="small"
              required
            />
            <TextField
              label="Опишите вашу ситуацию"
              value={newRequestDescription}
              onChange={(event) => onDescriptionChange(event.target.value)}
              size="small"
              multiline
              rows={3}
              required
              sx={{
                "& .MuiInputBase-inputMultiline": {
                  overflowY: "auto",
                },
              }}
            />
            <Button type="submit" variant="outlined">
              Создать запрос на сопровождение
            </Button>
          </Stack>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Вы вошли как специалист. Доступны все запросы пользователей.
        </Typography>
      )}

      <Divider sx={{ mb: 1.5 }} />
      <List dense sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {requests.map((item) => (
          <ListItemButton
            key={item.id}
            selected={item.id === selectedRequestId}
            onClick={() => onSelectRequest(item.id)}
            sx={{
              borderRadius: 1.5,
              mb: 0.6,
              border: "1px solid",
              borderColor: item.id === selectedRequestId ? "primary.light" : "divider",
              bgcolor: item.id === selectedRequestId ? "#fff7ea" : "transparent",
            }}
          >
            <ListItemText
              primary={item.title}
              secondary={
                <Chip
                  label={`Статус: ${getStatusLabel(item.status)}`}
                  size="small"
                  variant="outlined"
                  sx={{ mt: 0.6, ...getStatusChipSx(item.status) }}
                />
              }
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}
