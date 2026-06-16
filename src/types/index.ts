// ============================================================
// SVAAS Founder OS — Core Types
// ============================================================

export type StreamStatus = 'green' | 'yellow' | 'red' | 'grey';
export type TaskStatus = 'not_started' | 'committed_today' | 'in_progress' | 'waiting_on' | 'blocked' | 'deferred' | 'done' | 'cancelled';
export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type DecisionStatus = 'pending' | 'decided' | 'defaulted' | 'deferred';
export type DependencyType = 'hard_block' | 'soft_block' | 'enables';
export type MilestoneStatus = 'upcoming' | 'current' | 'at_risk' | 'achieved' | 'missed';
export type NeglectLevel = 'attended' | 'cooling' | 'drifting' | 'neglected';

export interface VentureStream {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  status: StreamStatus;
  currentBottleneck: string | null;
  waitingOn: string | null;
  nextMilestone: string | null;
  lastMovementAt: string | null;
  momentumScore: number;
  departments: string[];
  // Computed
  taskCount: number;
  tasksDone: number;
  tasksBlocked: number;
  daysSinceMovement: number;
  neglectLevel: NeglectLevel;
  hasActionableWork: boolean;
}

export interface StreamDependency {
  id: string;
  upstreamStreamId: string;
  downstreamStreamId: string;
  upstreamSlug: string;
  downstreamSlug: string;
  upstreamName: string;
  downstreamName: string;
  dependencyType: DependencyType;
  reason: string;
  strength: number;
}

export interface Task {
  id: string;
  streamId: string;
  streamSlug?: string;
  taskNumber: number | null;
  department: string;
  category: string;
  title: string;
  description: string | null;
  notesDependencies: string | null;
  priority: TaskPriority;
  phase: string;
  dayRangeStart: number | null;
  dayRangeEnd: number | null;
  costLow: number;
  costLikely: number;
  costHigh: number;
  owner: string;
  status: TaskStatus;
  blockedReason: string | null;
  completedAt: string | null;
  // Waiting On metadata
  waitingOnPerson?: string | null;
  waitingOnDate?: string | null;
  waitingOnNotes?: string | null;
  // Deferred metadata
  deferredReason?: string | null;
  deferredReviewDate?: string | null;
  // Committed
  committedAt?: string | null;
  // Computed
  leverageScore?: number;
  downstreamCount?: number;
  isOnCriticalPath?: boolean;
  daysOverdue?: number;
}

export interface Decision {
  id: string;
  title: string;
  context: string | null;
  options: { label: string; description: string }[];
  defaultOption: string | null;
  defaultRationale: string | null;
  deadline: string | null;
  status: DecisionStatus;
  decisionMade: string | null;
  rationale: string | null;
  decidedAt: string | null;
  deferCount: number;
  maxDeferrals: number;
  blocksTasks: string[];
  // Impact scoring
  impactScore: number;
  streamsAffected: number;
  tasksAffected: number;
  estimatedDelayDays: number;
  cascadeDepth: number;
}

export interface Milestone {
  id: string;
  title: string;
  dayTarget: number;
  phase: string;
  gateCriteria: { description: string; met: boolean }[];
  status: MilestoneStatus;
  achievedAt: string | null;
  // Computed
  criterionMetCount?: number;
  criterionTotalCount?: number;
  daysRemaining?: number;
}

export interface WaitingOn {
  id: string;
  personOrVendor: string;
  description: string;
  relatedTaskId: string | null;
  dueDate: string | null;
  lastContacted: string | null;
  status: 'active' | 'received' | 'overdue' | 'cancelled';
  streamSlug?: string;
}

export interface MomentumSnapshot {
  weekNumber: number;
  overallScore: number;
  streamScores: Record<string, number>;
  trend: 'improving' | 'stable' | 'declining' | 'critical';
  dormantStreams: string[];
}

export interface RecoveryAction {
  stream: string;
  streamSlug: string;
  action: string;
  effort: string;
  effortMinutes: number;
  impact: string;
  type: 'decision' | 'follow_up' | 'quick_action' | 'awareness';
  relatedEntityId?: string;
}

export interface FounderPattern {
  id: string;
  patternName: string;
  observation: string;
  suggestion: string;
  confidence: number;
  status: 'active' | 'shown' | 'dismissed' | 'expired';
}

export interface DreamProtectionScore {
  thisWeek: number; // days with activity (0-7)
  target: number; // founder-set target
  lastFourWeeks: number[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface AttentionDistribution {
  streamSlug: string;
  streamName: string;
  actionsThisWeek: number;
}

export interface VentureHealth {
  dayNumber: number;
  totalDays: number;
  overallProgress: number;
  currentPhase: string;
  currentMilestone: Milestone | null;
  streamsRed: number;
  streamsYellow: number;
  streamsGreen: number;
  streamsGrey: number;
  momentumScore: number;
  momentumTrend: 'improving' | 'stable' | 'declining' | 'critical';
  dreamProtection: DreamProtectionScore;
  patternInsight: string | null;
}
