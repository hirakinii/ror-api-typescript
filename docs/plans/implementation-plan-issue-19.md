# Implementation Plan: `apiRoot` オプションの追加（Issue #19, v0.2.0）

## Overview

`RorClientOptions` に `apiRoot?: string` を追加し、ROR API の接続先を差し替えられるようにします。既定値は `https://api.ror.org` です。
想定している用途は、DMP Editor の nginx リバースプロキシ（`/ror-api/` → `https://api.ror.org`）を経由したアクセスです。
既存の利用者の挙動は変えないため、minor リリース（0.1.2 → 0.2.0）とします。

## Requirements

- `RorClientOptions.apiRoot?: string` を追加する。既定値は `https://api.ror.org` とする
- base URL ではなく **API ルート** を受け取り、各パスを後ろに連結する
  - `/v2/organizations`
  - `/heartbeat`
- 末尾のスラッシュ（複数ある場合も含む）を取り除いて正規化する
- `/ror-api` のような相対パスも受け付ける。そのため `new URL()` による検証はしない
- `BASE_URL` と `HEALTH_CHECK_URL` は互換性のため値と型を変えずに export し続ける
- `Client-Id` ヘッダの挙動は変えない

## Architecture

```
src/
  constants/urls.ts      # + DEFAULT_API_ROOT, ORGANIZATIONS_PATH, HEARTBEAT_PATH
  client/api-root.ts     # (new) normalizeApiRoot()
  client/ror-client.ts   # apiRoot option, this.baseUrl / this.healthCheckUrl
  index.ts               # + export DEFAULT_API_ROOT
tests/
  constants/urls.test.ts     # (new)
  client/api-root.test.ts    # (new)
  client/ror-client.test.ts  # + describe('apiRoot option')
```

## Design

### `src/constants/urls.ts`

```ts
/** Default ROR API root (scheme + host, no trailing slash). */
export const DEFAULT_API_ROOT = 'https://api.ror.org' as const;
/** Path of the organizations endpoint, relative to the API root. */
export const ORGANIZATIONS_PATH = '/v2/organizations' as const;
/** Path of the heartbeat endpoint, relative to the API root. */
export const HEARTBEAT_PATH = '/heartbeat' as const;

// Kept for backward compatibility; values must not change.
export const BASE_URL = 'https://api.ror.org/v2/organizations' as const;
export const HEALTH_CHECK_URL = 'https://api.ror.org/heartbeat' as const;
```

- `BASE_URL` / `HEALTH_CHECK_URL` は、型が変わらないように元のリテラルのまま残す。`tsconfig.json` の対象が `src` だけでテストが型チェックされず、`expectTypeOf` で型を確かめられないためである。新しい定数と値が一致することは、値のテスト（`tests/constants/urls.test.ts`）で担保する。

### `normalizeApiRoot(root: string): string`（`src/client/api-root.ts`）

1. `trim()` する
2. 空文字なら `Error` を投げる
3. `?` または `#` を含む場合は `Error` を投げる。そのまま連結すると URL が壊れるため
4. 末尾から走査するループで、末尾のスラッシュを除去する（正規表現は使わない。下記「Security Considerations」を参照）

### `RorClient`

- コンストラクタで `normalizeApiRoot(options?.apiRoot ?? DEFAULT_API_ROOT)` を 1 回だけ計算する。結果は `private readonly baseUrl` と `private readonly healthCheckUrl` に保持する
- 6 か所ある `BASE_URL` / `HEALTH_CHECK_URL` の参照を、上記のフィールドに置き換える
- `buildUrl`、`buildHeaders`、エラーメッセージの組み立て（`for ${url}`）は変更しない
- `apiRoot` の docstring（英語）に以下を記載する
  - 既定値
  - 相対パスは、`fetch` が相対 URL を解決できる環境（ブラウザ）でのみ使えること
  - 末尾のスラッシュは除去されること
  - `?` と `#` は使えないこと

### エッジケース

| 入力 | 結果 |
|---|---|
| 未指定 | `https://api.ror.org/v2/organizations` |
| `''` / `'   '` | `Error` |
| `'/'` | `/v2/organizations` |
| `'/ror-api'`, `' /ror-api '`, `'/ror-api///'` | `/ror-api/v2/organizations` |
| `'https://proxy.example.com/ror/'` | `https://proxy.example.com/ror/v2/organizations` |
| `'https://x.com?a=b'`, `'…#f'` | `Error` |

## Implementation Steps (TDD)

### Phase 1: RED — テストを先に書く

1. `tests/constants/urls.test.ts` で次を確かめる
   - `BASE_URL` と `HEALTH_CHECK_URL` の値・リテラル型が変わっていない
   - `DEFAULT_API_ROOT` の値が正しい
2. `tests/client/api-root.test.ts` で次を確かめる
   - 末尾スラッシュが 0 個・1 個・複数個のとき
   - `'/'` を渡したとき
   - 空文字・空白のみで throw する
   - `?` または `#` を含むと throw する
   - 前後の空白が trim される
3. `tests/client/ror-client.test.ts` に `describe('apiRoot option')` を追加する
   - 6 つの public メソッドそれぞれについて、`apiRoot: '/ror-api'` のときに `fetch` が受け取る URL を検証する
     - `/ror-api/heartbeat`
     - `/ror-api/v2/organizations`
     - `/ror-api/v2/organizations/01q15rk86`
     - `?query=` / `?filter=` / `?query=…&filter=…` を付けた形
   - 絶対 URL かつパス接頭辞付きのルート（`https://proxy.example.com/ror`）を検証する
   - 末尾スラッシュ付きのルートで、URL に `//` が混入しない
   - `apiRoot` を指定しないとき、URL が `BASE_URL` / `HEALTH_CHECK_URL` と完全に一致する（後方互換）
   - `apiRoot` を指定しても `Client-Id` ヘッダが付与される
   - 404 / 500 のときのエラーメッセージに、解決済みの URL（例: `/ror-api/v2/organizations/xxx`）が含まれる
   - `apiRoot: ''` を渡すとコンストラクタが throw する
4. `npm test` を実行し、追加したテストが FAIL することを確認する

### Phase 2: GREEN — 最小実装

`urls.ts` → `api-root.ts` → `ror-client.ts` → `index.ts` の順に実装する。

### Phase 3: REFACTOR / 検証

- 次のコマンドがすべて通ることを確認する
  - `npm run lint`
  - `npm run type-check`
  - `npm run test:coverage`（カバレッジ 80% 以上。正規化処理は全分岐を通すこと）
- E2E テストは本ライブラリ（UI なし）では対象外とする。nginx を経由した機関検索の動作確認は、DMP Editor 側の E2E で行う

### Phase 4: ドキュメント

- **README.md**
  - 「Using a Reverse Proxy (`apiRoot`)」節を追加する
    - 使用例: `new RorClient({ clientId: 'dmp-editor', apiRoot: '/ror-api' })`
    - nginx の設定例
  - 以下の注意事項を書く
    - 渡すのは API ルートであること
    - 相対パスはブラウザでのみ使えること
    - `?` と `#` は使えないこと
    - `apiRoot` に利用者の入力を渡してはならないこと
- **docs/specifications.md**: 次を追記する
  - 定数の定義
  - `apiRoot` の仕様
  - エッジケースの表
- **CHANGELOG.md**
  - `## [0.2.0]` の `### Added` に記載する
  - 末尾のリンク定義を修正する
    - 欠けている `[0.1.1]` / `[0.1.2]` / `[0.2.0]` を追加する
    - `[Unreleased]` を `v0.2.0...HEAD` に更新する

### Phase 5: リリース

1. feature ブランチで作業し、PR を作成して main へマージする
2. `npm version 0.2.0 --no-git-tag-version` で `package.json` と `package-lock.json` を更新する。続けて CHANGELOG の日付を確定させ、コミットする
3. `v0.2.0` タグを push する。`.github/workflows/cd.yml` が npm へ公開する
4. 公開された版で `apiRoot` の型が参照できることを確認してから、DMP Editor 側の依存を更新する

## Security Considerations

- `apiRoot` は開発者が設定する値です。エンドユーザーの入力を渡すと、リクエストを任意のホストへ誘導できてしまいます。README に明記します
- `Client-Id` ヘッダは `apiRoot` が指すホストへ送られます。信頼できるプロキシだけを指定してください
- `rorId`、`query`、`filter` の `encodeURIComponent` によるエンコードは維持します
- 当初は末尾のスラッシュの除去に正規表現 `/\/+$/` を使う予定でしたが、CodeQL が ReDoS（high）として検出しました。`/` が大量に続いた後に別の文字がある入力では、処理時間が入力長の 2 乗に比例します（50,000 文字で約 1.2 秒）。そこで、末尾から走査する線形時間のループに置き換え、回帰テストを追加しました
- 秘密情報は追加しません。エラーメッセージに含めるのは URL だけで、ヘッダの値は含めません

## Risks

| リスク | 対策 |
|---|---|
| `as const` のテンプレートリテラルがリテラル型にならない | 型テストで検出し、リテラルの直書きに戻す |
| Node.js で相対パスの `apiRoot` を指定すると、`fetch` が実行時に失敗する | ドキュメントで警告する |
| nginx の `proxy_pass` を HTTPS の上流へ向けるときに SNI / Host の設定が漏れる | README の nginx 例に `proxy_ssl_server_name on;` と `proxy_set_header Host api.ror.org;` を含める |

## Decisions

| # | 論点 | 決定 |
|---|---|---|
| Q1 | `apiRoot` が空文字・空白のみ | `Error` を投げる |
| Q2 | `apiRoot` が `?` / `#` を含む | `Error` を投げる |
| Q3 | Node.js 環境で相対ルートが渡された場合 | 検証しない（README で注意喚起する） |
| Q4 | 公開する定数 | `DEFAULT_API_ROOT` のみ。パス定数は内部用とする |

前提: 開発環境は Node.js 24.21.0 / npm 11.19.0 とする（#17 / PR #18 で `.nvmrc` と `devEngines` により固定）。
