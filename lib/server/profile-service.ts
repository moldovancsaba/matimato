import type { NextRequest } from "next/server";
import { createProfile, touchProfile, updateProfileIdentity } from "@/lib/profile/profile-model";
import { toPublicProfile } from "@/lib/profile/types";
import type { PublicProfile } from "@/lib/profile/types";
import { createProfileCredential, getProfileCredentialFromRequest, hashProfileToken } from "./profile-session";
import type { ProfileCredential } from "./profile-session";
import { getGameStore } from "./store";

export type ProfileResolution = {
  profile: PublicProfile;
  profileId: string;
  credential?: ProfileCredential;
};

export async function resolveProfile(request: NextRequest, preferredTag?: string): Promise<ProfileResolution> {
  const store = getGameStore();
  const existing = getProfileCredentialFromRequest(request);
  if (existing) {
    const profile = await store.getProfile(existing.profileId);
    if (profile?.tokenHash === hashProfileToken(existing.token)) {
      const touched = await store.updateProfile(touchProfile(profile));
      return { profile: toPublicProfile(touched), profileId: touched.id };
    }
  }

  const credential = createProfileCredential();
  const profile = await store.createProfile(createProfile({
    id: credential.profileId,
    tokenHash: hashProfileToken(credential.token),
    displayTag: preferredTag
  }));
  return { profile: toPublicProfile(profile), profileId: profile.id, credential };
}

export async function updateCurrentProfile(request: NextRequest, input: { displayTag?: string; avatarColor?: string }) {
  const resolved = await resolveProfile(request, input.displayTag);
  const store = getGameStore();
  const profile = await store.getProfile(resolved.profileId);
  if (!profile) return resolved;
  const updated = await store.updateProfile(updateProfileIdentity(profile, input));
  return { profile: toPublicProfile(updated), profileId: updated.id, credential: resolved.credential };
}
