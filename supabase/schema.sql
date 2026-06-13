-- ============================================================
-- SVAAS VENTURE OS — Database Schema
-- Multi-venture architecture: SVAAS is Venture #1
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS & VENTURES (Multi-venture ready)
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ventures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'SVAAS'
  slug TEXT NOT NULL, -- 'svaas'
  description TEXT,
  launch_start_date DATE, -- Day 1 reference
  launch_target_days INTEGER DEFAULT 180,
  current_phase TEXT DEFAULT 'P0',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  settings JSONB DEFAULT '{}', -- dream_protection_target, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id, slug)
);

-- ============================================================
-- VENTURE STREAMS
-- ============================================================

CREATE TABLE venture_streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'grey'
    CHECK (status IN ('green', 'yellow', 'red', 'grey')),
  current_bottleneck TEXT,
  waiting_on TEXT,
  next_milestone TEXT,
  last_movement_at TIMESTAMPTZ,
  momentum_score INTEGER DEFAULT 0,
  departments TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(venture_id, slug)
);

CREATE TABLE stream_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  upstream_stream_id UUID REFERENCES venture_streams(id) ON DELETE CASCADE,
  downstream_stream_id UUID REFERENCES venture_streams(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'hard_block'
    CHECK (dependency_type IN ('hard_block', 'soft_block', 'enables')),
  reason TEXT,
  strength INTEGER DEFAULT 1,
  UNIQUE(upstream_stream_id, downstream_stream_id)
);

-- ============================================================
-- TASKS
-- ============================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES venture_streams(id) ON DELETE SET NULL,
  task_number INTEGER,
  department TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  notes_dependencies TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  phase TEXT NOT NULL,
  day_range_start INTEGER,
  day_range_end INTEGER,
  cost_low INTEGER DEFAULT 0,
  cost_likely INTEGER DEFAULT 0,
  cost_high INTEGER DEFAULT 0,
  owner TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'done', 'blocked', 'deferred')),
  blocked_reason TEXT,
  is_on_critical_path BOOLEAN DEFAULT false,
  downstream_count INTEGER DEFAULT 0,
  leverage_score INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'blocks'
    CHECK (dependency_type IN ('blocks', 'informs', 'enables')),
  UNIQUE(task_id, depends_on_task_id)
);

-- ============================================================
-- DECISIONS
-- ============================================================

CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES venture_streams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  context TEXT,
  options JSONB DEFAULT '[]',
  default_option TEXT,
  default_rationale TEXT,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'decided', 'defaulted', 'deferred')),
  decision_made TEXT,
  rationale TEXT,
  decided_at TIMESTAMPTZ,
  defer_count INTEGER DEFAULT 0,
  max_deferrals INTEGER DEFAULT 2,
  blocks_task_ids UUID[],
  -- Impact scoring (auto-calculated)
  impact_score INTEGER DEFAULT 0,
  streams_affected INTEGER DEFAULT 0,
  tasks_affected INTEGER DEFAULT 0,
  estimated_delay_days INTEGER DEFAULT 0,
  cascade_depth INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MILESTONES
-- ============================================================

CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  day_target INTEGER NOT NULL,
  phase TEXT NOT NULL,
  gate_criteria JSONB DEFAULT '[]',
  status TEXT DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'current', 'at_risk', 'achieved', 'missed')),
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- WAITING ON
-- ============================================================

CREATE TABLE waiting_on (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES venture_streams(id) ON DELETE SET NULL,
  person_or_vendor TEXT NOT NULL,
  description TEXT NOT NULL,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  due_date DATE,
  last_contacted DATE,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'received', 'overdue', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- WEEKLY REVIEWS
-- ============================================================

CREATE TABLE weekly_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  day_range TEXT,
  tasks_completed_count INTEGER DEFAULT 0,
  tasks_completed_ids UUID[],
  stuck_items JSONB DEFAULT '[]',
  decisions_made JSONB DEFAULT '[]',
  next_week_focus TEXT,
  notes TEXT,
  momentum_score_at_close INTEGER,
  dream_protection_at_close INTEGER,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(venture_id, week_number)
);

-- ============================================================
-- FOUNDER ATTENTION LAYER
-- ============================================================

CREATE TABLE founder_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES venture_streams(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL
    CHECK (activity_type IN (
      'task_completed', 'task_status_changed', 'decision_made',
      'decision_deferred', 'stream_viewed', 'review_completed',
      'idea_logged', 'waiting_on_updated'
    )),
  related_entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE daily_engagement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  had_activity BOOLEAN DEFAULT false,
  action_count INTEGER DEFAULT 0,
  streams_touched TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(venture_id, user_id, date)
);

CREATE TABLE momentum_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  overall_score INTEGER NOT NULL,
  stream_scores JSONB NOT NULL,
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining', 'critical')),
  dormant_streams TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(venture_id, week_number)
);

CREATE TABLE founder_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pattern_name TEXT NOT NULL,
  observation TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.0,
  first_detected_at TIMESTAMPTZ DEFAULT now(),
  last_shown_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'shown', 'dismissed', 'expired'))
);

-- ============================================================
-- FOUNDER LOG (ideas, lessons, observations)
-- ============================================================

CREATE TABLE founder_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL
    CHECK (entry_type IN ('decision', 'lesson', 'observation', 'idea', 'block')),
  title TEXT NOT NULL,
  content TEXT,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  stream_id UUID REFERENCES venture_streams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_ventures_owner ON ventures(owner_id);
CREATE INDEX idx_streams_venture ON venture_streams(venture_id);
CREATE INDEX idx_streams_status ON venture_streams(status);
CREATE INDEX idx_stream_deps_venture ON stream_dependencies(venture_id);
CREATE INDEX idx_tasks_venture ON tasks(venture_id);
CREATE INDEX idx_tasks_stream ON tasks(stream_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_phase ON tasks(phase);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_department ON tasks(department);
CREATE INDEX idx_tasks_critical_path ON tasks(is_on_critical_path) WHERE is_on_critical_path = true;
CREATE INDEX idx_decisions_venture ON decisions(venture_id);
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_impact ON decisions(impact_score DESC);
CREATE INDEX idx_milestones_venture ON milestones(venture_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_waiting_on_venture ON waiting_on(venture_id);
CREATE INDEX idx_waiting_on_status ON waiting_on(status);
CREATE INDEX idx_activity_log_venture ON founder_activity_log(venture_id);
CREATE INDEX idx_activity_log_stream ON founder_activity_log(stream_id);
CREATE INDEX idx_activity_log_date ON founder_activity_log(created_at);
CREATE INDEX idx_daily_engagement_date ON daily_engagement(date);
CREATE INDEX idx_momentum_snapshots_venture ON momentum_snapshots(venture_id);
CREATE INDEX idx_founder_patterns_status ON founder_patterns(status);
CREATE INDEX idx_founder_log_venture ON founder_log(venture_id);

-- ============================================================
-- ROW LEVEL SECURITY (enable when auth is connected)
-- ============================================================

ALTER TABLE ventures ENABLE ROW LEVEL SECURITY;
ALTER TABLE venture_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_on ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE momentum_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (user can only see their own ventures' data)
CREATE POLICY "Users can view own ventures" ON ventures
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users can view own venture streams" ON venture_streams
  FOR ALL USING (venture_id IN (SELECT id FROM ventures WHERE owner_id = auth.uid()));

CREATE POLICY "Users can view own tasks" ON tasks
  FOR ALL USING (venture_id IN (SELECT id FROM ventures WHERE owner_id = auth.uid()));

CREATE POLICY "Users can view own decisions" ON decisions
  FOR ALL USING (venture_id IN (SELECT id FROM ventures WHERE owner_id = auth.uid()));

CREATE POLICY "Users can view own milestones" ON milestones
  FOR ALL USING (venture_id IN (SELECT id FROM ventures WHERE owner_id = auth.uid()));

CREATE POLICY "Users can view own waiting_on" ON waiting_on
  FOR ALL USING (venture_id IN (SELECT id FROM ventures WHERE owner_id = auth.uid()));

CREATE POLICY "Users can view own reviews" ON weekly_reviews
  FOR ALL USING (venture_id IN (SELECT id FROM ventures WHERE owner_id = auth.uid()));

CREATE POLICY "Users can view own activity" ON founder_activity_log
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own engagement" ON daily_engagement
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own snapshots" ON momentum_snapshots
  FOR ALL USING (venture_id IN (SELECT id FROM ventures WHERE owner_id = auth.uid()));

CREATE POLICY "Users can view own patterns" ON founder_patterns
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own log" ON founder_log
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own stream deps" ON stream_dependencies
  FOR ALL USING (venture_id IN (SELECT id FROM ventures WHERE owner_id = auth.uid()));

CREATE POLICY "Users can view own task deps" ON task_dependencies
  FOR ALL USING (venture_id IN (SELECT id FROM ventures WHERE owner_id = auth.uid()));
