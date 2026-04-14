import type { PublicTrackingTokenRecord } from "@/lib/courier/types";

export interface TrackingTokenRepository {
  getByToken(token: string): Promise<PublicTrackingTokenRecord | null>;
  listByAssignmentId(assignmentId: string): Promise<PublicTrackingTokenRecord[]>;
  upsert(tokenRecord: PublicTrackingTokenRecord): Promise<PublicTrackingTokenRecord>;
  revoke(token: string, revokedAt: string): Promise<PublicTrackingTokenRecord | null>;
}
