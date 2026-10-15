BEGIN;
CREATE TABLE IF NOT EXISTS public."RateLimitBucket" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL,
    "untilMs" BIGINT NOT NULL
);
ALTER TABLE public."RateLimitBucket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicacionTransparencia" ADD COLUMN IF NOT EXISTS "mediaRef" TEXT;
COMMIT;
