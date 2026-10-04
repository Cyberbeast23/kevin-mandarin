# Kevin's Mandarin

Daily Mandarin practice (Simplified Chinese, Hanyu Pinyin, English). Each lesson is a self-contained HTML page. Audio is Mainland Mandarin neural TTS (`zh-CN-XiaoxiaoNeural`), slowed for listening.

## Live

- Hub: https://cyberbeast23.github.io/kevin-mandarin/
- Day 1 (2026-10-04): https://cyberbeast23.github.io/kevin-mandarin/lessons/2026-10-04/mandarin.html

## Adding a new day

1. Create `lessons/YYYY-MM-DD/mandarin.html`. Back link: `../../index.html`.
2. Add word mp3s under `audio/mandarin/` and point each card's `data-audio` at a filename. Reuse `audio/mandarin/player.js`.
3. Append the new words to `used-words.txt`.
4. Link the day from `index.html` (newest first).
5. Commit and push to `main`. GitHub Pages serves the repo root.

Record-and-compare audio stays in the browser for that visit only. Nothing is uploaded.
