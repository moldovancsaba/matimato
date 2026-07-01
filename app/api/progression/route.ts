import { z } from 'zod';
import { fail, ok } from '@/lib/server/http';
import { claimSeasonProgressReward, getProgression, purchaseBoardUnlock, recordSeasonProgressAction, updateActiveBoardSize, updateOnboarding } from '@/lib/server/store';
import { BOARD_SIZES } from '@/lib/game/progression';

const tutorialStepSchema = z.enum(['first-pick', 'column-target', 'row-target', 'negative-risk', 'ai-turn', 'finish']);
const boardSizeSchema = z.union(BOARD_SIZES.map((size) => z.literal(size)) as [z.ZodLiteral<5>, z.ZodLiteral<6>, z.ZodLiteral<7>, z.ZodLiteral<8>, z.ZodLiteral<9>]);
const progressionUpdateSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('onboarding'),
    playerId: z.string().min(1),
    step: tutorialStepSchema.optional(),
    completed: z.boolean().optional(),
    dismissed: z.boolean().optional(),
    trainingChoice: z.enum(['learn', 'play-now']).optional()
  }),
  z.object({
    type: z.literal('purchaseBoard'),
    playerId: z.string().min(1),
    boardSize: boardSizeSchema,
    actionId: z.string().min(8).max(100)
  }),
  z.object({
    type: z.literal('selectBoard'),
    playerId: z.string().min(1),
    boardSize: boardSizeSchema
  }),
  z.object({
    type: z.literal('seasonAction'),
    playerId: z.string().min(1),
    source: z.enum(['daily', 'solo', 'battle', 'blitz', 'journey', 'recap', 'rank', 'social']),
    metric: z.enum(['complete_match', 'win_match', 'score_threshold', 'unlock_board', 'replay_move', 'share_recap', 'view_rank', 'send_friend_gift']),
    actionId: z.string().min(3).max(140),
    score: z.number().optional(),
    boardSize: boardSizeSchema.optional()
  }),
  z.object({
    type: z.literal('claimSeasonReward'),
    playerId: z.string().min(1),
    rewardId: z.string().min(1).max(80)
  })
]);

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
    if ((input.type === 'purchaseBoard' || input.type === 'selectBoard') && process.env.MATIMATO_BOARD_JOURNEY_ENABLED === 'false') throw new Error('BOARD_JOURNEY_DISABLED');
    if (input.type === 'purchaseBoard') return ok({ ok: true, progression: await purchaseBoardUnlock(input) });
    if (input.type === 'selectBoard') return ok({ ok: true, progression: await updateActiveBoardSize(input) });
    if (input.type === 'seasonAction') return ok({ ok: true, activeSeason: await recordSeasonProgressAction(input) });
    if (input.type === 'claimSeasonReward') return ok({ ok: true, ...(await claimSeasonProgressReward(input)) });
    const onboarding = await updateOnboarding(input);
    return ok({ ok: true, onboarding });
  } catch (error) {
    return fail(error);
  }
}
