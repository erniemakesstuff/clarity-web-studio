"use client";

import { clarity } from 'clarity-js';
import { useEffect } from 'react';

const CLARITY_PROJECT_ID = "s7w16gmw51";

export function ClarityAnalytics() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && CLARITY_PROJECT_ID) {
      clarity.init(CLARITY_PROJECT_ID);
    }
  }, []);

  return null;
}
