import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createRequest, deleteRequest, getRequests, updateRequestStatus } from "../api";
import { LegalRequest, RequestStatus } from "../types";
import { RootState } from "../store";

interface RequestsState {
  items: LegalRequest[];
  selectedRequestId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: RequestsState = {
  items: [],
  selectedRequestId: null,
  loading: false,
  error: null,
};

export const fetchRequests = createAsyncThunk(
  "requests/fetchAll",
  async (_, thunkApi) => {
    const state = thunkApi.getState() as RootState;
    const token = state.user.token;
    if (!token) {
      throw new Error("User is not authenticated");
    }
    return getRequests(token);
  },
);

export const addRequest = createAsyncThunk(
  "requests/add",
  async (payload: { title: string; description: string }, thunkApi) => {
    const state = thunkApi.getState() as RootState;
    const token = state.user.token;
    if (!token) {
      throw new Error("User is not authenticated");
    }
    return createRequest({
      ...payload,
      token,
    });
  },
);

export const changeRequestStatus = createAsyncThunk(
  "requests/changeStatus",
  async (payload: { requestId: string; status: RequestStatus }, thunkApi) => {
    const state = thunkApi.getState() as RootState;
    const token = state.user.token;
    if (!token) {
      throw new Error("User is not authenticated");
    }
    return updateRequestStatus({
      ...payload,
      token,
    });
  },
);

export const removeRequest = createAsyncThunk(
  "requests/delete",
  async (payload: { requestId: string }, thunkApi) => {
    const state = thunkApi.getState() as RootState;
    const token = state.user.token;
    if (!token) {
      throw new Error("User is not authenticated");
    }
    await deleteRequest({
      requestId: payload.requestId,
      token,
    });
    return payload;
  },
);

const requestsSlice = createSlice({
  name: "requests",
  initialState,
  reducers: {
    selectRequest: (state, action: PayloadAction<string>) => {
      state.selectedRequestId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        if (!state.selectedRequestId && action.payload.length > 0) {
          state.selectedRequestId = action.payload[0].id;
        }
      })
      .addCase(fetchRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch requests";
      })
      .addCase(addRequest.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.selectedRequestId = action.payload.id;
      })
      .addCase(changeRequestStatus.fulfilled, (state, action) => {
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
      })
      .addCase(removeRequest.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload.requestId);
        if (state.selectedRequestId === action.payload.requestId) {
          state.selectedRequestId = state.items[0]?.id ?? null;
        }
      });
  },
});

export const { selectRequest } = requestsSlice.actions;
export default requestsSlice.reducer;
