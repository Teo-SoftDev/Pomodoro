import type { Metadata } from "next";
import { loginAction } from "../../actions/auth";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede a tu espacio de estudio Pomodoro.",
};

export default function LoginPage() {
  return <AuthForm mode="login" action={loginAction} />;
}
