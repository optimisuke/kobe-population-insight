-- kobe-population-insight スキーマ
-- TiDB Cloud Serverless で実行する

CREATE DATABASE IF NOT EXISTS kobe_population
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kobe_population;

-- 人口統計テーブル
CREATE TABLE IF NOT EXISTS population (
  id         BIGINT       PRIMARY KEY AUTO_INCREMENT,
  year       INT          NOT NULL,
  ward       VARCHAR(100),
  age_group  VARCHAR(100),
  metric     VARCHAR(100) NOT NULL COMMENT 'population | transfer_in | transfer_out | projection',
  value      BIGINT       NOT NULL,
  INDEX idx_year_metric (year, metric),
  INDEX idx_ward        (ward),
  INDEX idx_age_group   (age_group)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 政策文書チャンクテーブル
CREATE TABLE IF NOT EXISTS policy_chunks (
  id           BIGINT        PRIMARY KEY AUTO_INCREMENT,
  source_title VARCHAR(255)  NOT NULL,
  source_url   TEXT,
  page_number  INT,
  chunk_text   TEXT          NOT NULL,
  embedding    VECTOR(1536)  COMMENT 'hnsw(distance=cosine)',
  FULLTEXT INDEX ft_chunk_text (chunk_text)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
