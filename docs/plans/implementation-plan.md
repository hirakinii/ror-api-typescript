# Implementation Plan: ROR REST API TypeScript Client

## Overview

ROR (Research Organization Registry) REST API v2 と通信する TypeScript クライアントライブラリを実装します。
TDD (Test-Driven Development) スタイルに従い、テストファースト・最小実装・リファクタリングのサイクルで開発します。
ライブラリとして提供し、型安全なインターフェース、レートリミット制御、Client-Id ヘッダー送信をサポートします。

## Requirements

- `RorOrganization` 型定義（仕様書 `specifications.md` の Section 3 に準拠）
- ヘルスチェック機能（GET `https://api.ror.org/heartbeat`）
- 全レコード一覧取得（GET `/v2/organizations`）
- ROR ID 指定検索（GET `/v2/organizations/{ror_id}`）
- フィルター検索（`?filter=key:value,...`）
- キーワード検索（`?query=<keyword>`）
- キーワード・フィルター複合検索（`?query=...&filter=...`）
- `Client-Id` リクエストヘッダーの付与
- レートリミット制御（400 requests/min）

## Technology Stack

| 用途 | パッケージ |
|---|---|
| 言語 | TypeScript >= 5.9 |
| ランタイム | Node.js |
| テスト | `vitest` |
| スキーマバリデーション | `zod` |
| Linter | `eslint` |
| Formatter | `prettier` |

## Architecture

```
src/
  types/
    ror-organization.ts       # RorOrganization インターフェース・型定義
  constants/
    urls.ts                   # BASE_URL, HEALTH_CHECK_URL
  client/
    rate-limiter.ts           # レートリミット制御ロジック
    ror-client.ts             # ROR API クライアント本体
  index.ts                    # 公開 API のバレルエクスポート

tests/
  types/
    ror-organization.test.ts  # 型ガード・バリデーションのテスト
  client/
    rate-limiter.test.ts      # レートリミッターの単体テスト
    ror-client.test.ts        # クライアントの単体テスト（HTTP モック）
  integration/
    ror-client.integration.test.ts  # 実 API への統合テスト（オプション）
```

## Implementation Steps

### Phase 0: プロジェクトセットアップ　→　完了

#### Step 0-1: テストフレームワーク・依存関係のインストール

- **Action**: `vitest`、`zod`、および関連開発依存パッケージをインストールする
  ```bash
  npm install --save-dev vitest @vitest/coverage-v8
  npm install zod
  ```
- **Why**: TDD を実施するために、最初にテストランナーを用意する
- **Dependencies**: なし
- **Risk**: Low

#### Step 0-2: `package.json` スクリプトの整備

- **Action**: `package.json` の `scripts` を以下のように更新する
  ```json
  {
    "scripts": {
      "test": "vitest run",
      "test:watch": "vitest",
      "test:coverage": "vitest run --coverage",
      "build": "tsc",
      "lint": "eslint src tests",
      "format": "prettier --write src tests",
      "type-check": "tsc --noEmit"
    }
  }
  ```
- **Why**: `npm run test` / `npm run build` 等を許可コマンドとして利用できるようにする
- **Dependencies**: Step 0-1
- **Risk**: Low

#### Step 0-3: `tsconfig.json` の更新

- **Action**: `tsconfig.json` を Node.js ライブラリ向けに調整する
  - `rootDir: "./src"`, `outDir: "./dist"` を有効化
  - `module: "nodenext"` は維持、`types: ["node"]` を追加
  - `jsx` 設定（React 向け）を削除
- **Why**: ライブラリとして正しくビルドできる設定にする
- **Dependencies**: なし
- **Risk**: Low

#### Step 0-4: `vitest.config.ts` の作成

- **Action**: カバレッジ閾値（80%）を設定した vitest 設定ファイルを作成する
  ```typescript
  // vitest.config.ts
  export default {
    test: {
      coverage: {
        provider: 'v8',
        threshold: { lines: 80, functions: 80, branches: 80, statements: 80 },
      },
    },
  }
  ```
- **Why**: 80% 以上のカバレッジを強制する
- **Dependencies**: Step 0-1
- **Risk**: Low

---

### Phase 1: 型定義の実装（TDD）

#### Step 1-1: [RED] 型ガードのテストを書く

- **File**: `tests/types/ror-organization.test.ts`
- **Action**: `isRorOrganization(value: unknown): value is RorOrganization` 関数のテストを実装する
  - 必須プロパティ（`admin`、`id`、`locations`、`names`、`status`、`types`）が揃っている場合に `true` を返すテスト
  - 各必須プロパティが欠けている場合に `false` を返すテスト
  - `status` が規定外の文字列の場合に `false` を返すテスト
  - `types` の各要素が規定外の文字列の場合に `false` を返すテスト
- **Why**: 型定義を実装する前にテスト仕様を確立する（TDD: RED フェーズ）
- **Dependencies**: Step 0-2
- **Risk**: Low

#### Step 1-2: [GREEN] 型定義・型ガードを実装する

- **File**: `src/types/ror-organization.ts`
- **Action**: 仕様書 Section 3 の `RorOrganization` インターフェースと、`zod` スキーマ、型ガード関数を実装する
  ```typescript
  // src/types/ror-organization.ts
  export interface RorOrganization { ... }
  export const rorOrganizationSchema = z.object({ ... });
  export function isRorOrganization(value: unknown): value is RorOrganization { ... }
  ```
- **Why**: テストが PASS する最小限の実装を行う（TDD: GREEN フェーズ）
- **Dependencies**: Step 1-1
- **Risk**: Low

---

### Phase 2: 定数定義

#### Step 2-1: URL 定数の実装

- **File**: `src/constants/urls.ts`
- **Action**: `BASE_URL` と `HEALTH_CHECK_URL` を定数として定義する
  ```typescript
  export const BASE_URL = "https://api.ror.org/v2/organizations" as const;
  export const HEALTH_CHECK_URL = "https://api.ror.org/heartbeat" as const;
  ```
- **Why**: マジックストリングを排除し、URL を一元管理する
- **Dependencies**: なし
- **Risk**: Low

---

### Phase 3: レートリミッターの実装（TDD）

#### Step 3-1: [RED] レートリミッターのテストを書く

- **File**: `tests/client/rate-limiter.test.ts`
- **Action**: `RateLimiter` クラスのテストを実装する
  - 400回未満のリクエストでは待機しないこと
  - 400回目のリクエストで待機（またはエラースロー）すること
  - 1分経過後は制限がリセットされること
  - `vi.useFakeTimers()` を使用して時間を制御する
- **Why**: レートリミットロジックを実装前にテスト仕様を確立する（TDD: RED）
- **Dependencies**: Step 0-4
- **Risk**: Medium（タイマーモックの複雑さ）

#### Step 3-2: [GREEN] レートリミッターを実装する

- **File**: `src/client/rate-limiter.ts`
- **Action**: `RateLimiter` クラスを実装する
  ```typescript
  // src/client/rate-limiter.ts
  export class RateLimiter {
    private readonly maxRequests: number;   // 400
    private readonly windowMs: number;      // 60000ms (1分)
    private requestCount: number;
    private windowStart: number;

    async throttle(): Promise<void> { ... }
  }
  ```
  - 1分間に400回を超えた場合は次の 1分ウィンドウ開始まで待機する
  - HTTP 429 受信時の Exponential Backoff リトライ機構も含める
- **Why**: テストが PASS する最小限の実装（TDD: GREEN）
- **Dependencies**: Step 3-1
- **Risk**: Medium

---

### Phase 4: ROR API クライアントの実装（TDD）

#### Step 4-1: [RED] ヘルスチェックのテストを書く（4.1）

- **File**: `tests/client/ror-client.test.ts`
- **Action**: `vi.stubGlobal('fetch', ...)` または `vi.mock` で HTTP をモックし、`checkHealth()` のテストを書く
  - 200 レスポンス時に `200` を返すこと
  - ネットワークエラー時に例外をスローすること
- **Why**: TDD: RED フェーズ
- **Dependencies**: Step 0-4
- **Risk**: Low

#### Step 4-2: [RED] 全レコード一覧取得のテストを書く（4.2）

- **File**: `tests/client/ror-client.test.ts`（継続）
- **Action**: `listOrganizations()` のテストを書く
  - `GET BASE_URL` が呼ばれること
  - レスポンスが `RorOrganization[]` として返ること
  - `Client-Id` ヘッダーが付与されること（クライアント生成時に ID を指定した場合）
- **Why**: TDD: RED フェーズ
- **Dependencies**: Step 4-1
- **Risk**: Low

#### Step 4-3: [RED] ROR ID 指定検索のテストを書く（4.3）

- **File**: `tests/client/ror-client.test.ts`（継続）
- **Action**: `getOrganizationById(rorId: string)` のテストを書く
  - `GET BASE_URL/{ror_id}` が呼ばれること
  - 存在しない ID の場合の挙動（404 → エラースロー）
- **Why**: TDD: RED フェーズ
- **Dependencies**: Step 4-2
- **Risk**: Low

#### Step 4-4: [RED] フィルター検索のテストを書く（4.4）

- **File**: `tests/client/ror-client.test.ts`（継続）
- **Action**: `filterOrganizations(filters: FilterParams)` のテストを書く
  - `GET BASE_URL?filter=status:active` のように URL が構築されること
  - 複数フィルターが `,` で連結されること
  - サポートされていないフィルターキーが拒否されること（型レベル）
- **Why**: TDD: RED フェーズ
- **Dependencies**: Step 4-3
- **Risk**: Low

#### Step 4-5: [RED] キーワード検索・複合検索のテストを書く（4.5, 4.6）

- **File**: `tests/client/ror-client.test.ts`（継続）
- **Action**: `searchOrganizations(query: string)` と `searchAndFilter(query: string, filters: FilterParams)` のテストを書く
  - `?query=<keyword>` が URL に含まれること
  - `?query=...&filter=...` が正しく連結されること
- **Why**: TDD: RED フェーズ
- **Dependencies**: Step 4-4
- **Risk**: Low

#### Step 4-6: [GREEN] ROR クライアントを実装する

- **File**: `src/client/ror-client.ts`
- **Action**: 上記すべてのテストが PASS する `RorClient` クラスを実装する
  ```typescript
  // src/client/ror-client.ts
  export interface RorClientOptions {
    clientId?: string;  // Client-Id ヘッダー値
  }

  export type FilterKey =
    | "status"
    | "types"
    | "locations.geonames_details.country_code"
    | "locations.geonames_details.country_name"
    | "locations.geonames_details.continent_code"
    | "locations.geonames_details.continent_name";

  export type FilterParams = Partial<Record<FilterKey, string>>;

  export class RorClient {
    constructor(options?: RorClientOptions) { ... }
    async checkHealth(): Promise<number> { ... }
    async listOrganizations(): Promise<RorOrganization[]> { ... }
    async getOrganizationById(rorId: string): Promise<RorOrganization> { ... }
    async filterOrganizations(filters: FilterParams): Promise<RorOrganization[]> { ... }
    async searchOrganizations(query: string): Promise<RorOrganization[]> { ... }
    async searchAndFilter(query: string, filters: FilterParams): Promise<RorOrganization[]> { ... }

    private buildHeaders(): Record<string, string> { ... }
    private buildFilterString(filters: FilterParams): string { ... }
    private async fetchWithRateLimit(url: string): Promise<Response> { ... }
  }
  ```
- **Why**: すべての RED テストを PASS させる（TDD: GREEN フェーズ）
- **Dependencies**: Step 2-1, Step 3-2, Step 1-2, Step 4-1 〜 4-5
- **Risk**: Medium

#### Step 4-7: [REFACTOR] クライアントのリファクタリング

- **Action**: コードの重複排除、`fetch` ラッパーの共通化、エラーハンドリングの整理
- **Why**: TDD: REFACTOR フェーズ。テストが引き続き PASS することを確認しながら実施する
- **Dependencies**: Step 4-6
- **Risk**: Low

---

### Phase 5: バレルエクスポートとビルド確認

#### Step 5-1: `index.ts` の作成

- **File**: `src/index.ts`
- **Action**: ライブラリの公開 API をバレルエクスポートする
  ```typescript
  export type { RorOrganization } from "./types/ror-organization.js";
  export { RorClient } from "./client/ror-client.js";
  export type { RorClientOptions, FilterParams, FilterKey } from "./client/ror-client.js";
  export { BASE_URL, HEALTH_CHECK_URL } from "./constants/urls.js";
  ```
- **Why**: ライブラリ利用者が単一エントリポイントからインポートできるようにする
- **Dependencies**: Phase 1〜4 完了後
- **Risk**: Low

#### Step 5-2: ビルド・型チェックの確認

- **Action**: `npm run build` および `npm run type-check` を実行し、エラーがないことを確認する
- **Why**: 配布可能なライブラリとして完成させる
- **Dependencies**: Step 5-1
- **Risk**: Low

---

### Phase 6: セキュリティチェック

- **Action**: `~/.claude/rules/security.md` のチェックリストに従い、以下を確認する
  - ハードコードされたシークレットがないこと（`Client-Id` は環境変数またはコンストラクタ引数で受け取る）
  - 外部入力（`rorId`、`query`、`filters`）がそのまま URL に埋め込まれる際に URL エンコードされること
  - エラーメッセージに機密情報が含まれないこと
- **Dependencies**: Phase 5 完了後
- **Risk**: Low

---

## Testing Strategy

| テスト種別 | 対象ファイル | 内容 |
|---|---|---|
| 単体テスト | `tests/types/ror-organization.test.ts` | 型ガード・バリデーション関数 |
| 単体テスト | `tests/client/rate-limiter.test.ts` | レートリミットロジック（フェイクタイマー使用） |
| 単体テスト | `tests/client/ror-client.test.ts` | 各 API メソッド（fetch モック使用） |
| 統合テスト | `tests/integration/ror-client.integration.test.ts` | 実 API との疎通確認（CI では任意） |

## Risks & Mitigations

- **Risk**: `fetch` グローバルが Node.js バージョンによっては利用不可
  - Mitigation: `@types/node` の `node >= 18` を前提とする。必要に応じて `node-fetch` を追加
- **Risk**: レートリミッターのタイマー制御がテストで不安定になる
  - Mitigation: `vi.useFakeTimers()` を必ず使用し、`vi.advanceTimersByTime()` で時間を制御する
- **Risk**: ROR API のレスポンス構造がスキーマと異なる（フィールドの追加・変更）
  - Mitigation: `zod` の `.passthrough()` または `.strip()` を使い、未知フィールドを柔軟に扱う
- **Risk**: URL エンコードの漏れによる検索クエリの破損
  - Mitigation: `URLSearchParams` を使って自動エンコードする

## Success Criteria

- [ ] `npm run test` が全テスト PASS（RED → GREEN 確認済み）
- [ ] `npm run test:coverage` でカバレッジが 80% 以上
- [ ] `npm run build` が成功し `dist/` にコンパイル済みファイルが生成される
- [ ] `npm run type-check` がエラーなし
- [ ] `npm run lint` がエラーなし
- [ ] 全 API メソッドが `RorOrganization` 型で型安全に動作する
- [ ] セキュリティチェックリストをすべてクリア
- [ ] `Client-Id` ヘッダーが全リクエストに付与される
- [ ] レートリミット（400 req/min）が正しく機能する
