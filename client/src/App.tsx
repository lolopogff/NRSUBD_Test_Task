import { FormEvent, useEffect, useMemo, useState } from "react";
import { Box, Container } from "@mui/material";
import { useAppDispatch, useAppSelector } from "./hooks";
import { loginAccount, logout, registerAccount } from "./slices/userSlice";
import {
  addRequest,
  changeRequestStatus,
  fetchRequests,
  removeRequest,
  selectRequest,
} from "./slices/requestsSlice";
import {
  addMessage,
  selectMessagesByRequest,
} from "./slices/messagesSlice";
import { RequestStatus, UserRole } from "./types";
import { useMessageSync } from "./hooks/useMessageSync";
import { useMessageActions } from "./hooks/useMessageActions";
import AppHeader from "./components/AppHeader";
import AuthCard from "./components/AuthCard";
import EmptyCreateCaseState from "./components/EmptyCreateCaseState";
import CasesSidebar from "./components/CasesSidebar";
import ChatPanel from "./components/ChatPanel";
import MessageActionsMenu from "./components/MessageActionsMenu";

export default function App() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.current);
  const token = useAppSelector((state) => state.user.token);
  const userLoading = useAppSelector((state) => state.user.loading);
  const userError = useAppSelector((state) => state.user.error);
  const requests = useAppSelector((state) => state.requests.items);
  const selectedRequestId = useAppSelector(
    (state) => state.requests.selectedRequestId,
  );
  const selectedRequest = useMemo(
    () => requests.find((item) => item.id === selectedRequestId) ?? null,
    [requests, selectedRequestId],
  );
  const messages = useAppSelector((state) =>
    selectedRequestId ? selectMessagesByRequest(state, selectedRequestId) : [],
  );

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [newRequestTitle, setNewRequestTitle] = useState("");
  const [newRequestDescription, setNewRequestDescription] = useState("");
  const [messageText, setMessageText] = useState("");
  const {
    editingMessageId,
    editingMessageText,
    setEditingMessageText,
    messageMenuAnchor,
    startEditMessage,
    cancelEditMessage,
    openMessageMenu,
    closeMessageMenu,
    handleSaveMessage,
    handleEditFromMenu,
    handleDeleteFromMenu,
  } = useMessageActions();

  useEffect(() => {
    if (!user) return;
    void dispatch(fetchRequests());
  }, [dispatch, user]);

  useMessageSync(selectedRequestId, token);

  const handleAuth = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedUsername = username.trim().toLowerCase();
    const trimmedName = name.trim();
    if (!normalizedUsername || !password) return;

    if (authMode === "register") {
      if (!trimmedName) return;
      await dispatch(
        registerAccount({
          name: trimmedName,
          username: normalizedUsername,
          password,
          role,
        }),
      );
    } else {
      await dispatch(
        loginAccount({
          username: normalizedUsername,
          password,
        }),
      );
    }

    setPassword("");
  };

  const handleCreateRequest = async (event: FormEvent) => {
    event.preventDefault();
    const title = newRequestTitle.trim();
    const description = newRequestDescription.trim();
    if (!title || !description) return;
    await dispatch(addRequest({ title, description }));
    setNewRequestTitle("");
    setNewRequestDescription("");
  };

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedRequestId || !user) return;
    const text = messageText.trim();
    if (!text) return;
    await dispatch(
      addMessage({
        requestId: selectedRequestId,
        text,
      }),
    );
    setMessageText("");
  };

  const handleStatusChange = async (status: RequestStatus) => {
    if (!selectedRequest) return;
    if (selectedRequest.status === status) return;
    await dispatch(changeRequestStatus({ requestId: selectedRequest.id, status }));
  };

  const handleDeleteCase = async (requestId: string) => {
    if (!window.confirm("Удалить кейс и все его сообщения?")) return;
    await dispatch(removeRequest({ requestId }));
  };

  const showEmptyCreateCaseState = Boolean(
    user && user.role === "user" && requests.length === 0,
  );

  if (!user) {
    return (
      <AuthCard
        authMode={authMode}
        name={name}
        username={username}
        password={password}
        role={role}
        loading={userLoading}
        error={userError}
        onAuthModeChange={setAuthMode}
        onNameChange={setName}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onRoleChange={setRole}
        onSubmit={handleAuth}
      />
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppHeader user={user} onLogout={() => dispatch(logout())} />

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {showEmptyCreateCaseState ? (
          <EmptyCreateCaseState
            title={newRequestTitle}
            description={newRequestDescription}
            onTitleChange={setNewRequestTitle}
            onDescriptionChange={setNewRequestDescription}
            onSubmit={handleCreateRequest}
          />
        ) : (
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
            <CasesSidebar
              userRole={user.role}
              requests={requests}
              selectedRequestId={selectedRequestId}
              newRequestTitle={newRequestTitle}
              newRequestDescription={newRequestDescription}
              onTitleChange={setNewRequestTitle}
              onDescriptionChange={setNewRequestDescription}
              onCreateRequest={handleCreateRequest}
              onSelectRequest={(requestId) => dispatch(selectRequest(requestId))}
            />
            <ChatPanel
              user={user}
              selectedRequest={selectedRequest}
              messages={messages}
              messageText={messageText}
              editingMessageId={editingMessageId}
              editingMessageText={editingMessageText}
              onMessageTextChange={setMessageText}
              onEditingMessageTextChange={setEditingMessageText}
              onSendMessage={handleSendMessage}
              onDeleteCase={(requestId) => void handleDeleteCase(requestId)}
              onChangeStatus={(status) => void handleStatusChange(status)}
              onStartEditMessage={startEditMessage}
              onCancelEditMessage={cancelEditMessage}
              onSaveMessage={(requestId, messageId) =>
                void handleSaveMessage(requestId, messageId)
              }
              onOpenMessageMenu={openMessageMenu}
            />
          </Box>
        )}
      </Container>
      <MessageActionsMenu
        anchorEl={messageMenuAnchor}
        onClose={closeMessageMenu}
        onEdit={handleEditFromMenu}
        onDelete={() => void handleDeleteFromMenu()}
      />
    </Box>
  );
}
