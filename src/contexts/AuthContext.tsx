
"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useState, useEffect } from "react";
import type { MenuInstance } from "@/lib/types";
import { fetchMenuInstancesFromBackend } from "@/app/(dashboard)/dashboard/actions";
import { useToast } from "@/hooks/use-toast";


const MENU_INSTANCES_LS_KEY = "clarityMenuUserMenuInstances";
const MENU_INSTANCES_TIMESTAMP_LS_KEY = "clarityMenuMenuInstancesTimestamp";
const SELECTED_MENU_INSTANCE_LS_KEY = "clarityMenuSelectedMenuInstance";
const AUTH_STATUS_LS_KEY = "clarityMenuAuth";
const JWT_TOKEN_LS_KEY = "clarityMenuJwtToken";
const MENU_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  jwtToken: string | null;
  login: () => void;
  logout: () => void;
  menuInstances: MenuInstance[];
  selectedMenuInstance: MenuInstance | null;
  selectMenuInstance: (menuId: string) => void;
  addMenuInstance: (name: string) => MenuInstance; // This will update local cache, backend sync is separate
  renameMenuInstance: (menuId: string, newName: string) => boolean; // This will update local cache
  isLoadingMenuInstances: boolean;
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

  useEffect(() => {
    const storedAuthStatus = localStorage.getItem(AUTH_STATUS_LS_KEY);
    const storedJwtToken = localStorage.getItem(JWT_TOKEN_LS_KEY);
    if (storedAuthStatus === "true") {
      setIsAuthenticated(true);
      setJwtToken(storedJwtToken);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const loadMenuData = async () => {
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
      const ownerId = "admin@example.com"; // Mock ownerId, replace with actual user identifier
      
      const cachedTimestampStr = localStorage.getItem(MENU_INSTANCES_TIMESTAMP_LS_KEY);
      const cachedInstancesStr = localStorage.getItem(MENU_INSTANCES_LS_KEY);
      const cachedTimestamp = cachedTimestampStr ? parseInt(cachedTimestampStr, 10) : null;

      if (cachedTimestamp && cachedInstancesStr && (Date.now() - cachedTimestamp < MENU_CACHE_TTL)) {
        try {
          const parsedInstances: MenuInstance[] = JSON.parse(cachedInstancesStr);
          setMenuInstances(parsedInstances);
          const storedMenuInstanceId = localStorage.getItem(SELECTED_MENU_INSTANCE_LS_KEY);
          const foundMenuInstance = parsedInstances.find(m => m.id === storedMenuInstanceId);
          setSelectedMenuInstance(foundMenuInstance || (parsedInstances.length > 0 ? parsedInstances[0] : null));
          setIsLoadingMenuInstances(false);
          return; // Exit if valid cache is used
        } catch (e) {
          console.error("Failed to parse cached menu instances:", e);
          // Proceed to fetch if cache is invalid
        }
      }
      
      // Fetch from backend if no valid cache
      const result = await fetchMenuInstancesFromBackend(ownerId, jwtToken);

      if (result.success && result.menuInstances) {
        setMenuInstances(result.menuInstances);
        localStorage.setItem(MENU_INSTANCES_LS_KEY, JSON.stringify(result.menuInstances));
        localStorage.setItem(MENU_INSTANCES_TIMESTAMP_LS_KEY, Date.now().toString());

        if (result.menuInstances.length > 0) {
          const storedMenuInstanceId = localStorage.getItem(SELECTED_MENU_INSTANCE_LS_KEY);
          const foundMenuInstance = result.menuInstances.find(m => m.id === storedMenuInstanceId);
          const newSelected = foundMenuInstance || result.menuInstances[0];
          setSelectedMenuInstance(newSelected);
          localStorage.setItem(SELECTED_MENU_INSTANCE_LS_KEY, newSelected.id);
        } else {
          setSelectedMenuInstance(null);
          localStorage.removeItem(SELECTED_MENU_INSTANCE_LS_KEY);
        }
      } else {
        toast({
          title: "Error Fetching Menus",
          description: result.message || "Could not load your menus from the server.",
          variant: "destructive",
        });
        setMenuInstances([]); // Clear menus on fetch error
        setSelectedMenuInstance(null);
        localStorage.removeItem(MENU_INSTANCES_LS_KEY); // Clear potentially stale cache
        localStorage.removeItem(MENU_INSTANCES_TIMESTAMP_LS_KEY);
        localStorage.removeItem(SELECTED_MENU_INSTANCE_LS_KEY);
      }
      setIsLoadingMenuInstances(false);
    };

    loadMenuData();
  }, [isAuthenticated, jwtToken, toast]);

  const login = () => {
    const mockTokenValue = "mock-jwt-for-admin@example.com-" + Date.now();
    setIsAuthenticated(true);
    setJwtToken(mockTokenValue);
    localStorage.setItem(AUTH_STATUS_LS_KEY, "true");
    localStorage.setItem(JWT_TOKEN_LS_KEY, mockTokenValue);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setJwtToken(null);
    // Clearing menu data is handled by the useEffect watching isAuthenticated
  };

  const selectMenuInstance = (menuId: string) => {
    const menuInstance = menuInstances.find(m => m.id === menuId);
    if (menuInstance) {
      setSelectedMenuInstance(menuInstance);
      localStorage.setItem(SELECTED_MENU_INSTANCE_LS_KEY, menuInstance.id);
    }
  };

  const addMenuInstance = (name: string): MenuInstance => {
    // This function primarily updates local state and cache.
    // A separate backend call is made in the create-restaurant page.
    const newMenuInstance: MenuInstance = {
      id: name.toLowerCase().replace(/\s+/g, '-') + '-menu-' + Date.now(), // Ensure unique ID for local
      name: name,
      menu: [],
    };
    const updatedMenuInstances = [...menuInstances, newMenuInstance];
    setMenuInstances(updatedMenuInstances);
    setSelectedMenuInstance(newMenuInstance);
    // Update local storage cache immediately
    localStorage.setItem(MENU_INSTANCES_LS_KEY, JSON.stringify(updatedMenuInstances));
    localStorage.setItem(MENU_INSTANCES_TIMESTAMP_LS_KEY, Date.now().toString()); // Invalidate old cache
    localStorage.setItem(SELECTED_MENU_INSTANCE_LS_KEY, newMenuInstance.id);
    return newMenuInstance;
  };

  const renameMenuInstance = (menuId: string, newName: string): boolean => {
    // This function primarily updates local state and cache.
    // Backend sync for rename would need a separate server action.
    let success = false;
    const updatedMenuInstances = menuInstances.map(m =>
      m.id === menuId ? { ...m, name: newName } : m
    );
    
    if (JSON.stringify(updatedMenuInstances) !== JSON.stringify(menuInstances)) {
      setMenuInstances(updatedMenuInstances);
      localStorage.setItem(MENU_INSTANCES_LS_KEY, JSON.stringify(updatedMenuInstances));
      localStorage.setItem(MENU_INSTANCES_TIMESTAMP_LS_KEY, Date.now().toString()); // Invalidate old cache
      success = true;
    }

    if (selectedMenuInstance?.id === menuId) {
      const newSelected = updatedMenuInstances.find(m => m.id === menuId);
      setSelectedMenuInstance(newSelected || null);
    }
    return success;
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      jwtToken,
      login,
      logout,
      menuInstances,
      selectedMenuInstance,
      selectMenuInstance,
      addMenuInstance,
      renameMenuInstance,
      isLoadingMenuInstances
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
