
"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { MenuInstance, MenuItem } from "@/lib/types";
import { fetchMenuInstancesFromBackend } from "@/app/(dashboard)/dashboard/actions";
import { patchMenuSettings } from "@/app/(dashboard)/dashboard/hypothesis-tests/actions";
import { useToast } from "@/hooks/use-toast";
import { generateDeterministicIdHash } from "@/lib/hash-utils";


const MENU_INSTANCES_LS_KEY = "clarityMenuUserMenuInstances";
const MENU_INSTANCES_TIMESTAMP_LS_KEY = "clarityMenuMenuInstancesTimestamp";
const SELECTED_MENU_INSTANCE_LS_KEY = "clarityMenuSelectedMenuInstance";
const AUTH_STATUS_LS_KEY = "clarityMenuAuth";
const JWT_TOKEN_LS_KEY = "clarityMenuJwtToken";
const RAW_MENU_API_RESPONSE_LS_KEY = "clarityMenuRawApiResponse";
const MENU_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const RAW_OWNER_ID_FOR_CONTEXT = "admin@example.com"; // Define raw owner ID once

export interface AuthContextType {
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
  rawMenuApiResponseText: string | null;
  toggleABTesting: (menuId: string, enable: boolean) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  const [menuInstances, setMenuInstances] = useState<MenuInstance[]>([]);
  const [selectedMenuInstance, setSelectedMenuInstance] = useState<MenuInstance | null>(null);
  const [isLoadingMenuInstances, setIsLoadingMenuInstances] = useState(true);
  const [rawMenuApiResponseText, setRawMenuApiResponseText] = useState<string | null>(null);
  const { toast } = useToast();

  const hashedOwnerIdForContext = generateDeterministicIdHash(RAW_OWNER_ID_FOR_CONTEXT);

  const loadMenuData = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated) {
      setMenuInstances([]);
      setSelectedMenuInstance(null);
      setIsLoadingMenuInstances(false);
      setRawMenuApiResponseText(null);
      localStorage.removeItem(SELECTED_MENU_INSTANCE_LS_KEY);
      localStorage.removeItem(MENU_INSTANCES_LS_KEY);
      localStorage.removeItem(MENU_INSTANCES_TIMESTAMP_LS_KEY);
      localStorage.removeItem(JWT_TOKEN_LS_KEY);
      localStorage.removeItem(RAW_MENU_API_RESPONSE_LS_KEY);
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
        const cachedRawResponse = localStorage.getItem(RAW_MENU_API_RESPONSE_LS_KEY);
        setRawMenuApiResponseText(cachedRawResponse); 
        setIsLoadingMenuInstances(false);
        return;
      } catch (e) {
        console.error("Failed to parse cached menu instances:", e);
      }
    }

    const result = await fetchMenuInstancesFromBackend(hashedOwnerIdForContext, jwtToken);
    
    setRawMenuApiResponseText(result.rawResponseText || null);
    localStorage.setItem(RAW_MENU_API_RESPONSE_LS_KEY, result.rawResponseText || "");

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
      if (!(RAW_OWNER_ID_FOR_CONTEXT === "admin@example.com" && result.rawResponseText) && result.message) {
         toast({
            title: "Error Fetching Menus",
            description: result.message,
            variant: "destructive",
         });
      }
      if (forceRefresh || !cachedInstancesStr) {
        setMenuInstances([]);
        setSelectedMenuInstance(null);
        localStorage.removeItem(MENU_INSTANCES_LS_KEY);
        localStorage.removeItem(MENU_INSTANCES_TIMESTAMP_LS_KEY);
        localStorage.removeItem(SELECTED_MENU_INSTANCE_LS_KEY);
      }
    }
    setIsLoadingMenuInstances(false);
  }, [isAuthenticated, jwtToken, toast, selectedMenuInstance?.id, hashedOwnerIdForContext]);


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
    const mockTokenValue = "mock-jwt-for-" + RAW_OWNER_ID_FOR_CONTEXT + "-" + Date.now();
    setIsAuthenticated(true);
    setJwtToken(mockTokenValue);
    localStorage.setItem(AUTH_STATUS_LS_KEY, "true");
    localStorage.setItem(JWT_TOKEN_LS_KEY, mockTokenValue);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setJwtToken(null);
    setRawMenuApiResponseText(null);
    localStorage.removeItem(AUTH_STATUS_LS_KEY);
    localStorage.removeItem(JWT_TOKEN_LS_KEY);
    localStorage.removeItem(MENU_INSTANCES_LS_KEY);
    localStorage.removeItem(MENU_INSTANCES_TIMESTAMP_LS_KEY);
    localStorage.removeItem(SELECTED_MENU_INSTANCE_LS_KEY);
    localStorage.removeItem(RAW_MENU_API_RESPONSE_LS_KEY);
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
      analytics: [],
      allowABTesting: false,
    };
    const updatedMenuInstances = [...menuInstances, newMenuInstance];
    setMenuInstances(updatedMenuInstances);
    setSelectedMenuInstance(newMenuInstance);
    localStorage.setItem(MENU_INSTANCES_LS_KEY, JSON.stringify(updatedMenuInstances));
    localStorage.setItem(MENU_INSTANCES_TIMESTAMP_LS_KEY, Date.now().toString());
    localStorage.setItem(SELECTED_MENU_INSTANCE_LS_KEY, newMenuInstance.id);
    return newMenuInstance;
  };
  
  const refreshMenuInstances = useCallback(async () => {
    await loadMenuData(true);
  }, [loadMenuData]);

  const toggleABTesting = async (menuId: string, enable: boolean): Promise<boolean> => {
    if (!selectedMenuInstance || selectedMenuInstance.id !== menuId) {
        toast({
            title: "Error",
            description: "The correct menu is not selected.",
            variant: "destructive",
        });
        return false;
    }

    const result = await patchMenuSettings({
        ownerId: hashedOwnerIdForContext,
        menuId,
        allowABTesting: enable,
        jwtToken,
    });

    if (result.success) {
        toast({
            title: `A/B Testing ${enable ? 'Enabled' : 'Disabled'}`,
            description: "Successfully updated settings on the backend.",
            variant: "default",
            className: "bg-green-500 text-white",
        });
        await refreshMenuInstances(); // Re-fetches the data from backend
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

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      jwtToken,
      rawOwnerId: RAW_OWNER_ID_FOR_CONTEXT,
      hashedOwnerId: hashedOwnerIdForContext,
      login,
      logout,
      menuInstances,
      selectedMenuInstance,
      selectMenuInstance,
      addMenuInstance,
      renameMenuInstance,
      updateMenuItem,
      isLoadingMenuInstances,
      refreshMenuInstances,
      rawMenuApiResponseText,
      toggleABTesting,
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
