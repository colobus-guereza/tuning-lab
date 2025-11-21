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

  // [3] 모드별 구조 강성 계수 (톤필드 기하학적 특성)
  STIFFNESS_K: {
    tonic: 1.0, // 기준
    octave: 0.9, // 장축 (유연함)
    fifth: 1.2, // 단축 (뻣뻣함)
  },
} as const;

/**
 * 최적 타격 강도 및 타수 계산 함수
 * @param rawHz - 주 조율 대상의 오차 절대값 (예: 17.7)
 * @param coord - 계산된 좌표 {x, y} (예: {x: -0.2, y: -0.749})
 * @param mode - 조율 대상 모드 ('tonic', 'octave', 'fifth')
 * @returns {force: number, count: number} - 최적 강도와 타수
 */
export function calculateImpactPower(
  rawHz: number,
  coord: { x: number; y: number },
  mode: "tonic" | "octave" | "fifth"
): { force: number; count: number } {
  const { THRESHOLD_C, LIMIT, SCALING_S, STIFFNESS_K } = PHYSICS_CONFIG;

  // 1. [벡터 효율 보정] 빗겨 칠 때(대각선) 에너지 손실 보정
  // 주 축(Main Axis)에 얼마나 가까운지로 효율 판단 (0.1은 최소 안전장치)
  const efficiency = Math.max(Math.abs(coord.y), 0.1);

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

  // 소수점 1자리까지 반올림하여 리턴
  return {
    force: parseFloat(finalForce.toFixed(1)),
    count: finalCount,
  };
}
