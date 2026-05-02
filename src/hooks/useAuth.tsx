import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

const ADMIN_EMAIL = 'dlawngns94@gmail.com';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          let userProfile: UserProfile;

          if (userDoc.exists()) {
            userProfile = userDoc.data() as UserProfile;
            // Ensure designated email is always admin
            if (user.email === ADMIN_EMAIL && userProfile.role !== 'admin') {
              userProfile.role = 'admin';
              await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
            }
          } else {
            // Default profile for new users
            userProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '익명',
              role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
            };
            await setDoc(doc(db, 'users', user.uid), userProfile);
          }
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth state initialization error:', error);
        // Fallback: still set user even if profile fetch fails
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
