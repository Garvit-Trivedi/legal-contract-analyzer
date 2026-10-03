# Legal Contract Analyzer ⚖️

<div align="center">
  <h3>Forensic Document Analysis & Agentic Smart Comparison</h3>
  <p>A production-ready AI Legal Assistant ensuring zero-hallucination citations and deep structural contract comparisons.</p>

  ![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)
  ![pgvector](https://img.shields.io/badge/pgvector-Cosine_Sim-000000?logo=postgresql&logoColor=white)
  ![Gemini Flash](https://img.shields.io/badge/Gemini_Flash-Lite-8E75B2?logo=google&logoColor=white)
  ![Drizzle](https://img.shields.io/badge/Drizzle_ORM-Verified-C5F74F?logo=drizzle&logoColor=black)
</div>

---

## 🌟 Visual Workflow Journey

The application strictly bounds all AI responses to verifiable extraction layers. The entire lifecycle—from upload to chat—is captured below.

```mermaid
flowchart TD
    %% Styling
    classDef user fill:#2563eb,stroke:#fff,stroke-width:2px,color:#fff
    classDef ai fill:#7e22ce,stroke:#fff,stroke-width:2px,color:#fff
    classDef db fill:#059669,stroke:#fff,stroke-width:2px,color:#fff
    classDef ui fill:#475569,stroke:#fff,stroke-width:2px,color:#fff

    subgraph "1. Ingestion Layer"
    U([User Uploads PDF/DOCX]):::user --> E[Text & Page Extraction]
    E --> C[Paragraph Chunking]
    C --> V[Generate Vector Embeddings]:::ai
    V --> DB[(PostgreSQL + pgvector)]:::db
    end

    subgraph "2. Retrieval & Verification Layer"
    UQ([User asks Question]):::user --> SR[Semantic Similarity Search]
    DB --> SR
    SR --> GM[Gemini RAG Analysis]:::ai
    GM --> VF{Substring Extraction & Verification Matrix}
    end

    subgraph "3. Forensic UI Layer"
    VF -- Passes --> H[Returns Precise Character Offsets]
    VF -- Fails --> NH[Returns Unverified Fallback Text]
    H --> UI[UI Renders 4-Column Workspace]:::ui
    UI --> J[User clicks citation ➔ Triggers auto-scroll to exact offset]:::user
    end
```

---

## 🛠 Feature Matrices

### Part A: Core Document RAG
| Status | Feature | Implementation Detail |
| :---: | :--- | :--- |
| ✅ | **File Ingestion** | Extracts PDF, DOCX, and TXT directly to chunks |
| ✅ | **Vector Storage** | Drizzle ORM pushing float arrays to `pgvector` |
| ✅ | **RAG Chat** | Server-Sent Event (SSE) streaming with Gemini |
| ✅ | **Verified Quotes** | String-matching intercepts AI quotes to map exact DB offsets |
| ✅ | **Failure Handlers** | Discards empty Scans gracefully without crashing |

### Part B: Comparison Engine
| Status | Feature | Implementation Detail |
| :---: | :--- | :--- |
| ✅ | **Side-by-Side** | Two synchronized `DocumentViewer` panes in a dark workspace |
| ✅ | **Sync Scrolling** | Mathematical ratio calculation preventing CSS lock-loops |
| ✅ | **Accessibility** | Strict `<del>` and `<ins>` tags eliminating color dependence |
| ✅ | **Agentic Isolation** | Chat physically scoped strictly to the two compared documents |
| ✅ | **Significance Filter**| AI classifies explicit diffs into HIGH / MEDIUM / LOW risks |

---

## 🚀 Getting Started

To operate this application locally, you must provide your own Postgres and Gemini credentials.

### 1. Environment Configuration
Create a `.env.local` containing:
```env
# Database (Must contain pgvector extension)
DATABASE_URL="postgres://username:password@aws-0-postgres.supabase.com:6543/postgres"

# AI Inference
GEMINI_API_KEY="your-google-studio-api-key"
GEMINI_MODEL="gemini-flash-lite-latest"
```

### 2. Execution Run-book
```bash
# 1. Install dependencies
npm install

# 2. Push Schema to Database
npm run db:push

# 3. Spin up Turbopack Server
npm run dev
```

The application mounts immediately at `http://localhost:3000`.

---

## 🔬 How To Evaluate

For engineering or architectural review, follow this rigid test path:

1. **Upload & Extract:** Upload a multi-page legal DOCX. Observe the DB index vectors in real-time.
2. **Interact:** Ask the Chat a specific question found on Page 3. 
3. **Verify Bounds:** Click the generated citation in the Chat. Watch the `DocumentViewer` immediately scroll to highlight the exact text bounds *(without guessing page coordinates)*.
4. **Compare:** Upload a `V2` of the same document featuring altered money values and missing clauses. Run the **Comparison Simulator** and verify that monetary deviations flag as **HIGH** risk impacts within the Left Sidebar navigation tree.
