import { z } from 'zod';
import { fail, ok } from '@/lib/server/http';
import { getProgression, updateOnboarding } from '@/lib/server/store';

const tutorialStepSchema = z.enum(['first-pick', 'column-target', 'row-target', 'negative-risk', 'ai-turn', 'finish']);
const progressionUpdateSchema = z.object({
  type: z.literal('onboarding'),
  playerId: z.string().min(1),
  step: tutorialStepSchema.optional(),
  completed: z.boolean().optional(),
  dismissed: z.boolean().optional()
});

export async function GET(request: Request) {
  try {
    const playerId = new URL(request.url).searchParams.get('playerId') ?? undefined;
    return ok(await getProgression(playerId));
  } catch (error) {
    return fail(error, 503);
  }
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
