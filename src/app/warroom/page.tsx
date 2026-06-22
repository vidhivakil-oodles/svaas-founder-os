'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber } from '@/lib/venture-config';
import Link from 'next/link';
import { AppNav, BackToHome } from '@/components/shared/nav';

export default function WarRoomPage() {
  const { state, markTaskDone, acceptDecisionDefault, unblockTask } = useAppState();
  const dayNumber = getDayNumber();

  const overdueTasks = state.tasks
    .filter((t: any) => t.status === 'not_started' && t.priority === 'CRITICAL' && t.dayRangeEnd && dayNumber > t.dayRangeEnd)
    .sort((a: any, b: any) => (a.dayRangeEnd || 999) - (b.dayRangeEnd || 999));

  const blockedTasks = state.tasks.filter((t: any) => t.status === 'blocked');

  const criticalDecisions = state.decisions.filter((d: any) => d.status === 'pending' && d.deadline && new Date(d.deadline) < new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueWaiting = state.tasks
    .filter((t: any) => t.status === 'waiting_on' && t.waitingOnDate && new Date(t.waitingOnDate) < today)
    .sort((a: any, b: any) => new Date(a.waitingOnDate).getTime() - new Date(b.waitingOnDate).getTime());

  const totalFires = overdueTasks.length + blockedTasks.length + criticalDecisions.length + overdueWaiting.length;

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <header className="pt-2">
        <BackToHome />
        <h1 className="text-2xl font-medium text-[var(--svaas-brown-dark)] mt-3">War Room</h1>
        <p className="text-sm text-[var(--svaas-brown-light)] mt-1">{totalFires} item{totalFires !== 1 ? 's' : ''} need attention</p>
      </header>

      {totalFires === 0 && (
        <div className="border border-[var(--svaas-olive)]/20 bg-[var(--svaas-olive-light)] rounded-2xl p-8 text-center">
          <p className="text-[var(--svaas-olive)] font-medium text-lg">All clear.</p>
          <p className="text-sm text-[var(--svaas-brown-light)] mt-1">No overdue, blocked, or critical decisions.</p>
        </div>
      )}

      {/* Overdue Critical */}
      {overdueTasks.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] text-[var(--svaas-clay)] uppercase tracking-widest font-semibold">Overdue Critical ({overdueTasks.length})</p>
          {overdueTasks.map((t: any) => (
            <div key={t.id} className="border border-[var(--svaas-clay)]/20 bg-[var(--svaas-clay-light)] rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--svaas-brown-dark)]">{t.title}</p>
                  <p className="text-xs text-[var(--svaas-brown-light)] mt-1">{t.department} &middot; {t.owner} &middot; {dayNumber - t.dayRangeEnd}d overdue</p>
                </div>
                <button onClick={() => markTaskDone(t.id)} className="px-4 py-2.5 bg-[var(--svaas-brown)] hover:bg-[var(--svaas-brown-dark)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium transition-colors shrink-0">Done</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Blocked */}
      {blockedTasks.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] text-[var(--svaas-amber)] uppercase tracking-widest font-semibold">Blocked ({blockedTasks.length})</p>
          {blockedTasks.map((t: any) => (
            <div key={t.id} className="border border-[var(--svaas-amber)]/20 bg-[var(--svaas-amber-light)] rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--svaas-brown-dark)]">{t.title}</p>
                  <p className="text-xs text-[var(--svaas-clay)] mt-1">Reason: {t.blockedReason}</p>
                  <p className="text-xs text-[var(--svaas-brown-light)] mt-0.5">{t.department} &middot; {t.owner}</p>
                </div>
                <button onClick={() => unblockTask(t.id)} className="px-4 py-2.5 bg-[var(--svaas-brown)] hover:bg-[var(--svaas-brown-dark)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium transition-colors shrink-0">Unblock</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Critical Decisions Overdue */}
      {criticalDecisions.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] text-[var(--svaas-amber)] uppercase tracking-widest font-semibold">Decisions Overdue ({criticalDecisions.length})</p>
          {criticalDecisions.map((d: any) => (
            <div key={d.id} className="border border-[var(--svaas-sand)] bg-[var(--svaas-cream)] rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--svaas-brown-dark)]">{d.title}</p>
                  <p className="text-xs text-[var(--svaas-brown-light)] mt-1">Default: {d.defaultOption} &middot; Due: {d.deadline}</p>
                </div>
                <button onClick={() => acceptDecisionDefault(d.id)} className="px-4 py-2.5 bg-[var(--svaas-brown)] hover:bg-[var(--svaas-brown-dark)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium transition-colors shrink-0">Accept Default</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Waiting On - Overdue */}
      {overdueWaiting.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] text-[var(--svaas-slate)] uppercase tracking-widest font-semibold">Waiting On - Overdue ({overdueWaiting.length})</p>
          {overdueWaiting.map((t: any) => {
            const expectedDate = new Date(t.waitingOnDate);
            const daysLate = Math.floor((today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
            return (
              <div key={t.id} className="border border-[var(--svaas-slate)]/20 bg-[var(--svaas-slate-light)] rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--svaas-brown-dark)]">{t.title}</p>
                    <p className="text-xs text-[var(--svaas-slate)] mt-1">{t.waitingOnPerson} is {daysLate}d late (expected {t.waitingOnDate})</p>
                    {t.waitingOnNotes && <p className="text-xs text-[var(--svaas-brown-light)] mt-0.5">{t.waitingOnNotes}</p>}
                  </div>
                  <button onClick={() => markTaskDone(t.id)} className="px-4 py-2.5 bg-[var(--svaas-brown)] hover:bg-[var(--svaas-brown-dark)] text-[var(--svaas-ivory)] text-sm rounded-xl font-medium transition-colors shrink-0">Received</button>
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
