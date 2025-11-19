-- 타점 데이터를 저장하는 테이블 생성
-- Supabase SQL Editor에서 이 스크립트를 실행하세요

CREATE TABLE IF NOT EXISTS hit_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 조율 오차 값 (Hz)
  tonic DECIMAL(10, 2) NOT NULL,
  octave DECIMAL(10, 2) NOT NULL,
  fifth DECIMAL(10, 2) NOT NULL,

  -- 톤필드 좌표
  coordinate_x DECIMAL(10, 6) NOT NULL,
  coordinate_y DECIMAL(10, 6) NOT NULL,

  -- 타점 속성
  strength DECIMAL(10, 2) NOT NULL,
  location VARCHAR(10) NOT NULL CHECK (location IN ('internal', 'external')),
  intent TEXT NOT NULL,

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_hit_points_created_at ON hit_points(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hit_points_location ON hit_points(location);

-- Row Level Security (RLS) 활성화
ALTER TABLE hit_points ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능하도록 정책 설정
CREATE POLICY "Enable read access for all users" ON hit_points
  FOR SELECT USING (true);

-- 모든 사용자가 삽입 가능하도록 정책 설정
CREATE POLICY "Enable insert access for all users" ON hit_points
  FOR INSERT WITH CHECK (true);

-- 모든 사용자가 삭제 가능하도록 정책 설정
CREATE POLICY "Enable delete access for all users" ON hit_points
  FOR DELETE USING (true);
