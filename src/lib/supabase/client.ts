import { createClient, User } from "@supabase/supabase-js";
import { ConstructorId } from "@/types/f1";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured =
  supabaseUrl.startsWith("http") && supabaseAnonKey.length > 20;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function signInWithGoogle() {
  if (!supabase) {
    alert(
      "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local first."
    );
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo:
        typeof window !== "undefined" ? `${window.location.origin}` : undefined,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error("Google Auth error:", error.message);
  }
}

export async function signOutUser() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function syncUserProfile(
  user: User,
  supportedTeam?: ConstructorId
): Promise<ConstructorId | null> {
  if (!supabase || !user) return null;

  // Check if profile already has a saved supported_team in Supabase
  const { data: existing } = await supabase
    .from("profiles")
    .select("supported_team")
    .eq("id", user.id)
    .single();

  const teamToSave =
    supportedTeam || (existing?.supported_team as ConstructorId) || "red_bull";

  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    full_name:
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Pitwall Driver",
    avatar_url: user.user_metadata?.avatar_url || null,
    supported_team: teamToSave,
    updated_at: new Date().toISOString(),
  });

  return (existing?.supported_team as ConstructorId) || teamToSave;
}

export async function updateSupportedTeamInDb(
  userId: string,
  teamId: ConstructorId
) {
  if (!supabase) return;
  await supabase
    .from("profiles")
    .update({
      supported_team: teamId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}