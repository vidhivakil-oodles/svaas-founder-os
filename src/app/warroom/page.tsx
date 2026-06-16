'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber } from '@/lib/venture-config';
import Link from 'next/link';
import { AppNav, BackToHome } from '@/components/shared/nav';

export default function WarRoomPage() {
  const { state, markTaskDone, acceptDecisionDefault } = useAppState();
  const dayNumber = getDayNumber();

  const overdueTasks = state.tasks
    .filter((t: any) => t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd)
    .sort((a: any, b: any) => (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999));

  const blockedTasks = state.tasks.filter((t: any) => t.status === 'blocked');

  const criticalDecisions = state.decisions.filter((d: any) => d.status === 'pending' && d.deadline && new Date(d.deadline) < new Date());

  // Overdue waiting-on items
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueWaiting = state.tasks
    .filter((t: any) => t.status === 'waiting_on' && t.waitingOnDate && new Date(t.waitingOnDate) < today)
    .sort((a: any, b: any) => new Date(a.waitingOnDate).getTime() - new Date(b.waitingOnDate).getTime());

  const totalFires = overdueTasks.length + blockedTasks.length + criticalDecisions.length + overdueWaiting.length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <header className="pt-2">
        <BackToHome />
        <h1 className="text-2xl font-bold text-red-400 mt-2">War Room</h1>
        <p className="text-sm text-zinc-500">{totalFires} items need attention. Nothing else shown here.</p>
      </header>

      {totalFires === 0 && (
        <div className="border border-emerald-900/40 bg-emerald-950/10 rounded-xl p-8 text-center">
          <p className="text-emerald-400 font-medium text-lg">All clear.</p>
          <p className="text-zinc-500 text-sm mt-1">No overdue, blocked, or critical decisions.</p>
        </div>
      )}

      {/* Overdue Critical */}
      {overdueTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-red-400 uppercase tracking-wide">Overdue Critical ({overdueTasks.length})</h2>
          {overdueTasks.map((t: any) => (
            <div key={t.id} className="border border-red-900/50 bg-red-950/10 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-zinc-100 font-medium">{t.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{t.department} &bull; {t.owner} &bull; {dayNumber - t.dayRangeEnd}d overdue</p>
                </div>
                <button onClick={() => markTaskDone(t.id)} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium shrink-0">Done</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Blocked */}
      {blockedTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wide">Blocked ({blockedTasks.length})</h2>
          {blockedTasks.map((t: any) => (
            <div key={t.id} className="border border-amber-900/50 bg-amber-950/10 rounded-xl p-4">
              <p className="text-zinc-100 font-medium">{t.title}</p>
              <p className="text-xs text-red-400 mt-0.5">Reason: {t.blockedReason}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{t.department} &bull; {t.owner}</p>
            </div>
          ))}
        </div>
      )}

      {/* Critical Decisions Overdue */}
      {criticalDecisions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wide">Decisions Overdue ({criticalDecisions.length})</h2>
          {criticalDecisions.map((d: any) => (
            <div key={d.id} className="border border-amber-900/50 bg-amber-950/10 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-zinc-100 font-medium">{d.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Default: {d.defaultOption} &bull; Due: {d.deadline}</p>
                </div>
                <button onClick={() => acceptDecisionDefault(d.id)} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium shrink-0">Accept Default</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Waiting On — Overdue */}
      {overdueWaiting.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-blue-400 uppercase tracking-wide">Waiting On — Overdue ({overdueWaiting.length})</h2>
          {overdueWaiting.map((t: any) => {
            const expectedDate = new Date(t.waitingOnDate);
            const daysLate = Math.floor((today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
            return (
              <div key={t.id} className="border border-blue-900/50 bg-blue-950/10 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-zinc-100 font-medium">{t.title}</p>
                    <p className="text-xs text-blue-400 mt-0.5">{t.waitingOnPerson} is {daysLate}d late (expected {t.waitingOnDate})</p>
                    {t.waitingOnNotes && <p className="text-xs text-zinc-500 mt-0.5">{t.waitingOnNotes}</p>}
                  </div>
                  <button onClick={() => markTaskDone(t.id)} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium shrink-0">Received</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AppNav />
    </div>
  );
}
