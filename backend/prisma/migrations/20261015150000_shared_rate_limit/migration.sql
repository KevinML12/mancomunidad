CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL,
    "untilMs" BIGINT NOT NULL
);
