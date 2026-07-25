import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

const ADMIN_EMAIL = 'dlawngns94@gmail.com';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithSocial: (provider: 'kakao' | 'naver', name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true,
  loginWithSocial: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load custom stored social profile if Firebase auth is null
  useEffect(() => {
    const storedSocial = localStorage.getItem('fg_social_user');
    if (storedSocial && !user) {
      try {
        const parsed = JSON.parse(storedSocial);
        setProfile(parsed);
      } catch (e) {
        localStorage.removeItem('fg_social_user');
      }
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        setUser(authUser);
        if (authUser) {
          localStorage.removeItem('fg_social_user');
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          let userProfile: UserProfile;

          if (userDoc.exists()) {
            userProfile = userDoc.data() as UserProfile;
            if (authUser.email === ADMIN_EMAIL && userProfile.role !== 'admin') {
              userProfile.role = 'admin';
              await updateDoc(doc(db, 'users', authUser.uid), { role: 'admin' });
            }
          } else {
            userProfile = {
              uid: authUser.uid,
              email: authUser.email || '',
              displayName: authUser.displayName || '익명',
              role: authUser.email === ADMIN_EMAIL ? 'admin' : 'user',
            };
            await setDoc(doc(db, 'users', authUser.uid), userProfile);
          }
          setProfile(userProfile);
        } else {
          const storedSocial = localStorage.getItem('fg_social_user');
          if (storedSocial) {
            try {
              setProfile(JSON.parse(storedSocial));
            } catch {
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
        }
      } catch (error) {
        console.error('Auth state initialization error:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithSocial = async (provider: 'kakao' | 'naver', name: string) => {
    const customUser: UserProfile = {
      uid: `${provider}_${Date.now()}`,
      email: `${provider}_user@fromganghwa.kr`,
      displayName: `${name}`,
      role: 'user',
    };
    localStorage.setItem('fg_social_user', JSON.stringify(customUser));
    setProfile(customUser);

    try {
      await setDoc(doc(db, 'users', customUser.uid), customUser, { merge: true });
    } catch (e) {
      console.warn('Firestore sync skipped:', e);
    }
  };

  const logout = async () => {
    localStorage.removeItem('fg_social_user');
    await firebaseSignOut(auth);
    setProfile(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithSocial, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

