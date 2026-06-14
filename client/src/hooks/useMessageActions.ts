/** Локальное состояние редактирования и контекстного меню своих сообщений. */
import { MouseEvent, useState } from "react";
import { useAppDispatch } from "../hooks";
import { editMessage, removeMessage } from "../slices/messagesSlice";

export function useMessageActions() {
  const dispatch = useAppDispatch();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [menuRequestId, setMenuRequestId] = useState<string | null>(null);
  const [menuMessageText, setMenuMessageText] = useState("");

  const startEditMessage = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId);
    setEditingMessageText(currentText);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingMessageText("");
  };

  const openMessageMenu = (
    event: MouseEvent<HTMLElement>,
    requestId: string,
    messageId: string,
    text: string,
  ) => {
    setMessageMenuAnchor(event.currentTarget);
    setMenuRequestId(requestId);
    setMenuMessageId(messageId);
    setMenuMessageText(text);
  };

  const closeMessageMenu = () => {
    setMessageMenuAnchor(null);
    setMenuRequestId(null);
    setMenuMessageId(null);
    setMenuMessageText("");
  };

  const handleSaveMessage = async (requestId: string, messageId: string) => {
    const text = editingMessageText.trim();
    if (!text) return;
    await dispatch(editMessage({ requestId, messageId, text }));
    cancelEditMessage();
  };

  const handleDeleteMessage = async (requestId: string, messageId: string) => {
    if (!window.confirm("Удалить сообщение?")) return;
    await dispatch(removeMessage({ requestId, messageId }));
    if (editingMessageId === messageId) {
      cancelEditMessage();
    }
  };

  const handleEditFromMenu = () => {
    if (!menuMessageId) return;
    startEditMessage(menuMessageId, menuMessageText);
    closeMessageMenu();
  };

  const handleDeleteFromMenu = async () => {
    if (!menuRequestId || !menuMessageId) return;
    await handleDeleteMessage(menuRequestId, menuMessageId);
    closeMessageMenu();
  };

  return {
    editingMessageId,
    editingMessageText,
    setEditingMessageText,
    messageMenuAnchor,
    startEditMessage,
    cancelEditMessage,
    openMessageMenu,
    closeMessageMenu,
    handleSaveMessage,
    handleDeleteMessage,
    handleEditFromMenu,
    handleDeleteFromMenu,
  };
}
