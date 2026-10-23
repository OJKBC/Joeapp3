# くく ヒーロー（Joeapp3）

九九（いまは 2のだん・5のだん）を、音声で聞いて 0〜9 のボタンで答えるアプリ。

- 流れ：「にいちが」→ こたえを押す →「に！」→「にいちがに」→ 次の「ににんが」…
- まちがい：ブブー＋カードがゆれて、問題をもう一度読む。2回まちがえると、次に押すボタンが光る
- 9問おわるとクリア画面（九九の表・まちがえた所に×）。クリア回数はホームの⭐
- 読み方の修正・段の追加は `config.js` の `DANS`
- 起動：`python3 serve.py`（ポート8002）→ iPad は同じWi-Fiで `http://<MacのIP>:8002/index.html`
- config.js・app.js は毎回最新を読む（index.html 末尾で ?t=時刻）。index.html 自体(CSS含む)は公開版だと最大10分古いことがある

## JOEの声の録音（rec.html）
- **Macで** `python3 serve.py` を起動 → Mac のブラウザで `http://localhost:8002/rec.html`（iPad の Safari は http ではマイク不可）
- 1問ごとに「もんだい(にいちが)」「こたえ(に！)」「とおして(にいちがに)」の3つ。2のだん27個＋5のだん27個（「じゅう」は共通なので実際は53個）
- スペースキー＝録音開始/停止。止めると前後の無音カット・音量そろえ→保存→自動再生。だめならもう一度録れば上書き
- 保存先 `voice/*.wav`＋`voice/manifest.json`。保存は Mac 自身からのみ受け付ける（serve.py）
- アプリは録った声があればそれを、なければ読み上げ音声を鳴らす（ホームに戻るたびに読み直す）
- `voice/` も git に含めて公開している（2026-10-22 ユーザー判断で公開に同意）

## 公開
- https://ojkbc.github.io/Joeapp3/ （GitHub Pages・リポジトリ OJKBC/Joeapp3 は public）
- 録音は Mac のローカル（rec.html）で → `git add -A && git commit && git push` で数十秒後に反映
- 公開版の rec.html は保存できない（保存はローカルの serve.py のみ）
