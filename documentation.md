# BUET E-Council — Developer Guide & Technical Documentation

This document serves as the comprehensive technical specification and developer guide for the **BUET E-Council Meeting Management System**. It covers architectural patterns, core algorithms, database schemas, workflow permission engines, search indexers, PDF generation mechanics, and API references.

---

## Table of Contents

- [1. System Architecture & Topology](#1-system-architecture--topology)
  - [1.1 Service Decomposition](#11-service-decomposition)
  - [1.2 Communication Protocols & Network Security](#12-communication-protocols--network-security)
- [2. Database Schema & Data Modeling](#2-database-schema--data-modeling)
  - [2.1 Extensions & Enum Types](#21-extensions--enum-types)
  - [2.2 Core Tables & Entity Relationships](#22-core-tables--entity-relationships)
  - [2.3 Full-Text & Vector Indexes](#23-full-text--vector-indexes)
  - [2.4 Database Triggers & Automated Functions](#24-database-triggers--automated-functions)
- [3. Deep Dive: Core Engineering Subsystems](#3-deep-dive-core-engineering-subsystems)
  - [3.1 Level-Based Handover & Locking Engine](#31-level-based-handover--locking-engine)
    - [3.1.1 Lock Types & Access Control Matrix](#311-lock-types--access-control-matrix)
    - [3.1.2 Handover Lifecycle & State Transitions](#312-handover-lifecycle--state-transitions)
    - [3.1.3 Send-Back (Reject & Return) Feature](#313-send-back-reject--return-feature)
    - [3.1.4 Middleware & Client Implementation](#314-middleware--client-implementation)
  - [3.2 3-Tier Hybrid Search Engine](#32-3-tier-hybrid-search-engine)
    - [3.2.1 Query Parsing & SHA-256 Caching](#321-query-parsing--sha-256-caching)
    - [3.2.2 Tier 0: Keyword Search Engine (Postgres `tsvector` & `'simple'` Dictionary)](#322-tier-0-keyword-search-engine-postgres-tsvector--simple-dictionary)
    - [3.2.3 Tier 1: Entity Search Engine (`gin_trgm_ops` Fuzzy Matching)](#323-tier-1-entity-search-engine-gin_trgm_ops-fuzzy-matching)
    - [3.2.4 Tier 2: Vector Semantic Search Engine (`pgvector` HNSW + `bge-m3`)](#324-tier-2-vector-semantic-search-engine-pgvector-hnsw--bge-m3)
    - [3.2.5 Trigger-Based Cache Invalidation](#325-trigger-based-cache-invalidation)
  - [3.3 Asynchronous Vector Embedding Pipeline](#33-asynchronous-vector-embedding-pipeline)
  - [3.4 PDF Generation & Typography Engine](#34-pdf-generation--typography-engine)
  - [3.5 MinIO S3 Object Storage & Media Proxy](#35-minio-s3-object-storage--media-proxy)
  - [3.6 JSON Import & Regex Entity Resolution Engine](#36-json-import--regex-entity-resolution-engine)
  - [3.7 Audit Logging & Session Management](#37-audit-logging--session-management)
- [4. API Endpoint Reference](#4-api-endpoint-reference)
  - [4.1 Authentication Service (`/api/auth`)](#41-authentication-service-apiauth)
  - [4.2 Meeting Service (`/api/meetings`, `/api/agendas`, etc.)](#42-meeting-service-apimeetings-apiagendas-etc)
  - [4.3 Search API (`/api/search`)](#43-search-api-apisearch)
  - [4.4 Storage API (`/storage`)](#44-storage-api-storage)
  - [4.5 Embedding Service API (`http://embedding_service:8002`)](#45-embedding-service-api-httpembeddingservice8002)
- [5. Frontend Architecture & Design System](#5-frontend-architecture--design-system)
- [6. Development, Maintenance & Troubleshooting](#6-development-maintenance--troubleshooting)
  - [6.1 Running via Docker Compose](#61-running-via-docker-compose)
  - [6.2 Local Microservice Development Setup](#62-local-microservice-development-setup)
  - [6.3 Troubleshooting Guide](#63-troubleshooting-guide)

---

## 1. System Architecture & Topology

### 1.1 Service Decomposition

BUET E-Council is structured as a decoupled microservices architecture. Each container encapsulates a dedicated responsibility:

```
[ NGINX Gateway :9001 ]
       |
       +---> [ frontend:3000 ]         (Next.js App Router UI)
       +---> [ auth_service:8000 ]     (Express Auth & RBAC API)
       +---> [ meeting_service:8001 ]  (Express Core Business API & PDF Generator)
       |         |
       |         +--> [ BullMQ Queue ] ---> [ embedding_worker ] ---> [ embedding_service:8002 ]
       |                   |                       |                       (Python FastAPI BGE-M3)
       |                   v                       v
       +---> [ minio:9000 ] <----+                 +---> [ PostgreSQL 16 + pgvector ]
             (S3 Storage)        | (SigV4 Presigned)
```

### 1.2 Communication Protocols & Network Security

1. **Gateway Isolation**: Direct external access is limited exclusively to NGINX on host port `9001`. Internal microservices (`auth_service`, `meeting_service`, `embedding_service`, `redis`, `minio`, `db`) communicate across an isolated Docker internal bridge network.
2. **Dynamic Upstream DNS Resolution**: NGINX uses Docker's embedded DNS server (`127.0.0.11 valid=10s`) combined with `set $upstream` variables to force IP re-resolution on request, avoiding dead IP locks when containers restart.
3. **Session Propagation**: Authenticated API calls transport standard HTTP `Authorization: Bearer <session_token>` headers or `session_token` HttpOnly cookies.

---

## 2. Database Schema & Data Modeling

### 2.1 Extensions & Enum Types

The database is built on PostgreSQL 16 with three core extensions enabled in [`db/init.sql`](file:///media/samyo-pramanik/New%20Volume2/buet-ecouncil2/db/init.sql):
- **`uuid-ossp`**: Native UUID generation (`uuid_generate_v4()`).
- **`vector`**: Vector field support (`vector(1024)`) and HNSW cosine distance indexing (`vector_cosine_ops`).
- **`pg_trgm`**: Trigram index support (`gin_trgm_ops`) for fast fuzzy text matching.

#### Domain Enums

```sql
CREATE TYPE user_role AS ENUM ('admin', 'viewer', 'editor', 'superadmin', 'moderator', 'file_initiator');
CREATE TYPE member_type_enum AS ENUM ('academic', 'syndicate', 'none');
CREATE TYPE meeting_type AS ENUM ('syndicate', 'academic');
CREATE TYPE annexure_type AS ENUM ('agendaItem', 'resolution');
CREATE TYPE template_type AS ENUM ('agendaItem', 'resolutionItem', 'agendam', 'resolution', 'description', 'conclusion');
CREATE TYPE account_status AS ENUM ('active', 'inactive');
```

---

### 2.2 Core Tables & Entity Relationships

```
  +------------------+         +------------------+         +------------------+
  |      roles       |         |      users       |         |     sessions     |
  +------------------+         +------------------+         +------------------+
  | id (PK)          |<--------| role_id (FK)     |         | id (PK)          |
  | level (INT, UNQ) |         | id (PK)          |<--------| user_id (FK)     |
  | level_title      |         | username, email  |         | session_token    |
  +------------------+         +------------------+         +------------------+
                                        ^
                                        | (created_by)
                               +------------------+
                               |     meetings     |
                               +------------------+
                               | id (PK)          |
                               | title, date, type|
                               | agenda_handover  |
                               | agenda_locked    |
                               | resolution_hand  |
                               | is_completed     |
                               +------------------+
                                        |
                                        v (CASCADE)
                               +------------------+
                               |      agenda      |
                               +------------------+
                               | id (PK)          |
                               | meeting_id (FK)  |
                               | content, plain   |
                               | resolution, plain|
                               | content_tsv      |
                               | resolution_tsv   |
                               +------------------+
                                 /              \
                                /                \
                               v                  v
                    +------------------+  +-------------------+
                    |  agenda_chunks   |  | resolution_chunks |
                    +------------------+  +-------------------+
                    | id (PK)          |  | id (PK)           |
                    | agenda_id (FK)   |  | agenda_id (FK)    |
                    | embedding (1024) |  | embedding (1024)  |
                    +------------------+  +-------------------+
```

#### Field Descriptions: Key Entities

1. **`roles`**: Defines numerical hierarchy levels (`level` column). Lower integer numbers denote lower organizational hierarchy; higher integer numbers denote administrative/review levels (e.g., Level 3 > Level 2 > Level 1).
2. **`meetings`**: Stores meeting metadata along with workflow level tracking columns:
   - Handover fields: `agenda_handover_level`, `suppli_agenda_handover_level`, `resolution_handover_level`, `resolution_status_handover_level`
   - Lock fields: `agenda_locked_level`, `suppli_agenda_locked_level`, `resolution_locked_level`, `resolution_status_locked_level`, `meeting_locked_level`, `invitees_locked_level`, `presentees_locked_level`, `conclusion_locked_level`
3. **`agenda`**: Agenda and resolution content. Automatically maintains generated `content_tsv` and `resolution_tsv` tsvector columns using PostgreSQL's `simple` text search dictionary.
4. **`agenda_chunks` & `resolution_chunks`**: Stores text chunks and their 1024-dimensional float vector embeddings output by `BAAI/bge-m3`.

---

### 2.3 Full-Text & Vector Indexes

```sql
-- HNSW Vector Indexes for Fast Cosine Distance Search
CREATE INDEX idx_agenda_chunks_hnsw 
ON agenda_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_resolution_chunks_hnsw 
ON resolution_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Full-Text GIN Indexes
CREATE INDEX idx_agenda_content_tsv ON agenda USING GIN (content_tsv);
CREATE INDEX idx_agenda_resolution_tsv ON agenda USING GIN (resolution_tsv);

-- Trigram Fuzzy Indexes
CREATE INDEX idx_departments_trgm ON departments USING GIN (
    (name_bangla || ' ' || coalesce(name_english, '') || ' ' || coalesce(alias_bangla, '') || ' ' || coalesce(alias_english, '')) gin_trgm_ops
);
CREATE INDEX idx_members_name_trgm ON members USING GIN (name gin_trgm_ops);
```

---

### 2.4 Database Triggers & Automated Functions

1. **`sync_invitee_serial()` Trigger**: Synchronizes an invitee's `serial` field automatically when the corresponding member's global seniority `serial` changes in the `members` table:
   ```sql
   CREATE TRIGGER trg_sync_invitee_serial
   AFTER UPDATE OF serial ON members FOR EACH ROW
   WHEN (OLD.serial IS DISTINCT FROM NEW.serial)
   EXECUTE FUNCTION sync_invitee_serial();
   ```

2. **`clear_search_cache_trigger_fn()` Trigger**: Instantly invalidates all entries in the `search_cache` table whenever `meetings`, `agenda`, `users`, `annexures`, `invitees`, or `agenda_tags` tables are updated.

---

## 3. Deep Dive: Core Engineering Subsystems

### 3.1 Level-Based Handover & Locking Engine

Implementation: [`meeting_service/middlewares/meetingWorkflowMiddleware.js`](file:///media/samyo-pramanik/New%20Volume2/buet-ecouncil2/meeting_service/middlewares/meetingWorkflowMiddleware.js), [`frontend/lib/meetingAccess.ts`](file:///media/samyo-pramanik/New%20Volume2/buet-ecouncil2/frontend/lib/meetingAccess.ts)

The workflow engine enforces institutional protocol by dynamically evaluating an editor's assigned role level ($L_{user}$) against section-specific **Lock Levels** ($L_{locked}$) and **Handover Levels** ($L_{handover}$).

#### 3.1.1 Lock Types & Access Control Matrix

The system tracks **8 distinct section locks** on each meeting record:

| Lock Name | DB Field Name | Targeted Section | Permission Formula |
|---|---|---|---|
| **Meeting Lock** | `meeting_locked_level` | Title, date, type, president, description | $\text{CanEdit} \iff L_{user} \ge L_{meeting\_locked} \lor isAdmin$ |
| **Agenda Lock** | `agenda_locked_level` | Main agenda items & annexure uploads | $\text{CanEdit} \iff L_{user} \ge L_{agenda\_locked} \lor isAdmin$ |
| **Suppli Agenda Lock** | `suppli_agenda_locked_level` | Supplementary agenda items (`is_suppli`) | $\text{CanEdit} \iff L_{user} \ge L_{suppli\_locked} \lor isAdmin$ |
| **Resolution Lock** | `resolution_locked_level` | Resolution text authoring | $\text{CanEdit} \iff L_{user} \ge L_{resolution\_locked} \lor isAdmin$ |
| **Resolution Status Lock** | `resolution_status_locked_level` | Execution status (`is_executed`, text) | $\text{CanEdit} \iff L_{user} \ge L_{res\_status\_locked} \lor isAdmin$ |
| **Invitees Lock** | `invitees_locked_level` | Invitee list & member seniority ordering | $\text{CanEdit} \iff L_{user} \ge L_{invitees\_locked} \lor isAdmin$ |
| **Presentees Lock** | `presentees_locked_level` | Attendance taking during active meeting | $\text{CanEdit} \iff L_{user} \ge L_{presentees\_locked} \lor isAdmin$ |
| **Conclusion Lock** | `conclusion_locked_level` | Meeting conclusion & wrap-up summary | $\text{CanEdit} \iff L_{user} \ge L_{conclusion\_locked} \lor isAdmin$ |

---

#### 3.1.2 Handover Lifecycle & State Transitions

Handover is designed for **stage-by-stage review escalation**:

1. **Section Handover Fields**:
   - `agenda_handover_level`
   - `suppli_agenda_handover_level`
   - `resolution_handover_level`
   - `resolution_status_handover_level`

2. **Access State Transition Logic**:
   - When Level 1 hands over to Level 2 (`agenda_handover_level = 1`):
     - **Level 1 Users ($L_{user} \le 1$)**: Edit access is **REVOKED** (read-only view).
     - **Level 2+ Users ($L_{user} > 1$)**: Edit & review access is **GRANTED**.

---

#### 3.1.3 Send-Back (Reject & Return) Feature

When a higher-level reviewer (e.g. Level 2 or Level 3) reviews a handed-over section and determines that modifications are required by lower-level authors:

- **Send-Back Condition**: User Level $L_{user} > L_{handover}$ (or `admin`).
- **Execution Flow**: The reviewer sends a `POST /api/meetings/:id/send-back` request specifying the section target.
- **Database Effect**: `handover_level` is reset (or decremented to a lower integer).
- **Access Restored**: Editing rights immediately return to lower-level authors ($L_{user} \le L_{handover\_old}$), allowing them to update the draft.

---

#### 3.1.4 Middleware & Client Implementation

```javascript
// Server Middleware: meeting_service/middlewares/meetingWorkflowMiddleware.js
const calculateMeetingAccess = (meeting, user) => {
    if (!user) return emptyAccess;
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (isAdmin) return fullAdminAccess;

    const userLevel = parseInt(user.role_level, 10);
    const getLock = (lvl) => (lvl !== null && lvl !== undefined ? parseInt(lvl, 10) : null);
    const getHandover = (lvl) => (lvl !== null && lvl !== undefined ? parseInt(lvl, 10) : null);

    const agendaHandover = getHandover(meeting.agenda_handover_level);
    const agendaLock = getLock(meeting.agenda_locked_level);

    let canEditAgenda = true;
    if (agendaHandover !== null && userLevel <= agendaHandover) canEditAgenda = false;
    if (agendaLock !== null && userLevel < agendaLock) canEditAgenda = false;

    const canSendBackAgenda = agendaHandover !== null && (user.role === 'admin' || userLevel > agendaHandover);
    const canUnlockAgenda = agendaLock === null || userLevel >= agendaLock;

    return { canEditAgenda, canSendBackAgenda, canUnlockAgenda, /* ... section flags */ };
};
```

---

### 3.2 3-Tier Hybrid Search Engine

Implementation: [`meeting_service/controllers/searchController.js`](file:///media/samyo-pramanik/New%20Volume2/buet-ecouncil2/meeting_service/controllers/searchController.js), [`meeting_service/utils/searchIndexer.js`](file:///media/samyo-pramanik/New%20Volume2/buet-ecouncil2/meeting_service/utils/searchIndexer.js)

```
                       +-------------------------------+
                       |      Incoming Search Query    |
                       +---------------+---------------+
                                       |
                                       v
                       +-------------------------------+
                       |  Check Search Cache (SHA256)  |
                       +---------------+---------------+
                                       | (Cache Miss)
                                       v
                       +-------------------------------+
                       |  Tier 0: Postgres tsvector    |
                       |      websearch_to_tsquery     |
                       +---------------+---------------+
                                       |
                       +---------------+---------------+
                       | Matches >= 30? -> Return Fast |
                       +---------------+---------------+
                                       | (No)
                                       v
                       +-------------------------------+
                       |  Tier 1: Trigram Entity Search|
                       |    (Departments, Offices)     |
                       +---------------+---------------+
                                       |
                       +---------------+---------------+
                       | Matches >= 30? -> Return Fast |
                       +---------------+---------------+
                                       | (No & Embeddings Active)
                                       v
                       +-------------------------------+
                       |  Tier 2: pgvector HNSW Search |
                       |   Embedding Vector Cosine     |
                       +---------------+---------------+
                                       |
                                       v
                       +-------------------------------+
                       |  Cache Results & Return Data  |
                       +-------------------------------+
```

#### 3.2.1 Query Parsing & SHA-256 Caching

1. `parseFilters(req)` extracts `q`, `scope` (`agenda` vs `both`), `tags`, `dateFrom`, `dateTo`, `serialFrom`, `serialTo`, and auto-enforces viewer member-type restrictions.
2. A SHA-256 key is computed over `JSON.stringify(filters)`. If present in `search_cache`, results are returned immediately (`cached: true`).

---

#### 3.2.2 Tier 0: Keyword Search Engine (Postgres `tsvector` & `'simple'` Dictionary)

##### Technical Mechanics:
- **Plain-Text Extraction**: When an agenda item is saved, `htmlToText.js` strips HTML tags to produce `content_plain` and `resolution_plain`.
- **PostgreSQL Generated Columns**:
  ```sql
  content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content_plain, ''))) STORED,
  resolution_tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(resolution_plain, ''))) STORED
  ```
- **Why the `'simple'` Text Dictionary?**: Standard English stemmers (like Porter stemming) corrupt Bangla script by stripping word endings and suffixes, leading to false negatives. The `'simple'` dictionary tokenizes whitespace and punctuation literally without stemming, preserving both Bangla script and English words accurately.
- **SQL Execution**:
  ```sql
  SELECT a.id as agenda_id, a.meeting_id, m.title, m.meeting_title, m.type, m.meeting_date, m.status,
         'agenda' as matched_in,
         ts_rank(a.content_tsv, websearch_to_tsquery('simple', $1)) as rank,
         ts_headline('simple', coalesce(a.content_plain, ''), websearch_to_tsquery('simple', $1), 
                     'StartSel=<mark>, StopSel=</mark>, MaxWords=40, MinWords=15, MaxFragments=1') as snippet
  FROM agenda a
  JOIN meetings m ON m.id = a.meeting_id
  WHERE (a.content_tsv @@ websearch_to_tsquery('simple', $1) OR a.content_plain ILIKE '%' || $1 || '%')
    AND m.status = 'past'
  ORDER BY rank DESC
  LIMIT 30;
  ```
- **Cascading Early Exit**: If Tier 0 yields $\ge 30$ matches, execution terminates early, caches results, and returns (saving compute).

---

#### 3.2.3 Tier 1: Entity Search Engine (`gin_trgm_ops` Fuzzy Matching)

##### Technical Mechanics:
- **Problem Solved**: Agendas often mention official entity names, abbreviations, or aliases (e.g. "CSE", "সিএসই", "কম্পিউটার সায়েন্স এন্ড ইঞ্জিনিয়ারিং", "Department Head, EEE", "Vice Chancellor") that might not match query keywords verbatim.
- **Step 1: Entity Token Extraction (`findMatchingEntityTerms`)**:
  Query string `q` is split into word n-grams and matched across 6 entity tables using array substring queries (`ILIKE ANY($1)`):
  1. `departments` (`name_bangla`, `name_english`, `alias_bangla`, `alias_english`)
  2. `offices` (`name_bangla`, `name_english`)
  3. `members` (`name`)
  4. `faculties` (`name_bangla`, `name_english`)
  5. `invitees` (`name`)
  6. `agenda_entities` (`entity_name_bangla`, `entity_name_english`)
- **Step 2: Fast Trigram Matching (`runEntitySearchFast`)**:
  Collected entity names are matched against agendas using GIN trigram indexes (`idx_agenda_entities_trgm`):
  ```sql
  SELECT DISTINCT ON (a.id) a.id as agenda_id, a.meeting_id, m.title, m.type, m.meeting_date,
         'agenda' as matched_in, coalesce(substring(a.content_plain from 1 for 200), '') as snippet
  FROM agenda a
  JOIN meetings m ON m.id = a.meeting_id
  LEFT JOIN agenda_entities ae ON ae.agenda_id = a.id
  WHERE (a.content_plain ILIKE ANY($1) OR ae.entity_name_bangla ILIKE ANY($1) OR ae.entity_name_english ILIKE ANY($1))
    AND m.status = 'past'
  LIMIT 30;
  ```
- **Early Exit**: If combined Tier 0 + Tier 1 matches reach 30, execution terminates early.

---

#### 3.2.4 Tier 2: Vector Semantic Search Engine (`pgvector` HNSW + `bge-m3`)

##### Technical Mechanics:
- **Problem Solved**: Keyword and entity matching fail when users search using different phrasing, synonyms, or conceptual queries (e.g. query "শিক্ষকদের পদোন্নতি সংক্রান্ত নীতিমালা" matching an agenda titled "আবেদন বিবেচনা ও পদোন্নতি প্রক্রিয়া").
- **Text Chunking**: Long agenda bodies are split into smaller text chunks in `searchIndexer.js`.
- **`BAAI/bge-m3` Multilingual Embedding Model**:
  Query `q` is sent to `embedding_service` (`POST /embed`) to generate a 1024-dimensional normalized float vector using Hugging Face's `BAAI/bge-m3` model (trained on over 100 languages, including Bangla and English).
- **HNSW Vector Cosine Distance Search**:
  Executes cosine distance calculation `(c.embedding <=> $1::vector)` accelerated by **HNSW graph indexes** (`idx_agenda_chunks_hnsw`):
  ```sql
  SELECT c.agenda_id, a.meeting_id, m.title, m.type, m.meeting_date,
         'agenda' as matched_in, c.chunk_text as snippet,
         (c.embedding <=> $1::vector) as distance
  FROM agenda_chunks c
  JOIN agenda a ON a.id = c.agenda_id
  JOIN meetings m ON m.id = a.meeting_id
  WHERE m.status = 'past' AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> $1::vector ASC
  LIMIT 30;
  ```
- **Result Assembly**: Results are appended with `tier: 2`, `match_type: 'semantic'`.

---

#### 3.2.5 Trigger-Based Cache Invalidation

Database trigger `clear_search_cache_trigger_fn()` in [`db/init.sql`](file:///media/samyo-pramanik/New%20Volume2/buet-ecouncil2/db/init.sql) clears `search_cache` entries automatically whenever meetings, agendas, annexures, tags, or invitees are mutated.

---

### 3.3 Asynchronous Vector Embedding Pipeline

Implementation: [`meeting_service/worker.js`](file:///media/samyo-pramanik/New%20Volume2/buet-ecouncil2/meeting_service/worker.js), [`meeting_service/utils/searchIndexer.js`](file:///media/samyo-pramanik/New%20Volume2/buet-ecouncil2/meeting_service/utils/searchIndexer.js)

1. When an agenda or resolution is created/updated, `indexAgendaContent()` enqueues a job on BullMQ queue `embedding-jobs`.
2. `embedding_worker` processes the queue asynchronously out-of-process.
3. **Cgroup Resource Throttling**: Before processing each job, `embedding_worker` polls container cgroup memory limits `/sys/fs/cgroup/memory.max` and CPU load averages. If free RAM $< 400\text{ MB}$ or load $> 85\%$, it delays the job using `job.moveToDelayed()` to prevent OOM kills.
4. **Reconciliation Sweep**: `startBackgroundIndexer()` periodically scans for un-indexed content (e.g., after bulk imports or service downtime).

---

### 3.4 PDF Generation & Typography Engine

Implementation: [`meeting_service/utils/pdfGenerator.js`](file:///media/samyo-pramanik/New%20Volume2/buet-ecouncil2/meeting_service/utils/pdfGenerator.js)

- **Browser Singleton**: Manages a shared Puppeteer Chromium browser instance with launch parameters `--no-sandbox --disable-dev-shm-usage` and auto-relaunch on disconnect.
- **Embedded Bangla Typography**: Loads `SonarBangla.ttf` or `Kalpurush.ttf` from disk at startup, encodes it into a `data:font/ttf;base64` string, and injects `@font-face` directly into HTML before rendering.
- **SSRF Protection**: Request interception blocks external network calls inside Puppeteer, only permitting navigation requests and local `data:` URIs.

---

### 3.5 MinIO S3 Object Storage & Media Proxy

Implementation: [`meeting_service/utils/storageService.js`](file:///media/samyo-pramanik/New%20Volume2/buet-ecouncil2/meeting_service/utils/storageService.js), [`nginx/nginx.conf`](file:///media/samyo-pramanik/New%20Volume2/buet-ecouncil2/nginx/nginx.conf)

1. Files uploaded as annexures are written to MinIO via `@aws-sdk/client-s3`.
2. File access is protected: `meeting_service` checks user authorization and issues temporary AWS SigV4 presigned URLs valid for 15 minutes.
3. NGINX proxies `/storage/` directly to MinIO, permitting signature validation while keeping MinIO administrative consoles hidden behind the internal network.

---

### 3.6 JSON Import & Regex Entity Resolution Engine

Implementation: [`frontend/lib/departmentMergeRules.ts`](file:///media/samyo-pramanik/New%20Volume2/buet-ecouncil2/frontend/lib/departmentMergeRules.ts), [`MERGE_RULES.md`](file:///media/samyo-pramanik/New%20Volume2/buet-ecouncil2/MERGE_RULES.md)

When historical meetings are uploaded via `JsonImportDialog`, input strings are matched against ordered regex patterns to resolve canonical university departments:

```typescript
export const DEPARTMENT_MERGE_RULES = [
    { pattern: /তড়িৎ|ইলেক/, target: "Electrical and Electronic Engineering" },
    { pattern: /কম্পিউটার/, target: "Computer Science and Engineering" },
    { pattern: /ইন্ডাষ্ট্রিয়াল|ইন্ড্রাষ্ট্রিয়াল|আই[,.\s]*পি[,.\s]*ই/, target: "Industrial and Production Engineering" },
    // ... Additional rules in priority order
];
```

---

### 3.7 Audit Logging & Session Management

- **Audit Logs**: Shared PostgreSQL `audit_logs` table tracking `userId`, `username`, `action`, `entityType`, `entityId`, `details` (JSONB), and `ipAddress`.
- **Active Session Management**: Users can inspect active device sessions, IP addresses, and remote locations, with the option to remotely terminate individual sessions or execute global logout across all devices (`/signout-all`).

---

## 4. API Endpoint Reference

### 4.1 Authentication Service (`/api/auth`)

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `POST` | `/api/auth/signin` | Public | Authenticate user and issue session token & cookie |
| `POST` | `/api/auth/signout` | Authenticated | Terminate current session |
| `POST` | `/api/auth/signout-all` | Authenticated | Terminate all sessions for the user |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile and role level |
| `PUT` | `/api/auth/me` | Authenticated | Update user email or change password |
| `GET` | `/api/auth/sessions` | Authenticated | List all active sessions for current user |
| `DELETE` | `/api/auth/sessions/:id` | Authenticated | Terminate a specific remote session |
| `POST` | `/api/auth/signup` | Editor/Admin | Create a new user account |
| `GET` | `/api/auth/users` | Editor/Admin | List user accounts |
| `PUT` | `/api/auth/users/:id` | Editor/Admin | Modify user details or role level |
| `PATCH` | `/api/auth/users/:id/status` | Editor/Admin | Change account status (`active`/`inactive`) |
| `DELETE` | `/api/auth/users/:id` | Editor/Admin | Delete a user account |
| `POST` | `/api/auth/upload-csv` | Admin | Transactional bulk import of users from CSV |
| `GET` | `/api/auth/download-csv` | Admin | Export all user accounts as CSV |
| `GET` | `/api/auth/roles` | Authenticated | List level roles |
| `POST` | `/api/auth/roles` | Editor/Admin | Create a new level role |
| `PUT` | `/api/auth/roles/reorder` | Editor/Admin | Reorder level roles |
| `PUT` | `/api/auth/roles/:id` | Editor/Admin | Update level role title or numeric level |
| `DELETE` | `/api/auth/roles/:id` | Editor/Admin | Delete a level role |
| `GET` | `/api/auth/settings` | Authenticated | Retrieve system settings |
| `PUT` | `/api/auth/settings` | Editor/Admin | Update system settings (`min_completed_level`) |

---

### 4.2 Meeting Service (`/api/meetings`, `/api/agendas`, etc.)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/meetings` | List council meetings (supports type/status filtering) |
| `POST` | `/api/meetings` | Create a new council meeting |
| `GET` | `/api/meetings/:id` | Get detailed meeting information including access rights |
| `PUT` | `/api/meetings/:id` | Update meeting title, date, or metadata |
| `DELETE` | `/api/meetings/:id` | Delete meeting and associated agendas/annexures |
| `POST` | `/api/meetings/:id/handover` | Hand over meeting section to higher level |
| `POST` | `/api/meetings/:id/send-back` | Send back meeting section to lower level |
| `POST` | `/api/meetings/:id/lock` | Lock a specific meeting section |
| `POST` | `/api/meetings/:id/unlock` | Unlock a locked meeting section |
| `POST` | `/api/meetings/:id/complete` | Finalize and complete meeting |
| `GET` | `/api/meetings/:id/agenda-pdf` | Download rendered Agenda Book PDF |
| `GET` | `/api/meetings/:id/resolution-pdf` | Download rendered Official Resolution PDF |
| `GET` | `/api/meetings/:id/resolution-status-pdf` | Download Resolution Status Report PDF |
| `POST` | `/api/agendas` | Add an agenda item to a meeting |
| `PUT` | `/api/agendas/:id` | Update agenda item content or resolution |
| `DELETE` | `/api/agendas/:id` | Remove agenda item |
| `POST` | `/api/agendas/reorder` | Reorder agenda items within a meeting |
| `GET` | `/api/agendas/:id/revisions` | View revision history for an agenda item |
| `POST` | `/api/agendas/:id/annexures` | Upload annexure attachment to an agenda item |
| `GET` | `/api/members` | List university council members |
| `POST` | `/api/members` | Add a new member |
| `PUT` | `/api/members/:id` | Update member information |
| `PUT` | `/api/members/reorder` | Reorder member seniority serials |

---

### 4.3 Search API (`/api/search`)

| Method | Endpoint | Query Parameters | Description |
|---|---|---|---|
| `GET` | `/api/search` | `q`, `scope`, `tags`, `dateFrom`, `dateTo`, `serialFrom`, `serialTo` | Execute 3-Tier Hybrid Search |

---

### 4.4 Storage API (`/storage`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/storage/:bucket/:key` | Proxied request to MinIO for file download/viewing via presigned URL |

---

### 4.5 Embedding Service API (`http://embedding_service:8002`)

| Method | Endpoint | Payload | Description |
|---|---|---|---|
| `GET` | `/health` | None | Returns status and active Hugging Face model |
| `POST` | `/embed` | `{"texts": ["text string"]}` | Computes 1024-dim normalized vector embeddings |

---

## 5. Frontend Architecture & Design System

The frontend application is built using **Next.js 15 App Router**, **TypeScript**, **Tailwind CSS**, and **SWR**.

> 📌 **FRONTEND ROUTE ARCHITECTURE NOTE**: There are **no `/admin/*` routes** in the application. All management dashboards, user administration, and organizational settings are housed within `/workspace/*`:

```
frontend/app/
├── login/                  -> Authentication page
├── workspace/              -> Workspace dashboard container
│   ├── meetings/           -> Meeting management table & controls
│   ├── users/              -> User accounts & Role Level management
│   ├── members/            -> Member registry & serial ordering
│   ├── departments/        -> Department catalog & alias rules
│   ├── offices/            -> Office registry
│   ├── faculties/          -> Faculty catalog
│   ├── templates/          -> Agenda & Resolution templates
│   └── audit-log/          -> Audit trail viewer
├── meetings/[id]/          -> Interactive multi-tab meeting editor
├── search/                 -> 3-Tier Hybrid Search interface
├── viewer/                 -> Read-only portal for council members
└── profile/                -> Profile, password & active session manager
```

- **Client-Side Permission Integration**:
  - `lib/meetingAccess.ts`: Mirror calculation helper providing boolean flags (`canEditAgenda`, `canSendBackAgenda`, `canLockAgenda`, etc.) consumed by UI components.
  - `components/meetings/MeetingWorkflowBar.tsx`: Dynamic action toolbar rendering Handover, Send-Back, Lock, and Unlock buttons based on permissions.

---

## 6. Development, Maintenance & Troubleshooting

### 6.1 Running via Docker Compose

#### Standard Mode Build & Run
```bash
# 1. Build container images
docker compose build

# 2. Build and start containers in background
docker compose up -d --build
```

#### Full Mode with AI Embeddings Build & Run
```bash
# 1. Build container images including embedding profile
docker compose --profile embeddings build

# 2. Build and start containers including embedding profile
docker compose --profile embeddings up -d --build
```

#### Container Management Commands
```bash
# View logs across all services
docker compose logs -f

# Check container health status
docker compose ps

# Rebuild single microservice
docker compose build meeting_service
docker compose up -d meeting_service

# Stop all services
docker compose down
```

---

### 6.2 Local Microservice Development Setup

1. Launch PostgreSQL, Redis, and MinIO via Docker Compose:
   ```bash
   docker compose up -d db redis minio createbuckets
   ```

2. Run `auth_service` locally:
   ```bash
   cd auth_service
   npm install
   npm run dev
   ```

3. Run `meeting_service` locally:
   ```bash
   cd meeting_service
   npm install
   npm run dev
   ```

4. Run `frontend` locally:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

### 6.3 Troubleshooting Guide

- **Redis Connection Errors in Embedding Worker**: Ensure Redis is running and healthcheck passes. Check `REDIS_URL` environment variable.
- **Puppeteer PDF Font Issues**: Verify that `SonarBangla.ttf` or `Kalpurush.ttf` exist in `meeting_service/utils/fonts/`.
- **MinIO Storage Presigned URL Failures**: Ensure `R3_ENDPOINT` and `R3_BUCKET_NAME` match between `.env` and `docker-compose.yml`.

---
*BUET E-Council Developer Specification — Version 2.0*
