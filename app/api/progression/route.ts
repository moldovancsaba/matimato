import { ok } from '@/lib/server/http';

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  return ok({
    daily: { id: today, title: 'Daily chase', board: '9x9', status: 'active' },
    quests: [
      { id: 'finish-one', title: 'Finish one match', progress: 0, target: 1, rewardXp: 80 },
      { id: 'win-two', title: 'Win two duels', progress: 0, target: 2, rewardXp: 140 },
      { id: 'positive-row', title: 'Claim a positive row swing', progress: 0, target: 1, rewardXp: 60 }
    ]
  });
}
