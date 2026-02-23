# ROR REST API TypeScript クライアント機能仕様書

## 1. 概要

本仕様書は、Research Organization Registry (ROR) が提供する REST API (v2) と通信するための TypeScript クライアントライブラリの機能およびデータインターフェースを定義するものです。

## 2. 定数定義

クライアント内で使用する基準となる URL は以下の通りです。

* **BASE_URL**: `https://api.ror.org/v2/organizations`
* **HEALTH_CHECK_URL**: `https://api.ror.org/heartbeat`

## 3. データモデル (TypeScript インターフェース)

添付された JSON スキーマに基づき、ROR レコードの型定義を行います。以下の仕様を満たすインターフェースを実装します。

* ROR レコードのルートオブジェクト（`Organization`）は、`admin`、`id`、`locations`、`names`、`status`、`types` を必須プロパティとして持ちます。
* `status` は `active`、`inactive`、`withdrawn` のいずれかの文字列を取ります。
* `types` は `education`、`funder`、`healthcare`、`company`、`archive`、`nonprofit`、`government`、`facility`、`other` から選ばれる文字列の配列です。
* `id` は `https://ror.org/0...` の形式の文字列です。
* `admin` オブジェクトは、`created` と `last_modified` のプロパティを必須で持ち、それぞれに `date` と `schema_version` (1.0, 2.0, 2.1 のいずれか) を含みます。

```typescript
// ROR レコードのメインインターフェース
export interface RorOrganization {
  admin: { // Container for administrative information about the record
    created: {
      date: string; // the date when the record was created
      schema_version: "1.0" | "2.0" | "2.1" // the schema version in effect when the record was created
    };
    last_modified: { 
      date: string; // the date when the information in the record was last modified
      schema_version: "1.0" | "2.0" | "2.1" // the schema version in effect when the information in the record was last modified
    }; 
  };
  domains?: string[]; // The domains registered to a particular institution
  established?: number | null; // The year the organization was established, written as four digits (YYYY)
  external_ids?: Array<{ // Other identifiers for the organization
    all: string[]; //
    type: "fundref" | "grid" | "isni" | "wikidata"; // type of external identifiers
    preferred?: string | null; //
  }>;
  id: string; // Unique ROR ID for the organization
  links?: Array<{ value: string; type: "website" | "wikipedia" }>; // The organization's website and Wikipedia page
  locations: Array<{ // The location of the organization
    geonames_id: number; //
    geonames_details: {
      name: string; //
      lat?: number | null; // latitude
      lng?: number | null; // longitude
      continent_code?: "AF" | "AN" | "AS" | "EU" | "NA" | "OC" | "SA" | null; // Continent code
      continent_name?: "Africa" | "Antarctica" | "Asia" | "Europe" | "Oceania" | "South America" | "North America" | null; // Continent name
      country_code?: string | null; // Country code
      country_name?: string | null; // Country name
      country_subdivision_code?: string | null; //
      country_subdivision_name?: string | null; //
    };
  }>;
  names: Array<{ // Names the organization goes by
    value: string; //
    types: Array<"acronym" | "alias" | "label" | "ror_display">; // types of names
    lang?: string | null; //
  }>;
  relationships?: Array<{ // Related organizations in ROR
    type: "related" | "parent" | "child" | "successor" | "predecessor"; // type of relationships
    id: string; //
    label: string; //
  }>;
  status: "active" | "inactive" | "withdrawn"; // Whether the organization is active
  types: Array<"education" | "funder" | "healthcare" | "company" | "archive" | "nonprofit" | "government" | "facility" | "other">; // Organization type
}

```

## 4. クライアント機能要件

### 4.1. ヘルスチェック機能

* **HTTP メソッド / URL**: `GET HEALTH_CHECK_URL`
* **処理内容**: ROR API サービスの稼働状態を確認します。
* **戻り値**: HTTP レスポンスコード (例: `200` なら正常稼働)。

### 4.2. 全レコード一覧取得

* **HTTP メソッド / URL**: `GET BASE_URL`
* **処理内容**: ROR に登録されている organization レコードの一覧を取得します。
* **戻り値**: `RorOrganization[]` (ROR レコードのリスト)

### 4.3. ROR ID 指定検索

* **HTTP メソッド / URL**: `GET BASE_URL/{ror_id}`
* **処理内容**: 特定の ROR ID に合致するレコードを取得します。
* **戻り値**: `RorOrganization[]` (ROR レコードのリスト)

### 4.4. フィルター検索

* **HTTP メソッド / URL**: `GET BASE_URL?filter=filter1:XXX,filter2:YYY`
* **処理内容**: 指定された条件でレコードを絞り込みます。対応するフィルターキーは以下の通りです。
    * `status`: レコードのステータスによる絞り込み。
    * `types`: 組織タイプによる絞り込み。
    * `locations.geonames_details.country_code`: 国コードによる絞り込み。
    * `locations.geonames_details.country_name`: 国名による絞り込み。
    * `locations.geonames_details.continent_code`: 大陸コードによる絞り込み。
    * `locations.geonames_details.continent_name`: 大陸名による絞り込み。
* **戻り値**: `RorOrganization[]`

### 4.5. キーワード検索

* **HTTP メソッド / URL**: `GET BASE_URL?query=<keyword>`
* **処理内容**: 指定したキーワードを用いてレコードを検索します。
* **戻り値**: `RorOrganization[]`

### 4.6. キーワード・フィルター複合検索

* **HTTP メソッド / URL**: `GET BASE_URL?query=<keyword>&filter=<filters>`
*(※要件定義には `?query=<keyword>?filter=...` とありましたが、URLクエリパラメータの正しい記法に従い2つ目以降のパラメータ連結は `&` を使用する形に修正しています)*
* **処理内容**: キーワード検索とフィルター検索を同時に適用し、条件に合致するレコードを取得します。
* **戻り値**: `RorOrganization[]`

### 4.7. クライアント ID ヘッダーの送信

* **処理内容**: 全てのリクエストにおいて、呼び出し元を識別するための `Client-Id` ヘッダーを付与できるようにします。
* **リクエストヘッダー**: `Client-Id: <CLIENT_ID>`

### 4.8. レートリミット制御機能

* **処理内容**: API 側の制限（400 requests/min）を超過しないよう、クライアント内部でリクエストの実行回数を制御します。
* **実装仕様**:
* 1分間に400回を超えるリクエストが発生した場合、スロットリング（待機処理）を行うか、エラーをスローして実行をブロックします。
* 必要に応じて、HTTP 429 (Too Many Requests) レスポンスを受け取った際のリトライ機構（Exponential Backoff など）を設けます。
