# 복합 타점 시스템 (Compound Target System)

## 개요

복합 타점 시스템은 하나의 타격으로 두 개의 주파수를 동시에 조율할 수 있는 경우를 명확하게 표시하고 저장하는 기능입니다.

## 핵심 개념

### 1. Primary & Auxiliary 타겟

- **Primary Target**: 가중치 점수가 가장 높은 주파수 (메인 타겟)
  - 토닉: 점수 = eT × 6
  - 옥타브: 점수 = eO × 3
  - 5도: 점수 = eF × 2

- **Auxiliary Target**: 벡터 계산에 실제로 협력한 주파수 (보조 타겟)
  - 조건: 부호가 같아야 함 (협력 관계)
  - X축(5도) 힘이 0이 아니고, Primary가 5도가 아니면 → 5도가 Auxiliary
  - Y축(토닉/옥타브) 힘이 0이 아니고, Primary가 5도면 → 토닉 또는 옥타브가 Auxiliary

### 2. 복합 타점 판별

```typescript
isCompound = (auxiliaryTarget !== null)
```

- Auxiliary가 있으면 복합 타점
- Auxiliary가 없으면 단독 타점

## UI 표시 방식

### 포맷: `${Primary} (+${Auxiliary})`

**단독 타점:**
- `토닉`
- `옥타브`
- `5도`

**복합 타점:**
- `토닉 (+5도)` - 토닉이 메인, 5도가 협력
- `옥타브 (+5도)` - 옥타브가 메인, 5도가 협력
- `5도 (+옥타브)` - 5도가 메인, 옥타브가 협력
- `5도 (+토닉)` - 5도가 메인, 토닉이 협력

### 위계 질서

**`토닉 (+5도)`**: "토닉이 Primary고, 5도가 Auxiliary로 거들었다"는 명확한 위계를 표현

## 데이터 모델

### TypeScript 인터페이스

```typescript
export interface HitPointData {
  id?: string;
  tonic: number;
  octave: number;
  fifth: number;
  tuning_target: 'tonic' | 'octave' | 'fifth';

  // 복합 타점 정보
  primary_target: 'tonic' | 'octave' | 'fifth';           // 주 타겟
  auxiliary_target: 'tonic' | 'octave' | 'fifth' | null;  // 보조 타겟
  is_compound: boolean;                                     // 복합 여부
  target_display: string;                                   // UI 표시용

  coordinate_x: number;
  coordinate_y: number;
  strength: number;
  hit_count: number;
  location: 'internal' | 'external';
  intent: string;
  created_at?: string;
}
```

### 데이터베이스 스키마

```sql
ALTER TABLE hit_points
ADD COLUMN primary_target TEXT CHECK (primary_target IN ('tonic', 'octave', 'fifth'));
ADD COLUMN auxiliary_target TEXT CHECK (auxiliary_target IN ('tonic', 'octave', 'fifth'));
ADD COLUMN is_compound BOOLEAN DEFAULT FALSE;
ADD COLUMN target_display TEXT;
```

## 구현 로직

### 1. Primary 결정 (기존)

```typescript
// 가중치 점수 계산
const scores = [
  { type: 'tonic', score: eT * 6, value: tonicVal },
  { type: 'octave', score: eO * 3, value: octaveVal },
  { type: 'fifth', score: eF * 2, value: fifthVal }
].sort((a, b) => b.score - a.score);

const primaryTarget = scores[0].type;
```

### 2. Auxiliary 결정 (신규)

```typescript
let auxiliaryTarget: 'tonic' | 'octave' | 'fifth' | null = null;

// X축(5도) 힘이 들어갔고 & 5도가 Primary가 아니라면 → 5도가 보조
if (Math.abs(vectorX) > 0 && primaryTarget !== 'fifth') {
  auxiliaryTarget = 'fifth';
}
// Y축(토닉/옥타브) 힘이 들어갔고 & 5도가 Primary라면 → 토닉/옥타브가 보조
else if (Math.abs(vectorY) > 0 && primaryTarget === 'fifth') {
  // vectorY가 양수면 옥타브, 음수면 토닉
  auxiliaryTarget = vectorY > 0 ? 'octave' : 'tonic';
}
```

### 3. Display String 생성

```typescript
const nameMap: Record<string, string> = {
  'tonic': '토닉',
  'octave': '옥타브',
  'fifth': '5도'
};

const pText = nameMap[primaryTarget];
const aText = auxiliaryTarget ? nameMap[auxiliaryTarget] : null;
const targetDisplay = aText ? `${pText} (+${aText})` : pText;
```

## 사용 예시

### 시나리오 1: 토닉 메인, 5도 협력

**입력:**
- 토닉: -10.5Hz (다운)
- 옥타브: -2.3Hz
- 5도: -8.7Hz (토닉과 같은 부호!)

**결과:**
- Primary: `tonic` (점수 63)
- Auxiliary: `fifth` (vectorX ≠ 0)
- Is Compound: `true`
- Display: `토닉 (+5도)`

**의미:** 토닉을 올리는 타격이 메인이지만, 5도도 같이 올려주는 대각선 타격!

### 시나리오 2: 5도 메인, 옥타브 협력

**입력:**
- 토닉: -3.2Hz
- 옥타브: +15.8Hz (업)
- 5도: +22.1Hz (옥타브와 같은 부호!)

**결과:**
- Primary: `fifth` (점수 44.2)
- Auxiliary: `octave` (vectorY > 0)
- Is Compound: `true`
- Display: `5도 (+옥타브)`

**의미:** 5도를 내리는 타격이 메인이지만, 옥타브도 같이 내려주는 일타이피!

### 시나리오 3: 토닉 단독

**입력:**
- 토닉: -18.3Hz (다운)
- 옥타브: -1.2Hz
- 5도: +5.4Hz (반대 부호!)

**결과:**
- Primary: `tonic` (점수 109.8)
- Auxiliary: `null` (vectorX = 0, 축 고립)
- Is Compound: `false`
- Display: `토닉`

**의미:** 토닉만 순수하게 올리는 수직축 타격. 5도는 상충하므로 제외됨.

## 통계 분석 활용

### 복합 타점 성공률 분석

```sql
-- 복합 타점의 평균 효율성
SELECT
  is_compound,
  AVG(ABS(strength)) as avg_strength,
  COUNT(*) as count
FROM hit_points
GROUP BY is_compound;
```

### Auxiliary별 기여도 분석

```sql
-- 어느 주파수가 보조로 가장 자주 등장하는가?
SELECT
  auxiliary_target,
  COUNT(*) as count,
  AVG(ABS(strength)) as avg_strength
FROM hit_points
WHERE is_compound = TRUE
GROUP BY auxiliary_target
ORDER BY count DESC;
```

### Primary-Auxiliary 조합 분석

```sql
-- 가장 효과적인 Primary-Auxiliary 조합은?
SELECT
  primary_target,
  auxiliary_target,
  COUNT(*) as count,
  AVG(ABS(strength)) as avg_strength
FROM hit_points
WHERE is_compound = TRUE
GROUP BY primary_target, auxiliary_target
ORDER BY avg_strength DESC;
```

## 마이그레이션

데이터베이스에 새 컬럼을 추가하려면:

```bash
# Supabase SQL Editor에서 실행
psql -f migrations/add_compound_target_fields.sql
```

또는 Supabase Dashboard → SQL Editor에서 `migrations/add_compound_target_fields.sql` 내용을 복사하여 실행

## 참고

- 복합 타점은 "협력 관계" (같은 부호)일 때만 발생
- 상충 관계 (반대 부호)일 때는 축 고립이 적용되어 단독 타점이 됨
- `target_display`는 Read-only 값으로, UI에서 직접 수정할 수 없음
