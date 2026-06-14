/**
 * Состояние сообщений чата.
 * Хранение byRequestId позволяет переключаться между кейсами без повторной загрузки.
 */
import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { deleteMessage, getMessages, sendMessage, updateMessage } from "../api";
import { Message } from "../types";
import { RootState } from "../store";

interface MessagesState {
  byRequestId: Record<string, Message[]>;
  loading: boolean;
  error: string | null;
}

const initialState: MessagesState = {
  byRequestId: {},
  loading: false,
  error: null,
};

export const fetchMessages = createAsyncThunk(
  "messages/fetchByRequest",
  async (requestId: string, thunkApi) => {
    const state = thunkApi.getState() as RootState;
    const token = state.user.token;
    if (!token) {
      throw new Error("User is not authenticated");
    }
    const messages = await getMessages(requestId, 100, token);
    return { requestId, messages };
  },
);

export const addMessage = createAsyncThunk(
  "messages/add",
  async (payload: { requestId: string; text: string }, thunkApi) => {
    const state = thunkApi.getState() as RootState;
    const token = state.user.token;
    if (!token) {
      throw new Error("User is not authenticated");
    }
    const message = await sendMessage({
      ...payload,
      token,
    });
    return { requestId: payload.requestId, message };
  },
);

export const editMessage = createAsyncThunk(
  "messages/edit",
  async (
    payload: { requestId: string; messageId: string; text: string },
    thunkApi,
  ) => {
    const state = thunkApi.getState() as RootState;
    const token = state.user.token;
    if (!token) {
      throw new Error("User is not authenticated");
    }
    const message = await updateMessage({
      requestId: payload.requestId,
      messageId: payload.messageId,
      text: payload.text,
      token,
    });
    return { requestId: payload.requestId, message };
  },
);

export const removeMessage = createAsyncThunk(
  "messages/delete",
  async (payload: { requestId: string; messageId: string }, thunkApi) => {
    const state = thunkApi.getState() as RootState;
    const token = state.user.token;
    if (!token) {
      throw new Error("User is not authenticated");
    }
    const message = await deleteMessage({
      requestId: payload.requestId,
      messageId: payload.messageId,
      token,
    });
    return { requestId: payload.requestId, message };
  },
);

/** Без дублей: одно сообщение может прийти и из HTTP, и из WebSocket. */
function upsertMessage(list: Message[], incoming: Message): Message[] {
  const exists = list.some((item) => item.id === incoming.id);
  if (exists) {
    return list;
  }
  return [...list, incoming].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    /** Добавление сообщения, полученного по WebSocket. */
    receiveLiveMessage: (
      state,
      action: PayloadAction<{ requestId: string; message: Message }>,
    ) => {
      const list = state.byRequestId[action.payload.requestId] ?? [];
      state.byRequestId[action.payload.requestId] = upsertMessage(
        list,
        action.payload.message,
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.byRequestId[action.payload.requestId] = action.payload.messages;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch messages";
      })
      .addCase(addMessage.fulfilled, (state, action) => {
        const list = state.byRequestId[action.payload.requestId] ?? [];
        state.byRequestId[action.payload.requestId] = upsertMessage(
          list,
          action.payload.message,
        );
      })
      .addCase(editMessage.fulfilled, (state, action) => {
        const list = state.byRequestId[action.payload.requestId] ?? [];
        state.byRequestId[action.payload.requestId] = list.map((item) =>
          item.id === action.payload.message.id ? action.payload.message : item,
        );
      })
      .addCase(removeMessage.fulfilled, (state, action) => {
        const list = state.byRequestId[action.payload.requestId] ?? [];
        state.byRequestId[action.payload.requestId] = list.map((item) =>
          item.id === action.payload.message.id ? action.payload.message : item,
        );
      });
  },
});

export const { receiveLiveMessage } = messagesSlice.actions;
export const selectMessagesByRequest = (state: RootState, requestId: string) =>
  state.messages.byRequestId[requestId] ?? [];

export default messagesSlice.reducer;
