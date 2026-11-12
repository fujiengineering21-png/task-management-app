---
name: start-servers
description: TaskBoard の開発用サーバー（データベース 5433・APIサーバー 8080・画面 Vite 5173）を、決まったポートでだけ起動・停止する手順。ポートが使われていたら、番号を変えずに、使っているプロセスを確かめて止めてから起動する。別のポートでの起動は、一時的にも確認のためでもしない。「サーバーを起動して」「バックエンドを動かして」「画面を立ち上げて」「bootRun して」「npm run dev して」「curl で試して」「画面で確かめて」「Address already in use」「Port 5173 is in use」のとき、また動作確認のためにサーバーを動かす必要があるときは、頼まれていなくても必ずこのスキルを使う。
---

# サーバーの起動と停止（TaskBoard）

## 決まったポート

| 対象 | ポート | 起動のしかた | 待ち受ける場所 |
|---|---|---|---|
| データベース（Docker の PostgreSQL 17） | 5433 | リポジトリ直下で `docker compose up -d` | 127.0.0.1 |
| APIサーバー（Spring Boot） | 8080 | `cd backend` → `./gradlew bootRun` | 127.0.0.1 |
| 画面（Vite） | 5173 | `cd frontend` → `npm run dev` | localhost |

**この番号は変えない。** 画面の中継先（Vite の proxy）、文書に書いた URL、ユーザーが開くブックマークが、すべてこの番号を前提にしている。別の番号で動かすと、画面が古いサーバーにつながったり、ユーザーが別のサーバーを見て「確かめた」と思い込んだりする。だから、ポートが使われていても別の番号に逃げず、使っているものを止めて、この番号で起動する。

次のことはしない（`.claude/settings.json` の拒否リストでも止めている）。

- `--port`（Vite）、`--server.port`・`-Dserver.port`・`SERVER_PORT=`（Spring Boot）、`TASKBOARD_DB_PORT=`（Docker）で番号を変える
- `vite.config.ts`・`application.properties`・`compose.yaml`・`.env` のポート番号を書き換える
- Vite が「Port 5173 is in use」のあとに勝手に選んだ別の番号（5174 など）を、そのまま使う

## 手順

### 1. 3つのポートの空きを先に確かめる

```bash
for p in 5433 8080 5173; do echo "== $p"; lsof -nP -iTCP:$p -sTCP:LISTEN || echo "空いている"; done
```

### 2. 使われていたら、何のプロセスかを確かめる

```bash
ps -o pid,ppid,etime,command -p <PID>
lsof -a -p <PID> -d cwd -Fn      # そのプロセスの作業フォルダ（このリポジトリの中か）
```

見分けたら、次の表のとおりに扱う。迷ったら止めずにユーザーに聞く。

| 使っているもの | 扱い |
|---|---|
| Claude がこの会話で裏で起動したサーバー | その場で止める |
| TaskBoard のもの（作業フォルダがこのリポジトリ、`TaskBoardApplication`・`bootRun`、このリポジトリの `vite`） | `kill <PID>`（ふつうの停止）で止める |
| 5433 の TaskBoard のコンテナ（`docker compose ps` に `taskboard-db-1` が healthy で出る） | 競合ではない。そのまま使う |
| 別のアプリ・別のプロジェクトのもの | **止めずに**、何が使っているかを伝えて「止めてよいか」をユーザーに聞く。OK なら止めて決まった番号で起動する。NG なら起動しない（別の番号でも起動しない） |
| `kill` で止まらない | `kill -9` は、ユーザーに確かめてから |

- APIサーバーは、Gradle の裏方（daemon）の下で Java が 8080 を使っている。止めるのは、8080 を使っている Java のプロセス。
- データベースは、`docker compose down -v` を絶対に使わない（データが消える）。止めるなら `docker compose stop`。
- 5432 番は別のプロジェクト用の PostgreSQL（Homebrew）。TaskBoard では使わず、止めたり変えたりしない。

### 3. 止まったことを確かめる

手順1のコマンドをもう一度実行し、「空いている」と出るまで待つ（数秒〜10秒）。空かないまま起動しない。

### 4. 決まったポートで起動する

起動は、データベース → APIサーバー → 画面 の順。サーバーは裏で（バックグラウンドで）動かす。

**データベース**

```bash
docker info > /dev/null 2>&1 || open -a Docker    # Docker Desktop が止まっていたら開く
docker compose up -d
docker compose ps                                  # STATUS が (healthy) になるまで待つ
```

**APIサーバー**（Claude のシェルは PATH が最小なので、JAVA_HOME を指定する）

```bash
cd backend
export JAVA_HOME=/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home
./gradlew bootRun          # バックグラウンドで実行する
```

起動を待って確かめる（`sleep` を使わずに、つながるまで2秒おきに試す）。

```bash
curl -s --retry 30 --retry-connrefused --retry-delay 2 http://127.0.0.1:8080/actuator/health
# {"status":"UP"} なら動いている
```

**画面**（`frontend/` があるときだけ。まだないときは、そう伝えて飛ばす）

```bash
cd frontend
npm run dev                # バックグラウンドで実行する
curl -s -o /dev/null -w '%{http_code}\n' --retry 15 --retry-connrefused --retry-delay 1 http://localhost:5173/
```

- `vite.config.ts` に `server.strictPort: true` があれば、5173 が使われているとき Vite は別の番号に逃げずに止まる。
- 起動のログに 5173 以外の番号が出たら、すぐにそのサーバーを止めて、手順2に戻る。

### 5. 起動したことを伝える

どのサーバーを、どのポートで、どのプロセス番号で起動したかと、開く URL を伝える。

- 画面：http://localhost:5173
- API の動作確認：http://127.0.0.1:8080/actuator/health

### 6. 確認が終わったら止める

確認のために Claude が起動したサーバー（APIサーバー・画面）は、作業の終わりに必ず止め、手順1でポートが空いたことを確かめる。8080 番に、裏のサーバーを残したままにしない。データベースのコンテナは、頼まれない限り動かしたままにしてよい（止めるなら `docker compose stop`。データは残る）。

## うまく動かないとき

| 出るもの | 原因 | すること |
|---|---|---|
| `Port 8080 was already in use` | 8080 が使われている | 手順2 |
| `Port 5173 is in use` | 5173 が使われている | 手順2（別の番号では起動しない） |
| `127.0.0.1:5433 への接続が拒絶されました` | データベースが動いていない | 手順4のデータベース |
| エラーに `${TASKBOARD_DB_PORT}` がそのまま出る | `.env` が見つからない | ユーザーに `.env` があるか確かめてもらう（中身は表示しない） |
| health が `{"status":"DOWN"}` | 起動したあとでデータベースが止まった | `docker compose up -d`。戻るまで30秒ほど |
