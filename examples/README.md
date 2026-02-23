# Examples

このディレクトリには `RorClient` の使用例が含まれています。

## 前提条件

依存パッケージをインストールしてください。

```bash
npm install
```

## ファイル一覧

### [basic-usage.ts](./basic-usage.ts)

`RorClient` の全メソッドを網羅したサンプルです。  
以下の7つの操作を順番に実行します。

| # | メソッド | 内容 |
|---|---------|------|
| 1 | `checkHealth()` | ROR API のヘルスチェックを行い、HTTP ステータスコードを返す |
| 2 | `listOrganizations()` | 組織の一覧を取得する |
| 3 | `getOrganizationById(id)` | ROR ID を指定して単一の組織を取得する (例: CERN) |
| 4 | `searchOrganizations(query)` | キーワードで組織を検索する (例: `"Harvard"`) |
| 5 | `filterOrganizations(filters)` | 国コードでフィルタリングする (例: `JP`) |
| 6 | `filterOrganizations(filters)` | ステータスでフィルタリングする (例: `active`) |
| 7 | `searchAndFilter(query, filters)` | キーワード検索とフィルタリングを組み合わせる |

**実行方法:**

```bash
npx tsx examples/basic-usage.ts
```

**出力例:**

```
=== RorClient Basic Usage Examples ===

--- 1. Health Check ---
Health check status: 200

--- 2. List Organizations ---
Fetched 20 organizations
First organization: https://ror.org/... Example University

--- 3. Get Organization by ID ---
Organization name: CERN
Status: active
Types: Facility, Nonprofit

...
```

## `RorClient` のオプション

```typescript
const client = new RorClient({
  clientId: 'my-app/1.0', // Client-Id リクエストヘッダーに送信するアプリ識別子 (任意)
});
```

`clientId` を設定すると、すべてのリクエストに `Client-Id` ヘッダーが付与されます。  
ROR API の利用規約に従い、アプリケーションを識別できる値を設定することを推奨します。

## フィルタキー一覧

`filterOrganizations` および `searchAndFilter` で使用できるフィルタキーは以下のとおりです。

| キー | 説明 |
|-----|------|
| `status` | 組織のステータス (`active` / `inactive` / `withdrawn`) |
| `types` | 組織の種別 (`Education`, `Facility`, `Nonprofit` など) |
| `locations.geonames_details.country_code` | 国コード (ISO 3166-1 alpha-2, 例: `JP`, `US`, `DE`) |
| `locations.geonames_details.country_name` | 国名 (例: `Japan`, `United States`) |
| `locations.geonames_details.continent_code` | 大陸コード (例: `AS`, `EU`, `NA`) |
| `locations.geonames_details.continent_name` | 大陸名 (例: `Asia`, `Europe`) |
