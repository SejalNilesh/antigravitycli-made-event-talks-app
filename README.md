# BigQuery Release Notes Tracker

A sleek, responsive, and modern web application that fetches, parses, and formats the official Google Cloud BigQuery Release Notes feed, enabling users to search, filter, and share updates on X (formerly Twitter).

Built using a **Python Flask** backend and a **plain vanilla HTML, CSS, and JavaScript** frontend.

---

## 🛠️ Project Description

The **BigQuery Release Notes Tracker** aggregates updates from the official Google Cloud feed. Instead of displaying a dense, unformatted XML document, it breaks releases down into discrete, categorized updates (e.g., **Feature**, **Issue**, **Changed**, **Deprecated**, **General Update**). 

### Features
* **Granular Extraction**: Parses single release dates into individual, styled item cards.
* **Server-side Caching**: Implements a 5-minute memory cache to avoid rate limits and load pages instantly.
* **Advanced Share on X**: 
  * Select a single card to generate a clean, pre-formatted update tweet.
  * Select multiple cards to generate a bulleted summary tweet.
  * Adjust text live with an interactive composer containing character counters, circular progress rings, and a mockup tweet visualizer.
* **Modern Interface**: Designed with a premium dark theme, radial blur glow backdrops, interactive checkboxes, and subtle micro-animations.

---

## 📋 Steps Done

1. **Backend Caching & XML Parsing**: Implemented robust Atom XML parsing and a caching mechanism in `app.py` to scrape `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`.
2. **Web Page Template**: Created `templates/index.html` laying out the header, statistical insights panel, filtering controls, feed stream, and tweet composer modal.
3. **CSS Design System**: Created `static/css/style.css` defining the visual system, variable tokens, glowing overlay effects, skeleton loaders, and responsive views.
4. **JS Interactivity Layer**: Coded `static/js/app.js` to manage UI states, search queries, multi-select toggles, and modal metrics (character boundaries).
5. **Git Version Control & Deployment**: Added a `.gitignore` file, initialized a local git repository, committed all files, authenticated via GitHub CLI (`gh`), and successfully created and pushed to the public repository `antigravitycli-made-event-talks-app`.

---

## 🚀 How to Recreate This Project with Antigravity CLI (User's Perspective)

Follow these steps to build and push this application from scratch using the **Antigravity CLI** agent.

### 1. Prerequisites
Before starting, ensure you have the following installed on your machine:
- **Python 3.10+** (with `pip` and `flask` packages installed)
- **Git**
- **GitHub CLI (`gh`)**
- **Antigravity CLI** set up in your terminal environment.

### 2. Step-by-Step Walkthrough

#### Step A: Initialize Workspace
Create a folder for your project and open your terminal or command prompt inside it.

#### Step B: Request Project Creation
Prompt the Antigravity CLI agent to initialize the Flask server and parser.
* **Example prompt to the agent:**
  > "Please build a web application using Python Flask and plain vanilla HTML, JavaScript and CSS that fetches the BigQuery Release notes from https://docs.cloud.google.com/feeds/bigquery-release-notes.xml. Include a refresh button with a spinner, and support caching the feed for 5 minutes. Let me select specific updates and compose a tweet about them."

The agent will automatically create:
- `app.py` for backend routing, memory-based caching, and feed parsing.
- `templates/index.html` for frontend markup.
- `static/css/style.css` for typography, custom colors, gradients, and layout.
- `static/js/app.js` for state management, filters, and composer modal logic.

#### Step C: Add a Gitignore File
Ask the agent to create a `.gitignore` to keep python caches and configuration folders out of source control.
* **Example prompt to the agent:**
  > "Create a .gitignore file for this project."

#### Step D: Authenticate with GitHub
To allow the agent to push the repository to GitHub, open a separate terminal window and run:
```powershell
gh auth login
```
Choose **GitHub.com** -> **HTTPS** -> **Login with a web browser** and follow the prompts to authenticate your account.

#### Step E: Push to GitHub via CLI
Once logged in, return to your session with the Antigravity CLI agent and request to initialize git and push the files.
* **Example prompt to the agent:**
  > "I have logged in. Please initialize a local git repository, make an initial commit, and create a new public GitHub repository named 'antigravitycli-made-event-talks-app' and push the codebase."

The CLI agent will automatically initialize the git repository, commit the files, run `gh repo create`, link the remote, and push the code!

---

## 🏃 Running the Application

1. Open your terminal in the project directory.
2. Start the Flask server:
   ```powershell
   python app.py
   ```
3. Visit the dashboard at [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.
