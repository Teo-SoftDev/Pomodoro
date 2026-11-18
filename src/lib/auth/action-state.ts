import type { FieldErrors } from "./validation";

export interface AuthActionState {
  error: string | null;
  fieldErrors: FieldErrors;
  retryAfterSeconds: number;
  email: string;
}

export const initialAuthState: AuthActionState = {
  error: null,
  fieldErrors: {},
  retryAfterSeconds: 0,
  email: "",
};
