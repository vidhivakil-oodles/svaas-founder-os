'use client';

import { useAppState } from '@/lib/state-provider';
import { getDayNumber } from '@/lib/venture-config';
import Link from 'next/link';
import { AppNav, BackToHome } from '@/components/shared/nav';
import { KebabMenu } from '@/components/shared/kebab-menu';

export default function WarRoomPage() {
  const { state, markTaskDone, acceptDecisionDefault, unblockTask, commitTask, deferTask, blockTask, cancelTask } = useAppState();
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

  function getOverdueKebab(task: any) {
    return [
      { label: 'Commit today', onClick: () => commitTask(task.id) },
      { label: 'Defer', onClick: () => deferTask(task.id, 'Deferred from war room', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) },
      { label: 'Cancel', onClick: () => cancelTask(task.id), destructive: true },
    ];
  }

  function getBlockedKebab(task: any) {
    return [
      { label: 'Done', onClick: () => markTaskDone(task.id) },
      { label: 'Defer', onClick: () => deferTask(task.id, 'Deferred while blocked', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) },
      { label: 'Cancel', onClick: () => cancelTask(task.id), destructive: true },
    ];
  }

  return (
    <div className="space-y-0 max-w-2xl mx-auto">
      <header className="pt-4 pb-8 border-b border-[var(--svaas-sand)]/30">
        <BackToHome />
        <div className="mt-4">
          <p className="text-[12px] font-semibold tracking-[0.12em] text-[var(--svaas-clay)] uppercase">War Room</p>
          <h1 className="text-[32px] font-medium text-[var(--svaas-brown-dark)] mt-2 font-[family-name:var(--font-serif)]">{totalFires} item{totalFires !== 1 ? 's' : ''} need attention</h1>
          <p className="text-[13px] text-[var(--svaas-olive)] mt-1">Drishti sees {totalFires} item{totalFires !== 1 ? 's' : ''} requiring attention</p>
        </div>
      </header>

      {totalFires === 0 && (
        <div className="py-16 text-center">
          <p className="text-[20px] text-[var(--svaas-olive)] font-medium font-[family-name:var(--font-serif)]">All clear.</p>
          <p className="text-[14px] text-[var(--svaas-brown-light)] mt-3">No overdue, blocked, or critical decisions.</p>
        </div>
      )}

      {/* Overdue Critical */}
      {overdueTasks.length > 0 && (
        <section className="py-8 border-b border-[var(--svaas-sand)]/20">
          <p className="text-[12px] font-semibold tracking-[0.12em] text-[var(--svaas-clay)] uppercase mb-5">Overdue critical ({overdueTasks.length})</p>
          <div className="space-y-0 divide-y divide-[var(--svaas-sand)]/15">
            {overdueTasks.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 py-4">
                <div className="w-0.5 self-stretch bg-[var(--svaas-clay)] shrink-0 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-medium text-[var(--svaas-brown-dark)]">{t.title}</p>
                  <p className="text-[13px] text-[var(--svaas-brown-light)] mt-1">{t.department} · {t.owner} · {dayNumber - t.dayRangeEnd}d overdue</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => markTaskDone(t.id)} className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium">Done</button>
                  <KebabMenu actions={getOverdueKebab(t)} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Blocked */}
      {blockedTasks.length > 0 && (
        <section className="py-8 border-b border-[var(--svaas-sand)]/20">
          <p className="text-[12px] font-semibold tracking-[0.12em] text-[var(--svaas-brown-dark)] uppercase mb-5">Blocked ({blockedTasks.length})</p>
          <div className="space-y-0 divide-y divide-[var(--svaas-sand)]/15">
            {blockedTasks.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 py-4">
                <div className="w-0.5 self-stretch bg-[var(--svaas-sand)] shrink-0 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-medium text-[var(--svaas-brown-dark)]">{t.title}</p>
                  <p className="text-[13px] text-[var(--svaas-clay)] mt-1">{t.blockedReason}</p>
                  <p className="text-[13px] text-[var(--svaas-brown-light)] mt-0.5">{t.department} · {t.owner}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => unblockTask(t.id)} className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium">Unblock</button>
                  <KebabMenu actions={getBlockedKebab(t)} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Critical Decisions Overdue */}
      {criticalDecisions.length > 0 && (
        <section className="py-8 border-b border-[var(--svaas-sand)]/20">
          <p className="text-[12px] font-semibold tracking-[0.12em] text-[var(--svaas-olive)] uppercase mb-5">Decisions overdue ({criticalDecisions.length})</p>
          <div className="space-y-0 divide-y divide-[var(--svaas-sand)]/15">
            {criticalDecisions.map((d: any) => (
              <div key={d.id} className="flex items-center gap-3 py-4">
                <div className="w-0.5 self-stretch bg-[var(--svaas-olive)] shrink-0 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-medium text-[var(--svaas-brown-dark)]">{d.title}</p>
                  <p className="text-[13px] text-[var(--svaas-olive)] mt-1">Drishti recommends: {d.defaultOption}</p>
                </div>
                <button onClick={() => acceptDecisionDefault(d.id)} className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium shrink-0">Accept</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Waiting On - Overdue */}
      {overdueWaiting.length > 0 && (
        <section className="py-8">
          <p className="text-[12px] font-semibold tracking-[0.12em] text-[var(--svaas-brown-dark)] uppercase mb-5">Waiting on - overdue ({overdueWaiting.length})</p>
          <div className="space-y-0 divide-y divide-[var(--svaas-sand)]/15">
            {overdueWaiting.map((t: any) => {
              const expectedDate = new Date(t.waitingOnDate);
              const daysLate = Math.floor((today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={t.id} className="flex items-center gap-3 py-4">
                  <div className="w-0.5 self-stretch bg-[var(--svaas-brown-light)] shrink-0 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-medium text-[var(--svaas-brown-dark)]">{t.title}</p>
                    <p className="text-[13px] text-[var(--svaas-brown-light)] mt-1">{t.waitingOnPerson} · {daysLate}d late</p>
                    {t.waitingOnNotes && <p className="text-[13px] text-[var(--svaas-brown-light)] mt-0.5">{t.waitingOnNotes}</p>}
                  </div>
                  <button onClick={() => markTaskDone(t.id)} className="px-4 py-2 bg-[var(--svaas-brown-dark)] text-[var(--svaas-cream)] text-[13px] rounded-lg font-medium shrink-0">Received</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <AppNav />
    </div>
  );
}
