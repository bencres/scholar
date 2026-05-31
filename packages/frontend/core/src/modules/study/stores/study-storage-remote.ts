import type { GraphQLQuery } from '@affine/graphql';

import type { Server } from '../../cloud/entities/server';

const workspaceStudyStorageQuery = {
  id: 'workspaceStudyStorageQuery',
  op: 'workspaceStudyStorage',
  query: `query workspaceStudyStorage($workspaceId: String!) {
  workspace(id: $workspaceId) {
    studyStorage {
      decks
      sidecar
      updatedAt
    }
  }
}`,
} satisfies GraphQLQuery;

const upsertWorkspaceStudyStorageMutation = {
  id: 'upsertWorkspaceStudyStorageMutation',
  op: 'upsertWorkspaceStudyStorage',
  query: `mutation upsertWorkspaceStudyStorage($workspaceId: String!, $decks: JSONObject!, $sidecar: JSONObject!) {
  upsertWorkspaceStudyStorage(workspaceId: $workspaceId, decks: $decks, sidecar: $sidecar)
}`,
} satisfies GraphQLQuery;

export type RemoteStudyStorageState = {
  decks?: unknown;
  sidecar?: unknown;
  updatedAt?: string;
};

export async function fetchRemoteStudyStorageState(
  server: Server,
  workspaceId: string
): Promise<RemoteStudyStorageState | null> {
  const data = await server.gql({
    query: workspaceStudyStorageQuery as any,
    variables: { workspaceId },
  } as any);

  return data.workspace?.studyStorage ?? null;
}

export async function upsertRemoteStudyStorageState(
  server: Server,
  workspaceId: string,
  decks: Record<string, unknown>,
  sidecar: Record<string, unknown>
) {
  await server.gql({
    query: upsertWorkspaceStudyStorageMutation as any,
    variables: {
      workspaceId,
      decks,
      sidecar,
    },
  } as any);
}
