'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber, getWeekNumber, VENTURE_CONFIG } from '@/lib/venture-config';
import Link from 'next/link';
import { useState } from 'react';
import { AppNav } from '@/components/shared/nav';
import { KebabMenu } from '@/components/shared/kebab-menu';

function getConsequence(task: any) {
  if (task.department === 'LEGAL') return 'LLP, trademark, bank account all wait.';
  if (task.department === 'COMPLIANCE' && task.category === 'QP') return 'No QP, no licence, no launch.';
  if (task.department === 'COMPLIANCE') return 'Compliance chain stalls.';
  if (task.department === 'PRODUCT' && task.category === 'Formula') return 'Cannot produce or sell without locked formula.';
  if (task.department === 'PRODUCT') return 'Product development blocked.';
  if (task.department === 'PACKAGING') return 'Customer-facing work delayed.';
  if (task.department === 'SUPPLY CHAIN') return 'Production stops without ingredients.';
  if (task.notesDependencies) return task.notesDependencies.slice(0, 80);
  return 'Launch timeline extends.';
}

function getWhy(task: any) {
  if (task.priority === 'CRITICAL') return 'Critical path item. Everything downstream waits.';
  if (task.department === 'LEGAL') return 'Legal foundation enables all other streams.';
  if (task.department === 'COMPLIANCE') return 'Required for licence and launch.';
  if (task.notesDependencies) return task.notesDependencies.slice(0, 80);
  return 'Moves your venture forward.';
}

function getDaysOverdueWaiting(task: any): number {
  if (!task.waitingOnDate) return 0;
  const expected = new Date(task.waitingOnDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expected.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function TodayPage() {
  const { state, markTaskDone, startTask, commitTask, waitingOnTask, blockTask, deferTask, cancelTask, undoLastDone, addManualNote, addFounderTask } = useAppState();
  const [wins, setWins] = useState<string[]>([]);
  const [showWaitingForm, setShowWaitingForm] = useState<string | null>(null);
  const [showDeferForm, setShowDeferForm] = useState<string | null>(null);
  const [showBlockForm, setShowBlockForm] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [waitPerson, setWaitPerson] = useState('');
  const [waitDate, setWaitDate] = useState('');
  const [waitNotes, setWaitNotes] = useState('');
  const [deferReason, setDeferReason] = useState('');
  const [deferDate, setDeferDate] = useState('');
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEverythingElse, setShowEverythingElse] = useState(false);

  const dayNumber = getDayNumber();
  const weekNumber = getWeekNumber();
  const daysToLaunch = VENTURE_CONFIG.launchTargetDays - dayNumber;

  // Sections
  const committed = state.tasks.filter((t: any) => t.status === 'committed_today');
  const waitingOn = state.tasks.filter((t: any) => t.status === 'waiting_on');

  const overdueWaiting = waitingOn
    .filter((t: any) => t.waitingOnDate && getDaysOverdueWaiting(t) > 0)
    .sort((a: any, b: any) => getDaysOverdueWaiting(b) - getDaysOverdueWaiting(a));

  const actionable = state.tasks
    .filter((t: any) => t.status === 'not_started' && !t.blockedReason)
    .sort((a: any, b: any) => {
      const pri: any = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const pDiff = (pri[b.priority] || 0) - (pri[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999);
    });

  // Focus Now: committed + up to 3 total (prioritized)
  const focusNow = [...committed, ...actionable.slice(0, Math.max(0, 3 - committed.length))];
  // Up Next: next 4 after focus
  const upNext = actionable.slice(Math.max(0, 3 - committed.length), Math.max(0, 3 - committed.length) + 4);
  // Everything Else: the rest
  const everythingElse = actionable.slice(Math.max(0, 3 - committed.length) + 4);

  function handleDone(task: any) {
    markTaskDone(task.id);
    const stream = state.streams.find((s: any) => s.id === task.streamId);
    const streamName = stream?.name || task.department;
    const remaining = state.tasks.filter((t: any) => t.streamId === task.streamId && t.status !== 'done' && t.id !== task.id).length;
    let impact = `${streamName} advances.`;
    if (task.priority === 'CRITICAL') impact = `Critical path - ${streamName} moves.`;
    if (remaining <= 3 && remaining > 0) impact = `${streamName}: only ${remaining} left!`;
    setWins(prev => [...prev, `${task.title} - ${impact}`]);
    setUndoAvailable(true);
    setTimeout(() => setUndoAvailable(false), 3000);
  }

  function handleUndo() {
    undoLastDone();
    setWins(prev => prev.slice(0, -1));
    setUndoAvailable(false);
  }

  function handleBlock(taskId: string) {
    if (!blockReason.trim()) return;
    blockTask(taskId, blockReason.trim());
    setShowBlockForm(null);
    setBlockReason('');
  }

  function handleWaitingOn(taskId: string) {
    if (!waitPerson.trim()) return;
    waitingOnTask(taskId, waitPerson, waitDate, waitNotes);
    setShowWaitingForm(null);
    setWaitPerson(''); setWaitDate(''); setWaitNotes('');
  }

  function handleDefer(taskId: string) {
    if (!deferReason) return;
    const resolvedDate = deferDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    deferTask(taskId, deferReason, resolvedDate);
    setShowDeferForm(null);
    setDeferReason(''); setDeferDate('');
  }

  function handleQuickNote() {
    if (!quickNote.trim()) return;
    addManualNote(quickNote.trim());
    setQuickNote('');
  }

  function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    addFounderTask(newTaskTitle.trim());
    setNewTaskTitle('');
    setShowAddTask(false);
  }

  function getKebabActions(task: any) {
    const actions = [];
    if (task.status === 'not_started') {
      actions.push({ label: 'Start', onClick: () => startTask(task.id) });
    }
    actions.push({ label: 'Waiting On...', onClick: () => setShowWaitingForm(task.id) });
    actions.push({ label: 'Defer...', onClick: () => setShowDeferForm(task.id) });
    actions.push({ label: 'Blocked...', onClick: () => setShowBlockForm(task.id) });
    actions.push({ label: 'Cancel', onClick: () => cancelTask(task.id), destructive: true });
    return actions;
  }

  function renderInlineForms(taskId: string) {
    return (
      <>
        {showWaitingForm === taskId && (
          <div className="border-t border-[var(--svaas-sand)]/30 pt-3 mt-3 space-y-2">
            <input value={waitPerson} onChange={e => setWaitPerson(e.target.value)} placeholder="Who?" className="w-full px-3 py-2 bg-white border border-[var(--svaas-sand)]/40 rounded-lg text-[13px] text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none" />
            <input type="date" value={waitDate} onChange={e => setWaitDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-[var(--svaas-sand)]/40 rounded-lg text-[13px] text-[var(--svaas-brown-dark)] focus:outline-none" />
            <input value={waitNotes} onChange={e => setWaitNotes(e.target.value)} placeholder="Notes (optional)" className="w-full px-3 py-2 bg-white border border-[var(--svaas-sand)]/40 rounded-lg text-[13px] text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none" />
            <div className="flex gap-2">
              <button onClick={() => handleWaitingOn(taskId)} disabled={!waitPerson.trim()} className="px-3 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg disabled:opacity-30">Save</button>
              <button onClick={() => setShowWaitingForm(null)} className="px-3 py-2 text-[var(--svaas-brown-light)] text-[13px]">Cancel</button>
            </div>
          </div>
        )}
        {showBlockForm === taskId && (
          <div className="border-t border-[var(--svaas-sand)]/30 pt-3 mt-3 space-y-2">
            <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="What is blocking this?" className="w-full px-3 py-2 bg-white border border-[var(--svaas-sand)]/40 rounded-lg text-[13px] text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none" onKeyDown={e => e.key === 'Enter' && handleBlock(taskId)} autoFocus />
            <div className="flex gap-2">
              <button onClick={() => handleBlock(taskId)} disabled={!blockReason.trim()} className="px-3 py-2 bg-[var(--svaas-clay)] text-white text-[13px] rounded-lg disabled:opacity-30">Block</button>
              <button onClick={() => { setShowBlockForm(null); setBlockReason(''); }} className="px-3 py-2 text-[var(--svaas-brown-light)] text-[13px]">Cancel</button>
            </div>
          </div>
        )}
        {showDeferForm === taskId && (
          <div className="border-t border-[var(--svaas-sand)]/30 pt-3 mt-3 space-y-2">
            <input value={deferReason} onChange={e => setDeferReason(e.target.value)} placeholder="Why defer?" className="w-full px-3 py-2 bg-white border border-[var(--svaas-sand)]/40 rounded-lg text-[13px] text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none" />
            <input type="date" value={deferDate} onChange={e => setDeferDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-[var(--svaas-sand)]/40 rounded-lg text-[13px] text-[var(--svaas-brown-dark)] focus:outline-none" />
            <div className="flex gap-2">
              <button onClick={() => handleDefer(taskId)} disabled={!deferReason.trim()} className="px-3 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg disabled:opacity-30">Defer</button>
              <button onClick={() => setShowDeferForm(null)} className="px-3 py-2 text-[var(--svaas-brown-light)] text-[13px]">Cancel</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-0">
      {/* Header - editorial masthead */}
      <header className="pt-3 pb-6 flex items-baseline justify-between border-b border-[var(--svaas-sand)]/30">
        <div>
          <p className="text-[13px] text-[var(--svaas-brown-light)] tracking-wide">Day {dayNumber} · Week {weekNumber}</p>
          <h1 className="text-[24px] font-medium text-[var(--svaas-brown-dark)] mt-1 font-[family-name:var(--font-serif)]">Good morning, Vidhi.</h1>
          <p className="text-[12px] text-[var(--svaas-brown-light)] mt-0.5">Drishti briefing · {daysToLaunch}d to launch</p>
        </div>
      </header>

      {/* Quick Note - minimal inline */}
      <div className="py-4 border-b border-[var(--svaas-sand)]/20">
        <div className="flex gap-2">
          <input
            value={quickNote}
            onChange={e => setQuickNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickNote()}
            placeholder="Add a note..."
            className="flex-1 px-4 py-2.5 bg-transparent border border-[var(--svaas-sand)]/40 rounded-lg text-[14px] text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none focus:border-[var(--svaas-brown)]/40"
          />
          {quickNote.trim() && (
            <button onClick={handleQuickNote} className="px-4 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium">Add</button>
          )}
        </div>
      </div>

      {/* Wins - editorial inline */}
      {wins.length > 0 && (
        <div className="py-4 border-b border-[var(--svaas-sand)]/20">
          <div className="flex items-start gap-3">
            <div className="w-0.5 self-stretch bg-[var(--svaas-olive)] shrink-0 rounded-full" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase">Done</p>
                {undoAvailable && (
                  <button onClick={handleUndo} className="text-[12px] text-[var(--svaas-brown-light)] hover:text-[var(--svaas-brown)]">Undo</button>
                )}
              </div>
              {wins.map((w, i) => <p key={i} className="text-[14px] text-[var(--svaas-brown)]">{w}</p>)}
            </div>
          </div>
        </div>
      )}

      {/* OVERDUE FOLLOW-UPS - thin ruled list */}
      {overdueWaiting.length > 0 && (
        <section className="pt-6 pb-2">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-clay)] uppercase mb-3">Follow up ({overdueWaiting.length})</p>
          <div className="divide-y divide-[var(--svaas-sand)]/20">
            {overdueWaiting.map((t: any) => {
              const daysOver = getDaysOverdueWaiting(t);
              return (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[14px] font-medium text-[var(--svaas-brown-dark)]">{t.title}</span>
                    <span className="text-[12px] text-[var(--svaas-clay)] ml-2">{t.waitingOnPerson} · {daysOver}d late</span>
                  </div>
                  <button onClick={() => handleDone(t)} className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium shrink-0">Received</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* FOCUS NOW - Large treatment, max 3. Editorial blocks, not cards. */}
      {focusNow.length > 0 && (
        <section className="pt-8">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-brown-dark)] uppercase mb-5">Focus now</p>
          <div className="space-y-0 divide-y divide-[var(--svaas-sand)]/30">
            {focusNow.map((task: any) => {
              const isCommitted = task.status === 'committed_today';
              return (
                <div key={task.id} className="py-6 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {isCommitted && <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase mb-1.5">Committed</p>}
                      <h3 className="text-[18px] font-medium text-[var(--svaas-brown-dark)] leading-snug font-[family-name:var(--font-serif)]">{task.title}</h3>
                      <div className="mt-2 space-y-0.5 text-[13px]">
                        <p className="text-[var(--svaas-brown)]"><span className="text-[var(--svaas-brown-light)]">Why:</span> {getWhy(task)}</p>
                        <p className="text-[var(--svaas-clay)]"><span className="text-[var(--svaas-brown-light)]">If ignored:</span> {getConsequence(task)}</p>
                      </div>
                    </div>
                    <KebabMenu actions={getKebabActions(task)} />
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    {isCommitted ? (
                      <button onClick={() => handleDone(task)} className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium">Done</button>
                    ) : (
                      <>
                        <button onClick={() => commitTask(task.id)} className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium">Commit</button>
                        <button onClick={() => handleDone(task)} className="text-[13px] text-[var(--svaas-brown-light)]">Done</button>
                      </>
                    )}
                  </div>

                  {renderInlineForms(task.id)}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* UP NEXT - Compact rows, minimal. No cards. */}
      {upNext.length > 0 && (
        <section className="pt-8">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-brown-light)] uppercase mb-3">Up next</p>
          <div className="divide-y divide-[var(--svaas-sand)]/20">
            {upNext.map((task: any) => (
              <div key={task.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[var(--svaas-brown-dark)] truncate">{task.title}</p>
                    <p className="text-[12px] text-[var(--svaas-brown-light)] mt-0.5">{task.priority} · {task.department}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => commitTask(task.id)} className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[12px] rounded-lg font-medium">Commit</button>
                    <KebabMenu actions={getKebabActions(task)} />
                  </div>
                </div>
                {renderInlineForms(task.id)}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* EVERYTHING ELSE - Collapsed by default */}
      {everythingElse.length > 0 && (
        <section className="pt-6">
          {!showEverythingElse ? (
            <button
              onClick={() => setShowEverythingElse(true)}
              className="text-[13px] text-[var(--svaas-brown-light)] hover:text-[var(--svaas-brown)] transition-colors"
            >
              View all ({everythingElse.length} more tasks)
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--svaas-brown-light)] uppercase">Everything else</p>
                <button onClick={() => setShowEverythingElse(false)} className="text-[13px] text-[var(--svaas-brown-light)]">Collapse</button>
              </div>
              <div className="divide-y divide-[var(--svaas-sand)]/20">
                {everythingElse.map((task: any) => (
                  <div key={task.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-[var(--svaas-brown-dark)] truncate">{task.title}</p>
                      <p className="text-[11px] text-[var(--svaas-brown-light)] mt-0.5">{task.department}</p>
                    </div>
                    <button onClick={() => commitTask(task.id)} className="px-3 py-1.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[12px] rounded-lg shrink-0">Commit</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ADD TASK - minimal */}
      <section className="pt-6 pb-2">
        {showAddTask ? (
          <div className="border-t border-[var(--svaas-sand)]/30 pt-4 space-y-3">
            <input
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTask()}
              placeholder="What needs to happen?"
              className="w-full px-4 py-2.5 bg-white border border-[var(--svaas-sand)]/40 rounded-lg text-[14px] text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none focus:border-[var(--svaas-brown)]/40"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleAddTask} disabled={!newTaskTitle.trim()} className="px-5 py-2.5 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium disabled:opacity-30">Add</button>
              <button onClick={() => { setShowAddTask(false); setNewTaskTitle(''); }} className="text-[13px] text-[var(--svaas-brown-light)]">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTask(true)}
            className="text-[13px] text-[var(--svaas-brown-light)] hover:text-[var(--svaas-brown)] transition-colors"
          >
            + Add task
          </button>
        )}
      </section>

      <AppNav />
    </div>
  );
}
