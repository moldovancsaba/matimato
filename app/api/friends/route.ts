import { z } from 'zod';
import { acceptFriendInvite, blockFriend, listFriends, removeFriend, sendFriendGift } from '@/lib/server/store';
import { fail, ok } from '@/lib/server/http';

const FRIENDS_ENABLED = process.env.MATIMATO_FRIENDS_ENABLED !== 'false';

const friendActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('acceptInvite'),
    playerId: z.string().min(1),
    playerTag: z.string().min(1).max(80).optional(),
    friendPlayerId: z.string().min(1),
    friendTag: z.string().min(1).max(80),
    actionId: z.string().min(8).max(140),
    matchId: z.string().min(1).max(140).optional()
  }),
  z.object({
    type: z.literal('remove'),
    playerId: z.string().min(1),
    friendshipId: z.string().min(8).max(140),
    actionId: z.string().min(8).max(140)
  }),
  z.object({
    type: z.literal('block'),
    playerId: z.string().min(1),
    friendshipId: z.string().min(8).max(140),
    actionId: z.string().min(8).max(140)
  }),
  z.object({
    type: z.literal('sendGift'),
    playerId: z.string().min(1),
    friendshipId: z.string().min(8).max(140),
    actionId: z.string().min(8).max(140)
  })
]);

export async function GET(request: Request) {
  try {
    if (!FRIENDS_ENABLED) throw new Error('FRIENDS_DISABLED');
    const playerId = new URL(request.url).searchParams.get('playerId');
    if (!playerId) throw new Error('FRIEND_PLAYER_REQUIRED');
    return ok(await listFriends(playerId));
  } catch (error) {
    return fail(error, 400);
  }
}

export async function POST(request: Request) {
  try {
    if (!FRIENDS_ENABLED) throw new Error('FRIENDS_DISABLED');
    const input = friendActionSchema.parse(await request.json());
    if (input.type === 'acceptInvite') return ok({ ok: true, ...(await acceptFriendInvite(input)) });
    if (input.type === 'remove') return ok({ ok: true, ...(await removeFriend(input)) });
    if (input.type === 'block') return ok({ ok: true, ...(await blockFriend(input)) });
    return ok({ ok: true, ...(await sendFriendGift(input)) });
  } catch (error) {
    return fail(error, 400);
  }
}
