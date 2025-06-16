
"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useState, useEffect } from "react";
import type { MenuInstance } from "@/lib/types"; // Updated import

// Mock menu instance data
const mockMenuInstances: MenuInstance[] = [
  { id: "clara-kitchen-menu", name: "Clara's Kitchen Menu", menu: [] },
  { id: "daily-grind-menu", name: "The Daily Grind Cafe Menu", menu: [] },
  { id: "spice-route-menu", name: "Spice Route Eatery Menu", menu: [] },
];

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  menuInstances: MenuInstance[]; // Renamed from restaurants
  selectedMenuInstance: MenuInstance | null; // Renamed from selectedRestaurant
  selectMenuInstance: (menuId: string) => void; // Renamed from selectRestaurant
  addMenuInstance: (name: string) => MenuInstance; // Renamed from addRestaurant
  renameMenuInstance: (menuId: string, newName: string) => boolean; // Renamed from renameRestaurant
  isLoadingMenuInstances: boolean; // Renamed from isLoadingRestaurants
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [menuInstances, setMenuInstances] = useState<MenuInstance[]>([]); // Renamed
  const [selectedMenuInstance, setSelectedMenuInstance] = useState<MenuInstance | null>(null); // Renamed
  const [isLoadingMenuInstances, setIsLoadingMenuInstances] = useState(true); // Renamed

  useEffect(() => {
    const storedAuthStatus = localStorage.getItem("clarityMenuAuth");
    if (storedAuthStatus === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingMenuInstances(true);
      setTimeout(() => { 
        const storedMenuInstances = localStorage.getItem("clarityMenuUserMenuInstances"); // Key updated
        let initialMenuInstances: MenuInstance[];
        if (storedMenuInstances) {
          initialMenuInstances = JSON.parse(storedMenuInstances);
        } else {
          initialMenuInstances = [...mockMenuInstances]; 
          localStorage.setItem("clarityMenuUserMenuInstances", JSON.stringify(initialMenuInstances)); // Key updated
        }
        setMenuInstances(initialMenuInstances);

        if (initialMenuInstances.length > 0) {
          const storedMenuInstanceId = localStorage.getItem("clarityMenuSelectedMenuInstance"); // Key updated
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
      localStorage.removeItem("clarityMenuSelectedMenuInstance"); // Key updated
      localStorage.removeItem("clarityMenuUserMenuInstances"); // Key updated
    }
  }, [isAuthenticated]);

  const login = () => {
    setIsAuthenticated(true);
    localStorage.setItem("clarityMenuAuth", "true");
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("clarityMenuAuth");
    localStorage.removeItem("clarityMenuSelectedMenuInstance"); 
    localStorage.removeItem("clarityMenuUserMenuInstances");
    setMenuInstances([]);
    setSelectedMenuInstance(null);
  };

  const selectMenuInstance = (menuId: string) => { // Renamed parameter
    const menuInstance = menuInstances.find(m => m.id === menuId);
    if (menuInstance) {
      setSelectedMenuInstance(menuInstance);
      localStorage.setItem("clarityMenuSelectedMenuInstance", menuInstance.id); // Key updated
    }
  };

  const addMenuInstance = (name: string): MenuInstance => { // Renamed
    const newMenuInstance: MenuInstance = {
      id: name.toLowerCase().replace(/\s+/g, '-') + '-menu-' + Date.now(), // id generation updated slightly for clarity
      name: name,
      menu: [],
    };
    const updatedMenuInstances = [...menuInstances, newMenuInstance];
    setMenuInstances(updatedMenuInstances);
    setSelectedMenuInstance(newMenuInstance);
    localStorage.setItem("clarityMenuUserMenuInstances", JSON.stringify(updatedMenuInstances)); // Key updated
    localStorage.setItem("clarityMenuSelectedMenuInstance", newMenuInstance.id); // Key updated
    return newMenuInstance;
  };

  const renameMenuInstance = (menuId: string, newName: string): boolean => { // Renamed
    let success = false;
    setMenuInstances(prevMenuInstances => {
      const updatedMenuInstances = prevMenuInstances.map(m => 
        m.id === menuId ? { ...m, name: newName } : m
      );
      if (JSON.stringify(updatedMenuInstances) !== JSON.stringify(prevMenuInstances)) {
        localStorage.setItem("clarityMenuUserMenuInstances", JSON.stringify(updatedMenuInstances)); // Key updated
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
      login, 
      logout,
      menuInstances, // Renamed
      selectedMenuInstance, // Renamed
      selectMenuInstance, // Renamed
      addMenuInstance, // Renamed
      renameMenuInstance, // Renamed
      isLoadingMenuInstances // Renamed
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
