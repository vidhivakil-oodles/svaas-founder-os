'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber, getWeekNumber, VENTURE_CONFIG } from '@/lib/venture-config';
import Link from 'next/link';
import { useState } from 'react';
import { AppNav } from '@/components/shared/nav';

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
  const diff = Math.floor((today.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export default function TodayPage() {
  const { state, markTaskDone, startTask, commitTask, waitingOnTask, blockTask, deferTask, cancelTask, undoLastDone } = useAppState();
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

  const dayNumber = getDayNumber();
  const weekNumber = getWeekNumber();
  const daysToLaunch = VENTURE_CONFIG.launchTargetDays - dayNumber;

  // Sections
  const committed = state.tasks.filter((t: any) => t.status === 'committed_today');
  const waitingOn = state.tasks.filter((t: any) => t.status === 'waiting_on');
  const blocked = state.tasks.filter((t: any) => t.status === 'blocked');
  const overdue = state.tasks.filter((t: any) => t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd);

  // Split waiting-on into overdue follow-ups vs. on-time
  const overdueWaiting = waitingOn
    .filter((t: any) => t.waitingOnDate && getDaysOverdueWaiting(t) > 0)
    .sort((a: any, b: any) => getDaysOverdueWaiting(b) - getDaysOverdueWaiting(a));
  const onTimeWaiting = waitingOn.filter((t: any) => !t.waitingOnDate || getDaysOverdueWaiting(t) === 0);

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
    // Show impact in wins log
    const stream = state.streams.find((s: any) => s.id === task.streamId);
    const streamName = stream?.name || task.department;
    const remaining = state.tasks.filter((t: any) => t.streamId === task.streamId && t.status !== 'done' && t.id !== task.id).length;
    let impact = `${streamName} advances.`;
    if (task.priority === 'CRITICAL') impact = `Critical path unblocked — ${streamName} moves forward.`;
    if (remaining <= 3 && remaining > 0) impact = `${streamName}: only ${remaining} tasks remain!`;
    setWins(prev => [...prev, `✓ ${task.title} — ${impact}`]);
    // Enable undo for 3 seconds
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
    if (!waitPerson) return;
    waitingOnTask(taskId, waitPerson, waitDate, waitNotes);
    setShowWaitingForm(null);
    setWaitPerson(''); setWaitDate(''); setWaitNotes('');
  }

  function handleDefer(taskId: string) {
    if (!deferReason) return;
    // Default defer date to +7 days if not set
    const resolvedDate = deferDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    deferTask(taskId, deferReason, resolvedDate);
    setShowDeferForm(null);
    setDeferReason(''); setDeferDate('');
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="pt-2">
        <p className="text-zinc-500 text-sm">Day {dayNumber} &bull; Week {weekNumber} &bull; {daysToLaunch}d to launch</p>
        <h1 className="text-3xl font-bold text-zinc-100 mt-1">Good morning, Vidhi.</h1>
      </div>

      {/* Wins */}
      {wins.length > 0 && (
        <div className="border border-emerald-900/40 bg-emerald-950/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-emerald-400 uppercase tracking-wide font-medium">Wins Today</p>
            {undoAvailable && (
              <button onClick={handleUndo} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 rounded">Undo</button>
            )}
          </div>
          {wins.map((w, i) => <p key={i} className="text-sm text-emerald-300">{w}</p>)}
        </div>
      )}

      {/* OVERDUE FOLLOW-UPS — Chief of Staff alert */}
      {overdueWaiting.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wide flex items-center gap-2">
            <span>⚠</span> Follow Up Required ({overdueWaiting.length})
          </h2>
          {overdueWaiting.map((t: any) => {
            const daysOver = getDaysOverdueWaiting(t);
            return (
              <div key={t.id} className="border border-amber-900/50 bg-amber-950/15 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-zinc-100 font-medium">{t.title}</p>
                    <p className="text-xs text-amber-400 mt-0.5 font-medium">
                      {t.waitingOnPerson} is {daysOver} day{daysOver > 1 ? 's' : ''} late
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Expected: {t.waitingOnDate}{t.waitingOnNotes ? ` • ${t.waitingOnNotes}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => handleDone(t)} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg">Received</button>
                    <button onClick={() => blockTask(t.id, `No response from ${t.waitingOnPerson}`)} className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/50 text-red-300 text-xs rounded-lg">Escalate</button>
                  </div>
                </div>
                <p className="text-xs text-amber-400/60 mt-2">
                  Action: Follow up with {t.waitingOnPerson} today. {daysOver > 3 ? 'Consider alternative path.' : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* TODAY'S SINGLE COMMITMENT — Hero Card */}
      {committed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-emerald-400 uppercase tracking-wide">Today&apos;s Commitment</h2>
          {committed.slice(0, 1).map((t: any) => (
            <div key={t.id} className="border-2 border-emerald-600/60 bg-emerald-950/20 rounded-xl p-5 space-y-3">
              <div>
                <p className="text-xl text-zinc-50 font-semibold">{t.title}</p>
                <p className="text-xs text-zinc-500 mt-1">{t.department} &bull; {t.owner}</p>
                <p className="text-xs text-red-400/70 mt-2">If ignored → {getConsequence(t)}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => handleDone(t)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium">✓ Done</button>
                <button onClick={() => startTask(t.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg">Start</button>
                <button onClick={() => setShowWaitingForm(t.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-blue-400 text-xs rounded-lg">Waiting On</button>
                <button onClick={() => setShowDeferForm(t.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 text-xs rounded-lg">Defer</button>
                <button onClick={() => setShowBlockForm(t.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-red-400 text-xs rounded-lg">Blocked</button>
                <button onClick={() => cancelTask(t.id)} className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-600 text-xs rounded-lg">Cancel</button>
              </div>
              {/* Block form */}
              {showBlockForm === t.id && (
                <div className="border border-red-900/40 rounded-lg p-3 space-y-2">
                  <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="What is blocking this?" className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" onKeyDown={e => e.key === 'Enter' && handleBlock(t.id)} autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => handleBlock(t.id)} disabled={!blockReason.trim()} className="px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-30 text-white text-xs rounded-lg">Block</button>
                    <button onClick={() => { setShowBlockForm(null); setBlockReason(''); }} className="px-3 py-1.5 text-zinc-500 text-xs">Cancel</button>
                  </div>
                </div>
              )}
              {/* Waiting On form */}
              {showWaitingForm === t.id && (
                <div className="border border-blue-900/40 rounded-lg p-3 space-y-2">
                  <input value={waitPerson} onChange={e => setWaitPerson(e.target.value)} placeholder="Who? (person/vendor)" className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Expected follow-up date</label>
                    <input type="date" value={waitDate} onChange={e => setWaitDate(e.target.value)} className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
                  </div>
                  <input value={waitNotes} onChange={e => setWaitNotes(e.target.value)} placeholder="Notes (optional)" className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
                  <div className="flex gap-2">
                    <button onClick={() => handleWaitingOn(t.id)} disabled={!waitPerson.trim()} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs rounded-lg">Save</button>
                    <button onClick={() => setShowWaitingForm(null)} className="px-3 py-1.5 text-zinc-500 text-xs">Cancel</button>
                  </div>
                </div>
              )}
              {/* Defer form */}
              {showDeferForm === t.id && (
                <div className="border border-zinc-700 rounded-lg p-3 space-y-2">
                  <input value={deferReason} onChange={e => setDeferReason(e.target.value)} placeholder="Why defer?" className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Review date (when to resurface)</label>
                    <input type="date" value={deferDate} onChange={e => setDeferDate(e.target.value)} className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDefer(t.id)} className="px-3 py-1.5 bg-zinc-700 text-white text-xs rounded-lg">Defer</button>
                    <button onClick={() => setShowDeferForm(null)} className="px-3 py-1.5 text-zinc-500 text-xs">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Waiting On Others (on-time) */}
      {onTimeWaiting.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-blue-400 uppercase tracking-wide">Waiting On Others ({onTimeWaiting.length})</h2>
          {onTimeWaiting.map((t: any) => (
            <div key={t.id} className="border border-blue-900/40 bg-blue-950/10 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-zinc-100 font-medium">{t.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Waiting on: {t.waitingOnPerson || 'Unknown'}
                    {t.waitingOnDate ? ` • Expected: ${t.waitingOnDate}` : ' • No date set'}
                  </p>
                  {t.waitingOnNotes && <p className="text-xs text-zinc-600 mt-0.5">{t.waitingOnNotes}</p>}
                </div>
                <button onClick={() => handleDone(t)} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg shrink-0">Received</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Blocked */}
      {blocked.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-red-400 uppercase tracking-wide">Blocked ({blocked.length})</h2>
          {blocked.slice(0, 3).map((t: any) => (
            <div key={t.id} className="border border-red-900/40 bg-red-950/10 rounded-xl p-3">
              <p className="text-zinc-200 text-sm font-medium">{t.title}</p>
              <p className="text-xs text-red-400">{t.blockedReason}</p>
            </div>
          ))}
          {blocked.length > 3 && (
            <Link href="/warroom" className="text-xs text-red-400 hover:text-red-300">+{blocked.length - 3} more in War Room →</Link>
          )}
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-red-400 uppercase tracking-wide">Overdue ({overdue.length})</h2>
          {overdue.slice(0, 3).map((t: any) => (
            <div key={t.id} className="border border-red-900/40 bg-red-950/10 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-zinc-200 text-sm font-medium">{t.title}</p>
                <p className="text-xs text-zinc-500">{dayNumber - (t.dayRangeEnd || 0)}d overdue</p>
              </div>
              <button onClick={() => handleDone(t)} className="px-3 py-1.5 bg-emerald-700 text-white text-xs rounded-lg">Done</button>
            </div>
          ))}
        </div>
      )}

      {/* Top Actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">Do Next</h2>
        {actionable.map((task: any) => (
          <div key={task.id} className="border border-zinc-800 rounded-xl p-4 space-y-3 bg-zinc-900/20">
            <div>
              <h3 className="font-medium text-zinc-100">{task.title}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{task.department} &bull; {task.owner}</p>
              <p className="text-xs text-red-400/70 mt-1">If ignored → {getConsequence(task)}</p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleDone(task)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-medium">✓ Done</button>
              <button onClick={() => commitTask(task.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg">Commit Today</button>
              <button onClick={() => startTask(task.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg">Start</button>
              <button onClick={() => setShowWaitingForm(task.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-blue-400 text-xs rounded-lg">Waiting On</button>
              <button onClick={() => setShowBlockForm(task.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-red-400 text-xs rounded-lg">Blocked</button>
              <button onClick={() => setShowDeferForm(task.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 text-xs rounded-lg">Defer</button>
              <button onClick={() => cancelTask(task.id)} className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-600 text-xs rounded-lg">Cancel</button>
            </div>

            {/* Block form */}
            {showBlockForm === task.id && (
              <div className="border border-red-900/40 rounded-lg p-3 space-y-2">
                <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="What is blocking this?" className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" onKeyDown={e => e.key === 'Enter' && handleBlock(task.id)} autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => handleBlock(task.id)} disabled={!blockReason.trim()} className="px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-30 text-white text-xs rounded-lg">Block</button>
                  <button onClick={() => { setShowBlockForm(null); setBlockReason(''); }} className="px-3 py-1.5 text-zinc-500 text-xs">Cancel</button>
                </div>
              </div>
            )}

            {/* Waiting On form */}
            {showWaitingForm === task.id && (
              <div className="border border-blue-900/40 rounded-lg p-3 space-y-2">
                <input value={waitPerson} onChange={e => setWaitPerson(e.target.value)} placeholder="Who? (person/vendor)" className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500">Expected follow-up date</label>
                  <input type="date" value={waitDate} onChange={e => setWaitDate(e.target.value)} className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
                </div>
                <input value={waitNotes} onChange={e => setWaitNotes(e.target.value)} placeholder="Notes (optional)" className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
                <div className="flex gap-2">
                  <button onClick={() => handleWaitingOn(task.id)} disabled={!waitPerson.trim()} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs rounded-lg">Save</button>
                  <button onClick={() => setShowWaitingForm(null)} className="px-3 py-1.5 text-zinc-500 text-xs">Cancel</button>
                </div>
              </div>
            )}

            {/* Defer form */}
            {showDeferForm === task.id && (
              <div className="border border-zinc-700 rounded-lg p-3 space-y-2">
                <input value={deferReason} onChange={e => setDeferReason(e.target.value)} placeholder="Why defer?" className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500">Review date (when to resurface)</label>
                  <input type="date" value={deferDate} onChange={e => setDeferDate(e.target.value)} className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDefer(task.id)} className="px-3 py-1.5 bg-zinc-700 text-white text-xs rounded-lg">Defer</button>
                  <button onClick={() => setShowDeferForm(null)} className="px-3 py-1.5 text-zinc-500 text-xs">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Nav */}
      <AppNav />
    </div>
  );
}
