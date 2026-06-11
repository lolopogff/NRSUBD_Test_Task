import { Menu, MenuItem } from "@mui/material";

interface MessageActionsMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function MessageActionsMenu({
  anchorEl,
  onClose,
  onEdit,
  onDelete,
}: MessageActionsMenuProps) {
  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      <MenuItem onClick={onEdit}>Редактировать</MenuItem>
      <MenuItem onClick={onDelete} sx={{ color: "error.main" }}>
        Удалить
      </MenuItem>
    </Menu>
  );
}
