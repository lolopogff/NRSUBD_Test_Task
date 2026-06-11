import { AppBar, Box, Button, Stack, Toolbar, Typography } from "@mui/material";
import { User } from "../types";
import { getRoleLabel } from "../utils/status";

interface AppHeaderProps {
  user: User;
  onLogout: () => void;
}

export default function AppHeader({ user, onLogout }: AppHeaderProps) {
  return (
    <AppBar
      position="static"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: "3px solid",
        borderColor: "primary.main",
        bgcolor: "background.paper",
      }}
    >
      <Toolbar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ color: "secondary.dark", lineHeight: 1.2 }}>
            Чат сопровождения правового запроса
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
            {getRoleLabel(user.role)}: {user.name} (@{user.username})
          </Typography>
          <Button
            color="inherit"
            variant="text"
            size="small"
            onClick={onLogout}
            sx={{ color: "text.secondary", minWidth: "auto", px: 1 }}
          >
            Выйти
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
