# Dragon Tiger Eric

A browser-based Dragon Tiger card game played with **virtual credits only**. No real money, no backend, no API keys. Built with plain HTML, CSS and JavaScript so it runs on GitHub Pages.

## How to play

1. You start with 1,000 credits.
2. Choose **Dragon**, **Tiger** or **Tie**, then choose a bet amount.
3. Click **Place Bet**. Two cards are drawn from a freshly shuffled 52-card deck and revealed.
4. Card values: Ace = 1, 2–10 = face value, J = 11, Q = 12, K = 13. The higher card wins; equal values are a Tie.
5. Click **New Round** to play again, or **Reset Balance** to start over.

| Bet | Pays |
|---|---|
| Dragon | 1:1 |
| Tiger | 1:1 |
| Tie | 8:1 |

A win plays a victory fanfare and a loss plays a sad tone (use **Sound** to mute). The scoreboard has three tabs: **Big Road**, **Bead Plate** and **Stats**.

A Tie result loses Dragon and Tiger bets. Balance and the last 120 results are saved in your browser's `localStorage`.

## Run locally

Open `index.html` in any modern browser. No build step or server is needed.

To check the game logic, open the browser console and run `runSelfTests()`.

## Upload to GitHub

1. Create a new **public** repository on GitHub, for example `dragon-tiger`.
2. Upload the files so that `index.html` is at the repository root:
   - Web: click **Add file → Upload files**, drag in `index.html`, `style.css`, `script.js` and `README.md`, then **Commit changes**.
   - Command line:
     ```bash
     git init
     git add .
     git commit -m "Add Dragon Tiger game"
     git branch -M main
     git remote add origin https://github.com/YOUR-USERNAME/dragon-tiger.git
     git push -u origin main
     ```

## Enable GitHub Pages

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Select branch **main** and folder **/ (root)**, then click **Save**.
4. Wait a minute or two for the first deployment.

## Public link

```
https://YOUR-USERNAME.github.io/dragon-tiger/
```

Replace `YOUR-USERNAME` with your GitHub username and `dragon-tiger` with your repository name. All file paths are relative, so the game works at this address with no extra configuration.

## Files

- `index.html` – page structure
- `style.css` – casino styling, card flip animation, responsive layout
- `script.js` – deck, shuffle, betting, payouts, history, storage
