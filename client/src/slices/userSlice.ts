import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { loginUser as loginUserApi, registerUser } from "../api";
import { User, UserRole } from "../types";

interface UserState {
  current: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

function loadAuthState(): Pick<UserState, "current" | "token"> {
  const raw = localStorage.getItem("auth");
  if (!raw) {
    return { current: null, token: null };
  }
  try {
    const parsed = JSON.parse(raw) as { user: User; token: string };
    if (!parsed?.user || !parsed?.token) {
      return { current: null, token: null };
    }
    return { current: parsed.user, token: parsed.token };
  } catch {
    return { current: null, token: null };
  }
}

const initialState: UserState = {
  ...loadAuthState(),
  loading: false,
  error: null,
};

export const registerAccount = createAsyncThunk(
  "user/register",
  async (payload: { name: string; username: string; password: string; role: UserRole }) => {
    return registerUser(payload);
  },
);

export const loginAccount = createAsyncThunk(
  "user/login",
  async (payload: { username: string; password: string }) => {
    return loginUserApi(payload);
  },
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    logout: (state) => {
      state.current = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem("auth");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem("auth", JSON.stringify(action.payload));
      })
      .addCase(registerAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Registration failed";
      })
      .addCase(loginAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem("auth", JSON.stringify(action.payload));
      })
      .addCase(loginAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Login failed";
      });
  },
});

export const { logout } = userSlice.actions;
export default userSlice.reducer;
