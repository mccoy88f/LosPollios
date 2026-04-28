-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Election" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'large',
    "totalSeats" INTEGER NOT NULL DEFAULT 32,
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "status" TEXT NOT NULL DEFAULT 'setup',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "eligibleVotersTotal" INTEGER,
    "registeredVoters" INTEGER,
    "turnoutVoters" INTEGER,
    "turnoutPercent" DOUBLE PRECISION,
    "ballotsBlank" INTEGER,
    "ballotsInvalidInclBlank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "electionId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "location" TEXT,
    "theoreticalVoters" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionList" (
    "id" SERIAL NOT NULL,
    "electionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "listLogoUrl" TEXT,
    "coalitionLogoUrl" TEXT,
    "candidateMayor" TEXT,
    "mayorPersonId" INTEGER,
    "coalition" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "importedSeats" INTEGER,

    CONSTRAINT "ElectionList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" SERIAL NOT NULL,
    "listId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "gender" TEXT,
    "personId" INTEGER,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionTurnout" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "electionId" INTEGER NOT NULL,
    "votersActual" INTEGER NOT NULL DEFAULT 0,
    "ballotsValid" INTEGER,
    "ballotsNull" INTEGER,
    "ballotsBlank" INTEGER,
    "enteredBy" TEXT,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionTurnout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionListResult" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "listId" INTEGER NOT NULL,
    "listVotes" INTEGER NOT NULL DEFAULT 0,
    "enteredBy" TEXT,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionListResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatePreference" (
    "id" SERIAL NOT NULL,
    "sectionResultId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "enteredBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidatePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'entry',
    "electionId" INTEGER,
    "listId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalElection" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "registeredVoters" INTEGER,
    "turnoutVoters" INTEGER,
    "turnoutPercent" DOUBLE PRECISION,
    "ballotsBlank" INTEGER,
    "ballotsInvalidInclBlank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalElection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalListResult" (
    "id" SERIAL NOT NULL,
    "electionId" INTEGER NOT NULL,
    "listName" TEXT NOT NULL,
    "coalition" TEXT,
    "candidateMayor" TEXT,
    "mayorPersonId" INTEGER,
    "listLogoUrl" TEXT,
    "coalitionLogoUrl" TEXT,
    "votes" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "seats" INTEGER,
    "notes" TEXT,

    CONSTRAINT "HistoricalListResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalCouncilCandidate" (
    "id" SERIAL NOT NULL,
    "listResultId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "personId" INTEGER,
    "preferenceVotes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HistoricalCouncilCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Section_electionId_idx" ON "Section"("electionId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_electionId_number_key" ON "Section"("electionId", "number");

-- CreateIndex
CREATE INDEX "Person_lastName_firstName_idx" ON "Person"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "ElectionList_electionId_idx" ON "ElectionList"("electionId");

-- CreateIndex
CREATE INDEX "ElectionList_mayorPersonId_idx" ON "ElectionList"("mayorPersonId");

-- CreateIndex
CREATE INDEX "Candidate_listId_idx" ON "Candidate"("listId");

-- CreateIndex
CREATE INDEX "Candidate_personId_idx" ON "Candidate"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionTurnout_sectionId_key" ON "SectionTurnout"("sectionId");

-- CreateIndex
CREATE INDEX "SectionListResult_sectionId_idx" ON "SectionListResult"("sectionId");

-- CreateIndex
CREATE INDEX "SectionListResult_listId_idx" ON "SectionListResult"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionListResult_sectionId_listId_key" ON "SectionListResult"("sectionId", "listId");

-- CreateIndex
CREATE INDEX "CandidatePreference_updatedAt_idx" ON "CandidatePreference"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandidatePreference_sectionResultId_candidateId_key" ON "CandidatePreference"("sectionResultId", "candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "HistoricalListResult_mayorPersonId_idx" ON "HistoricalListResult"("mayorPersonId");

-- CreateIndex
CREATE INDEX "HistoricalCouncilCandidate_listResultId_idx" ON "HistoricalCouncilCandidate"("listResultId");

-- CreateIndex
CREATE INDEX "HistoricalCouncilCandidate_personId_idx" ON "HistoricalCouncilCandidate"("personId");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionList" ADD CONSTRAINT "ElectionList_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionList" ADD CONSTRAINT "ElectionList_mayorPersonId_fkey" FOREIGN KEY ("mayorPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ElectionList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionTurnout" ADD CONSTRAINT "SectionTurnout_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionTurnout" ADD CONSTRAINT "SectionTurnout_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionListResult" ADD CONSTRAINT "SectionListResult_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionListResult" ADD CONSTRAINT "SectionListResult_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ElectionList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreference" ADD CONSTRAINT "CandidatePreference_sectionResultId_fkey" FOREIGN KEY ("sectionResultId") REFERENCES "SectionListResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreference" ADD CONSTRAINT "CandidatePreference_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ElectionList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalListResult" ADD CONSTRAINT "HistoricalListResult_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "HistoricalElection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalListResult" ADD CONSTRAINT "HistoricalListResult_mayorPersonId_fkey" FOREIGN KEY ("mayorPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalCouncilCandidate" ADD CONSTRAINT "HistoricalCouncilCandidate_listResultId_fkey" FOREIGN KEY ("listResultId") REFERENCES "HistoricalListResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalCouncilCandidate" ADD CONSTRAINT "HistoricalCouncilCandidate_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

