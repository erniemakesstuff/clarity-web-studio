
"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { MenuInstance, MenuItem } from "@/lib/types";
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
  addMenuInstance: (name: string) => MenuInstance; 
  renameMenuInstance: (menuId: string, newName: string) => boolean; 
  updateMenuItem: (menuInstanceId: string, updatedItem: MenuItem) => boolean; // New
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
    const ownerId = "admin@example.com"; 
    
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
      }
    }
    
    const result = await fetchMenuInstancesFromBackend(ownerId, jwtToken);

    if (result.success && result.menuInstances) {
      setMenuInstances(result.menuInstances);
      localStorage.setItem(MENU_INSTANCES_LS_KEY, JSON.stringify(result.menuInstances));
      localStorage.setItem(MENU_INSTANCES_TIMESTAMP_LS_KEY, Date.now().toString());

      if (result.menuInstances.length > 0) {
        const storedMenuInstanceId = localStorage.getItem(SELECTED_MENU_INSTANCE_LS_KEY);
        const currentSelectedStillValid = result.menuInstances.find(m => m.id === selectedMenuInstance?.id);
        if (currentSelectedStillValid) {
            setSelectedMenuInstance(currentSelectedStillValid); 
        } else {
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
      toast({
        title: "Error Fetching Menus",
        description: result.message || "Could not load your menus from the server.",
        variant: "destructive",
      });
      if (forceRefresh || !cachedInstancesStr) {
        setMenuInstances([]); 
        setSelectedMenuInstance(null);
        localStorage.removeItem(MENU_INSTANCES_LS_KEY); 
        localStorage.removeItem(MENU_INSTANCES_TIMESTAMP_LS_KEY);
        localStorage.removeItem(SELECTED_MENU_INSTANCE_LS_KEY);
      }
    }
    setIsLoadingMenuInstances(false);
  }, [isAuthenticated, jwtToken, toast, selectedMenuInstance?.id]);


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
    loadMenuData();
  }, [isAuthenticated, loadMenuData]); 

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
    localStorage.removeItem(AUTH_STATUS_LS_KEY);
    localStorage.removeItem(JWT_TOKEN_LS_KEY);
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

  const addMenuInstance = (name: string): MenuInstance => {
    const newMenuInstance: MenuInstance = {
      id: name.toLowerCase().replace(/\s+/g, '-') + '-menu-' + Date.now(), 
      name: name,
      menu: [],
    };
    const updatedMenuInstances = [...menuInstances, newMenuInstance];
    setMenuInstances(updatedMenuInstances);
    setSelectedMenuInstance(newMenuInstance);
    localStorage.setItem(MENU_INSTANCES_LS_KEY, JSON.stringify(updatedMenuInstances));
    localStorage.setItem(MENU_INSTANCES_TIMESTAMP_LS_KEY, Date.now().toString()); 
    localStorage.setItem(SELECTED_MENU_INSTANCE_LS_KEY, newMenuInstance.id);
    return newMenuInstance;
  };

  const renameMenuInstance = (menuId: string, newName: string): boolean => {
    let success = false;
    const updatedMenuInstances = menuInstances.map(m =>
      m.id === menuId ? { ...m, name: newName } : m
    );
    
    if (JSON.stringify(updatedMenuInstances) !== JSON.stringify(menuInstances)) {
      setMenuInstances(updatedMenuInstances);
      localStorage.setItem(MENU_INSTANCES_LS_KEY, JSON.stringify(updatedMenuInstances));
      localStorage.setItem(MENU_INSTANCES_TIMESTAMP_LS_KEY, Date.now().toString()); 
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
        // Check if the menu actually changed to avoid unnecessary updates
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
      localStorage.setItem(MENU_INSTANCES_TIMESTAMP_LS_KEY, Date.now().toString());

      if (selectedMenuInstance?.id === menuInstanceId) {
        const newSelectedInstance = updatedMenuInstances.find(m => m.id === menuInstanceId);
        setSelectedMenuInstance(newSelectedInstance || null);
      }
    }
    return success;
  };


  const refreshMenuInstances = useCallback(async () => {
    await loadMenuData(true); 
  }, [loadMenuData]);


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
