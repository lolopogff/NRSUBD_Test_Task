import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { FormEvent } from "react";
import { UserRole } from "../types";

interface AuthCardProps {
  authMode: "login" | "register";
  name: string;
  username: string;
  password: string;
  role: UserRole;
  loading: boolean;
  error: string | null;
  onAuthModeChange: (mode: "login" | "register") => void;
  onNameChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRoleChange: (role: UserRole) => void;
  onSubmit: (event: FormEvent) => void;
}

export default function AuthCard(props: AuthCardProps) {
  const {
    authMode,
    name,
    username,
    password,
    role,
    loading,
    error,
    onAuthModeChange,
    onNameChange,
    onUsernameChange,
    onPasswordChange,
    onRoleChange,
    onSubmit,
  } = props;

  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Paper sx={{ p: 4, border: "1px solid", borderColor: "divider" }}>
        <Typography variant="h5" gutterBottom>
          Аккаунт чата сопровождения правового запроса
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Можно зарегистрировать пользователя и специалиста.
        </Typography>
        <Tabs
          value={authMode}
          onChange={(_event, value) => onAuthModeChange(value)}
          sx={{ mb: 2, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Tab value="login" label="Вход" />
          <Tab value="register" label="Регистрация" />
        </Tabs>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            {authMode === "register" && (
              <TextField
                label="Имя"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                required
                fullWidth
              />
            )}
            <TextField
              label="Имя пользователя"
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Пароль"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              required
              fullWidth
            />
            {authMode === "register" && (
              <FormControl fullWidth>
                <InputLabel id="role-select-label">Роль</InputLabel>
                <Select
                  labelId="role-select-label"
                  label="Роль"
                  value={role}
                  onChange={(event) => onRoleChange(event.target.value as UserRole)}
                >
                  <MenuItem value="user">Пользователь</MenuItem>
                  <MenuItem value="specialist">Специалист</MenuItem>
                </Select>
              </FormControl>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" disabled={loading}>
              {authMode === "register" ? "Создать аккаунт" : "Войти"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
