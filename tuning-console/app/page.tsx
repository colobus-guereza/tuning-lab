"use client";

import { useState, useEffect, useRef } from "react";
import TonefieldCanvas from "./components/TonefieldCanvas";
import { supabase, HitPointData } from "@/lib/supabase";

export default function HomePage() {
  const [tonic, setTonic] = useState(0);
  const [octave, setOctave] = useState(0);
  const [fifth, setFifth] = useState(0);
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
  const [hitPointStrength, setHitPointStrength] = useState<number | null>(null);
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

    setFifth(parseFloat(randomFifth.toFixed(2)));
    setOctave(parseFloat(randomOctave.toFixed(2)));
    setTonic(parseFloat(randomTonic.toFixed(2)));
  };

  const handleSaveHitPoint = async () => {
    if (!hitPointCoord || hitPointStrength === null || !hitPointLocation || !hitPointIntent.trim()) {
      alert("모든 필드를 입력해주세요");
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
            tonic,
            octave,
            fifth,
            coordinate_x: hitPointCoord.x,
            coordinate_y: hitPointCoord.y,
            strength: hitPointStrength,
            location: hitPointLocation,
            intent: hitPointIntent,
          },
        ]);

      if (error) {
        console.error("저장 오류:", error);
        alert(`저장 실패: ${error.message}`);
      } else {
        // 저장 후 모든 입력 필드 초기화
        setTonic(0);
        setOctave(0);
        setFifth(0);
        setHitPointCoord(null);
        setHitPointStrength(null);
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
    hitPointStrength !== null &&
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
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white font-bold text-base sm:text-lg flex items-center justify-center transition-colors shadow-md flex-shrink-0"
              title="Generate random values (-30 ~ +30)"
            >
              R
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <label className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 min-w-[60px] sm:min-w-[80px]">
                5도 (Hz)
              </label>
              <input
                type="number"
                value={fifth}
                onChange={(e) => setFifth(parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xl sm:text-2xl font-bold text-center focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                step="0.1"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <label className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 min-w-[60px] sm:min-w-[80px]">
                옥타브 (Hz)
              </label>
              <input
                type="number"
                value={octave}
                onChange={(e) => setOctave(parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xl sm:text-2xl font-bold text-center focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                step="0.1"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <label className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 min-w-[60px] sm:min-w-[80px]">
                토닉 (Hz)
              </label>
              <input
                type="number"
                value={tonic}
                onChange={(e) => setTonic(parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xl sm:text-2xl font-bold text-center focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                step="0.1"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  위치
                </label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  좌표 (톤필드 클릭)
                </label>
                <input
                  type="text"
                  value={
                    hitPointCoord
                      ? `(${hitPointCoord.x.toFixed(3)}, ${hitPointCoord.y.toFixed(3)})`
                      : ""
                  }
                  readOnly
                  placeholder="톤필드를 클릭하여 좌표를 선택하세요"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  강도
                </label>
                <input
                  type="number"
                  value={hitPointStrength ?? ""}
                  onChange={(e) =>
                    setHitPointStrength(
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  placeholder="강도 값을 입력하세요"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  의도
                </label>
                <input
                  type="text"
                  value={hitPointIntent}
                  onChange={(e) => setHitPointIntent(e.target.value)}
                  placeholder="의도를 간단히 입력하세요"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                />
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
                        {/* 의도 (가장 우선) */}
                        <div className="mb-3">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">의도</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {hitPoint.intent}
                          </div>
                        </div>

                        {/* 위치/좌표/강도 | 5도/옥타브/토닉 2열 그리드 */}
                        <div className="grid grid-cols-2 gap-4 mb-2 text-sm">
                          {/* 왼쪽 열: 위치, 좌표, 강도 */}
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
                              <div className="text-gray-500 dark:text-gray-400">강도</div>
                              <div className="text-gray-700 dark:text-gray-300">
                                {hitPoint.strength >= 0 ? '+' : ''}{hitPoint.strength}
                              </div>
                            </div>
                          </div>

                          {/* 오른쪽 열: 5도, 옥타브, 토닉 */}
                          <div className="space-y-2">
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">5도</div>
                              <div className="text-gray-700 dark:text-gray-300">{hitPoint.fifth}Hz</div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">옥타브</div>
                              <div className="text-gray-700 dark:text-gray-300">{hitPoint.octave}Hz</div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">토닉</div>
                              <div className="text-gray-700 dark:text-gray-300">{hitPoint.tonic}Hz</div>
                            </div>
                          </div>
                        </div>

                        {/* 날짜 */}
                        <div className="text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                          {hitPoint.created_at
                            ? new Date(hitPoint.created_at).toLocaleString("ko-KR", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
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
