<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🏢 Office Fish Hunter - AI Edition

A fun office-themed fishing game controlled by hand gestures, powered by Google Gemini AI and MediaPipe.

## ✨ Features

- 🎮 **Gesture Control**: Use hand gestures to play (Point to move, Palm to fish, Fist to catch)
- 🤖 **AI-Powered**: Gemini AI generates witty descriptions for caught items and boss lectures
- 🎯 **Avoid Detection**: Manage your risk level while slacking off at different workstations
- 🎨 **Modern UI**: Beautiful office-themed design with smooth animations

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- A webcam for gesture control
- Gemini API key (optional - game works without it, but with limited AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd office-slacker_-ai-edition
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Key (Optional but Recommended)**

   The game works without an API key, but AI features will be limited. To enable full AI features:
   
   - Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Copy the example environment file:
     ```bash
     cp .env.example .env.local
     ```
   - Edit `.env.local` and replace `your_api_key_here` with your actual API key:
     ```
     GEMINI_API_KEY=your_actual_api_key_here
     ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` (or the URL shown in terminal)

## 🎮 How to Play

- **☝️ Point with index finger** → Move your character around
- **🖐️ Show open palm** → Start fishing at a workstation
- **✊ Make a fist** → Catch the item (keep fist closed to view details, release to close)

## 🛠️ Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **MediaPipe** - Hand gesture recognition
- **Google Gemini AI** - Content generation
- **Tailwind CSS** - Styling

## 📝 Environment Variables

The game uses environment variables for configuration:

- `GEMINI_API_KEY` - Your Google Gemini API key (optional)

Create a `.env.local` file (see `.env.example` for template) to configure these.

**⚠️ Note**: Never commit your `.env.local` file to version control. It's already in `.gitignore`.

## 🔒 Security

- API keys are stored in `.env.local` which is ignored by Git
- Never share your API key publicly
- The `.env.local` file will never be committed to the repository

## 📦 Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 🌐 Deploy to GitHub Pages

The project is configured to automatically deploy to GitHub Pages when you push to the `main` branch.

### Automatic Deployment (Recommended)

1. Push your code to GitHub
2. Go to your repository Settings → Pages
3. Under "Source", select "GitHub Actions"
4. The workflow will automatically build and deploy when you push to `main`

Your game will be available at: `https://<username>.github.io/office-slacker_-ai-edition/`

### Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. If your repository name is different, update the `base` path in `vite.config.ts`:
   ```typescript
   base: '/your-repo-name/'
   ```

3. Push the `dist` folder to the `gh-pages` branch, or use GitHub Actions (already configured)

### Using the Deployed Game

1. Visit your GitHub Pages URL
2. Click the **⚙️ Set API Key** button in the top-left corner
3. Enter your Gemini API key (optional - game works without it)
4. Allow camera permissions when prompted
5. Start playing!

**Note**: API keys entered in the browser are stored locally and never sent to our servers.

## 🐛 Troubleshooting

- **Camera not working**: Make sure you grant camera permissions in your browser
- **AI features not working**: Check that your `.env.local` file exists and contains a valid `GEMINI_API_KEY`
- **Game not loading**: Make sure all dependencies are installed with `npm install`

## 📄 License

This project is open source and available for personal use.

## 🙏 Acknowledgments

- Powered by Google Gemini API
- Hand tracking by MediaPipe
- UI inspired by Booking.com design
