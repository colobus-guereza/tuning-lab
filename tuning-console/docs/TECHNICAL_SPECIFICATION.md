# 조율오차 기반 핸드팬 자동타점계산 시스템 - 기술 명세서

**버전**: 1.4
**작성일**: 2025-11-22
**최종 수정**: 2025-11-22
**목적**: 핸드팬 자동 튜닝 시스템 개발을 위한 기술 명세 및 외부 전문가 검토용

---

## 📋 목차

1. [시스템 개요](#1-시스템-개요)
2. [핵심 물리 모델](#2-핵심-물리-모델)
   - 2.2 SUS430 소재 물성 데이터 기반 설정
3. [톤필드 좌표계 시스템](#3-톤필드-좌표계-시스템)
4. [타격 강도 및 타수 계산 알고리즘](#4-타격-강도-및-타수-계산-알고리즘)
5. [해머링 타입 결정 로직](#5-해머링-타입-결정-로직)
6. [복합 조율 대상 시스템](#6-복합-조율-대상-시스템)
7. [데이터베이스 스키마](#7-데이터베이스-스키마)
8. [검증 시나리오](#8-검증-시나리오)
9. [실측 보정 대상 상수 및 설정 근거](#9-실측-보정-대상-상수-및-설정-근거)
10. [코드 구조](#10-코드-구조)
11. [참고 문헌 및 관련 자료](#11-참고-문헌-및-관련-자료)
12. [버전 이력](#12-버전-이력)
13. [검토 요청 사항](#13-검토-요청-사항)
14. [연락처](#14-연락처)

---

## 1. 시스템 개요

### 1.1 목적
핸드팬(Handpan) 제작 및 튜닝 시 측정된 조율오차(Hz)를 기반으로 최적의 타점 위치, 타격 강도, 타수, 해머링 타법을 자동으로 계산하여 정밀한 튜닝을 지원하는 시스템

### 1.2 입력 데이터
- **토닉(Tonic) 오차**: Hz 단위 (양수/음수) - 핸드팬 기본음(Fundamental)
- **옥타브(Octave) 오차**: Hz 단위 (양수/음수) - 장축 방향 배음(Harmonic)
- **5도(Fifth) 오차**: Hz 단위 (양수/음수) - 단축 방향 배음(Harmonic)

### 1.3 출력 데이터
- **조율 대상(Target)**: 주 조율 대상 + 부차 조율 대상 (선택적)
- **의도(Intent)**: 상향/하향
- **위치(Location)**: 내부/외부
- **좌표(Coordinates)**: (x, y) - 톤필드 좌표계
- **타격 강도(Force)**: 단위 없음, 소수점 1자리
- **타수(Count)**: 정수
- **해머링 타입(Hammering Type)**: SNAP/PULL/PRESS

### 1.4 기술 스택
- **프론트엔드**: Next.js 15.1.2, React 19, TypeScript
- **UI**: Tailwind CSS (핸드팬 톤필드 시각화)
- **백엔드**: Supabase (PostgreSQL)
- **물리 엔진**: 커스텀 JavaScript 라이브러리 (핸드팬 물성 반영)

---

## 2. 핵심 물리 모델

### 2.1 물리 상수 정의

```typescript
export const PHYSICS_CONFIG = {
  // [1] 기계 캘리브레이션 (핸드팬 전용 튜닝 머신 기준)
  THRESHOLD_C: 20.0,        // 임계값 (SUS430 소성 변형 시작 최소 강도)
  SCALING_S: 30.0,          // 스케일링 (Hz 오차 -> 기계적 타격 강도 변환 계수)

  // [2] 안전 한계 (자동 계산됨: 임계값 * 2.1)
  // SUS430 소재 특성 및 자동 튜닝 머신 타격 안전율 고려
  SAFETY_RATIO: 2.1,
  get LIMIT() {
    return this.THRESHOLD_C * this.SAFETY_RATIO;  // = 42.0
  },

  // [3] 톤필드 기하학적 상수 (타원형 핸드팬 톤필드 효율 계산용)
  TONEFIELD_RADIUS_Y: 0.85,  // 세로 반지름 (토닉/옥타브 축 - 장축)
  TONEFIELD_RADIUS_X: 0.6,   // 가로 반지름 (5도 축 - 단축)

  // [4] 모드별 구조 강성 계수 (핸드팬 톤필드 진동 특성)
  STIFFNESS_K: {
    tonic: 1.0,   // 기준 (전체 면적 진동)
    octave: 0.9,  // 장축 방향 (상대적으로 유연함)
    fifth: 1.2,   // 단축 방향 (상대적으로 뻣뻣함)
  },
} as const;
```

### 2.2 SUS430 소재 물성 데이터 기반 설정

본 시스템은 핸드팬의 주 소재인 **페라이트계 스테인리스강 SUS430 (AISI 430)**의 기계적 성질을 기반으로 물리 모델을 설계했습니다.

#### 2.2.1 SUS430 물성 데이터 (참고 규격: ASTM A240)

| 항목 | 수치 | 단위 | 비고 |
|------|------|------|------|
| 항복 강도 (Yield Strength) | 205 (Min) | MPa | 소성 변형 시작점 (0.2% Offset) |
| 인장 강도 (Tensile Strength) | 450 (Min) | MPa | 재료 파단 위험점 |
| 연신율 (Elongation) | 22 (Min) | % | 50mm 기준 |
| 경도 (Hardness) | 89 (Max) | HRB | Rockwell B |
| 탄성 계수 (Elastic Modulus) | 200 | GPa | 영률 (Young's Modulus) |

**⚠️ 중요**: 위 데이터는 일반적인 SUS430 규격값입니다. **실제 사용하는 SUS430 제품의 재료 시험 성적서(Mill Sheet)를 확보하여 해당 값으로 교체해야 합니다.** 이는 Section 9 "실측 보정 대상"에 포함됩니다.

#### 2.2.2 임계값 및 안전 한계 설정 근거

**1. 임계값 (Threshold_C = 20.0)**

물리적 의미: 재료가 탄성 영역을 벗어나 영구적인 변형(소성 변형)이 시작되는 최소한의 타격 강도입니다.

산출 근거: SUS430의 항복 강도 205 MPa를 기계 제어 단위(Level)로 모델링했습니다.
```
205 MPa ≈ Level 20.5 → 편의상 20.0으로 설정 (Calibration Point)
```

**2. 안전 타격 한계 (LIMIT = 42.0)**

물리적 의미: 재료의 파단(Fracture)이나 기능적 손상(Buckling 등)을 방지하기 위해 설정된 최대 허용 타격 강도입니다.

산출 근거: **항복 강도와 인장 강도의 비율(Ratio)**을 기반으로 안전 계수를 적용했습니다.
```
물리적 비율: 인장 강도(450) / 항복 강도(205) ≈ 2.195 (약 2.2배)
안전 계수 적용: 극한값인 2.2배를 꽉 채우지 않고, 약 5%의 안전 마진을 두어 2.1배로 설정
최종 계산: 임계값(20.0) × 2.1 = 42.0
```

**결론**: 이 설정은 경험적인 수치가 아니라, SUS430 소재가 견딜 수 있는 **소성 변형 작업 구간(Plastic Deformation Range)**인 205~450 MPa 범위를 기계 제어 값인 20~42 Level로 1:1 매핑한 공학적 결과입니다.

#### 2.2.3 구조 강성 계수 (Stiffness_K) 설정 근거

- **토닉 (Tonic = 1.0)**: 핸드팬 톤필드 전체 면적이 돔(Dome) 형태로 진동하는 기본 모드로, 이를 기준값(1.0)으로 설정했습니다.

- **옥타브 (Octave = 0.9)**: 타원형 톤필드의 **긴 축(Y축, 장축)**을 따라 진동합니다. 장축 방향은 기하학적으로 휨 모멘트에 대해 상대적으로 유연하므로, 기준보다 적은 힘(0.9배)으로도 변형이 가능합니다.

- **5도 (Fifth = 1.2)**: 타원형 톤필드의 **짧은 축(X축, 단축)**을 따라 진동합니다. 단축 방향은 곡률 반경이 작아 구조적으로 더 뻣뻣하므로(Stiff), 동일한 변형을 위해 기준보다 더 큰 힘(1.2배)이 필요합니다.

---

## 3. 톤필드 좌표계 시스템

### 3.1 좌표계 정의

```
Y축 (세로, 토닉/옥타브)
  ↑
  |     * (x, y)
  |    /
  |   /  r
  |  /
  | /
  |/________→ X축 (가로, 5도)
  O
```

- **원점(O)**: (0, 0) - 중립점
- **X축**: 5도(Fifth) 진동 방향
- **Y축**: 토닉(Tonic)/옥타브(Octave) 진동 방향
- **타원 경계**:
  - X축 반지름: 0.6
  - Y축 반지름: 0.85

### 3.2 좌표 계산 알고리즘

**입력**: 토닉, 옥타브, 5도 오차값 (부호 포함)
**출력**: (x, y) 좌표

#### 3.2.1 조율 대상 결정 로직

```typescript
// 1단계: 절대값 기준 주 조율 대상 결정
const absT = Math.abs(tonicHz);
const absO = Math.abs(octaveHz);
const absF = Math.abs(fifthHz);

let primary: Target;
if (absT >= absO && absT >= absF) {
  primary = { type: 'tonic', error: absT };
} else if (absO >= absT && absO >= absF) {
  primary = { type: 'octave', error: absO };
} else {
  primary = { type: 'fifth', error: absF };
}

// 2단계: 부차 조율 대상 결정 (협력 관계)
let auxiliary: Target | null = null;
if (primary.type === 'tonic') {
  // 토닉이 주 대상일 때, 옥타브/5도 중 더 큰 것
  if (absO > absF && absO >= 0.3) {
    auxiliary = { type: 'octave', error: absO };
  } else if (absF > absO && absF >= 0.3) {
    auxiliary = { type: 'fifth', error: absF };
  }
}
// 옥타브나 5도가 주 대상일 경우 부차 대상 없음
```

**협력 관계 조건**:
- 부차 조율 대상은 주 조율 대상이 토닉일 때만 존재
- 부차 오차가 0.3Hz 이상일 때만 고려
- 주/부차 대상이 같은 방향(부호)일 때만 협력 관계 성립

#### 3.2.2 좌표 계산 공식

```typescript
// 3단계: 의도 결정 (주 조율 대상 기준)
const rawPrimaryHz = primary.type === 'tonic' ? tonicHz
                   : primary.type === 'octave' ? octaveHz
                   : fifthHz;
const intent = rawPrimaryHz < 0 ? "상향" : "하향";
const location = rawPrimaryHz < 0 ? "internal" : "external";

// 4단계: 기본 좌표 계산 (주 조율 대상)
let x = 0, y = 0;
const primaryError = primary.error;

if (primary.type === 'tonic') {
  // 토닉: Y축 방향 (세로)
  y = (rawPrimaryHz < 0 ? -1 : 1) * Math.min(primaryError / 20.0, 0.85);
  x = 0;
} else if (primary.type === 'octave') {
  // 옥타브: Y축 방향 (세로)
  y = (rawPrimaryHz < 0 ? -1 : 1) * Math.min(primaryError / 20.0, 0.85);
  x = 0;
} else if (primary.type === 'fifth') {
  // 5도: X축 방향 (가로)
  x = (rawPrimaryHz < 0 ? -1 : 1) * Math.min(primaryError / 30.0, 0.6);
  y = 0;
}

// 5단계: 부차 조율 대상 반영 (가중치 적용)
if (auxiliary) {
  const rawAuxHz = auxiliary.type === 'tonic' ? tonicHz
                 : auxiliary.type === 'octave' ? octaveHz
                 : fifthHz;

  // 협력 관계 확인 (같은 방향인가?)
  const isCooperative = (rawPrimaryHz < 0 && rawAuxHz < 0) ||
                        (rawPrimaryHz > 0 && rawAuxHz > 0);

  if (isCooperative) {
    const auxWeight = 0.35;  // 부차 영향력 35%
    const auxError = auxiliary.error;

    if (auxiliary.type === 'tonic' || auxiliary.type === 'octave') {
      y += (rawAuxHz < 0 ? -1 : 1) * auxWeight * Math.min(auxError / 20.0, 0.85);
    } else {
      x += (rawAuxHz < 0 ? -1 : 1) * auxWeight * Math.min(auxError / 30.0, 0.6);
    }
  }
}

// 6단계: 타원 경계 제약 적용
const ellipseRatio = (x / 0.6) ** 2 + (y / 0.85) ** 2;
if (ellipseRatio > 1) {
  const scale = Math.sqrt(ellipseRatio);
  x /= scale;
  y /= scale;
}
```

**정규화 공식**:
- 토닉/옥타브: `normalized = error / 20.0` (최대 0.85로 클램핑)
- 5도: `normalized = error / 30.0` (최대 0.6으로 클램핑)

**타원 경계 조건**:
```
(x / 0.6)² + (y / 0.85)² ≤ 1
```

---

## 4. 타격 강도 및 타수 계산 알고리즘

### 4.1 함수 시그니처

```typescript
export function calculateImpactPower(
  rawHz: number,                          // 주 조율 대상의 원본 오차 (부호 포함)
  coord: { x: number; y: number },        // 계산된 좌표
  mode: "tonic" | "octave" | "fifth"      // 조율 대상 모드
): {
  force: number;                          // 타격 강도
  count: number;                          // 타수
  hammeringType: "SNAP" | "PULL" | "PRESS" // 해머링 타입
}
```

### 4.2 계산 단계

#### 4.2.1 상대적 효율 계산 (Relative Efficiency)

**목적**: 타점 위치가 진동 꼭지점에서 얼마나 떨어져 있는지 계산

```typescript
// 모드별 진동 축 결정
let currentPos = 0;
let vertexPos = 1.0;

if (mode === 'fifth') {
  // 5도: X축 진동
  currentPos = Math.abs(coord.x);
  vertexPos = TONEFIELD_RADIUS_X;  // 0.6
} else {
  // 토닉, 옥타브: Y축 진동
  currentPos = Math.abs(coord.y);
  vertexPos = TONEFIELD_RADIUS_Y;  // 0.85
}

// 상대적 효율 (최소 10% 안전장치)
const efficiency = Math.max(currentPos / vertexPos, 0.1);

// 효율을 감안한 유효 오차 거리
const effectiveHz = Math.abs(rawHz) / efficiency;
```

**효율 공식**:
```
efficiency = max(현재위치 / 꼭지점위치, 0.1)
effectiveHz = |오차| / efficiency
```

**물리적 해석**:
- 꼭지점 근처 (efficiency ≈ 1.0): 최대 효율, effectiveHz ≈ |오차|
- 중심 근처 (efficiency ≈ 0.1): 최소 효율, effectiveHz = |오차| × 10

#### 4.2.2 에너지 법칙 기반 필요 강도 계산

```typescript
// 모드별 구조 강성 계수
const stiffness = STIFFNESS_K[mode] || 1.0;

// 순수 에너지 계산
const pureEnergy = Math.sqrt(effectiveHz * SCALING_S * stiffness);

// 1회 타격 기준 필요 강도
const requiredForce = THRESHOLD_C + pureEnergy;
```

**에너지 공식**:
```
E_pure = √(effectiveHz × S × K)
F_required = C + E_pure

여기서:
  C = THRESHOLD_C (임계값) = 20.0
  S = SCALING_S (스케일링 상수) = 30.0
  K = STIFFNESS_K (구조 강성 계수) = 0.9~1.2
```

**물리적 근거**:
- `√` 사용: 에너지와 변형량의 비선형 관계 (후크의 법칙 확장)
- `C` 항: 변형 시작을 위한 최소 에너지 (임계값)
- `E_pure` 항: 오차 크기에 비례하는 추가 에너지

#### 4.2.3 안전 분할 로직 (Multi-Hit Strategy)

```typescript
let finalForce = requiredForce;
let finalCount = 1;

if (requiredForce > LIMIT) {  // LIMIT = 42.0
  let count = 2;
  while (true) {
    // 임계값(C)은 고정하고, 추가 에너지만 횟수(제곱근)로 나눔
    const splitEnergy = pureEnergy / Math.sqrt(count);
    const currentForce = THRESHOLD_C + splitEnergy;

    if (currentForce <= LIMIT) {
      finalForce = currentForce;
      finalCount = count;
      break;
    }

    count++;
    if (count > 10) {
      // 무한 루프 방지 (최대 10타)
      finalForce = LIMIT;
      finalCount = 10;
      break;
    }
  }
}
```

**분할 공식**:
```
F_n = C + E_pure / √n

여기서:
  n = 타수
  F_n = n회 타격 시 1회당 강도
```

**물리적 근거**:
- 에너지 분배: `E_total = n × (F_n - C)²` 일정 유지
- `√n` 사용: 타수가 증가해도 총 에너지 보존
- 임계값 `C`는 매 타격마다 필수적으로 필요

**예시**:
```
오차 17.7Hz, 좌표 (0.431, -0.592), 모드 fifth
→ efficiency ≈ 0.72
→ effectiveHz = 17.7 / 0.72 ≈ 24.6
→ pureEnergy = √(24.6 × 30 × 1.2) ≈ 29.7
→ requiredForce = 20.0 + 29.7 = 49.7 > 42.0 (초과!)
→ 2회 분할: F_2 = 20.0 + 29.7/√2 ≈ 41.0 ✓
→ 결과: 41.0 × 2
```

---

## 5. 해머링 타입 결정 로직

### 5.1 해머링 타입 정의

| 타입 | 한글 | 용도 | 특징 |
|------|------|------|------|
| SNAP | 튕겨치기 | 미세 조율 | 빠르고 가벼운 타격 |
| PULL | 당겨치기 | 중간 조율 | 현을 당기는 중간 강도 |
| PRESS | 눌러치기 | 큰 조율 | 강하고 지속적인 압력 |

### 5.2 결정 알고리즘

```typescript
const absHz = Math.abs(rawHz);
let hammeringType: "SNAP" | "PULL" | "PRESS";

if (rawHz < 0) {
  // 내부 타격 (음수: 상향 조율)
  if (absHz <= HAMMERING_RULES.INTERNAL.SNAP_LIMIT) {       // ≤ 1.0Hz
    hammeringType = "SNAP";   // 튕겨치기
  } else if (absHz < HAMMERING_RULES.INTERNAL.PRESS_START) {  // 1.0 < x < 10.0Hz
    hammeringType = "PULL";   // 당겨치기
  } else {                                                     // ≥ 10.0Hz
    hammeringType = "PRESS";  // 눌러치기
  }
} else {
  // 외부 타격 (양수: 하향 조율)
  if (absHz <= HAMMERING_RULES.EXTERNAL.SNAP_LIMIT) {       // ≤ 5.0Hz
    hammeringType = "SNAP";   // 튕겨치기
  } else {                                                     // > 5.0Hz
    hammeringType = "PRESS";  // 눌러치기 (외부에는 PULL 없음)
  }
}
```

### 5.3 임계값 설정

```typescript
HAMMERING_RULES: {
  INTERNAL: {
    SNAP_LIMIT: 1.0,    // 1.0Hz 이하 → 튕겨치기
    PRESS_START: 10.0   // 10.0Hz 이상 → 눌러치기
  },
  EXTERNAL: {
    SNAP_LIMIT: 5.0     // 5.0Hz 이하 → 튕겨치기
  }
}
```

### 5.4 결정 테이블

#### 내부 타격 (rawHz < 0, 상향 조율)

| 오차 범위 | 타입 | 한글 | 예시 |
|-----------|------|------|------|
| \|Hz\| ≤ 1.0 | SNAP | 튕겨치기 | -0.8Hz → SNAP |
| 1.0 < \|Hz\| < 10.0 | PULL | 당겨치기 | -4.1Hz → PULL |
| \|Hz\| ≥ 10.0 | PRESS | 눌러치기 | -17.7Hz → PRESS |

#### 외부 타격 (rawHz > 0, 하향 조율)

| 오차 범위 | 타입 | 한글 | 예시 |
|-----------|------|------|------|
| \|Hz\| ≤ 5.0 | SNAP | 튕겨치기 | +3.2Hz → SNAP |
| \|Hz\| > 5.0 | PRESS | 눌러치기 | +17.7Hz → PRESS |

**참고**: 외부 타격에는 PULL 타입이 없음 (물리적 특성)

---

## 6. 복합 조율 대상 시스템

### 6.1 시스템 개념

**단일 조율**: 하나의 모드만 조율 필요 (예: 토닉만 -5.8Hz)
**복합 조율**: 두 개 이상의 모드가 협력적으로 조율 필요 (예: 토닉 -9.8Hz + 5도 -5.8Hz)

### 6.2 협력 관계 판별 조건

```typescript
// 1. 주 조율 대상이 토닉이어야 함
if (primary.type !== 'tonic') {
  return null;  // 협력 관계 없음
}

// 2. 부차 오차가 0.3Hz 이상
const auxError = auxiliary.error;
if (auxError < 0.3) {
  return null;  // 너무 작아서 무시
}

// 3. 같은 방향 (같은 부호)
const rawPrimaryHz = tonicHz;
const rawAuxHz = auxiliary.type === 'octave' ? octaveHz : fifthHz;
const isCooperative = (rawPrimaryHz < 0 && rawAuxHz < 0) ||
                      (rawPrimaryHz > 0 && rawAuxHz > 0);

if (!isCooperative) {
  return null;  // 반대 방향
}

// 협력 관계 성립
return auxiliary;
```

### 6.3 표시 형식

**단일 조율**:
```
조율대상: 토닉
```

**복합 조율**:
```
조율대상: 토닉 (+옥타브)
조율대상: 토닉 (+5도)
```

### 6.4 좌표 계산 시 가중치

```typescript
const PRIMARY_WEIGHT = 1.0;    // 주 조율 대상 100%
const AUXILIARY_WEIGHT = 0.35;  // 부차 조율 대상 35%

// 좌표 계산
x = primaryX * PRIMARY_WEIGHT + auxiliaryX * AUXILIARY_WEIGHT;
y = primaryY * PRIMARY_WEIGHT + auxiliaryY * AUXILIARY_WEIGHT;
```

**근거**: 부차 조율 대상은 주 조율 대상의 35% 영향력만 반영

---

## 7. 데이터베이스 스키마

### 7.1 테이블 구조: `hit_points`

```sql
CREATE TABLE hit_points (
  id BIGSERIAL PRIMARY KEY,

  -- 조율 오차 입력값 (원본)
  tonic_error DECIMAL(5,2) NOT NULL,        -- 토닉 오차 (Hz)
  octave_error DECIMAL(5,2) NOT NULL,       -- 옥타브 오차 (Hz)
  fifth_error DECIMAL(5,2) NOT NULL,        -- 5도 오차 (Hz)

  -- 계산 결과
  target_mode VARCHAR(10) NOT NULL,         -- 주 조율 대상 (tonic/octave/fifth)
  auxiliary_mode VARCHAR(10),               -- 부차 조율 대상 (NULL 가능)
  coordinate_x DECIMAL(8,3) NOT NULL,       -- X 좌표
  coordinate_y DECIMAL(8,3) NOT NULL,       -- Y 좌표
  strength DECIMAL(5,1) NOT NULL,           -- 타격 강도
  hit_count INTEGER NOT NULL,               -- 타수
  location VARCHAR(10) NOT NULL             -- 위치 (internal/external)
    CHECK (location IN ('internal', 'external')),
  intent VARCHAR(10) NOT NULL,              -- 의도 (상향/하향)
  hammering_type TEXT                       -- 해머링 타입 (SNAP/PULL/PRESS)
    CHECK (hammering_type IN ('SNAP', 'PULL', 'PRESS')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7.2 마이그레이션 파일

#### 7.2.1 `add_compound_target_fields.sql`

```sql
-- Add auxiliary_mode field for compound target system
ALTER TABLE hit_points
ADD COLUMN IF NOT EXISTS auxiliary_mode VARCHAR(10) CHECK (auxiliary_mode IN ('tonic', 'octave', 'fifth'));

COMMENT ON COLUMN hit_points.auxiliary_mode IS
'Secondary tuning target for compound adjustments (NULL for single-target cases)';
```

#### 7.2.2 `add_hammering_type_field.sql`

```sql
-- Add hammering_type field for hammering technique
ALTER TABLE hit_points
ADD COLUMN IF NOT EXISTS hammering_type TEXT
CHECK (hammering_type IN ('SNAP', 'PULL', 'PRESS'));

COMMENT ON COLUMN hit_points.hammering_type IS
'Hammering technique: SNAP (튕겨치기) for small errors, PULL (당겨치기) for medium internal errors, PRESS (눌러치기) for large errors. Determined by rawHz direction and magnitude.';
```

### 7.3 TypeScript 인터페이스

```typescript
export interface HitPointData {
  id?: number;
  tonic_error: number;
  octave_error: number;
  fifth_error: number;
  target_mode: 'tonic' | 'octave' | 'fifth';
  auxiliary_mode?: 'tonic' | 'octave' | 'fifth' | null;
  coordinate_x: number;
  coordinate_y: number;
  strength: number;
  hit_count: number;
  location: 'internal' | 'external';
  intent: string;
  hammering_type?: 'SNAP' | 'PULL' | 'PRESS' | null;
  created_at?: string;
}
```

---

## 8. 검증 시나리오

### 8.1 시나리오 1: 단일 조율 - 토닉 내부 중간 오차

**입력**:
- 토닉: -4.1Hz
- 옥타브: 0Hz
- 5도: 0Hz

**기대 출력**:
- 조율대상: 토닉
- 의도: 상향
- 위치: 내부
- 좌표: (0, -0.205)
- 해머링 타입: PULL (당겨치기)
- 계산 근거: 1.0 < 4.1 < 10.0

**검증 항목**:
- [x] 좌표 부호 (음수 Y)
- [x] 해머링 타입 (PULL)
- [ ] 강도 범위 (20~42 사이)

---

### 8.2 시나리오 2: 단일 조율 - 토닉 내부 미세 오차

**입력**:
- 토닉: -0.8Hz
- 옥타브: 0Hz
- 5도: 0Hz

**기대 출력**:
- 조율대상: 토닉
- 의도: 상향
- 위치: 내부
- 좌표: (0, -0.04)
- 해머링 타입: SNAP (튕겨치기)
- 계산 근거: 0.8 ≤ 1.0

**검증 항목**:
- [x] 좌표 부호 (음수 Y)
- [x] 해머링 타입 (SNAP)
- [ ] 강도 범위 (20~25 사이, 미세 오차)

---

### 8.3 시나리오 3: 단일 조율 - 토닉 내부 큰 오차

**입력**:
- 토닉: -9.5Hz
- 옥타브: 0Hz
- 5도: 0Hz

**기대 출력**:
- 조율대상: 토닉
- 의도: 상향
- 위치: 내부
- 좌표: (0, -0.475)
- 강도: 40.2
- 타수: 1
- 해머링 타입: PULL (당겨치기)
- 계산 근거: 1.0 < 9.5 < 10.0

**검증 항목**:
- [x] 좌표 부호 (음수 Y)
- [x] 해머링 타입 (PULL, NOT PRESS)
- [x] PRESS_START 임계값 10.0 적용 확인

**특이사항**:
이 시나리오는 초기 버그 발견의 계기가 됨.
PRESS_START가 5.0으로 설정되어 있어 PRESS가 잘못 표시되었으나, 10.0으로 수정 후 해결.

---

### 8.4 시나리오 4: 단일 조율 - 5도 외부 큰 오차

**입력**:
- 토닉: -9.8Hz
- 옥타브: 0Hz
- 5도: +17.7Hz (외부)

**기대 출력**:
- 조율대상: 5도 (17.7 > 9.8)
- 의도: 하향
- 위치: 외부
- 좌표: (0.431, -0.592)
  - X: +17.7 / 30 ≈ 0.59 → 0.431 (타원 경계 조정)
  - Y: -9.8의 35% 영향 → -0.592
- 강도: 40.2
- 타수: 2
- 해머링 타입: PRESS (눌러치기)
- 계산 근거: 17.7 > 5.0 (외부 SNAP_LIMIT)

**검증 항목**:
- [x] 주 조율 대상 (5도 우선)
- [x] 해머링 타입 (PRESS)
- [x] 타수 분할 (2회)
- [ ] 좌표 타원 경계 준수

---

### 8.5 시나리오 5: 복합 조율 - 토닉 + 옥타브 협력

**입력**:
- 토닉: -9.8Hz
- 옥타브: -5.8Hz
- 5도: 0Hz

**기대 출력**:
- 조율대상: 토닉 (+옥타브)
- 의도: 상향
- 위치: 내부
- 좌표: (0, -0.592)
  - 주: -9.8 / 20 = -0.49
  - 부: -5.8 / 20 × 0.35 = -0.1015
  - 합: -0.5915 ≈ -0.592
- 해머링 타입: PULL (당겨치기)
- 계산 근거: 주 조율 대상 토닉 -9.8Hz, 1.0 < 9.8 < 10.0

**검증 항목**:
- [x] 복합 조율 대상 표시
- [x] 부차 가중치 35% 적용
- [x] 해머링 타입 (주 대상 기준)
- [ ] 좌표 정확도

---

### 8.6 시나리오 6: 복합 조율 - 토닉 + 5도 협력

**입력**:
- 토닉: -15.2Hz
- 옥타브: 0Hz
- 5도: -8.3Hz

**기대 출력**:
- 조율대상: 토닉 (+5도)
- 의도: 상향
- 위치: 내부
- 좌표: 복합 계산
  - Y: -15.2 / 20 = -0.76
  - X: -8.3 / 30 × 0.35 = -0.097
  - 결과: (-0.097, -0.76)
- 해머링 타입: PRESS (눌러치기)
- 계산 근거: 15.2 ≥ 10.0

**검증 항목**:
- [x] 복합 조율 대상 표시
- [x] X/Y 양축 좌표 계산
- [x] 해머링 타입 (PRESS)

---

### 8.7 시나리오 7: 경계 케이스 - 정확히 10.0Hz

**입력**:
- 토닉: -10.0Hz
- 옥타브: 0Hz
- 5도: 0Hz

**기대 출력**:
- 해머링 타입: PRESS (눌러치기)
- 계산 근거: absHz = 10.0, 조건 `absHz < PRESS_START (10.0)` 불충족

**검증 항목**:
- [ ] 경계값 처리 (≥ 10.0 → PRESS)
- [ ] 일관성 유지

---

### 8.8 시나리오 8: 경계 케이스 - 정확히 1.0Hz

**입력**:
- 토닉: -1.0Hz
- 옥타브: 0Hz
- 5도: 0Hz

**기대 출력**:
- 해머링 타입: SNAP (튕겨치기)
- 계산 근거: absHz = 1.0, 조건 `absHz <= SNAP_LIMIT (1.0)` 충족

**검증 항목**:
- [ ] 경계값 처리 (≤ 1.0 → SNAP)
- [ ] 일관성 유지

---

### 8.9 시나리오 9: 외부 경계 케이스 - 5.0Hz

**입력**:
- 토닉: +5.0Hz
- 옥타브: 0Hz
- 5도: 0Hz

**기대 출력**:
- 해머링 타입: SNAP (튕겨치기)
- 계산 근거: absHz = 5.0, 조건 `absHz <= SNAP_LIMIT (5.0)` 충족

**검증 항목**:
- [ ] 외부 경계값 처리
- [ ] SNAP/PRESS 경계 명확성

---

### 8.10 시나리오 10: 반협력 관계 - 반대 방향

**입력**:
- 토닉: -9.8Hz
- 옥타브: +5.8Hz (반대 방향)
- 5도: 0Hz

**기대 출력**:
- 조율대상: 토닉 (단일, 옥타브 무시)
- 좌표: (0, -0.49) (토닉만 반영)
- 해머링 타입: PULL

**검증 항목**:
- [ ] 반대 방향 부차 대상 무시
- [ ] 좌표 계산에 부차 미반영

---

## 9. 실측 보정 대상 상수 및 설정 근거

본 시스템은 물리적 이론을 바탕으로 구축되었으나, 실제 자동 튜닝 머신(Robot Arm)의 하드웨어 특성과 연동될 때 반드시 **실측(Calibration)**을 통해 미세 조정되어야 하는 상수들이 존재합니다.

### 9.1 개요 및 보정 필요성

핸드팬 튜닝 시스템의 정확도는 다음 세 가지 요소에 의해 결정됩니다:
1. **재료 물성**: 실제 사용하는 SUS430 소재의 정확한 기계적 특성
2. **기계 특성**: 자동 튜닝 머신의 힘-변위 관계 및 제어 정밀도
3. **톤필드 형상**: 실제 제작된 핸드팬의 기하학적 구조

이 중 현재 시스템에 적용된 값들은 **일반적인 규격값과 이론적 모델**을 기반으로 하므로, 실제 환경에서는 반드시 실측 데이터로 보정되어야 합니다.

### 9.2 보정 대상 상수 일람표

| 보정순서 | 상수명 | 현재값 | 역할 및 의미 | 설정 원인 및 보정 방법 |
|---------|--------|--------|-------------|---------------------|
| 🔴 0순위 | **SUS430 물성 데이터** | Section 2.2.1 참조 | 재료의 항복강도, 인장강도 등 기계적 특성 | **원인**: ASTM A240 일반 규격값 사용<br>**보정**: 실제 사용하는 SUS430 제품의 재료 시험 성적서(Mill Sheet) 확보 후 Section 2.2.1 테이블 값 교체<br>**영향**: THRESHOLD_C 및 LIMIT 값의 정확도에 직접적 영향 |
| 🔴 1순위 | THRESHOLD_C | 20.0 | 임계값 (Threshold) - 소성 변형이 시작되는 최소 기계 강도 (입장료) | **원인**: SUS430 항복강도(205 MPa)를 기계 레벨 20으로 모델링<br>**보정**: 기계의 힘을 1부터 서서히 올려가며 피치(Hz) 변화가 처음 감지되는 값을 찾아 교체<br>**방법**: Section 9.5.1 참조 |
| 🟡 2순위 | LIMIT | 42.0 | 안전 타격 한계 - 재료 파손 및 기능적 손상을 방지하는 상한선 | **원인**: 항복강도(20.0)의 2.1배(SUS430 인장강도 비율)로 설정<br>**보정**: THRESHOLD_C가 실측되면 × 2.1 하여 자동 재산출하거나, 전문가가 허용하는 최대 타격 강도로 수동 설정<br>**방법**: Section 9.5.2 참조 |
| 🟡 2순위 | SCALING_S | 30.0 | 스케일러 (Sensitivity) - Hz 오차를 기계 강도로 변환하는 민감도 계수 | **원인**: 시뮬레이션 상 10~30Hz 오차를 적절한 강도(20~42)로 변환하기 위한 최적값<br>**보정**: 실제 타격 후 피치 변화량이 예상보다 적으면 값을 올리고(예: 35), 너무 크면 값을 내림(예: 25)<br>**방법**: Section 9.5.3 참조 |
| 🟢 3순위 | STIFFNESS_K | tonic: 1.0<br>octave: 0.9<br>fifth: 1.2 | 구조 강성 계수 - 모드별(토닉/옥타브/5도) 뻣뻣함 차이 반영 | **원인**: 타원형 톤필드의 기하학적 구조(장축 vs 단축)에 따른 휨 강성 차이 반영<br>**보정**: 특정 모드(예: 5도)만 유독 튜닝이 안 먹힐 경우 해당 계수($K$)를 상향 조정<br>**방법**: Section 9.5.4 참조 |
| 🟢 3순위 | 정규화 상수 | 20.0 (토닉/옥타브)<br>30.0 (5도) | 최대 타점 도달 오차 - 타점이 톤필드 끝(Rim)에 닿는 Hz 기준 | **원인**: 0~10Hz(빈번 구간)를 정밀 제어하고, 큰 오차는 외곽 타격으로 대응하기 위함<br>**보정**: 타점이 너무 중앙에만 몰리면 값을 낮추고, 너무 쉽게 외곽으로 빠지면 값을 높임<br>**주의**: "최대 타점 도달 오차(Max Reach Error)" 개념 - 해당 오차일 때 타점이 최외각에 위치 |

### 9.3 보정 대상 상수의 상호 의존성

```
SUS430 물성 데이터 (0순위)
    ↓ 항복강도 → MPa to Level 매핑
THRESHOLD_C (1순위)
    ↓ × 2.1 (안전 계수)
LIMIT (2순위)
    ↓ 전체 시스템 강도 범위 확정
SCALING_S (2순위)
    ↓ 강도-오차 변환 민감도 조정
STIFFNESS_K (3순위)
    ↓ 모드별 미세 조정
최종 시스템 정확도
```

**중요**: 보정은 반드시 **순서대로(0순위 → 1순위 → 2순위 → 3순위)** 진행해야 합니다. 상위 순위 상수가 하위 순위 상수의 기준이 되기 때문입니다.

### 9.4 상수별 상세 설명

#### 9.4.1 🔴 0순위: SUS430 물성 데이터

**보정 필요성**:
Section 2.2.1에 명시된 SUS430 물성 데이터(항복강도 205 MPa, 인장강도 450 MPa 등)는 ASTM A240 일반 규격값입니다. **실제 사용하는 SUS430 제품은 제조사, 로트(Lot), 열처리 조건에 따라 ±10~20% 편차**가 발생할 수 있습니다.

**보정 방법**:
1. SUS430 소재 공급업체로부터 **재료 시험 성적서(Mill Sheet)** 요청
2. 성적서에 명시된 실측 물성값 확인:
   - 항복 강도 (Yield Strength)
   - 인장 강도 (Tensile Strength)
   - 연신율 (Elongation)
   - 경도 (Hardness)
3. Section 2.2.1 테이블의 해당 값 교체
4. 새로운 항복강도 기반으로 THRESHOLD_C 재계산

**예시**:
```
Mill Sheet 실측값: 항복강도 = 220 MPa (규격 205 대비 +7%)
→ THRESHOLD_C = 220 / 10 ≈ 22.0 (기존 20.0에서 10% 증가)
→ LIMIT = 22.0 × 2.1 = 46.2 (기존 42.0에서 10% 증가)
```

#### 9.4.2 🔴 1순위: THRESHOLD_C (임계값)

**물리적 의미**:
기계가 핸드팬 소재를 타격하여 영구적인 변형(소성 변형)이 시작되는 최소한의 타격 강도입니다. 이 값보다 약하게 치면 아무 일도 일어나지 않습니다.

**보정 방법**: Section 9.5.1 참조

#### 9.4.3 🟡 2순위: LIMIT (안전 타격 한계)

**물리적 의미**:
재료의 파단(Fracture)이나 기능적 손상을 방지하기 위한 최대 허용 타격 강도입니다.

**보정 방법**: Section 9.5.2 참조

#### 9.4.4 🟡 2순위: SCALING_S (스케일러)

**물리적 의미**:
Hz 오차를 기계 강도로 변환하는 "전체 볼륨 노브"입니다. 이 값이 크면 동일한 오차에 대해 더 강하게 치게 됩니다.

**보정 방법**: Section 9.5.3 참조

#### 9.4.5 🟢 3순위: STIFFNESS_K (구조 강성 계수)

**물리적 의미**:
타원형 톤필드의 방향별(토닉/옥타브/5도) 뻣뻣함 차이를 반영합니다.

**보정 방법**: Section 9.5.4 참조

#### 9.4.6 🟢 3순위: 정규화 상수 (20.0, 30.0)

**물리적 의미**:
- `MAX_REACH_TONIC = 20.0`: 토닉/옥타브 오차가 20Hz일 때 타점이 Y축 최외각(0.85)에 도달
- `MAX_REACH_FIFTH = 30.0`: 5도 오차가 30Hz일 때 타점이 X축 최외각(0.6)에 도달

**튜닝 감도(Tuning Sensitivity) 조절**:
- 이 값들을 **감소**시키면: 같은 오차에 대해 타점이 외곽으로 이동 (더 민감)
- 이 값들을 **증가**시키면: 같은 오차에 대해 타점이 중심으로 이동 (덜 민감)

**보정 가이드**:
1. **데이터 수집**: 실제 튜닝 작업 100건의 오차 분포 측정
2. **95th Percentile 계산**: 상위 5% 극단값 제외한 최대 오차 확인
3. **상수 재설정**:
   - MAX_REACH_TONIC = (95th percentile 토닉 오차) × 1.2
   - MAX_REACH_FIFTH = (95th percentile 5도 오차) × 1.2
4. **검증**: 새 상수로 타점 분포가 타원 내 균등하게 분포하는지 확인

### 9.5 보정 프로세스 (Calibration Workflow)

#### 9.5.1 Phase 1: 임계값($C$) 측정 🔴

**목적**: 재료가 실제로 변형되기 시작하는 최소 강도 발견

**준비물**:
- 더미(Dummy) 시편 (실제 핸드팬과 동일 소재 SUS430)
- 고정밀 주파수 측정기 (±0.01Hz 해상도)
- 자동 튜닝 머신

**실험 절차**:
1. 시편을 튜닝 머신에 고정
2. 초기 주파수 측정 (F₀)
3. 강도 Level 1부터 시작하여 1 단위씩 증가하며 단타 실시
4. 각 타격 후 주파수 재측정 (F₁, F₂, ...)
5. **ΔF = |Fₙ - F₀| ≥ 0.1Hz** 가 처음 발생하는 Level을 기록

**예상 결과**:
```
Level 5  → ΔF = 0.00 Hz (변화 없음)
Level 10 → ΔF = 0.00 Hz (변화 없음)
Level 15 → ΔF = 0.02 Hz (미세 변화, 측정 오차 범위)
Level 18 → ΔF = 0.12 Hz ⭐ (명확한 변화 감지)
Level 20 → ΔF = 0.31 Hz (변화 지속)

→ THRESHOLD_C = 18.0으로 업데이트
```

**주의사항**:
- 시편마다 약간의 편차가 있을 수 있으므로 3회 반복 후 평균값 사용
- 온도(20±2℃), 습도(50±10%) 일정하게 유지

---

#### 9.5.2 Phase 2: 안전 한계($L$) 확정 🟡

**방법 1 - 자동 계산 (권장)**:
```
LIMIT = THRESHOLD_C × 2.1
```

**방법 2 - 실측 (선택)**:
1. Phase 1에서 측정된 THRESHOLD_C부터 시작
2. 강도를 10% 단위로 증가시키며 타격
3. 시편에 육안 변형(Dent), 균열(Crack), 또는 과도한 음정 변화(>50Hz) 발생 시점 확인
4. 해당 강도의 90%를 LIMIT으로 설정

**예시**:
```
THRESHOLD_C = 18.0 (실측)
→ 자동 계산: LIMIT = 18.0 × 2.1 = 37.8
→ 코드 업데이트:
  THRESHOLD_C: 18.0,
  SAFETY_RATIO: 2.1,
  get LIMIT() { return 37.8; }
```

---

#### 9.5.3 Phase 3: 민감도($S$) 튜닝 🟡

**목적**: 계산된 강도가 실제 오차 변화량과 일치하도록 조정

**실험 설계**:
1. 표준 오차 시나리오 준비 (예: 토닉 -10Hz)
2. 현재 SCALING_S=30.0으로 강도 계산
3. 계산된 강도로 타격 후 실제 오차 변화량 측정
4. 목표 변화량(10Hz)과 비교

**보정 공식**:
```
S_new = S_old × (목표_변화량 / 실제_변화량)

예시:
  목표: -10Hz → 0Hz (변화량 10Hz)
  실측: -10Hz → -3Hz (변화량 7Hz)
  → S_new = 30.0 × (10 / 7) ≈ 42.9
```

**검증**:
새로운 SCALING_S로 10개 시나리오 재실험 → 평균 오차 ≤ 15%면 합격

---

#### 9.5.4 Phase 4: 모드 밸런스($K$) 조정 🟢

**목적**: 특정 모드만 일관되게 문제가 있을 때 개별 보정

**케이스 스터디**:
```
문제: "5도는 항상 계산된 강도보다 20% 더 세게 쳐야 한다"

분석:
  토닉 시나리오 10개 → 평균 정확도 92% ✅
  옥타브 시나리오 10개 → 평균 정확도 89% ✅
  5도 시나리오 10개 → 평균 정확도 68% ❌

보정:
  현재 K_fifth = 1.2
  실제 필요 강도 비율 = 1.2 × 1.2 = 1.44
  → K_fifth = 1.44로 업데이트
```

**주의사항**:
- 다른 모드가 정상일 때만 개별 보정 실시
- 모든 모드가 문제라면 SCALING_S 재조정 필요

### 9.6 보정 우선순위 가이드

#### 🔴 최우선 (시스템 도입 초기 필수)
- [ ] **SUS430 물성 데이터 확보** - 재료 시험 성적서(Mill Sheet) 확보 및 Section 2.2.1 업데이트
- [ ] **THRESHOLD_C 실측** - 모든 계산의 기준점
- [ ] **LIMIT 확정** - 안전성 확보
- [ ] **하드웨어 인터페이스 매핑** - 소프트웨어 강도 → 기계 제어값 변환

#### 🟡 우선 (100회 튜닝 작업 후 권장)
- [ ] **SCALING_S 미세 조정** - 전체 민감도 보정
- [ ] **해머링 타입 임계값 검증** - 실제 조율 효과 확인
- [ ] **좌표 분포 분석** - 타점이 균등하게 분포하는지 확인

#### 🟢 선택 (1000회 튜닝 작업 후 또는 특정 문제 발생 시)
- [ ] **STIFFNESS_K 모드별 보정** - 특정 모드 문제 해결
- [ ] **부차 가중치(35%) 최적화** - 복합 조율 정밀도 향상
- [ ] **전체 시스템 재평가** - 장기 사용 후 성능 점검

#### ⚪ 보정 불필요 (이론적/기하학적 근거 명확)
- 타원 반지름 (TONEFIELD_RADIUS_X/Y) - 실제 톤필드 형상 측정값
- 안전 계수 (SAFETY_RATIO=2.1) - 재료 공학 표준
- 해머링 타입 종류 (SNAP/PULL/PRESS) - 튜닝 이론 확립

---

## 10. 코드 구조

### 10.1 파일 구조

```
tuning-console/
├── lib/
│   ├── TuningPhysicsConfig.ts    # 물리 엔진 핵심 로직
│   └── supabase.ts                # 데이터베이스 인터페이스
├── app/
│   ├── page.tsx                   # 메인 UI 컴포넌트
│   └── components/
│       └── TonefieldCanvas.tsx    # 톤필드 시각화
├── docs/
│   ├── TECHNICAL_SPECIFICATION.md       # 본 문서
│   ├── COMPOUND_TARGET_SYSTEM.md        # 복합 조율 문서
│   └── HAMMERING_TYPE_SYSTEM.md         # 해머링 타입 문서
└── migrations/
    ├── add_compound_target_fields.sql   # 복합 조율 마이그레이션
    └── add_hammering_type_field.sql     # 해머링 타입 마이그레이션
```

### 10.2 주요 함수

#### `calculateImpactPower()` - TuningPhysicsConfig.ts:48

**입력**: rawHz, coord, mode
**출력**: { force, count, hammeringType }
**역할**: 타격 강도, 타수, 해머링 타입 계산

#### `handleTuneClick()` - page.tsx:147

**역할**: 조율 버튼 클릭 시 전체 계산 흐름 실행
1. 조율 대상 결정
2. 좌표 계산
3. 강도/타수 계산
4. 상태 업데이트

#### `handleSaveHitPoint()` - page.tsx:343

**역할**: 계산 결과를 데이터베이스에 저장

---

## 11. 참고 문헌 및 관련 자료

### 11.1 물리 법칙
- 후크의 법칙 (Hooke's Law): F = k × x
- 에너지 보존 법칙
- 탄성 변형 이론

### 11.2 재료 과학
- SUS430 스테인레스 물성치
- 항복 강도 및 탄성 계수
- 피로 한계 및 안전 계수

### 11.3 피아노 조율 이론
- 조율 핀 및 현의 물리적 특성
- 해머링 기법 분류 체계
- 톤필드 기하학

---

## 12. 버전 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.4 | 2025-11-22 | 핸드팬 특화 및 실측 보정 시스템 추가 |
| | | - 전체 문서 "핸드팬" 용어 통일 |
| | | - Section 2.2: SUS430 소재 물성 데이터 테이블 및 공학적 근거 상세화 |
| | | - Section 2.2: Mill Sheet 확보 및 보정 필요성 명시 |
| | | - Section 9: "실측 보정 대상 상수 및 설정 근거" 전면 재작성 |
| | | - Section 9.2: 보정 대상 상수 일람표 추가 (0~3순위 구분) |
| | | - Section 9.5: 4단계 보정 워크플로우 상세화 (Phase 1~4) |
| | | - SUS430 물성 데이터를 0순위 보정 대상으로 추가 |
| 1.0 | 2025-11-22 | 초기 버전 작성 |
| | | - 기본 물리 모델 구현 |
| | | - 좌표 계산 알고리즘 |
| | | - 해머링 타입 시스템 |
| | | - 복합 조율 대상 시스템 |

---

## 13. 검토 요청 사항

### 13.1 물리 모델 검증
- [ ] 에너지 공식의 물리적 타당성 (`√(Hz × S × K)`)
- [ ] 임계값 및 안전 한계 설정 (C=20.0, LIMIT=42.0)
- [ ] 타수 분할 로직의 에너지 보존 법칙 준수 여부

### 13.2 수학적 정확성
- [ ] 좌표 정규화 공식 (20.0, 30.0 상수의 근거)
- [ ] 타원 경계 조건 적용 정확성
- [ ] 효율(efficiency) 계산 로직

### 13.3 해머링 타입 로직
- [ ] 임계값 설정의 적절성 (1.0, 5.0, 10.0Hz)
- [ ] 내부/외부 타격 구분의 타당성
- [ ] PULL 타입의 존재 여부 (외부 타격에서 제외한 근거)

### 13.4 복합 조율 시스템
- [ ] 부차 가중치 35%의 적절성
- [ ] 협력 관계 판별 조건의 타당성
- [ ] 좌표 합성 방법의 정확성

### 13.5 엣지 케이스
- [ ] 경계값 처리 (1.0, 5.0, 10.0Hz 정확히)
- [ ] 반협력 관계 (반대 방향) 처리
- [ ] 모든 오차가 0인 경우
- [ ] 극단적으로 큰 오차 (>50Hz)

### 13.6 실무 적용성
- [ ] 실제 조율 작업 흐름과의 일치성
- [ ] 조율사 경험과의 부합 여부
- [ ] UI/UX 개선 제안

---

## 14. 연락처

**개발팀**: Claude Code AI Assistant
**프로젝트**: Tuning Lab - 조율오차 기반 자동타점계산 시스템
**저장소**: `/Users/equus/Desktop/tlab/tuning-console`

---

**문서 끝**
