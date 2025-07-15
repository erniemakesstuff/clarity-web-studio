
"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { MenuInstance, MenuItem, OverrideSchedule, ClarityUserProfile } from "@/lib/types";
import { fetchMenuInstancesFromBackend } from "@/app/(dashboard)/dashboard/actions";
import { patchMenu } from "@/app/(dashboard)/dashboard/hypothesis-tests/actions";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import {
  onIdTokenChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type User,
  type UserCredential,
} from "firebase/auth";

const ADMIN_USER_RAW_IDS = ["admin@example.com", "valerm09@gmail.com"];
const SELECTED_MENU_STORAGE_KEY = "clarityMenu_selectedMenuId";
const MENU_SELECTION_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export interface AuthContextType {
  user: User | null;
  clarityUserProfile: ClarityUserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  jwtToken: string | null;
  rawOwnerId: string | null;
  ownerId: string;
  signInWithEmail: (email: string, pass: string) => Promise<any>;
  signUpWithEmail: (email: string, pass: string) => Promise<any>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  menuInstances: MenuInstance[];
  selectedMenuInstance: MenuInstance | null;
  selectMenuInstance: (menuId: string) => void;
  addMenuInstance: (name: string) => MenuInstance;
  renameMenuInstance: (menuId: string, newName: string) => boolean;
  updateMenuItem: (menuInstanceId: string, updatedItem: MenuItem) => boolean;
  updateMenuSchedules: (menuInstanceId: string, schedules: OverrideSchedule[]) => boolean;
  isLoadingMenuInstances: boolean;
  refreshMenuInstances: () => Promise<void>;
  rawMenuApiResponseText: string | null;
  toggleABTesting: (menuId: string, enable: boolean) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [clarityUserProfile, setClarityUserProfile] = useState<ClarityUserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  const [menuInstances, setMenuInstances] = useState<MenuInstance[]>([]);
  const [selectedMenuInstance, setSelectedMenuInstance] = useState<MenuInstance | null>(null);
  const [isLoadingMenuInstances, setIsLoadingMenuInstances] = useState(true);
  const [rawMenuApiResponseText, setRawMenuApiResponseText] = useState<string | null>(null);
  const { toast } = useToast();

  const rawOwnerId = user?.email || null;
  const ownerId = user?.uid || "";

  const clearMenuData = () => {
    setMenuInstances([]);
    setSelectedMenuInstance(null);
    setRawMenuApiResponseText(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SELECTED_MENU_STORAGE_KEY);
    }
  };
  
  const fetchClarityUserProfile = useCallback(async (userId: string, token: string): Promise<ClarityUserProfile | null> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ris/v1/user?userId=${userId}`, {
        method: "GET",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`Could not fetch user profile from backend. Status: ${response.status}`);
        return null;
      }
      
      const profileData = await response.json();
      return profileData as ClarityUserProfile;

    } catch (error: any) {
      console.error("Critical: Failed to fetch user profile from backend.", error.message);
      return null;
    }
  }, []);
  
  const syncUserWithBackend = useCallback(async (userToSync: User, token: string) => {
    if (!userToSync) return;
  
    const googleProviderData = userToSync.providerData.find(p => p.providerId === 'google.com');

    const newUserProfile = {
      userId: userToSync.uid,
      menuGrants: [`${userToSync.uid}:main`], // Add a default grant for new users
      subscriptionStatus: "active",
      contactInfoEmail: googleProviderData?.email || userToSync.email || "",
      contactInfoPhone: googleProviderData?.phoneNumber || userToSync.phoneNumber || "",
      name: googleProviderData?.displayName || userToSync.displayName || userToSync.email || "New User",
    };
    
    console.log("Attempting to synchronize user with backend.", { payload: newUserProfile });
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ris/v1/user`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserProfile),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        // A 409 Conflict means the user already exists, which is not an error in this context.
        if (response.status !== 409) {
          console.warn(`Backend user sync issue. Status: ${response.status}. Response: ${errorText.substring(0, 500)}`);
        }
      } else {
        console.log(`Successfully created user ${userToSync.uid} in backend.`);
      }
    } catch (error: any) {
       console.error("Critical: Failed to synchronize user with backend.", error.message);
    }
  }, []);


  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken(true);
        setUser(firebaseUser);
        setJwtToken(idToken);
        setIsAuthenticated(true);
        
        const profile = await fetchClarityUserProfile(firebaseUser.uid, idToken);
        setClarityUserProfile(profile);

      } else {
        setUser(null);
        setJwtToken(null);
        setIsAuthenticated(false);
        setClarityUserProfile(null);
        clearMenuData();
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchClarityUserProfile]);

  const loadMenuData = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated || !clarityUserProfile) {
      clearMenuData();
      setIsLoadingMenuInstances(false);
      return;
    }

    setIsLoadingMenuInstances(true);
    
    const menuGrants = clarityUserProfile.menuGrants || [];

    if (jwtToken) {
      const result = await fetchMenuInstancesFromBackend(ownerId, menuGrants, jwtToken);
      
      setRawMenuApiResponseText(result.rawResponseTexts?.join('\n\n---\n\n') || null);

      if (result.success && result.menuInstances) {
        setMenuInstances(result.menuInstances);

        if (result.menuInstances.length > 0) {
            let lastSelectedMenuId: string | null = null;
            if (typeof window !== 'undefined') {
                const storedSelection = localStorage.getItem(SELECTED_MENU_STORAGE_KEY);
                if (storedSelection) {
                    const { menuId, expiry } = JSON.parse(storedSelection);
                    if (expiry > Date.now()) {
                        lastSelectedMenuId = menuId;
                    } else {
                        localStorage.removeItem(SELECTED_MENU_STORAGE_KEY);
                    }
                }
            }

            const menuToSelect = result.menuInstances.find(m => m.id === lastSelectedMenuId) || result.menuInstances[0];
            setSelectedMenuInstance(menuToSelect);
            
        } else {
          setSelectedMenuInstance(null);
        }
      } else {
        if (result.message) {
          toast({
              title: "Error Fetching Menus",
              description: result.message,
              variant: "destructive",
          });
        }
        clearMenuData();
      }
    } else {
        console.warn("Attempted to load menu data without a JWT token.");
    }
    setIsLoadingMenuInstances(false);
  }, [isAuthenticated, jwtToken, toast, clarityUserProfile, ownerId]);

  useEffect(() => {
    if (isAuthenticated && clarityUserProfile) {
      loadMenuData();
    }
  }, [isAuthenticated, clarityUserProfile, loadMenuData]);

  const signUpWithEmail = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential.user) {
        const token = await userCredential.user.getIdToken();
        await syncUserWithBackend(userCredential.user, token);
    }
    return userCredential;
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    if (userCredential.user) {
        const token = await userCredential.user.getIdToken();
        await syncUserWithBackend(userCredential.user, token);
    }
    return userCredential;
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    try {
      const result: UserCredential = await signInWithPopup(auth, provider);
      if (result.user) {
          const token = await result.user.getIdToken();
          await syncUserWithBackend(result.user, token);
      }
      console.log("IDP Response User Object:", {
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
        phoneNumber: result.user.phoneNumber,
        metadata: result.user.metadata,
      });
    } catch (error: any) {
      console.error("Error during Google sign-in:", error);
      let description = "Could not sign in with Google. Please try again.";
      if (error.code === 'auth/unauthorized-domain') {
        description = `This domain (${window.location.hostname}) is not authorized for Google Sign-In. Please add it to your Firebase project's authorized domains to continue.`;
      }
      toast({
        title: "Sign-in Error",
        description: description,
        variant: "destructive",
      });
    }
  };

  const logout = async () => {
    await signOut(auth);
  };
  
  const refreshMenuInstances = useCallback(async () => {
    await loadMenuData(true);
  }, [loadMenuData]);

  const selectMenuInstance = (menuId: string) => {
    const menuInstance = menuInstances.find(m => m.id === menuId);
    if (menuInstance) {
      setSelectedMenuInstance(menuInstance);
       if (typeof window !== 'undefined') {
        const selectionData = {
          menuId: menuId,
          expiry: Date.now() + MENU_SELECTION_EXPIRY_MS,
        };
        localStorage.setItem(SELECTED_MENU_STORAGE_KEY, JSON.stringify(selectionData));
      }
    }
  };

  const addMenuInstance = (name: string): MenuInstance => {
    const newMenuInstance: MenuInstance = {
      id: name,
      name: name,
      menu: [],
      analytics: [],
      allowABTesting: false,
      overrideSchedules: [],
    };
    const updatedMenuInstances = [...menuInstances, newMenuInstance];
    setMenuInstances(updatedMenuInstances);
    selectMenuInstance(newMenuInstance.id);

    // Also update the user profile state locally for immediate feedback
    setClarityUserProfile(prev => {
        if (!prev) return null;
        const newGrant = `${ownerId}:${name}`;
        const existingGrants = prev.menuGrants || [];
        return {
            ...prev,
            menuGrants: [...existingGrants, newGrant]
        };
    });

    return newMenuInstance;
  };
  
  const toggleABTesting = async (menuId: string, enable: boolean): Promise<boolean> => {
    if (!selectedMenuInstance || selectedMenuInstance.id !== menuId) {
        toast({
            title: "Error",
            description: "The correct menu is not selected.",
            variant: "destructive",
        });
        return false;
    }
    const token = await user?.getIdToken();
    const result = await patchMenu({
        ownerId: ownerId,
        menuId,
        payload: { allowABTesting: enable },
        jwtToken: token || null,
    });

    if (result.success) {
        toast({
            title: `Experiments ${enable ? 'Enabled' : 'Disabled'}`,
            description: "Successfully updated settings on the backend.",
            variant: "default",
            className: "bg-green-500 text-white",
        });
        await refreshMenuInstances();
        return true;
    } else {
        toast({
            title: "Update Failed",
            description: result.message || "An unknown error occurred.",
            variant: "destructive",
        });
        return false;
    }
  };

  const renameMenuInstance = (menuId: string, newName: string): boolean => {
    let success = false;
    const updatedMenuInstances = menuInstances.map(m =>
      m.id === menuId ? { ...m, name: newName } : m
    );

    if (JSON.stringify(updatedMenuInstances) !== JSON.stringify(menuInstances)) {
      setMenuInstances(updatedMenuInstances);
      success = true;
    }

    if (selectedMenuInstance?.id === menuId) {
      const newSelected = updatedMenuInstances.find(m => m.id === menuId);
      setSelectedMenuInstance(newSelected || null);
    }
    return success;
  };

  const updateMenuItem = (menuInstanceId: string, updatedItem: MenuItem): boolean => {
    let success = false;
    const updatedMenuInstances = menuInstances.map(instance => {
      if (instance.id === menuInstanceId) {
        const updatedMenu = instance.menu.map(item =>
          item.id === updatedItem.id ? updatedItem : item
        );
        if (JSON.stringify(updatedMenu) !== JSON.stringify(instance.menu)) {
            success = true;
        }
        return { ...instance, menu: updatedMenu };
      }
      return instance;
    });

    if (success) {
      setMenuInstances(updatedMenuInstances);

      if (selectedMenuInstance?.id === menuInstanceId) {
        const newSelectedInstance = updatedMenuInstances.find(m => m.id === menuInstanceId);
        setSelectedMenuInstance(newSelectedInstance || null);
      }
    }
    return success;
  };

  const updateMenuSchedules = (menuInstanceId: string, schedules: OverrideSchedule[]): boolean => {
    let success = false;
    const updatedMenuInstances = menuInstances.map(instance => {
      if (instance.id === menuInstanceId) {
        if (JSON.stringify(instance.overrideSchedules) !== JSON.stringify(schedules)) {
          success = true;
        }
        return { ...instance, overrideSchedules: schedules };
      }
      return instance;
    });

    if (success) {
      setMenuInstances(updatedMenuInstances);
      if (selectedMenuInstance?.id === menuInstanceId) {
        setSelectedMenuInstance(prev => prev ? { ...prev, overrideSchedules: schedules } : null);
      }
    }
    return success;
  };

  const value = {
    user,
    clarityUserProfile,
    isAuthenticated,
    isLoading,
    jwtToken,
    rawOwnerId,
    ownerId,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    logout,
    menuInstances,
    selectedMenuInstance,
    selectMenuInstance,
    addMenuInstance,
    renameMenuInstance,
    updateMenuItem,
    updateMenuSchedules,
    isLoadingMenuInstances,
    refreshMenuInstances,
    rawMenuApiResponseText,
    toggleABTesting,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
