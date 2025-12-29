import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'funcionario' | 'cliente';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOtp: (email: string, fullName?: string, whatsapp?: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signUpClient: (email: string, fullName: string, whatsapp: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isFuncionario: boolean;
  isCliente: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-link professional by email if exists without user_id
  const autoLinkProfessional = async (userId: string, userEmail: string) => {
    try {
      // Check if there's a professional with same email but no user_id linked
      const { data: professional } = await supabase
        .from('professionals')
        .select('id, user_id, email')
        .eq('email', userEmail.toLowerCase())
        .is('user_id', null)
        .maybeSingle();

      if (professional) {
        // Link the professional to this user
        await supabase
          .from('professionals')
          .update({ user_id: userId })
          .eq('id', professional.id);
        
        // Also update user role to funcionario if not already
        const { data: existingRole } = await supabase.rpc('get_user_role', { _user_id: userId });
        
        if (existingRole !== 'funcionario' && existingRole !== 'admin') {
          await supabase
            .from('user_roles')
            .update({ role: 'funcionario' })
            .eq('user_id', userId);
        }
        
        console.log('Profissional vinculado automaticamente:', professional.email);
      }
    } catch (error) {
      console.error('Erro ao vincular profissional:', error);
    }
  };

  const fetchUserData = async (userId: string, userEmail?: string) => {
    // Auto-link professional by email if applicable
    if (userEmail) {
      await autoLinkProfessional(userId, userEmail);
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData as Profile);
    }

    // Fetch role using RPC (fetch fresh role after potential update)
    const { data: roleData } = await supabase.rpc('get_user_role', { _user_id: userId });
    
    if (roleData) {
      setRole(roleData as AppRole);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id, session.user.email);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id, session.user.email).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return { error };
  };

  const signInWithOtp = async (email: string, fullName?: string, whatsapp?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          whatsapp: whatsapp,
          // Role is NOT sent here - trigger always creates as 'cliente'
        },
      },
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  // Sign up client and auto-login (generates random password)
  const signUpClient = async (email: string, fullName: string, whatsapp: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const randomPassword = crypto.randomUUID();
    
    // Try to sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: randomPassword,
      options: {
        data: {
          full_name: fullName,
          whatsapp: whatsapp,
        },
      },
    });

    // If user already exists, try magic link
    if (signUpError?.message?.includes('already registered')) {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            whatsapp: whatsapp,
          },
        },
      });
      return { error: otpError ? new Error('Usuário já cadastrado. Enviamos um link de acesso para seu email.') : null };
    }

    if (signUpError) {
      return { error: signUpError };
    }

    // Auto-confirm is enabled, user should be logged in already
    if (signUpData.session) {
      return { error: null };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    loading,
    signIn,
    signInWithOtp,
    signUp,
    signUpClient,
    signOut,
    isAdmin: role === 'admin',
    isFuncionario: role === 'funcionario',
    isCliente: role === 'cliente',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
