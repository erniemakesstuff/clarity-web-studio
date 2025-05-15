
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
      // Simulate fetching user's restaurants
      // For admin@example.com, assume they have access to mockRestaurants
      // In a real app, this would be an API call based on the logged-in user
      setTimeout(() => { // Simulate API delay
        setRestaurants(mockRestaurants);
        if (mockRestaurants.length > 0) {
          // Try to load last selected restaurant from localStorage
          const storedRestaurantId = localStorage.getItem("clarityMenuSelectedRestaurant");
          const foundRestaurant = mockRestaurants.find(r => r.id === storedRestaurantId);
          setSelectedRestaurant(foundRestaurant || mockRestaurants[0]);
        } else {
          setSelectedRestaurant(null);
        }
        setIsLoadingRestaurants(false);
      }, 500);
    } else {
      // Clear restaurant data if not authenticated
      setRestaurants([]);
      setSelectedRestaurant(null);
      setIsLoadingRestaurants(false);
    }
  }, [isAuthenticated]);

  const login = () => {
    setIsAuthenticated(true);
    localStorage.setItem("clarityMenuAuth", "true");
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("clarityMenuAuth");
    localStorage.removeItem("clarityMenuSelectedRestaurant"); // Clear selected restaurant on logout
    // Reset restaurant states
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

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isLoading, 
      login, 
      logout,
      restaurants,
      selectedRestaurant,
      selectRestaurant,
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
