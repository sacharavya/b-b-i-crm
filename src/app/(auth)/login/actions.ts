"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators/auth";

export type LoginState = {
  formError?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { formError: "Invalid email or password." };
  }

  // Forced-reset short-circuit. The (staff) layout also redirects on
  // password_reset_required_at, but doing it here avoids a flash of
  // /dashboard before the layout's redirect kicks in.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: row } = await supabase
      .schema("crm")
      .from("staff")
      .select("password_reset_required_at")
      .eq("auth_user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (row?.password_reset_required_at) {
      redirect("/reset-password");
    }
  }

  redirect("/dashboard");
}
