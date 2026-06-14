/**
 * SVAAS Venture Configuration
 * 
 * THE SINGLE SOURCE OF TRUTH for venture parameters.
 * Every page reads from here. Nothing is hardcoded elsewhere.
 * 
 * To change venture parameters: edit this file OR update via admin.
 * In production with Supabase: these come from the ventures table.
 */

export const VENTURE_CONFIG = {
  // Core identity
  name: 'SVAAS',
  slug: 'svaas',
  description: 'Premium botanical wellness brand. Beauty Inside Out. Ritual Wellness. Handmade. Chennai.',

  // Timeline
  launchStartDate: '2026-06-01',  // Day 1 = June 1, 2026
  launchTargetDays: 180,          // 180 days to public launch
  currentPhase: 'P0',

  // Founder settings
  dreamProtectionTarget: 5,       // Target: 5 days/week with SVAAS activity

  // Launch objective
  launchObjective: 'Public Launch — SVAAS live and selling to strangers',
};

/**
 * Calculate the current day number relative to venture start.
 */
export function getDayNumber(): number {
  const start = new Date(VENTURE_CONFIG.launchStartDate);
  const today = new Date();
  const diffMs = today.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

/**
 * Calculate the current week number.
 */
export function getWeekNumber(): number {
  return Math.max(1, Math.ceil(getDayNumber() / 7));
}

/**
 * Get progress percentage toward launch.
 */
export function getLaunchProgress(): number {
  const day = getDayNumber();
  return Math.min(100, Math.round((day / VENTURE_CONFIG.launchTargetDays) * 100));
}

/**
 * Get the target launch date.
 */
export function getTargetLaunchDate(): Date {
  const start = new Date(VENTURE_CONFIG.launchStartDate);
  start.setDate(start.getDate() + VENTURE_CONFIG.launchTargetDays);
  return start;
}
