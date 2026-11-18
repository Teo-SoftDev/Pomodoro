import type { Metadata } from "next";
import { registerAction } from "../../actions/auth";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Regístrate para registrar tus sesiones de estudio.",
};

export default function RegisterPage() {
  return <AuthForm mode="register" action={registerAction} />;
}
