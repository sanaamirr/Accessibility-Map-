# ♿ AccessMap

**Check if a place works for you *before* you leave home.**

AccessMap shows how accessible everyday places are (cafés, parks, restaurants, hospitals, malls, libraries, museums) for people with disabilities and health conditions. Built for the **DSH v2 Hackathon, theme: AI × Healthcare**.

- 🌐 **Live demo:** `https://YOUR-SITE.netlify.app` *(paste your link here)*
- 🎬 **Demo video:** *(paste your link here)*

---

## The problem

For a wheelchair user, someone with low vision, or a person who gets overwhelmed by noise, a trip can fail at the door: steps with no ramp, no accessible washroom, no first-aid kit. Today the only way to find out is to turn up and see, or phone around. Accessibility is a health-equity problem, and the information is hard to find.

## What it does

- 🗺️ Shows places on a map. Each pin shows an **accessibility score** (0 to 100).
- ✅ Each place lists 7 features: wheelchair entrance, accessible washroom, emergency supplies, accessible parking, step-free paths or lift, braille and tactile signs, quiet space.
- 🔎 **Filter** by type of place and by the features you must have.
- ✨ **Ask AI in plain English**, for example:
  - *"I use a wheelchair and need a café with an accessible washroom"*
  - *"I'm blind, where can I eat out?"*
  - *"Somewhere calm for my autistic son, like a park"*
- ⌨️ The app itself is accessible: works with a keyboard, has screen-reader labels, uses high-contrast colours, and never shows status by colour alone.

## Where is the AI?

People don't think in filters, they describe their situation. The AI (Claude) **turns that sentence into filters**.

> **The AI only understands the question. It never writes facts about a place.**
> Every answer comes from `places.json`, so the app can't "hallucinate" a ramp that isn't there. That matters in healthcare.

If there is no API key, or the AI call fails, the app **automatically falls back to keyword matching**, so the demo never breaks.

---

## 🚀 Deploy on Netlify (step by step)

You need: a free [GitHub](https://github.com) account, a free [Netlify](https://www.netlify.com) account, and an Anthropic API key (optional; without it the site runs in keyword mode).

### Step 1: Put the project on GitHub

1. On GitHub click **New repository**, name it `accessmap`, and create it (leave it empty).
2. In a terminal, inside this project folder:

```bash
git init
git add .
git commit -m "AccessMap for DSH v2 hackathon"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/accessmap.git
git push -u origin main
```

*(No terminal? On the new repo page choose **uploading an existing file** and drag in everything from this folder, including the `public` and `netlify` folders.)*

### Step 2: Create the site on Netlify

1. Log in to Netlify (**Sign up with GitHub** is easiest).
2. Click **Add new site → Import an existing project → GitHub** and pick your `accessmap` repo.
3. Leave the build settings as they are. Netlify reads them from `netlify.toml` (publish folder `public`, no build command).
4. Click **Deploy**. After about a minute your site is live at a `something.netlify.app` address.

> Don't use drag-and-drop deploys for this project. They are meant for plain static sites, so the AI function would be left out. Use GitHub (above) or the CLI (below).

### Step 3: Add your API key (this switches the AI on)

1. In Netlify open your site → **Site configuration → Environment variables**.
2. **Add a variable**: key `ANTHROPIC_API_KEY`, value = your key. Keep the scope so that it includes **Functions** (the default).
3. Save.

### Step 4: Redeploy so the key takes effect

Netlify only applies new variables to **new** deploys. Go to **Deploys → Trigger deploy → Deploy site** and wait for it to finish.

### Step 5: Check that it works

1. Open `https://YOUR-SITE.netlify.app/api/ai-search`. You should see `{"ai_enabled":true}`.
2. Open the site. The header badge should say **✨ AI search: on**.
3. Type *"I use a wheelchair and need a café with an accessible washroom"* and press **Ask AI**.

Do the same sentence once more before you record the video: the first AI request after a quiet period can be a little slower.

### Step 6 (optional): A nicer address

**Site configuration → Site details → Change site name**, for example `accessmap-dsh`.

### Alternative: deploy with the Netlify CLI (no GitHub needed)

```bash
npm install -g netlify-cli
netlify login
netlify init                      # create & link a new site
netlify env:set ANTHROPIC_API_KEY "your-key-here"
netlify deploy --prod
```

### ⚠️ Protect your API key

The key itself stays secret (it only lives in Netlify, never in the web page), but your site address is public, so anyone who has it can use the AI search and spend your credits. For a hackathon:
- use a **separate API key** just for this project,
- set a **low spend limit** for it in the Anthropic Console,
- delete the key after judging.

### Troubleshooting

| What you see | What to do |
|---|---|
| Badge says "offline mode" | The key is missing, or you didn't redeploy after adding it (Step 4). |
| `/api/ai-search` shows "Not Found" | The function wasn't deployed. Check that `netlify/functions/ai-search.mjs` is in your repo at exactly that path, then redeploy. |
| Map is blank grey | Map tiles need internet. Check your connection and refresh. |
| "Ask AI" still works but says "Keyword search:" | The AI call failed (wrong key, no credits). The app falls back on purpose. Check **Logs → Functions** in Netlify. |

---

## Project structure (what each file does)

```
accessmap/
├── README.md                    ← this file
├── netlify.toml                 ← tells Netlify what to publish
├── package.json                 ← project info + the test command
├── .env.example                 ← template for your key (local use only)
├── .gitignore                   ← files Git should NOT upload (like your real .env)
├── public/                      ← the website (this is what Netlify serves)
│   ├── index.html               ← the page layout
│   ├── style.css                ← colours, spacing, accessibility styling
│   ├── app.js                   ← the browser logic: map, filters, cards, "Ask AI" button
│   ├── search.js                ← scoring, filtering and the offline keyword search
│   ├── config.js                ← the list of features and place types
│   └── data/
│       └── places.json          ← the places and their accessibility features
├── netlify/
│   └── functions/
│       └── ai-search.mjs        ← the AI part (a Netlify Function)
└── tests/
    ├── search.test.js           ← checks scoring, filtering, keyword search
    └── function.test.js         ← checks the AI function (with a pretend AI)
```

### The website (`public/`)

| File | In simple words |
|---|---|
| `index.html` | The **skeleton** of the page: header, "Ask AI" box, filters, results list and the map area. |
| `style.css` | The **looks**: colours, cards, pins, and the visible focus outline for keyboard users. Stacks the layout on phones. |
| `app.js` | The **behaviour**. Draws the map, builds the filters, shows places as cards and pins, and handles the "Ask AI" button. Plain JavaScript, no build step. |
| `search.js` | The **data brain**. Calculates each place's score (features it has ÷ 7 × 100), filters places, and does the offline keyword search. No AI here, so facts always come from the data. |
| `config.js` | The **lists**: which accessibility features and place types exist, with their labels, icons and meanings. Used by both the website and the AI function, so you edit it in one place. |
| `data/places.json` | The **data**. One entry per place: name, type, map position, description, and `true`/`false` for each feature. To add a place, copy an entry and edit it. |

### The AI function (`netlify/functions/`)

| File | In simple words |
|---|---|
| `ai-search.mjs` | The **AI helper**. A small piece of server code that Netlify runs for you at `/api/ai-search`. It sends the user's sentence to Claude, asks for filters back as JSON, and double-checks the answer (only known features allowed). It exists so your API key stays secret on the server instead of sitting in the web page. If anything goes wrong it returns an error and the website uses keyword search instead. |

### Other files

| File | In simple words |
|---|---|
| `netlify.toml` | Two lines of settings for Netlify: publish the `public` folder, find functions in `netlify/functions`. |
| `package.json` | Project name, plus the `npm test` command. Has no dependencies to install. |
| `.env.example` | A template. For running on your own computer only; on the live site you add the key in the Netlify dashboard instead. |
| `.gitignore` | Keeps secrets and junk (like `.env`) out of GitHub. |
| `tests/` | Automated checks. Run them with `npm test` (needs Node 20 or newer). |
| `DEMO_SCRIPT.md` | A step-by-step script for a 2 to 3 minute demo video. |

---

## How the pieces talk to each other

```
 Browser (public/)                          Netlify
┌─────────────────────────┐   POST        ┌───────────────────────────┐
│ "I use a wheelchair and │  /api/ai-     │ ai-search.mjs             │
│  need a café…"          │  search       │   └─► Claude              │
│                         │ ────────────► │       (sentence → filters)│
│ app.js applies filters  │ ◄──────────── │                           │
│ to places.json (in the  │  {type,       └───────────────────────────┘
│ browser) → cards + pins │   features}
└─────────────────────────┘
   If the AI is unavailable → search.js keyword matching instead
```

---

## Run it on your own computer (optional)

**Quick look, keyword search only** (needs Node):

```bash
npx serve public
```

Then open the address it prints.

**With the AI**, use the Netlify CLI, which runs the function locally:

```bash
npm install -g netlify-cli
cp .env.example .env        # paste your ANTHROPIC_API_KEY inside
netlify dev                 # then open http://localhost:8888
```

**Run the tests:** `npm test`

**Change the map location:** edit `MAP_CENTER` at the top of `public/app.js`, and the `lat` / `lng` values in `public/data/places.json`.

## About the data

The places in `places.json` are **fictional sample data** for the demo. They are not real businesses. Real-world use needs verified data.

## What's next

- 👥 **Community reports:** let users add and verify accessibility details, with a "last verified" date.
- 📍 **Real data:** import from OpenStreetMap, which already has wheelchair tags for many places.
- 🧭 **Route planning:** step-free routes between places.
- 🗣️ **Voice input** and more languages (including Urdu).
- 🔔 **More needs:** hearing loops, sign-language support, accessible medical equipment.
