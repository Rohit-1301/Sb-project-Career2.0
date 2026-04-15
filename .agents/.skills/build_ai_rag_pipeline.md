# Skill: Build AI RAG Pipeline

## Objective

Your goal as the AI Engineer is to design, implement, and integrate a complete Retrieval-Augmented Generation (RAG) pipeline for the application, replacing all dummy logic with real AI-driven outputs.

---

## Rules of Engagement

* **Strict RAG Architecture**:

  * You MUST separate:

    * Embedding logic
    * Retrieval logic
    * Generation logic

* **Model Separation**:

  * Use embedding model ONLY for vector generation
  * Use LLM ONLY for response generation

* **Tech Stack Compliance**:

  * Backend: FastAPI
  * Vector DB: Supabase PostgreSQL (pgvector)
  * Orchestration: LangChain
  * Embeddings: Google Gemini
  * Generation: Gemini or fine-tuned model (Hugging Face)

* **No Dummy Logic**:

  * Completely remove all placeholder scoring or fake outputs

* **Structured Output**:

  * All AI responses MUST be returned in structured JSON format

---

## Responsibilities

1. **Data Processing**

   * Load job dataset from CSV
   * Clean and normalize job data
   * Extract relevant fields (title, description, skills)

2. **Embedding Pipeline**

   * Generate embeddings using Gemini
   * Store embeddings in Supabase (pgvector)

3. **Vector Retrieval**

   * Implement similarity search using pgvector
   * Retrieve top-k relevant jobs based on user profile

4. **User Profile Processing**

   * Combine:

     * user profile
     * resume text
   * Convert into embedding

5. **RAG Context Construction**

   * Merge retrieved jobs + user profile into structured prompt

6. **LLM Generation**

   * Generate:

     * Match Score
     * Matching Skills
     * Missing Skills
     * Suggestions

7. **Optimization**

   * Minimize API calls
   * Use caching where possible

---

## Instructions

1. **Read Specification**

   * Open `production_artifacts/Technical_Specification.md`

2. **Implement AI Services**
   Create modular services inside:

   app_build/backend/services/

   Files to create:

   * embedding_service.py
   * retrieval_service.py
   * rag_pipeline.py
   * llm_service.py

3. **Database Integration**

   * Use Supabase client
   * Store and query embeddings using pgvector

4. **LangChain Integration**

   * Use chains for:

     * retrieval
     * prompt construction
     * generation

5. **API Integration**

   * Connect pipeline to:
     POST /api/job-fit

6. **Replace Dummy Logic**

   * Remove all mock scoring
   * Replace with real AI outputs

---

## Output Requirements

* Fully working RAG pipeline
* Modular backend services
* FastAPI integration
* Clean, reusable code
* JSON-based AI responses

---

## Expected Output Format

{
"match_score": number,
"matching_skills": [],
"missing_skills": [],
"suggestions": []
}

---

## Constraints

* Must use pgvector (VECTOR type)
* Must not mix embedding and generation models
* Must be production-ready
* Must integrate with existing backend
* Must be scalable and cost-efficient

---

## Final Goal

Transform the system from a dummy UI-based job matcher into a fully functional AI-powered job recommendation system using RAG, real data, and intelligent insights.
