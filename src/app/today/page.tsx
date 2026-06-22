'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber, getWeekNumber, VENTURE_CONFIG } from '@/lib/venture-config';
import Link from 'next/link';
import { useState } from 'react';
import { AppNav } from '@/components/shared/nav';
import { KebabMenu } from '@/components/shared/kebab-menu';

function getConsequence(task: any) {
  if (task.department === 'LEGAL') return 'LLP, trademark, bank account all wait.';
  if (task.department === 'COMPLIANCE' && task.category === 'QP') return 'No QP → no licence → no launch.';
  if (task.department === 'COMPLIANCE') return 'Compliance chain stalls.';
  if (task.department === 'PRODUCT' && task.category === 'Formula') return 'Cannot produce or sell without locked formula.';
  if (task.department === 'PRODUCT') return 'Product development blocked.';
  if (task.department === 'PACKAGING') return 'Customer-facing work delayed.';
  if (task.department === 'SUPPLY CHAIN') return 'Production stops without ingredients.';
  if (task.notesDependencies) return task.notesDependencies.slice(0, 80);
  return 'Launch timeline extends.';
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

  const dayNumber = getDayNumber();
  const weekNumber = getWeekNumber();
  const daysToLaunch = VENTURE_CONFIG.launchTargetDays - dayNumber;

  // Sections
  const committed = state.tasks.filter((t: any) => t.status === 'committed_today');
  const waitingOn = state.tasks.filter((t: any) => t.status === 'waiting_on');
  const blocked = state.tasks.filter((t: any) => t.status === 'blocked');

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
    })
    .slice(0, 5);

  function handleDone(task: any) {
    markTaskDone(task.id);
    const stream = state.streams.find((s: any) => s.id === task.streamId);
    const streamName = stream?.name || task.department;
    const remaining = state.tasks.filter((t: any) => t.streamId === task.streamId && t.status !== 'done' && t.id !== task.id).length;
    let impact = `${streamName} advances.`;
    if (task.priority === 'CRITICAL') impact = `Critical path — ${streamName} moves.`;
    if (remaining <= 3 && remaining > 0) impact = `${streamName}: only ${remaining} left!`;
    setWins(prev => [...prev, `${task.title} — ${impact}`]);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pt-2">
        <p className="text-[var(--svaas-brown-light)] text-xs tracking-wide">Day {dayNumber} · Week {weekNumber} · {daysToLaunch}d to launch</p>
        <h1 className="text-2xl font-semibold text-[var(--svaas-brown-dark)] mt-1">Good morning, Vidhi.</h1>
      </div>

      {/* Quick Note */}
      <div className="flex gap-2">
        <input
          value={quickNote}
          onChange={e => setQuickNote(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleQuickNote()}
          placeholder="Add a note..."
          className="flex-1 px-4 py-2.5 bg-[var(--svaas-cream)] border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none focus:border-[var(--svaas-brown)]/40"
        />
        {quickNote.trim() && (
          <button onClick={handleQuickNote} className="px-3 py-2.5 bg-[var(--svaas-brown)] text-[var(--svaas-ivory)] text-sm rounded-xl">+</button>
        )}
      </div>

      {/* Wins */}
      {wins.length > 0 && (
        <div className="border border-[var(--svaas-olive)]/20 bg-[var(--svaas-olive-light)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-[var(--svaas-olive)] uppercase tracking-widest font-semibold">Done</p>
            {undoAvailable && (
              <button onClick={handleUndo} className="text-xs text-[var(--svaas-brown-light)] hover:text-[var(--svaas-brown)]">Undo</button>
            )}
          </div>
          {wins.map((w, i) => <p key={i} className="text-sm text-[var(--svaas-brown)]">{w}</p>)}
        </div>
      )}

      {/* OVERDUE FOLLOW-UPS */}
      {overdueWaiting.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] text-[var(--svaas-amber)] uppercase tracking-widest font-semibold">Follow Up ({overdueWaiting.length})</p>
          {overdueWaiting.map((t: any) => {
            const daysOver = getDaysOverdueWaiting(t);
            return (
              <div key={t.id} className="border border-[var(--svaas-amber)]/20 bg-[var(--svaas-amber-light)] rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--svaas-brown-dark)]">{t.title}</p>
                    <p className="text-xs text-[var(--svaas-amber)] mt-0.5">{t.waitingOnPerson} · {daysOver}d late</p>
                  </div>
                  <button onClick={() => handleDone(t)} className="px-3 py-1.5 bg-[var(--svaas-brown)] text-[var(--svaas-ivory)] text-xs rounded-xl shrink-0">Received</button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* TODAY'S COMMITMENT — Hero */}
      {committed.length > 0 && (
        <section>
          <p className="text-[10px] text-[var(--svaas-brown-light)] uppercase tracking-widest font-semibold mb-2">Your Commitment</p>
          {committed.slice(0, 1).map((t: any) => (
            <div key={t.id} className="border-2 border-[var(--svaas-brown)]/15 bg-[var(--svaas-cream)] rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <p className="text-xl font-semibold text-[var(--svaas-brown-dark)] leading-tight flex-1">{t.title}</p>
                <KebabMenu actions={getKebabActions(t)} />
              </div>
              <p className="text-xs text-[var(--svaas-brown-light)]">{t.department} · {t.owner}</p>
              <p className="text-sm text-[var(--svaas-clay)]">If ignored → {getConsequence(t)}</p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleDone(t)} className="px-4 py-2.5 bg-[var(--svaas-brown)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium">✓ Done</button>
                <button onClick={() => setShowWaitingForm(t.id)} className="px-4 py-2.5 border border-[var(--svaas-sand)] text-[var(--svaas-brown)] text-sm rounded-xl">Waiting On</button>
              </div>

              {/* Inline forms */}
              {showWaitingForm === t.id && (
                <div className="border border-[var(--svaas-sand)] rounded-xl p-3 space-y-2 bg-white">
                  <input value={waitPerson} onChange={e => setWaitPerson(e.target.value)} placeholder="Who?" className="w-full px-3 py-2 bg-[var(--svaas-cream)] border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none" />
                  <input type="date" value={waitDate} onChange={e => setWaitDate(e.target.value)} className="w-full px-3 py-2 bg-[var(--svaas-cream)] border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] focus:outline-none" />
                  <input value={waitNotes} onChange={e => setWaitNotes(e.target.value)} placeholder="Notes (optional)" className="w-full px-3 py-2 bg-[var(--svaas-cream)] border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => handleWaitingOn(t.id)} disabled={!waitPerson.trim()} className="px-3 py-2 bg-[var(--svaas-brown)] text-[var(--svaas-ivory)] text-xs rounded-xl disabled:opacity-30">Save</button>
                    <button onClick={() => setShowWaitingForm(null)} className="px-3 py-2 text-[var(--svaas-brown-light)] text-xs">Cancel</button>
                  </div>
                </div>
              )}
              {showBlockForm === t.id && (
                <div className="border border-[var(--svaas-sand)] rounded-xl p-3 space-y-2 bg-white">
                  <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="What is blocking this?" className="w-full px-3 py-2 bg-[var(--svaas-cream)] border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none" onKeyDown={e => e.key === 'Enter' && handleBlock(t.id)} autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => handleBlock(t.id)} disabled={!blockReason.trim()} className="px-3 py-2 bg-[var(--svaas-clay)] text-white text-xs rounded-xl disabled:opacity-30">Block</button>
                    <button onClick={() => { setShowBlockForm(null); setBlockReason(''); }} className="px-3 py-2 text-[var(--svaas-brown-light)] text-xs">Cancel</button>
                  </div>
                </div>
              )}
              {showDeferForm === t.id && (
                <div className="border border-[var(--svaas-sand)] rounded-xl p-3 space-y-2 bg-white">
                  <input value={deferReason} onChange={e => setDeferReason(e.target.value)} placeholder="Why defer?" className="w-full px-3 py-2 bg-[var(--svaas-cream)] border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none" />
                  <input type="date" value={deferDate} onChange={e => setDeferDate(e.target.value)} className="w-full px-3 py-2 bg-[var(--svaas-cream)] border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] focus:outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => handleDefer(t.id)} disabled={!deferReason.trim()} className="px-3 py-2 bg-[var(--svaas-brown)] text-[var(--svaas-ivory)] text-xs rounded-xl disabled:opacity-30">Defer</button>
                    <button onClick={() => setShowDeferForm(null)} className="px-3 py-2 text-[var(--svaas-brown-light)] text-xs">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* DO NEXT */}
      <section className="space-y-2">
        <p className="text-[10px] text-[var(--svaas-brown-light)] uppercase tracking-widest font-semibold">Do Next</p>
        {actionable.map((task: any) => (
          <div key={task.id} className="border border-[var(--svaas-sand)] bg-[var(--svaas-cream)] rounded-2xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--svaas-brown-dark)]">{task.title}</p>
                <p className="text-xs text-[var(--svaas-brown-light)] mt-0.5">{task.priority} · {task.department}</p>
                {task.source === 'founder' && <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 bg-[var(--svaas-amber-light)] text-[var(--svaas-amber)] rounded-md font-medium">You created</span>}
              </div>
              <KebabMenu actions={getKebabActions(task)} />
            </div>
            <p className="text-xs text-[var(--svaas-clay)]">If ignored → {getConsequence(task)}</p>
            <div className="flex gap-2">
              <button onClick={() => commitTask(task.id)} className="px-3 py-2 bg-[var(--svaas-brown)] text-[var(--svaas-ivory)] text-xs rounded-xl font-medium">Commit</button>
              <button onClick={() => handleDone(task)} className="px-3 py-2 border border-[var(--svaas-sand)] text-[var(--svaas-brown)] text-xs rounded-xl">Done</button>
            </div>

            {/* Inline forms for this task */}
            {showWaitingForm === task.id && (
              <div className="border border-[var(--svaas-sand)] rounded-xl p-3 space-y-2 bg-white">
                <input value={waitPerson} onChange={e => setWaitPerson(e.target.value)} placeholder="Who?" className="w-full px-3 py-2 bg-[var(--svaas-cream)] border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none" />
                <input type="date" value={waitDate} onChange={e => setWaitDate(e.target.value)} className="w-full px-3 py-2 bg-[var(--svaas-cream)] border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => handleWaitingOn(task.id)} disabled={!waitPerson.trim()} className="px-3 py-2 bg-[var(--svaas-brown)] text-[var(--svaas-ivory)] text-xs rounded-xl disabled:opacity-30">Save</button>
                  <button onClick={() => setShowWaitingForm(null)} className="px-3 py-2 text-[var(--svaas-brown-light)] text-xs">Cancel</button>
                </div>
              </div>
            )}
            {showBlockForm === task.id && (
              <div className="border border-[var(--svaas-sand)] rounded-xl p-3 space-y-2 bg-white">
                <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="What is blocking this?" className="w-full px-3 py-2 bg-[var(--svaas-cream)] border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none" onKeyDown={e => e.key === 'Enter' && handleBlock(task.id)} autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => handleBlock(task.id)} disabled={!blockReason.trim()} className="px-3 py-2 bg-[var(--svaas-clay)] text-white text-xs rounded-xl disabled:opacity-30">Block</button>
                  <button onClick={() => { setShowBlockForm(null); setBlockReason(''); }} className="px-3 py-2 text-[var(--svaas-brown-light)] text-xs">Cancel</button>
                </div>
              </div>
            )}
            {showDeferForm === task.id && (
              <div className="border border-[var(--svaas-sand)] rounded-xl p-3 space-y-2 bg-white">
                <input value={deferReason} onChange={e => setDeferReason(e.target.value)} placeholder="Why defer?" className="w-full px-3 py-2 bg-[var(--svaas-cream)] border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none" />
                <input type="date" value={deferDate} onChange={e => setDeferDate(e.target.value)} className="w-full px-3 py-2 bg-[var(--svaas-cream)] border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => handleDefer(task.id)} disabled={!deferReason.trim()} className="px-3 py-2 bg-[var(--svaas-brown)] text-[var(--svaas-ivory)] text-xs rounded-xl disabled:opacity-30">Defer</button>
                  <button onClick={() => setShowDeferForm(null)} className="px-3 py-2 text-[var(--svaas-brown-light)] text-xs">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* ADD TASK */}
      <section>
        {showAddTask ? (
          <div className="border border-[var(--svaas-sand)] bg-[var(--svaas-cream)] rounded-2xl p-4 space-y-2">
            <input
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTask()}
              placeholder="What needs to happen?"
              className="w-full px-3 py-2.5 bg-white border border-[var(--svaas-sand)] rounded-xl text-sm text-[var(--svaas-brown-dark)] placeholder-[var(--svaas-brown-light)] focus:outline-none focus:border-[var(--svaas-brown)]/40"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleAddTask} disabled={!newTaskTitle.trim()} className="px-4 py-2 bg-[var(--svaas-brown)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium disabled:opacity-30">Add</button>
              <button onClick={() => { setShowAddTask(false); setNewTaskTitle(''); }} className="px-4 py-2 text-[var(--svaas-brown-light)] text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTask(true)}
            className="w-full py-3 border border-dashed border-[var(--svaas-sand)] rounded-2xl text-sm text-[var(--svaas-brown-light)] hover:border-[var(--svaas-brown)]/30 hover:text-[var(--svaas-brown)] transition-colors"
          >
            + Add task
          </button>
        )}
      </section>

      <AppNav />
    </div>
  );
}
