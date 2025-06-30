"use client";

import { useEffect, useRef, useCallback } from 'react';
import type { MenuItem } from '@/lib/types';
import { flushMenuAnalytics, type AnalyticsPayload } from '@/app/menu/[ownerId]/[menuId]/actions';

// The shape of the data we'll store in-memory
interface EngagementData {
  foodName: string;
  foodCategory: string;
  impressions: number;
  engagementDurations: number[]; // in seconds
}

const FLUSH_INTERVAL = 30 * 1000; // 30 seconds

export const useMenuAnalytics = (ownerId: string, menuId: string) => {
  const analyticsBuffer = useRef<Map<string, EngagementData>>(new Map());
  const activeEngagementTimer = useRef<Map<string, number>>(new Map()); // foodName -> startTime (timestamp)

  const flushData = useCallback(async () => {
    if (analyticsBuffer.current.size === 0 || !ownerId || !menuId) {
      return; // Nothing to flush or missing IDs
    }

    // Before flushing, make sure any active timers are stopped and their duration is recorded
    activeEngagementTimer.current.forEach((startTime, foodName) => {
        const duration = (Date.now() - startTime) / 1000;
        const existingData = analyticsBuffer.current.get(foodName);
        if (existingData) {
            existingData.engagementDurations.push(duration);
            analyticsBuffer.current.set(foodName, existingData);
        }
        activeEngagementTimer.current.delete(foodName);
    });

    const analyticsData = Array.from(analyticsBuffer.current.values()).map(data => {
      const totalEngagement = data.engagementDurations.reduce((sum, duration) => sum + duration, 0);
      const averageEngagement = data.engagementDurations.length > 0 ? totalEngagement / data.engagementDurations.length : 0;
      
      const engagementSec = data.engagementDurations.map(d => Math.round(d));

      return {
        timestamp_day: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        impressions: data.impressions,
        engagement_sec: engagementSec,
        food_name: data.foodName,
        average_engagement: averageEngagement,
        purchase_count: 0, // Not trackable
        purchased_with: [], // Not trackable
        food_category: data.foodCategory,
      };
    });

    const payload: AnalyticsPayload = {
      ownerId,
      menuId,
      analytics: analyticsData,
    };

    try {
      const result = await flushMenuAnalytics(payload);
      if (result.success) {
        analyticsBuffer.current.clear();
      } else {
        console.error('Failed to flush analytics:', result.message);
      }
    } catch (error) {
      console.error('Error during analytics flush:', error);
    }
  }, [ownerId, menuId]);

  // Set up the interval for flushing data
  useEffect(() => {
    const intervalId = setInterval(flushData, FLUSH_INTERVAL);
    
    // Flush when the user is about to leave the page
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            flushData();
        }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushData(); // Final flush on component unmount
    };
  }, [flushData]);

  const startTrackingEngagement = useCallback((item: MenuItem) => {
    if (!item || activeEngagementTimer.current.has(item.name)) return;

    const existingData = analyticsBuffer.current.get(item.name) || {
      foodName: item.name,
      foodCategory: item.category || 'Other',
      impressions: 0,
      engagementDurations: [],
    };
    existingData.impressions += 1;
    analyticsBuffer.current.set(item.name, existingData);

    activeEngagementTimer.current.set(item.name, Date.now());
  }, []);

  const endTrackingEngagement = useCallback((itemName: string) => {
    const startTime = activeEngagementTimer.current.get(itemName);
    if (startTime) {
      const duration = (Date.now() - startTime) / 1000;
      const existingData = analyticsBuffer.current.get(itemName);
      if (existingData) {
        existingData.engagementDurations.push(duration);
        analyticsBuffer.current.set(itemName, existingData);
      }
      activeEngagementTimer.current.delete(itemName);
    }
  }, []);

  return { startTrackingEngagement, endTrackingEngagement };
};
