import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { FormEvent } from "react";

interface EmptyCreateCaseStateProps {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}

export default function EmptyCreateCaseState({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
}: EmptyCreateCaseStateProps) {
  return (
    <Box
      sx={{
        minHeight: { xs: "58vh", md: "calc(100vh - 180px)" },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Paper
        sx={{
          width: "100%",
          maxWidth: 620,
          p: { xs: 2.5, md: 4 },
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h5" gutterBottom>
          Создайте первый правовой запрос
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          После создания запроса откроется рабочее пространство переписки.
        </Typography>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Тема запроса"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              size="small"
              required
            />
            <TextField
              label="Описание"
              value={description}
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
            <Button type="submit" variant="contained">
              Создать запрос
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
