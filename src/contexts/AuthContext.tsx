
"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useState, useEffect } from "react";
import type { Restaurant } from "@/lib/types";

// Mock restaurant data - in a real app, this would come from a backend
const mockRestaurants: Restaurant[] = [
  { id: "clara-kitchen", name: "Clara's Kitchen", menu: [] },
  { id: "the-daily-grind", name: "The Daily Grind Cafe", menu: [] },
  { id: "spice-route-eatery", name: "Spice Route Eatery", menu: [] },
];

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  selectRestaurant: (restaurantId: string) => void;
  addRestaurant: (name: string) => Restaurant;
  renameRestaurant: (restaurantId: string, newName: string) => boolean;
  isLoadingRestaurants: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);

  useEffect(() => {
    const storedAuthStatus = localStorage.getItem("clarityMenuAuth");
    if (storedAuthStatus === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingRestaurants(true);
      setTimeout(() => { 
        const storedRestaurants = localStorage.getItem("clarityMenuUserRestaurants");
        let initialRestaurants: Restaurant[];
        if (storedRestaurants) {
          initialRestaurants = JSON.parse(storedRestaurants);
        } else {
          initialRestaurants = [...mockRestaurants]; 
          localStorage.setItem("clarityMenuUserRestaurants", JSON.stringify(initialRestaurants));
        }
        setRestaurants(initialRestaurants);

        if (initialRestaurants.length > 0) {
          const storedRestaurantId = localStorage.getItem("clarityMenuSelectedRestaurant");
          const foundRestaurant = initialRestaurants.find(r => r.id === storedRestaurantId);
          setSelectedRestaurant(foundRestaurant || initialRestaurants[0]);
        } else {
          setSelectedRestaurant(null);
        }
        setIsLoadingRestaurants(false);
      }, 500);
    } else {
      setRestaurants([]);
      setSelectedRestaurant(null);
      setIsLoadingRestaurants(false);
      localStorage.removeItem("clarityMenuSelectedRestaurant");
      localStorage.removeItem("clarityMenuUserRestaurants");
    }
  }, [isAuthenticated]);

  const login = () => {
    setIsAuthenticated(true);
    localStorage.setItem("clarityMenuAuth", "true");
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("clarityMenuAuth");
    localStorage.removeItem("clarityMenuSelectedRestaurant"); 
    localStorage.removeItem("clarityMenuUserRestaurants");
    setRestaurants([]);
    setSelectedRestaurant(null);
  };

  const selectRestaurant = (restaurantId: string) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      localStorage.setItem("clarityMenuSelectedRestaurant", restaurant.id);
    }
  };

  const addRestaurant = (name: string): Restaurant => {
    const newRestaurant: Restaurant = {
      id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: name,
      menu: [],
    };
    const updatedRestaurants = [...restaurants, newRestaurant];
    setRestaurants(updatedRestaurants);
    setSelectedRestaurant(newRestaurant);
    localStorage.setItem("clarityMenuUserRestaurants", JSON.stringify(updatedRestaurants));
    localStorage.setItem("clarityMenuSelectedRestaurant", newRestaurant.id);
    return newRestaurant;
  };

  const renameRestaurant = (restaurantId: string, newName: string): boolean => {
    let success = false;
    setRestaurants(prevRestaurants => {
      const updatedRestaurants = prevRestaurants.map(r => 
        r.id === restaurantId ? { ...r, name: newName } : r
      );
      if (JSON.stringify(updatedRestaurants) !== JSON.stringify(prevRestaurants)) {
        localStorage.setItem("clarityMenuUserRestaurants", JSON.stringify(updatedRestaurants));
        success = true;
      }
      return updatedRestaurants;
    });

    if (selectedRestaurant?.id === restaurantId) {
      setSelectedRestaurant(prevSelected => prevSelected ? { ...prevSelected, name: newName } : null);
    }
    return success;
  };


  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isLoading, 
      login, 
      logout,
      restaurants,
      selectedRestaurant,
      selectRestaurant,
      addRestaurant,
      renameRestaurant,
      isLoadingRestaurants
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
