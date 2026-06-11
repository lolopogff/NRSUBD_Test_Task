import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice";
import requestsReducer from "./slices/requestsSlice";
import messagesReducer from "./slices/messagesSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    requests: requestsReducer,
    messages: messagesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
