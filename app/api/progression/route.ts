import { z } from 'zod';
import { fail, ok } from '@/lib/server/http';
import { getOnboarding, updateOnboarding } from '@/lib/server/store';

const tutorialStepSchema = z.enum(['first-pick', 'column-target', 'row-target', 'negative-risk', 'ai-turn', 'finish']);
const progressionUpdateSchema = z.object({
  type: z.literal('onboarding'),
  playerId: z.string().min(1),
  step: tutorialStepSchema.optional(),
  completed: z.boolean().optional(),
  dismissed: z.boolean().optional()
});

export async function GET(request: Request) {
  const today = new Date().toISOString().slice(0, 10);
  const playerId = new URL(request.url).searchParams.get('playerId');
  return ok({
    daily: { id: today, title: 'Daily chase', board: '9x9', status: 'active' },
    quests: [
      { id: 'finish-one', title: 'Finish one match', progress: 0, target: 1, rewardXp: 80 },
      { id: 'win-two', title: 'Win two duels', progress: 0, target: 2, rewardXp: 140 },
      { id: 'positive-row', title: 'Claim a positive row swing', progress: 0, target: 1, rewardXp: 60 }
    ],
    onboarding: playerId ? await getOnboarding(playerId) : undefined
  });
}

export async function POST(request: Request) {
  try {
    const input = progressionUpdateSchema.parse(await request.json());
    const onboarding = await updateOnboarding(input);
    return ok({ ok: true, onboarding });
  } catch (error) {
    return fail(error);
  }
}
