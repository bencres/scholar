-- CreateTable
CREATE TABLE "study_storage_states" (
    "workspace_id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "deck_state" JSONB NOT NULL,
    "sidecar_state" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_storage_states_pkey" PRIMARY KEY ("workspace_id","user_id")
);

-- CreateIndex
CREATE INDEX "study_storage_states_user_id_updated_at_idx" ON "study_storage_states"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "study_storage_states_workspace_id_updated_at_idx" ON "study_storage_states"("workspace_id", "updated_at");

-- AddForeignKey
ALTER TABLE "study_storage_states" ADD CONSTRAINT "study_storage_states_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_storage_states" ADD CONSTRAINT "study_storage_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
