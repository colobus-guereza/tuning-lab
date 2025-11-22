/**
 * 조율 물리 연산 설정
 * 기계 캘리브레이션을 위한 물리 상수 관리
 */

export const PHYSICS_CONFIG = {
  // [1] 기계 캘리브레이션 (추후 보정 1순위)
  THRESHOLD_C: 20.0, // 임계값 (변형 시작 최소 강도)
  SCALING_S: 30.0, // 스케일링 (Hz -> 강도 변환 민감도)

  // [2] 안전 한계 (자동 계산됨: 임계값 * 2.1)
  // SUS430 + 30mm 망치 특성 반영
  SAFETY_RATIO: 2.1,
  get LIMIT() {
    return this.THRESHOLD_C * this.SAFETY_RATIO;
  },

  // [3] 톤필드 기하학적 상수 (효율 계산용)
  TONEFIELD_RADIUS_Y: 0.85, // 세로 반지름 (토닉/옥타브 축 꼭지점)
  TONEFIELD_RADIUS_X: 0.6,  // 가로 반지름 (5도 축 꼭지점)

  // [4] 모드별 구조 강성 계수 (톤필드 기하학적 특성)
  STIFFNESS_K: {
    tonic: 1.0, // 기준
    octave: 0.9, // 장축 (유연함)
    fifth: 1.2, // 단축 (뻣뻣함)
  },

  // [5] 해머링 타입 결정 임계값 (단위: Hz)
  HAMMERING_RULES: {
    INTERNAL: {
      SNAP_LIMIT: 1.0,   // 1.0 이하 튕겨치기
      PRESS_START: 10.0  // 10.0 이상 눌러치기 (그 사이는 당겨치기)
    },
    EXTERNAL: {
      SNAP_LIMIT: 5.0    // 5.0 이하 튕겨치기 (그 이상 눌러치기)
    }
  },
} as const;

/**
 * 최적 타격 강도 및 타수 계산 함수
 * @param rawHz - 주 조율 대상의 오차값 (부호 포함, 예: -17.7 또는 +17.7)
 * @param coord - 계산된 좌표 {x, y} (예: {x: -0.2, y: -0.749})
 * @param mode - 조율 대상 모드 ('tonic', 'octave', 'fifth')
 * @returns {force: number, count: number, hammeringType: string} - 최적 강도, 타수, 해머링 타입
 */
export function calculateImpactPower(
  rawHz: number,
  coord: { x: number; y: number },
  mode: "tonic" | "octave" | "fifth"
): { force: number; count: number; hammeringType: "SNAP" | "PULL" | "PRESS" } {
  const { THRESHOLD_C, LIMIT, SCALING_S, STIFFNESS_K, TONEFIELD_RADIUS_Y, TONEFIELD_RADIUS_X, HAMMERING_RULES } = PHYSICS_CONFIG;

  // 1. [상대적 효율 계산] Relative Efficiency (꼭지점 기준 정규화)
  // 모드별로 진동 축이 다르므로 기준 좌표를 다르게 적용
  // - 5도(Fifth): X축 진동 → X좌표 / RADIUS_X
  // - 토닉/옥타브: Y축 진동 → Y좌표 / RADIUS_Y
  let currentPos = 0;
  let vertexPos = 1.0;

  if (mode === 'fifth') {
    // 5도는 가로축(X) 기준
    currentPos = Math.abs(coord.x);
    vertexPos = TONEFIELD_RADIUS_X; // 0.6
  } else {
    // 토닉, 옥타브는 세로축(Y) 기준
    currentPos = Math.abs(coord.y);
    vertexPos = TONEFIELD_RADIUS_Y; // 0.85
  }

  // 상대적 효율 (최소 10% 안전장치)
  const efficiency = Math.max(currentPos / vertexPos, 0.1);

  // 효율을 감안한 유효 오차 거리 (효율이 낮으면 거리가 먼 것으로 간주)
  const effectiveHz = Math.abs(rawHz) / efficiency;

  // 2. [에너지 법칙] 1회 타격 기준 필요 에너지 산출
  // 공식: 임계값 + sqrt(오차 * 스케일 * 강성)
  const stiffness = STIFFNESS_K[mode] || 1.0;
  const pureEnergy = Math.sqrt(effectiveHz * SCALING_S * stiffness);
  const requiredForce = THRESHOLD_C + pureEnergy;

  // 3. [안전 분할 로직] 기계 한계(LIMIT) 초과 시 타수 나누기
  let finalForce = requiredForce;
  let finalCount = 1;

  if (requiredForce > LIMIT) {
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

  // 4. [해머링 타입 결정] Hammering Style
  // 기준: 원본 오차(rawHz)의 부호(방향) 및 절대값(크기)
  const absHz = Math.abs(rawHz);
  let hammeringType: "SNAP" | "PULL" | "PRESS";

  if (rawHz < 0) {
    // 내부 타격 (음수: 상향)
    if (absHz <= HAMMERING_RULES.INTERNAL.SNAP_LIMIT) {
      hammeringType = "SNAP"; // 튕겨치기
    } else if (absHz < HAMMERING_RULES.INTERNAL.PRESS_START) {
      hammeringType = "PULL"; // 당겨치기
    } else {
      hammeringType = "PRESS"; // 눌러치기
    }
  } else {
    // 외부 타격 (양수: 하향)
    if (absHz <= HAMMERING_RULES.EXTERNAL.SNAP_LIMIT) {
      hammeringType = "SNAP"; // 튕겨치기
    } else {
      hammeringType = "PRESS"; // 눌러치기 (외부에는 PULL 없음)
    }
  }

  // 최종 결과 반환 (소수점 1자리까지 반올림)
  return {
    force: parseFloat(finalForce.toFixed(1)),
    count: finalCount,
    hammeringType: hammeringType,
  };
}
