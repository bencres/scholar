import { Injectable } from '@nestjs/common';

import { BaseModel } from './base';

export type StudyStorageState = {
  workspaceId: string;
  userId: string;
  decks: Record<string, unknown>;
  sidecar: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

type StudyStorageStateRow = {
  workspaceId: string;
  userId: string;
  decks: Record<string, unknown>;
  sidecar: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class StudyStorageStateModel extends BaseModel {
  async get(
    workspaceId: string,
    userId: string
  ): Promise<StudyStorageState | null> {
    const rows = await this.db.$queryRaw<StudyStorageStateRow[]>`
      SELECT
        workspace_id AS "workspaceId",
        user_id AS "userId",
        deck_state AS "decks",
        sidecar_state AS "sidecar",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM study_storage_states
      WHERE workspace_id = ${workspaceId}
        AND user_id = ${userId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  async upsert(input: {
    workspaceId: string;
    userId: string;
    decks: Record<string, unknown>;
    sidecar: Record<string, unknown>;
  }) {
    await this.db.$executeRaw`
      INSERT INTO study_storage_states (
        workspace_id,
        user_id,
        deck_state,
        sidecar_state,
        created_at,
        updated_at
      )
      VALUES (
        ${input.workspaceId},
        ${input.userId},
        ${JSON.stringify(input.decks)}::jsonb,
        ${JSON.stringify(input.sidecar)}::jsonb,
        now(),
        now()
      )
      ON CONFLICT (workspace_id, user_id)
      DO UPDATE SET
        deck_state = EXCLUDED.deck_state,
        sidecar_state = EXCLUDED.sidecar_state,
        updated_at = now()
    `;
  }
}
