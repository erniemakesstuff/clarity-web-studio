
"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useState, useEffect } from "react";
import type { MenuInstance } from "@/lib/types";

// Mock menu instance data
const mockMenuInstances: MenuInstance[] = [
  { id: "clara-kitchen-menu", name: "Clara's Kitchen Menu", menu: [] },
  { id: "daily-grind-menu", name: "The Daily Grind Cafe Menu", menu: [] },
  { id: "spice-route-menu", name: "Spice Route Eatery Menu", menu: [] },
];

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  jwtToken: string | null; // Added for JWT token
  login: () => void;
  logout: () => void;
  menuInstances: MenuInstance[];
  selectedMenuInstance: MenuInstance | null;
  selectMenuInstance: (menuId: string) => void;
  addMenuInstance: (name: string) => MenuInstance;
  renameMenuInstance: (menuId: string, newName: string) => boolean;
  isLoadingMenuInstances: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jwtToken, setJwtToken] = useState<string | null>(null); // Added

  const [menuInstances, setMenuInstances] = useState<MenuInstance[]>([]);
  const [selectedMenuInstance, setSelectedMenuInstance] = useState<MenuInstance | null>(null);
  const [isLoadingMenuInstances, setIsLoadingMenuInstances] = useState(true);

  useEffect(() => {
    const storedAuthStatus = localStorage.getItem("clarityMenuAuth");
    const storedJwtToken = localStorage.getItem("clarityMenuJwtToken"); // Added
    if (storedAuthStatus === "true") {
      setIsAuthenticated(true);
      setJwtToken(storedJwtToken); // Added
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingMenuInstances(true);
      setTimeout(() => {
        const storedMenuInstances = localStorage.getItem("clarityMenuUserMenuInstances");
        let initialMenuInstances: MenuInstance[];
        if (storedMenuInstances) {
          initialMenuInstances = JSON.parse(storedMenuInstances);
        } else {
          initialMenuInstances = [...mockMenuInstances];
          localStorage.setItem("clarityMenuUserMenuInstances", JSON.stringify(initialMenuInstances));
        }
        setMenuInstances(initialMenuInstances);

        if (initialMenuInstances.length > 0) {
          const storedMenuInstanceId = localStorage.getItem("clarityMenuSelectedMenuInstance");
          const foundMenuInstance = initialMenuInstances.find(m => m.id === storedMenuInstanceId);
          setSelectedMenuInstance(foundMenuInstance || initialMenuInstances[0]);
        } else {
          setSelectedMenuInstance(null);
        }
        setIsLoadingMenuInstances(false);
      }, 500);
    } else {
      setMenuInstances([]);
      setSelectedMenuInstance(null);
      setIsLoadingMenuInstances(false);
      localStorage.removeItem("clarityMenuSelectedMenuInstance");
      localStorage.removeItem("clarityMenuUserMenuInstances");
      localStorage.removeItem("clarityMenuJwtToken"); // Added
      setJwtToken(null); // Added
    }
  }, [isAuthenticated]);

  const login = () => {
    const mockToken = "mock-jwt-for-admin@example.com-" + Date.now(); // Create a mock token
    setIsAuthenticated(true);
    setJwtToken(mockToken);
    localStorage.setItem("clarityMenuAuth", "true");
    localStorage.setItem("clarityMenuJwtToken", mockToken); // Store mock token
  };

  const logout = () => {
    setIsAuthenticated(false);
    setJwtToken(null);
    localStorage.removeItem("clarityMenuAuth");
    localStorage.removeItem("clarityMenuSelectedMenuInstance");
    localStorage.removeItem("clarityMenuUserMenuInstances");
    localStorage.removeItem("clarityMenuJwtToken"); // Clear mock token
    setMenuInstances([]);
    setSelectedMenuInstance(null);
  };

  const selectMenuInstance = (menuId: string) => {
    const menuInstance = menuInstances.find(m => m.id === menuId);
    if (menuInstance) {
      setSelectedMenuInstance(menuInstance);
      localStorage.setItem("clarityMenuSelectedMenuInstance", menuInstance.id);
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
    localStorage.setItem("clarityMenuUserMenuInstances", JSON.stringify(updatedMenuInstances));
    localStorage.setItem("clarityMenuSelectedMenuInstance", newMenuInstance.id);
    return newMenuInstance;
  };

  const renameMenuInstance = (menuId: string, newName: string): boolean => {
    let success = false;
    setMenuInstances(prevMenuInstances => {
      const updatedMenuInstances = prevMenuInstances.map(m =>
        m.id === menuId ? { ...m, name: newName } : m
      );
      if (JSON.stringify(updatedMenuInstances) !== JSON.stringify(prevMenuInstances)) {
        localStorage.setItem("clarityMenuUserMenuInstances", JSON.stringify(updatedMenuInstances));
        success = true;
      }
      return updatedMenuInstances;
    });

    if (selectedMenuInstance?.id === menuId) {
      setSelectedMenuInstance(prevSelected => prevSelected ? { ...prevSelected, name: newName } : null);
    }
    return success;
  };


  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      jwtToken, // Added
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
