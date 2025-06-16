
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
      setTimeout(() => { 
        // For this mock, we initialize with mockRestaurants but allow adding more.
        // A real app would fetch user-specific restaurants.
        // If `restaurants` state already has items (e.g., from a previous addRestaurant call in the same session),
        // we might not want to overwrite with mockRestaurants unless it's the very first load after login.
        // For simplicity, let's assume mockRestaurants are the base for a new session.
        const initialRestaurants = [...mockRestaurants]; // Start with a copy
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
    }
  }, [isAuthenticated]);

  const login = () => {
    setIsAuthenticated(true);
    localStorage.setItem("clarityMenuAuth", "true");
    // Restaurant loading will be handled by the useEffect above
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("clarityMenuAuth");
    localStorage.removeItem("clarityMenuSelectedRestaurant"); 
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
    setRestaurants(prevRestaurants => [...prevRestaurants, newRestaurant]);
    setSelectedRestaurant(newRestaurant);
    localStorage.setItem("clarityMenuSelectedRestaurant", newRestaurant.id);
    return newRestaurant;
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
