"use client";

import { useState, useEffect, useRef } from "react";
import TonefieldCanvas from "./components/TonefieldCanvas";
import { supabase, HitPointData } from "@/lib/supabase";

export default function HomePage() {
  const [tonic, setTonic] = useState<string>("0");
  const [octave, setOctave] = useState<string>("0");
  const [fifth, setFifth] = useState<string>("0");
  const [tuningTarget, setTuningTarget] = useState<"tonic" | "octave" | "fifth" | null>(null);
  const [result, setResult] = useState<{
    L: number;
    S: number;
    strength: number;
  } | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<
    Array<{ x: number; y: number }>
  >([]);
  const [hitPointCoord, setHitPointCoord] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hitPointStrength, setHitPointStrength] = useState<string>("");
  const [hitPointHitCount, setHitPointHitCount] = useState<string>("");
  const [hitPointLocation, setHitPointLocation] = useState<"external" | "internal" | null>("internal");
  const [hitPointIntent, setHitPointIntent] = useState<string>("");
  const [recentHitPoints, setRecentHitPoints] = useState<HitPointData[]>([]);
  const [selectedHitPoint, setSelectedHitPoint] = useState<HitPointData | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isLoadingHitPoints, setIsLoadingHitPoints] = useState<boolean>(true);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  // 최근 타점 데이터 불러오기
  const fetchRecentHitPoints = async () => {
    try {
      setIsLoadingHitPoints(true);
      const { data, error } = await supabase
        .from("hit_points")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("데이터 불러오기 오류:", error);
      } else if (data) {
        setRecentHitPoints(data);
      }
    } catch (err) {
      console.error("데이터 불러오기 중 오류:", err);
    } finally {
      setIsLoadingHitPoints(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 불러오기
  useEffect(() => {
    fetchRecentHitPoints();
  }, []);

  // 조율대상 자동 계산 (실제 주파수 비율 1:2:3 고려)
  // 토닉 1Hz = 옥타브 2Hz = 5도 3Hz (같은 영향력)
  useEffect(() => {
    // 가중치: 토닉×6, 옥타브×3, 5도×2 (공통분모 6 사용)
    const tonicValue = Math.abs(parseFloat(tonic) || 0) * 6;
    const octaveValue = Math.abs(parseFloat(octave) || 0) * 3;
    const fifthValue = Math.abs(parseFloat(fifth) || 0) * 2;

    const maxValue = Math.max(tonicValue, octaveValue, fifthValue);

    if (maxValue === 0) {
      setTuningTarget(null);
    } else if (tonicValue === maxValue) {
      setTuningTarget("tonic");
    } else if (octaveValue === maxValue) {
      setTuningTarget("octave");
    } else {
      setTuningTarget("fifth");
    }
  }, [tonic, octave, fifth]);

  // 의도와 위치 자동 계산
  useEffect(() => {
    if (!tuningTarget) return;

    // 조율대상 값 가져오기
    let targetValue: number;
    if (tuningTarget === "tonic") {
      targetValue = parseFloat(tonic) || 0;
    } else if (tuningTarget === "octave") {
      targetValue = parseFloat(octave) || 0;
    } else {
      targetValue = parseFloat(fifth) || 0;
    }

    // 의도 자동 제안
    // 양수: 너무 높음 → 낮춰야 함 (Down)
    // 음수: 너무 낮음 → 올려야 함 (Up)
    const suggestedIntent = targetValue > 0 ? "Down (플랫)" : targetValue < 0 ? "Up (샵)" : "";
    setHitPointIntent(suggestedIntent);

    // 위치 자동 선택
    // Down → 외부 타격
    // Up → 내부 타격
    const autoPosition = targetValue > 0 ? "external" : targetValue < 0 ? "internal" : null;
    setHitPointLocation(autoPosition);
  }, [tuningTarget, tonic, octave, fifth]);

  // 좌표 자동 계산 (타원 외곽선 위의 점) - atan2 벡터 방식 + 축 고립
  useEffect(() => {
    if (!tuningTarget) return;

    // 조율오차 원본값 (부호 포함)
    const tonicVal = parseFloat(tonic) || 0;
    const octaveVal = parseFloat(octave) || 0;
    const fifthVal = parseFloat(fifth) || 0;

    // 조율오차 절대값
    const eT = Math.abs(tonicVal);
    const eO = Math.abs(octaveVal);
    const eF = Math.abs(fifthVal);

    // 모든 오차가 0이면 계산하지 않음
    if (eT === 0 && eO === 0 && eF === 0) return;

    // 타원 파라미터 (TonefieldCanvas와 동일)
    const radiusX = 0.6;  // 가로 반지름 (5도 방향)
    const radiusY = 0.85; // 세로 반지름 (토닉/옥타브 방향)

    // 1단계: 가중치 적용하여 힘(Force) 계산
    const forceTonic = eT / 1.0;   // 가중치 1
    const forceOctave = eO / 2.0;  // 가중치 2
    const forceFifth = eF / 3.0;   // 가중치 3

    // 2순위 찾기 (반구 결정용)
    const scores = [
      { type: 'tonic', score: eT * 6, value: tonicVal },
      { type: 'octave', score: eO * 3, value: octaveVal },
      { type: 'fifth', score: eF * 2, value: fifthVal }
    ].sort((a, b) => b.score - a.score);

    const primary = scores[0];
    const secondary = scores[1];

    // 2단계: 상/하반구 결정 (수직 방향 힘 결정)
    let vectorY: number;
    let isUpperHemisphere = false;

    if (primary.type === 'octave') {
      isUpperHemisphere = true;
      vectorY = forceOctave;  // 상반구: 옥타브 힘 (양수)
    } else if (primary.type === 'tonic') {
      isUpperHemisphere = false;
      vectorY = -forceTonic;  // 하반구: 토닉 힘 (음수)
    } else {
      // 5도가 1순위면 2순위로 결정
      if (secondary.type === 'octave') {
        isUpperHemisphere = true;
        vectorY = forceOctave;
      } else {
        isUpperHemisphere = false;
        vectorY = -forceTonic;
      }
    }

    // 3단계: 좌/우 결정 (수평 방향 힘 결정) - 축 고립 로직 적용
    let vectorX: number;

    // 조율 대상이 토닉/옥타브(수직축)인 경우에만 부호 검사
    if (primary.type === 'tonic' || primary.type === 'octave') {
      const targetValue = primary.value;
      const isSignSame = Math.sign(targetValue) === Math.sign(fifthVal);

      if (isSignSame || fifthVal === 0) {
        // [협력 관계] 부호가 같음 → 5도 벡터 포함하여 대각선 타격 (일타이피 효과)
        const isRight = Math.random() >= 0.5;
        vectorX = isRight ? forceFifth : -forceFifth;
      } else {
        // [상충 관계] 부호가 반대 → 5도 벡터 제외 (축 고립)
        // 순수 수직축(12시/6시) 타격으로 주 대상만 조율, 5도 영향 최소화
        vectorX = 0;
      }
    } else {
      // 5도가 주 조율 대상인 경우 → 기존 로직 (좌/우 랜덤)
      const isRight = Math.random() >= 0.5;
      vectorX = isRight ? forceFifth : -forceFifth;
    }

    // 4단계: 각도 계산 (atan2 사용 - 비율 문제 자동 해결!)
    // 두 힘의 비율에 따라 정확한 각도가 자동으로 계산됨
    const theta = Math.atan2(vectorY, vectorX);

    // 5단계: 타원 좌표 매핑
    // 타원의 각 반지름에 cos/sin을 곱하여 외곽선 위의 점 계산
    const x = radiusX * Math.cos(theta);
    const y = radiusY * Math.sin(theta);

    // 좌표 설정
    setHitPointCoord({ x, y });
  }, [tuningTarget, tonic, octave, fifth]);

  // 카드 바깥 클릭 시 카드 접기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cardsContainerRef.current &&
        !cardsContainerRef.current.contains(event.target as Node) &&
        expandedCards.size > 0
      ) {
        setExpandedCards(new Set());
        setSelectedHitPoint(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expandedCards]);

  const handleCanvasClick = (x: number, y: number) => {
    // Clicking sets the hit point coordinate
    setHitPointCoord({ x, y });
  };

  const handleClearCoords = () => {
    setSelectedCoords([]);
  };

  const handleRandomize = () => {
    // Generate random numbers between -30 and +30
    const randomFifth = Math.random() * 60 - 30; // -30 to +30
    const randomOctave = Math.random() * 60 - 30;
    const randomTonic = Math.random() * 60 - 30;

    setFifth(randomFifth.toFixed(2));
    setOctave(randomOctave.toFixed(2));
    setTonic(randomTonic.toFixed(2));
  };

  const handleSaveHitPoint = async () => {
    if (!hitPointCoord || !hitPointStrength.trim() || !hitPointHitCount.trim() || !hitPointLocation || !hitPointIntent.trim()) {
      alert("모든 필드를 입력해주세요");
      return;
    }

    if (!tuningTarget) {
      alert("조율대상이 설정되지 않았습니다. 조율오차 값을 입력해주세요.");
      return;
    }

    // Supabase 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === 'your-project-url') {
      alert("⚠️ Supabase가 아직 설정되지 않았습니다.\n\nSUPABASE_SETUP.md 파일을 참고하여:\n1. Supabase 프로젝트 생성\n2. .env.local 파일에 URL과 API 키 입력\n3. 개발 서버 재시작");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("hit_points")
        .insert([
          {
            tonic: parseFloat(tonic),
            octave: parseFloat(octave),
            fifth: parseFloat(fifth),
            tuning_target: tuningTarget,
            coordinate_x: hitPointCoord.x,
            coordinate_y: hitPointCoord.y,
            strength: parseFloat(hitPointStrength),
            hit_count: parseInt(hitPointHitCount),
            location: hitPointLocation,
            intent: hitPointIntent,
          },
        ]);

      if (error) {
        console.error("저장 오류:", error);
        alert(`저장 실패: ${error.message}`);
      } else {
        // 저장 후 모든 입력 필드 초기화
        setTonic("0");
        setOctave("0");
        setFifth("0");
        setHitPointCoord(null);
        setHitPointStrength("");
        setHitPointHitCount("");
        setHitPointLocation("internal");
        setHitPointIntent("");
        // 최근 데이터 새로고침
        fetchRecentHitPoints();
      }
    } catch (err) {
      console.error("저장 중 오류 발생:", err);
      alert("저장 중 오류가 발생했습니다. 콘솔을 확인해주세요.");
    }
  };

  const isSaveEnabled =
    hitPointCoord !== null &&
    hitPointStrength.trim() !== "" &&
    hitPointHitCount.trim() !== "" &&
    hitPointLocation !== null &&
    hitPointIntent.trim() !== "";

  // 타점 카드 클릭 핸들러
  const handleHitPointCardClick = (hitPoint: HitPointData) => {
    const cardId = hitPoint.id!;

    if (expandedCards.has(cardId)) {
      // 이미 펼쳐진 카드를 클릭하면 접기
      setExpandedCards(new Set());
      // 접을 때 선택 해제
      setSelectedHitPoint(null);
    } else {
      // 접힌 카드를 클릭하면 다른 카드들은 모두 닫고 이 카드만 펼치기
      setExpandedCards(new Set([cardId]));
      setSelectedHitPoint(hitPoint);
    }
  };

  // 타점 삭제 핸들러
  const handleDeleteHitPoint = async (
    e: React.MouseEvent,
    hitPointId: string
  ) => {
    // 이벤트 버블링 방지 (카드 클릭 이벤트가 발생하지 않도록)
    e.stopPropagation();

    if (!confirm("이 타점 데이터를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("hit_points")
        .delete()
        .eq("id", hitPointId);

      if (error) {
        console.error("삭제 오류:", error);
        alert(`삭제 실패: ${error.message}`);
      } else {
        // 삭제 성공 시 선택 해제
        if (selectedHitPoint?.id === hitPointId) {
          setSelectedHitPoint(null);
        }
        // 펼침 상태에서도 제거
        const newExpanded = new Set(expandedCards);
        newExpanded.delete(hitPointId);
        setExpandedCards(newExpanded);
        // 목록 새로고침
        fetchRecentHitPoints();
      }
    } catch (err) {
      console.error("삭제 중 오류 발생:", err);
      alert("삭제 중 오류가 발생했습니다. 콘솔을 확인해주세요.");
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 transition-colors">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center text-gray-900 dark:text-white">
        조율오차 기반 최적타점 산출을 위한 기초타점데이터 학습
      </h1>

      <div className="max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Left: Controls */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">조율오차 입력</h2>
            <button
              onClick={handleRandomize}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white font-bold text-base sm:text-lg flex items-center justify-center transition-colors shadow-md flex-shrink-0"
              title="Generate random values (-30 ~ +30)"
            >
              R
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <label className={`text-sm sm:text-base font-semibold min-w-[60px] sm:min-w-[80px] flex items-center gap-1 ${
                tuningTarget === "fifth"
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-700 dark:text-gray-300"
              }`}>
                {tuningTarget === "fifth" && "🎯 "}5도 (Hz)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fifth}
                onChange={(e) => setFifth(e.target.value)}
                className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg text-xl sm:text-2xl font-bold text-center transition-colors ${
                  tuningTarget === "fifth"
                    ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                }`}
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <label className={`text-sm sm:text-base font-semibold min-w-[60px] sm:min-w-[80px] flex items-center gap-1 ${
                tuningTarget === "octave"
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-700 dark:text-gray-300"
              }`}>
                {tuningTarget === "octave" && "🎯 "}옥타브 (Hz)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={octave}
                onChange={(e) => setOctave(e.target.value)}
                className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg text-xl sm:text-2xl font-bold text-center transition-colors ${
                  tuningTarget === "octave"
                    ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                }`}
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <label className={`text-sm sm:text-base font-semibold min-w-[60px] sm:min-w-[80px] flex items-center gap-1 ${
                tuningTarget === "tonic"
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-700 dark:text-gray-300"
              }`}>
                {tuningTarget === "tonic" && "🎯 "}토닉 (Hz)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={tonic}
                onChange={(e) => setTonic(e.target.value)}
                className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg text-xl sm:text-2xl font-bold text-center transition-colors ${
                  tuningTarget === "tonic"
                    ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                }`}
              />
            </div>
          </div>

          {/* Hit Point Input Fields */}
            <div className={`mt-4 sm:mt-6 p-3 sm:p-4 border rounded-lg space-y-2 sm:space-y-3 transition-all ${
              isSaveEnabled
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 opacity-100"
                : "bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 opacity-60"
            }`}>
              <h3 className="font-semibold text-sm sm:text-base text-blue-900 dark:text-blue-300 mb-2 sm:mb-3">
                타점 파라미터
              </h3>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    위치
                  </label>
                  {hitPointLocation && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      ✨ 자동 계산됨
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setHitPointLocation("internal")}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      hitPointLocation === "internal"
                        ? "bg-blue-600 text-white dark:bg-blue-500"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    내부
                  </button>
                  <button
                    type="button"
                    onClick={() => setHitPointLocation("external")}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      hitPointLocation === "external"
                        ? "bg-orange-500 text-white dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    외부
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    좌표
                  </label>
                  {hitPointCoord && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      ✨ 자동 계산됨
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={
                    hitPointCoord
                      ? `(${hitPointCoord.x.toFixed(3)}, ${hitPointCoord.y.toFixed(3)})`
                      : ""
                  }
                  readOnly
                  placeholder="자동으로 계산됩니다"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                />
              </div>

              {/* 강도와 타수 그리드 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    강도
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={hitPointStrength}
                    onChange={(e) => setHitPointStrength(e.target.value)}
                    placeholder="강도"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    타수
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={hitPointHitCount}
                    onChange={(e) => setHitPointHitCount(e.target.value)}
                    placeholder="타수"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              {/* 조율대상과 의도 그리드 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    조율대상
                  </label>
                  <input
                    type="text"
                    value={
                      tuningTarget === "tonic"
                        ? "토닉"
                        : tuningTarget === "octave"
                        ? "옥타브"
                        : tuningTarget === "fifth"
                        ? "5도"
                        : ""
                    }
                    readOnly
                    placeholder="조율대상"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold cursor-not-allowed"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      의도
                    </label>
                    {hitPointIntent && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        ✨ 자동 제안됨
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={hitPointIntent}
                    onChange={(e) => setHitPointIntent(e.target.value)}
                    placeholder="의도"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveHitPoint}
                disabled={!isSaveEnabled}
                className={`w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold transition-colors ${
                  isSaveEnabled
                    ? "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white"
                    : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                }`}
              >
                타점 입력
              </button>
            </div>

          {result && (
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg transition-colors">
              <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                예측 결과
              </h3>
              <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                <div>
                  <span className="font-medium">L:</span> {result.L.toFixed(3)}
                </div>
                <div>
                  <span className="font-medium">S:</span> {result.S.toFixed(3)}
                </div>
                <div>
                  <span className="font-medium">Strength:</span>{" "}
                  {result.strength.toFixed(3)}
                </div>
              </div>
            </div>
          )}

          {/* Selected Coordinates */}
          {selectedCoords.length > 0 && (
            <div className="mt-4 sm:mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  선택된 좌표 ({selectedCoords.length})
                </h3>
                <button
                  onClick={handleClearCoords}
                  className="text-xs sm:text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                  모두 지우기
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 text-xs sm:text-sm bg-gray-50 dark:bg-gray-700 p-2 sm:p-3 rounded transition-colors">
                {selectedCoords.map((coord, i) => (
                  <div key={i} className="text-gray-700 dark:text-gray-300">
                    {i + 1}. ({coord.x.toFixed(3)}, {coord.y.toFixed(3)})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: Tonefield Canvas */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg transition-colors lg:col-span-2 xl:col-span-1">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">
            톤필드좌표계
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
            톤필드의 아무 곳이나 클릭하여 좌표를 선택하세요
          </p>
          <TonefieldCanvas
            selectedCoords={selectedCoords}
            onCoordClick={handleCanvasClick}
            hitPointCoord={hitPointCoord}
            hitPointLocation={hitPointLocation}
            selectedHitPoint={selectedHitPoint}
          />

          {/* Reset button below canvas */}
          {selectedCoords.length > 0 && (
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {selectedCoords.length}개 좌표 선택됨
              </div>
              <button
                onClick={handleClearCoords}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                모든 좌표 지우기
              </button>
            </div>
          )}
        </div>

        {/* Right: Recent Hit Points */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg transition-colors">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
            최근 타점
            <span className="text-xs sm:text-sm font-normal px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              {recentHitPoints.length}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
            저장된 타점을 클릭하여 좌표계에 표시
          </p>

          <div ref={cardsContainerRef} className="space-y-3 max-h-[800px] overflow-y-auto">
            {isLoadingHitPoints ? (
              // 로딩 스켈레톤: 접힌 카드와 동일한 구조
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    {/* 강도 숫자 스켈레톤 */}
                    <div className="h-6 w-12 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    {/* I/E 배지 스켈레톤 */}
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    {/* 의도 텍스트 스켈레톤 */}
                    <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    {/* 삭제 버튼 스켈레톤 */}
                    <div className="h-8 w-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                  </div>
                </div>
              ))
            ) : recentHitPoints.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                저장된 타점 데이터가 없습니다
              </div>
            ) : (
              recentHitPoints.map((hitPoint) => {
                const isExpanded = expandedCards.has(hitPoint.id!);
                const isSelected = selectedHitPoint?.id === hitPoint.id;

                return (
                  <div
                    key={hitPoint.id}
                    onClick={() => handleHitPointCardClick(hitPoint)}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-700"
                    }`}
                  >
                    {isExpanded ? (
                      // 펼쳐진 상태: 전체 정보 표시
                      <>
                        {/* 상단 영역: 의도 + 삭제 버튼 */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">의도</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {hitPoint.intent}
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteHitPoint(e, hitPoint.id!)}
                            className="px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-500 rounded transition-colors border border-red-600 dark:border-red-400 flex-shrink-0"
                            title="삭제"
                          >
                            삭제
                          </button>
                        </div>

                        {/* 위치/좌표/강도/타수 | 5도/옥타브/토닉 2열 그리드 */}
                        <div className="grid grid-cols-2 gap-4 mb-2 text-sm">
                          {/* 왼쪽 열: 위치, 좌표, 강도, 타수 */}
                          <div className="space-y-2">
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">위치</div>
                              <div className="text-gray-700 dark:text-gray-300">
                                {hitPoint.location === "internal" ? "내부" : "외부"}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">좌표</div>
                              <div className="text-gray-700 dark:text-gray-300">
                                ({hitPoint.coordinate_x.toFixed(3)}, {hitPoint.coordinate_y.toFixed(3)})
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">강도×타수</div>
                              <div className="text-gray-700 dark:text-gray-300">
                                {hitPoint.strength >= 0 ? '+' : ''}{hitPoint.strength} × {hitPoint.hit_count}
                              </div>
                            </div>
                          </div>

                          {/* 오른쪽 열: 5도, 옥타브, 토닉 (조율대상 표시) */}
                          <div className="space-y-2">
                            <div>
                              <div className={hitPoint.tuning_target === "fifth"
                                ? "text-red-600 dark:text-red-400 font-bold"
                                : "text-gray-500 dark:text-gray-400"}>
                                5도
                              </div>
                              <div className={hitPoint.tuning_target === "fifth"
                                ? "text-red-600 dark:text-red-400 font-bold"
                                : "text-gray-700 dark:text-gray-300"}>
                                {hitPoint.fifth}Hz
                              </div>
                            </div>
                            <div>
                              <div className={hitPoint.tuning_target === "octave"
                                ? "text-red-600 dark:text-red-400 font-bold"
                                : "text-gray-500 dark:text-gray-400"}>
                                옥타브
                              </div>
                              <div className={hitPoint.tuning_target === "octave"
                                ? "text-red-600 dark:text-red-400 font-bold"
                                : "text-gray-700 dark:text-gray-300"}>
                                {hitPoint.octave}Hz
                              </div>
                            </div>
                            <div>
                              <div className={hitPoint.tuning_target === "tonic"
                                ? "text-red-600 dark:text-red-400 font-bold"
                                : "text-gray-500 dark:text-gray-400"}>
                                토닉
                              </div>
                              <div className={hitPoint.tuning_target === "tonic"
                                ? "text-red-600 dark:text-red-400 font-bold"
                                : "text-gray-700 dark:text-gray-300"}>
                                {hitPoint.tonic}Hz
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // 접힌 상태: 강도, I/E, 의도만 한 줄로 표시
                      <div className="flex items-center gap-3 text-base">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {hitPoint.strength >= 0 ? '+' : ''}{hitPoint.strength}
                        </div>
                        <div className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium">
                          {hitPoint.location === "internal" ? "I" : "E"}
                        </div>
                        <div className="flex-1 text-gray-700 dark:text-gray-300 truncate">
                          {hitPoint.intent}
                        </div>
                        <button
                          onClick={(e) => handleDeleteHitPoint(e, hitPoint.id!)}
                          className="px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-500 rounded transition-colors border border-red-600 dark:border-red-400"
                          title="삭제"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
