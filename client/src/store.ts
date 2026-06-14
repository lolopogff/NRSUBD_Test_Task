/**
 * Redux store (Redux Toolkit).
 *
 * user     — текущий пользователь и JWT (persist в localStorage)
 * requests — список кейсов и выбранный кейс
 * messages — сообщения, сгруппированные по requestId
 */
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
