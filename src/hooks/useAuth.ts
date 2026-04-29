import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  primary_wallet: string | null;
  primary_role: "token_owner" | "partner" | null;
  onboarding_completed: boolean;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CRITICAL: Set up listener FIRST (do not await async inside)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer DB calls to avoid deadlock
        setTimeout(() => { void loadProfile(sess.user.id); void loadRole(sess.user.id); }, 0);
      } else {
        setProfile(null); setIsAdmin(false);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        void loadProfile(sess.user.id);
        void loadRole(sess.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(uid: string) {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  }
  async function loadRole(uid: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    setIsAdmin(!!data);
  }

  return { session, user, profile, isAdmin, loading, reloadProfile: () => user && loadProfile(user.id) };
}
