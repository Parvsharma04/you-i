# 📄 PRODUCT REQUIREMENT DOCUMENT (PRD)

## Product Name: him&her

---

## 🧠 Overview  
him&her is a lightweight, viral-ready compatibility quiz app where two people answer questions and receive an AI-generated compatibility score.

No login required. The experience is fast, shareable, and designed for social/viral usage.

---

## 🎯 Goals  
- Enable instant quiz creation (no friction)  
- Create a 2-person shared experience via link  
- Generate fun + insightful compatibility results using LLM  
- Optimize for virality (sharing + repeat usage)  

---

## 👤 Target Users  
- Couples / talking stage / friends  
- Social media users (Instagram, WhatsApp sharing)  
- Gen Z / college crowd  

---

## 🧩 Core Features  

### 1. Quiz Creation Flow  
- Select category (Love, Friendship, Deep Talk, Fun, Spicy)  
- Select number of questions (5, 10, 15, 20)  
- CTA: Start Quiz  

### 2. Session Creation  
- Generate session_id  
- Generate shareable link  
- User becomes Player 1 (Host)  

### 3. Invite Flow  
- Host shares link  
- Second user joins as Player 2  
- Only 2 participants allowed  

### 4. Quiz Experience  
- Turn-based answering  
- Progress bar  
- Question display  
- Input (MCQ/text)  

### 5. Answer Storage  
```
{
  session_id,
  question_id,
  player_1_answer,
  player_2_answer
}
```

### 6. Compatibility Scoring (LLM)  
- Generate score (0–100)  
- Summary  
- Strengths  
- Weak areas  

### 7. Results Page  
- Compatibility Score  
- AI summary  
- Strengths & Differences  
- Share CTA  

---

## 🤖 LLM Prompt  

```
You are an AI relationship analyst.

Two users answered the following questions:

<Question + Player 1 Answer + Player 2 Answer>

Your task:
1. Analyze compatibility
2. Assign score (0–100)
3. Generate summary, strengths, differences

Tone: playful, Gen Z

Output:
{
  "score": number,
  "summary": "...",
  "strengths": ["..."],
  "differences": ["..."]
}
```

---

## 🖥️ Frontend  

- Next.js (App Router)  
- Mobile-first  
- Pages: Landing, Lobby, Quiz, Results  
- Real-time sync  

---

## ⚙️ Backend  

- Nest.js / Serverless  
- REST APIs  

### Endpoints  

POST /session/create  
POST /session/join  
POST /answer  
GET /question  
POST /result/generate  

---

## 🗄️ Database  

### Sessions  
- id  
- category  
- question_count  
- status  
- created_at  

### Answers  
- session_id  
- question_id  
- player_id  
- answer  

---

## 🔄 Real-Time Sync  
- WebSockets / Firebase / Supabase  

---

## 📈 Scalability  
- Stateless APIs  
- Cache questions  
- Queue LLM calls  

---

## 🚀 Viral Hooks  
- Shareable result cards  
- Funny summaries  
- WhatsApp sharing  

---

## 🔒 MVP Constraints  
- No authentication  
- Max 2 users  

---

## 🧪 Future Enhancements  
- Login  
- History  
- Voice answers  
- Leaderboards  

---

## 💡 Vision  
Zero-friction, shareable compatibility game powered by AI.
