
"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { MenuInstance, MenuItem } from "@/lib/types";
import { fetchMenuInstancesFromBackend } from "@/app/(dashboard)/dashboard/actions";
import { useToast } from "@/hooks/use-toast";
import { generateDeterministicIdHash } from "@/lib/hash-utils";


const MENU_INSTANCES_LS_KEY = "clarityMenuUserMenuInstances";
const MENU_INSTANCES_TIMESTAMP_LS_KEY = "clarityMenuMenuInstancesTimestamp";
const SELECTED_MENU_INSTANCE_LS_KEY = "clarityMenuSelectedMenuInstance";
const AUTH_STATUS_LS_KEY = "clarityMenuAuth";
const JWT_TOKEN_LS_KEY = "clarityMenuJwtToken";
const MENU_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const RAW_OWNER_ID_FOR_CONTEXT = "admin@example.com"; // Define raw owner ID once

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  jwtToken: string | null;
  rawOwnerId: string; 
  hashedOwnerId: string; 
  login: () => void;
  logout: () => void;
  menuInstances: MenuInstance[];
  selectedMenuInstance: MenuInstance | null;
  selectMenuInstance: (menuId: string) => void;
  addMenuInstance: (name: string) => MenuInstance; 
  renameMenuInstance: (menuId: string, newName: string) => boolean; 
  updateMenuItem: (menuInstanceId: string, updatedItem: MenuItem) => boolean;
  isLoadingMenuInstances: boolean;
  refreshMenuInstances: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  const [menuInstances, setMenuInstances] = useState<MenuInstance[]>([]);
  const [selectedMenuInstance, setSelectedMenuInstance] = useState<MenuInstance | null>(null);
  const [isLoadingMenuInstances, setIsLoadingMenuInstances] = useState(true);
  const { toast } = useToast();

  // Hashed Owner ID for backend calls, generated once.
  const hashedOwnerIdForContext = generateDeterministicIdHash(RAW_OWNER_ID_FOR_CONTEXT);

  const loadMenuData = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated) {
      setMenuInstances([]);
      setSelectedMenuInstance(null);
      setIsLoadingMenuInstances(false);
      localStorage.removeItem(SELECTED_MENU_INSTANCE_LS_KEY);
      localStorage.removeItem(MENU_INSTANCES_LS_KEY);
      localStorage.removeItem(MENU_INSTANCES_TIMESTAMP_LS_KEY);
      localStorage.removeItem(JWT_TOKEN_LS_KEY);
      setJwtToken(null);
      return;
    }

    setIsLoadingMenuInstances(true);
    
    const cachedTimestampStr = localStorage.getItem(MENU_INSTANCES_TIMESTAMP_LS_KEY);
    const cachedInstancesStr = localStorage.getItem(MENU_INSTANCES_LS_KEY);
    const cachedTimestamp = cachedTimestampStr ? parseInt(cachedTimestampStr, 10) : null;

    if (!forceRefresh && cachedTimestamp && cachedInstancesStr && (Date.now() - cachedTimestamp < MENU_CACHE_TTL)) {
      try {
        const parsedInstances: MenuInstance[] = JSON.parse(cachedInstancesStr);
        setMenuInstances(parsedInstances);
        const storedMenuInstanceId = localStorage.getItem(SELECTED_MENU_INSTANCE_LS_KEY);
        const foundMenuInstance = parsedInstances.find(m => m.id === storedMenuInstanceId);
        setSelectedMenuInstance(foundMenuInstance || (parsedInstances.length > 0 ? parsedInstances[0] : null));
        setIsLoadingMenuInstances(false);
        return; 
      } catch (e) {
        console.error("Failed to parse cached menu instances:", e);
        // Proceed to fetch from backend if cache is corrupted
      }
    }
    
    const result = await fetchMenuInstancesFromBackend(hashedOwnerIdForContext, jwtToken);

    // Conditional toast for debugging, only for the admin user
    if (RAW_OWNER_ID_FOR_CONTEXT === "admin@example.com" && result.rawResponseText) {
      const isSuccessButEmpty = result.success && (!result.menuInstances || result.menuInstances.length === 0);
      toast({
        title: "Backend Response (Admin Debug)",
        description: `Status: ${result.success ? 'OK' : 'Error'}. Length: ${result.rawResponseText.length}. Data: ${result.rawResponseText.substring(0, 500)}${result.rawResponseText.length > 500 ? '...' : ''}`,
        variant: (!result.success || isSuccessButEmpty) ? "destructive" : "default",
        duration: 15000 
      });
    }

    if (result.success && result.menuInstances) {
      setMenuInstances(result.menuInstances);
      localStorage.setItem(MENU_INSTANCES_LS_KEY, JSON.stringify(result.menuInstances));
      localStorage.setItem(MENU_INSTANCES_TIMESTAMP_LS_KEY, Date.now().toString());

      if (result.menuInstances.length > 0) {
        const storedMenuInstanceId = localStorage.getItem(SELECTED_MENU_INSTANCE_LS_KEY);
        const currentSelectedStillValid = result.menuInstances.find(m => m.id === selectedMenuInstance?.id);
        if (currentSelectedStillValid) {
            // If current selection is still valid in the new list, keep it.
            // Potentially update its data if the backend returned a fresh version.
            setSelectedMenuInstance(currentSelectedStillValid); 
        } else {
            // If current selection is no longer valid, or no selection, try to use stored ID or default.
            const foundMenuInstance = result.menuInstances.find(m => m.id === storedMenuInstanceId);
            const newSelected = foundMenuInstance || result.menuInstances[0];
            setSelectedMenuInstance(newSelected);
            localStorage.setItem(SELECTED_MENU_INSTANCE_LS_KEY, newSelected.id);
        }

      } else {
        setSelectedMenuInstance(null);
        localStorage.removeItem(SELECTED_MENU_INSTANCE_LS_KEY);
      }
    } else {
      // Only show a generic error toast if the admin debug toast wasn't already shown
      // (i.e., if rawResponseText was not present or not admin) AND there's a message.
      if (!(RAW_OWNER_ID_FOR_CONTEXT === "admin@example.com" && result.rawResponseText) && result.message) {
         toast({
            title: "Error Fetching Menus",
            description: result.message,
            variant: "destructive",
         });
      }
      // If forcing refresh or cache was bad, clear local state.
      if (forceRefresh || !cachedInstancesStr) {
        setMenuInstances([]); 
        setSelectedMenuInstance(null);
        localStorage.removeItem(MENU_INSTANCES_LS_KEY); 
        localStorage.removeItem(MENU_INSTANCES_TIMESTAMP_LS_KEY);
        localStorage.removeItem(SELECTED_MENU_INSTANCE_LS_KEY);
      }
    }
    setIsLoadingMenuInstances(false);
  }, [isAuthenticated, jwtToken, toast, selectedMenuInstance?.id, hashedOwnerIdForContext]); // Ensure hashedOwnerIdForContext is in dependency array


  useEffect(() => {
    const storedAuthStatus = localStorage.getItem(AUTH_STATUS_LS_KEY);
    const storedJwtToken = localStorage.getItem(JWT_TOKEN_LS_KEY);
    if (storedAuthStatus === "true") {
      setIsAuthenticated(true);
      setJwtToken(storedJwtToken); // Load JWT token for the authenticated user
    }
    setIsLoading(false); // Done loading initial auth state
  }, []);

  // Load menu data whenever isAuthenticated changes or on initial load if already authenticated.
  useEffect(() => {
    loadMenuData();
  }, [isAuthenticated, loadMenuData]); // loadMenuData is now memoized with useCallback

  const login = () => {
    // For mock purposes, generate a simple JWT-like string
    const mockTokenValue = "mock-jwt-for-" + RAW_OWNER_ID_FOR_CONTEXT + "-" + Date.now();
    setIsAuthenticated(true);
    setJwtToken(mockTokenValue);
    localStorage.setItem(AUTH_STATUS_LS_KEY, "true");
    localStorage.setItem(JWT_TOKEN_LS_KEY, mockTokenValue);
    // Menu data will be loaded by the useEffect watching isAuthenticated
  };

  const logout = () => {
    setIsAuthenticated(false);
    setJwtToken(null);
    localStorage.removeItem(AUTH_STATUS_LS_KEY);
    localStorage.removeItem(JWT_TOKEN_LS_KEY);
    // Clear menu data on logout
    localStorage.removeItem(MENU_INSTANCES_LS_KEY);
    localStorage.removeItem(MENU_INSTANCES_TIMESTAMP_LS_KEY);
    localStorage.removeItem(SELECTED_MENU_INSTANCE_LS_KEY);
    setMenuInstances([]);
    setSelectedMenuInstance(null);
  };

  const selectMenuInstance = (menuId: string) => {
    const menuInstance = menuInstances.find(m => m.id === menuId);
    if (menuInstance) {
      setSelectedMenuInstance(menuInstance);
      localStorage.setItem(SELECTED_MENU_INSTANCE_LS_KEY, menuInstance.id);
    }
  };

  // This function should likely call a backend endpoint to persist the new menu instance.
  // For now, it updates local state and localStorage.
  const addMenuInstance = (name: string): MenuInstance => {
    // Create a somewhat unique ID for the new menu instance
    const newMenuInstance: MenuInstance = {
      id: name.toLowerCase().replace(/\s+/g, '-') + '-menu-' + Date.now(), // Example ID
      name: name,
      menu: [], // Starts with an empty menu
    };
    const updatedMenuInstances = [...menuInstances, newMenuInstance];
    setMenuInstances(updatedMenuInstances);
    setSelectedMenuInstance(newMenuInstance); // Select the newly added menu
    localStorage.setItem(MENU_INSTANCES_LS_KEY, JSON.stringify(updatedMenuInstances));
    localStorage.setItem(MENU_INSTANCES_TIMESTAMP_LS_KEY, Date.now().toString()); // Invalidate cache
    localStorage.setItem(SELECTED_MENU_INSTANCE_LS_KEY, newMenuInstance.id);
    return newMenuInstance;
  };

  const renameMenuInstance = (menuId: string, newName: string): boolean => {
    let success = false;
    const updatedMenuInstances = menuInstances.map(m =>
      m.id === menuId ? { ...m, name: newName } : m
    );
    
    // Check if actual change occurred to avoid unnecessary state updates/localStorage writes
    if (JSON.stringify(updatedMenuInstances) !== JSON.stringify(menuInstances)) {
      setMenuInstances(updatedMenuInstances);
      localStorage.setItem(MENU_INSTANCES_LS_KEY, JSON.stringify(updatedMenuInstances));
      localStorage.setItem(MENU_INSTANCES_TIMESTAMP_LS_KEY, Date.now().toString()); // Invalidate cache
      success = true;
    }

    // If the renamed instance was the selected one, update the selectedMenuInstance state
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
        // Find and update the specific item in the menu
        const updatedMenu = instance.menu.map(item =>
          item.id === updatedItem.id ? updatedItem : item
        );
        // Check if actual change occurred
        if (JSON.stringify(updatedMenu) !== JSON.stringify(instance.menu)) {
            success = true;
        }
        return { ...instance, menu: updatedMenu };
      }
      return instance;
    });

    if (success) {
      setMenuInstances(updatedMenuInstances);
      localStorage.setItem(MENU_INSTANCES_LS_KEY, JSON.stringify(updatedMenuInstances));
      localStorage.setItem(MENU_INSTANCES_TIMESTAMP_LS_KEY, Date.now().toString()); // Invalidate cache

      // If the updated menu instance was the selected one, update the selectedMenuInstance state
      if (selectedMenuInstance?.id === menuInstanceId) {
        const newSelectedInstance = updatedMenuInstances.find(m => m.id === menuInstanceId);
        setSelectedMenuInstance(newSelectedInstance || null);
      }
    }
    return success;
  };


  const refreshMenuInstances = useCallback(async () => {
    await loadMenuData(true); // Pass true to force a refresh from backend
  }, [loadMenuData]);


  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      jwtToken,
      rawOwnerId: RAW_OWNER_ID_FOR_CONTEXT, // Expose raw owner ID
      hashedOwnerId: hashedOwnerIdForContext, // Expose hashed owner ID
      login,
      logout,
      menuInstances,
      selectedMenuInstance,
      selectMenuInstance,
      addMenuInstance,
      renameMenuInstance,
      updateMenuItem,
      isLoadingMenuInstances,
      refreshMenuInstances
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Helper Hook for redirecting if not authenticated, can be used in page components
// This is not part of the AuthContext itself but uses it.
// Example usage: useAuthRedirect(); in a dashboard page.
// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
// export function useAuthRedirect(redirectTo = "/signin") {
//   const { isAuthenticated, isLoading } = useAuth();
//   const router = useRouter();
//   useEffect(() => {
//     if (!isLoading && !isAuthenticated) {
//       router.replace(redirectTo);
//     }
//   }, [isAuthenticated, isLoading, router, redirectTo]);
// }
