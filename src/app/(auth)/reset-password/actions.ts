"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validators/auth";

export type ResetPasswordState = {
  formError?: string;
  fieldErrors?: {
    newPassword?: string[];
    confirmPassword?: string[];
  };
};

export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as
      | ResetPasswordState["fieldErrors"]
      | undefined;
    return { fieldErrors };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (updateErr) {
    return { formError: updateErr.message };
  }

  // Clear the forced-reset flag so the (staff) layout stops redirecting
  // here. Best-effort: if this update fails the user is still left in
  // a redirect loop, so log loudly. RLS allows the user to update their
  // own staff row.
  const { error: clearErr } = await supabase
    .schema("crm")
    .from("staff")
    .update({ password_reset_required_at: null })
    .eq("auth_user_id", user.id);
  if (clearErr) {
    console.error(
      `[resetPassword] cleared password but could not clear flag for ${user.id}:`,
      clearErr,
    );
    return {
      formError:
        "Password updated, but we couldn't clear the reset flag. Contact an administrator.",
    };
  }

  redirect("/dashboard");
}
