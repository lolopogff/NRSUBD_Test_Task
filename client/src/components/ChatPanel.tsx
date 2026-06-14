/**
 * Панель чата выбранного кейса: история сообщений, ввод, статус запроса.
 * Свои сообщения можно редактировать/удалять.
 */
import { FormEvent, MouseEvent } from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { LegalRequest, Message, RequestStatus, User } from "../types";
import { getStatusChipSx, getStatusLabel } from "../utils/status";

interface ChatPanelProps {
  user: User;
  selectedRequest: LegalRequest | null;
  messages: Message[];
  messageText: string;
  editingMessageId: string | null;
  editingMessageText: string;
  onMessageTextChange: (value: string) => void;
  onEditingMessageTextChange: (value: string) => void;
  onSendMessage: (event: FormEvent) => void;
  onDeleteCase: (requestId: string) => void;
  onChangeStatus: (status: RequestStatus) => void;
  onStartEditMessage: (messageId: string, currentText: string) => void;
  onCancelEditMessage: () => void;
  onSaveMessage: (requestId: string, messageId: string) => void;
  onOpenMessageMenu: (
    event: MouseEvent<HTMLElement>,
    requestId: string,
    messageId: string,
    text: string,
  ) => void;
}

export default function ChatPanel(props: ChatPanelProps) {
  const {
    user,
    selectedRequest,
    messages,
    messageText,
    editingMessageId,
    editingMessageText,
    onMessageTextChange,
    onEditingMessageTextChange,
    onSendMessage,
    onDeleteCase,
    onChangeStatus,
    onStartEditMessage,
    onCancelEditMessage,
    onSaveMessage,
    onOpenMessageMenu,
  } = props;

  return (
    <Paper
      sx={{
        flex: 1,
        p: 2,
        display: "flex",
        flexDirection: "column",
        height: { xs: "70vh", md: "calc(100vh - 120px)" },
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {!selectedRequest ? (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography color="text.secondary">
            Создайте или выберите правовой запрос.
          </Typography>
        </Box>
      ) : (
        <>
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{selectedRequest.title}</Typography>
              <Tooltip title="Удалить запрос">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDeleteCase(selectedRequest.id)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {selectedRequest.description}
            </Typography>
            {user.role === "specialist" ? (
              // Только специалист меняет статус кейса (new / in_progress / resolved).
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label="Статус запроса" size="small" />
                <Select
                  size="small"
                  value={selectedRequest.status}
                  onChange={(event) =>
                    onChangeStatus(event.target.value as RequestStatus)
                  }
                >
                  <MenuItem value="new">{getStatusLabel("new")}</MenuItem>
                  <MenuItem value="in_progress">{getStatusLabel("in_progress")}</MenuItem>
                  <MenuItem value="resolved">{getStatusLabel("resolved")}</MenuItem>
                </Select>
              </Stack>
            ) : (
              <Chip
                label={`Статус: ${getStatusLabel(selectedRequest.status)}`}
                size="small"
                variant="outlined"
                sx={{ alignSelf: "flex-start", ...getStatusChipSx(selectedRequest.status) }}
              />
            )}
          </Stack>

          <Divider />

          {/* Прокручиваемая история; загружается до 100 последних сообщений. */}
          <Box sx={{ flex: 1, minHeight: 0, py: 2, overflowY: "auto" }}>
            <Stack spacing={1.5}>
              {messages.map((message) => {
                const isOwn = message.authorId === user.id;
                const canManageMessage = message.authorId === user.id && !message.isDeleted;
                const isEditing = editingMessageId === message.id;

                return (
                  <Box
                    key={message.id}
                    sx={{
                      display: "flex",
                      justifyContent: isOwn ? "flex-end" : "flex-start",
                    }}
                  >
                    <Paper
                      elevation={0}
                      onClick={(event) => {
                        if (!canManageMessage || isEditing) return;
                        onOpenMessageMenu(
                          event,
                          message.requestId,
                          message.id,
                          message.text,
                        );
                      }}
                      sx={{
                        px: 1.5,
                        py: 1,
                        maxWidth: { xs: "88%", md: "72%" },
                        borderRadius: "22px",
                        bgcolor: isOwn ? "primary.main" : "#eef3fb",
                        color: isOwn ? "primary.contrastText" : "text.primary",
                        border: "1px solid",
                        borderColor: isOwn ? "primary.main" : "#d7e2f2",
                        opacity: message.isDeleted ? 0.82 : 1,
                        cursor: canManageMessage && !isEditing ? "pointer" : "default",
                        overflow: "hidden",
                      }}
                    >
                      {!isOwn && (
                        <Typography
                          variant="caption"
                          sx={{ display: "block", mb: 0.4, color: "text.secondary" }}
                        >
                          {message.authorName}
                        </Typography>
                      )}

                      {isEditing ? (
                        <Stack spacing={1}>
                          <TextField
                            size="small"
                            multiline
                            minRows={2}
                            fullWidth
                            value={editingMessageText}
                            onChange={(event) =>
                              onEditingMessageTextChange(event.target.value)
                            }
                            sx={
                              isOwn
                                ? {
                                    "& .MuiInputBase-input": {
                                      color: "common.white",
                                    },
                                    "& .MuiInputBase-input::placeholder": {
                                      color: "rgba(255,255,255,0.78)",
                                      opacity: 1,
                                    },
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      borderColor: "rgba(255,255,255,0.45)",
                                    },
                                    "&:hover .MuiOutlinedInput-notchedOutline": {
                                      borderColor: "rgba(255,255,255,0.72)",
                                    },
                                    "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                                      borderColor: "common.white",
                                    },
                                  }
                                : undefined
                            }
                          />
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="Отмена">
                              <IconButton size="small" onClick={onCancelEditMessage}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Сохранить">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  onSaveMessage(message.requestId, message.id)
                                }
                              >
                                <SaveOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      ) : (
                        <Typography
                          variant="body1"
                          sx={{
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.55,
                            fontSize: { xs: "1rem", md: "1.05rem" },
                            fontStyle: message.isDeleted ? "italic" : "normal",
                          }}
                        >
                          {message.text}
                        </Typography>
                      )}

                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 0.6,
                          textAlign: "right",
                          color: isOwn ? "rgba(255,255,255,0.8)" : "text.secondary",
                        }}
                      >
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    </Paper>
                  </Box>
                );
              })}
            </Stack>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box component="form" onSubmit={onSendMessage}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                label="Сообщение"
                value={messageText}
                onChange={(event) => onMessageTextChange(event.target.value)}
              />
              <Button type="submit" variant="contained">
                Отправить
              </Button>
            </Stack>
          </Box>
        </>
      )}
    </Paper>
  );
}
