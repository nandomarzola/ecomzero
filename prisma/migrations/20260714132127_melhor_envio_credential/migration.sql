-- CreateTable
CREATE TABLE "MelhorEnvioCredential" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MelhorEnvioCredential_pkey" PRIMARY KEY ("id")
);

