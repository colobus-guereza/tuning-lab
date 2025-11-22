# 해머링 타법 시스템 (Hammering Type System)

## 개요

피아노 조율 시 타격 방향과 오차 크기에 따라 최적의 해머링 타법을 자동으로 결정하는 시스템입니다.

## 해머링 타법 종류

### 1. SNAP (튕겨치기)
- **용도**: 미세한 조율 오차 조정
- **내부 타격**: 1.0Hz 이하
- **외부 타격**: 5.0Hz 이하
- **특징**: 빠르고 가벼운 타격으로 미세 조정

### 2. PULL (당겨치기)
- **용도**: 중간 정도의 조율 오차 조정
- **내부 타격만 해당**: 1.0Hz ~ 5.0Hz
- **특징**: 현을 당기는 느낌의 중간 강도 타격
- **주의**: 외부 타격에는 PULL 타법이 없음

### 3. PRESS (눌러치기)
- **용도**: 큰 조율 오차 조정
- **내부 타격**: 5.0Hz 이상
- **외부 타격**: 5.0Hz 초과
- **특징**: 강하고 지속적인 압력으로 큰 변화 유도

## 결정 로직

### 내부 타격 (rawHz < 0, 상향 조율)
```
|rawHz| ≤ 1.0  → SNAP (튕겨치기)
1.0 < |rawHz| < 5.0 → PULL (당겨치기)
|rawHz| ≥ 5.0  → PRESS (눌러치기)
```

### 외부 타격 (rawHz > 0, 하향 조율)
```
|rawHz| ≤ 5.0  → SNAP (튕겨치기)
|rawHz| > 5.0  → PRESS (눌러치기)
```

## 구현 위치

### 1. 물리 계산 (`lib/TuningPhysicsConfig.ts`)

```typescript
export const PHYSICS_CONFIG = {
  // ... 기존 설정 ...

  HAMMERING_RULES: {
    INTERNAL: {
      SNAP_LIMIT: 1.0,   // 1.0Hz 이하 튕겨치기
      PRESS_START: 5.0   // 5.0Hz 이상 눌러치기
    },
    EXTERNAL: {
      SNAP_LIMIT: 5.0    // 5.0Hz 이하 튕겨치기
    }
  },
};

export function calculateImpactPower(
  rawHz: number,
  coord: { x: number; y: number },
  mode: "tonic" | "octave" | "fifth"
): {
  force: number;
  count: number;
  hammeringType: "SNAP" | "PULL" | "PRESS"
}
```

### 2. UI 표시 (`app/page.tsx`)

- 한글 매핑: `SNAP → "튕겨치기"`, `PULL → "당겨치기"`, `PRESS → "눌러치기"`
- 카드 뷰: 강도 × 타수와 함께 타법 표시
- 예시: `36.3 × 2 (눌러치기)`

### 3. 톤필드 캔버스 (`app/components/TonefieldCanvas.tsx`)

- 타점 라벨에 타법 표시
- 선택된 타점 정보에 타법 포함

### 4. 데이터베이스 스키마

```sql
-- 마이그레이션 파일: migrations/add_hammering_type_field.sql
ALTER TABLE hit_points
ADD COLUMN IF NOT EXISTS hammering_type TEXT
CHECK (hammering_type IN ('SNAP', 'PULL', 'PRESS'));
```

## 데이터베이스 마이그레이션 적용

### Supabase Dashboard 사용

1. Supabase 프로젝트 대시보드 접속
2. **SQL Editor** 메뉴 선택
3. `migrations/add_hammering_type_field.sql` 파일 내용 복사
4. SQL Editor에 붙여넣기
5. **Run** 버튼 클릭

### Supabase CLI 사용

```bash
# 마이그레이션 파일 적용
supabase db push

# 또는 특정 파일 실행
supabase db execute --file migrations/add_hammering_type_field.sql
```

## 사용 예시

### 예시 1: 토닉 -3.2Hz (내부 타격)
- **오차**: -3.2Hz (음수 = 내부 타격)
- **절대값**: 3.2Hz
- **조건**: 1.0 < 3.2 < 5.0
- **결과**: **PULL (당겨치기)**

### 예시 2: 5도 +17.7Hz (외부 타격)
- **오차**: +17.7Hz (양수 = 외부 타격)
- **절대값**: 17.7Hz
- **조건**: 17.7 > 5.0
- **결과**: **PRESS (눌러치기)**

### 예시 3: 옥타브 -0.8Hz (내부 타격)
- **오차**: -0.8Hz (음수 = 내부 타격)
- **절대값**: 0.8Hz
- **조건**: 0.8 ≤ 1.0
- **결과**: **SNAP (튕겨치기)**

## 물리적 근거

### SUS430 스테인레스 특성
- 임계값(Threshold_C): 20.0
- 안전 한계: 42.0 (임계값 × 2.1)
- 30mm 망치 기준

### 타법별 에너지 전달
1. **SNAP**: 순간적 충격, 미세 변형
2. **PULL**: 지속적 견인력, 중간 변형
3. **PRESS**: 강한 압력, 큰 변형

## 참고 자료

- 물리 엔진 설정: `lib/TuningPhysicsConfig.ts`
- 데이터베이스 스키마: `lib/supabase.ts`
- 작업 요청서: 사용자 제공 문서 (2025-11-22)
