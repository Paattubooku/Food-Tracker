# Agon Food Tracker

A modern, AI-powered food tracking application built with React, Vite, and Vercel Serverless Functions. It features instant meal scanning, nutritional estimation, and comprehensive health insights.

## 🚀 Features

- **AI Meal Scanning**: Snap a photo or upload an image to automatically identify food and estimate portions.
- **Multimodal AI Fallbacks**: Cascading logic using Gemini, Groq, OpenRouter, and Hugging Face to ensure 100% scanning uptime.
- **Micro-Macro Tracking**: Automatic calculation of Calories, Protein, Carbs, and Fats.
- **Interactive Dashboard**: Real-time progress monitoring and meal history.
- **Grocery & Insights**: Intelligent grocery list generation and health pattern analytics.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS (Vanilla CSS components)
- **Backend API**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase
- **AI Models**: Google Gemini 2.5 Flash, Llama 3.2 Vision (via Groq/OpenRouter), Qwen 2.5 (via HF)

## 📦 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/agon-food-tracker.git
   cd agon-food-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase and AI API keys.
   ```bash
   cp .env.example .env.local
   ```

### Running Locally

To run the full stack (Frontend + API):

1. **Start the local API server**:
   ```bash
   npm run server
   ```

2. **Start the frontend (Vite)**:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🚢 Deployment

The project is optimized for **Vercel**. Simply connect your GitHub repository to Vercel and it will automatically detect the serverless functions in the `/api` directory.

---

Built with ❤️ by [Your Name/Agon Team]
