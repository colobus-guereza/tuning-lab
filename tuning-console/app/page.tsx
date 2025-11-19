"use client";

import { useState } from "react";
import TonefieldCanvas from "./components/TonefieldCanvas";
import ThemeToggle from "./components/ThemeToggle";

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
  const [showInputFields, setShowInputFields] = useState(false);
  const [hitPointCoord, setHitPointCoord] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hitPointStrength, setHitPointStrength] = useState<number | null>(null);

  const handlePredict = () => {
    setShowInputFields(true);
    setHitPointCoord(null);
    setHitPointStrength(null);
  };

  const handleCanvasClick = (x: number, y: number) => {
    if (showInputFields) {
      // When input fields are shown, clicking sets the hit point coordinate
      setHitPointCoord({ x, y });
    } else {
      // Normal behavior: add to selected coordinates list
      setSelectedCoords([...selectedCoords, { x, y }]);
    }
  };

  const handleClearCoords = () => {
    setSelectedCoords([]);
  };

  const handleSaveHitPoint = () => {
    // TODO: Database save functionality will be implemented later
    console.log("Saving hit point:", {
      tonic,
      octave,
      fifth,
      coordinate: hitPointCoord,
      strength: hitPointStrength,
    });
    alert("Hit point data ready to save (DB connection pending)");
  };

  const isSaveEnabled = hitPointCoord !== null && hitPointStrength !== null;

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 transition-colors">
      <ThemeToggle />

      <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center text-gray-900 dark:text-white">
        Tuning Lab Console
      </h1>

      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Left: Controls */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg transition-colors">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Tuning Error Input</h2>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fifth (Hz)
              </label>
              <input
                type="number"
                value={fifth}
                onChange={(e) => setFifth(parseFloat(e.target.value) || 0)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Octave (Hz)
              </label>
              <input
                type="number"
                value={octave}
                onChange={(e) => setOctave(parseFloat(e.target.value) || 0)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tonic (Hz)
              </label>
              <input
                type="number"
                value={tonic}
                onChange={(e) => setTonic(parseFloat(e.target.value) || 0)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                step="0.1"
              />
            </div>

            <button
              onClick={handlePredict}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors"
            >
              Add Optimal Hit Point Data
            </button>
          </div>

          {/* Hit Point Input Fields */}
          {showInputFields && (
            <div className="mt-4 sm:mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-3">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">
                Hit Point Data Entry
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Coordinate (click on tonefield)
                </label>
                <input
                  type="text"
                  value={
                    hitPointCoord
                      ? `(${hitPointCoord.x.toFixed(3)}, ${hitPointCoord.y.toFixed(3)})`
                      : ""
                  }
                  readOnly
                  placeholder="Click on the tonefield to select coordinate"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Strength
                </label>
                <input
                  type="number"
                  value={hitPointStrength ?? ""}
                  onChange={(e) =>
                    setHitPointStrength(
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  placeholder="Enter strength value"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                  step="0.1"
                />
              </div>

              <button
                onClick={handleSaveHitPoint}
                disabled={!isSaveEnabled}
                className={`w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold transition-colors ${
                  isSaveEnabled
                    ? "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
                    : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                }`}
              >
                Save Optimal Hit Point Based on Tuning Error
              </button>
            </div>
          )}

          {result && (
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg transition-colors">
              <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                Prediction Result
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
                  Selected Coordinates ({selectedCoords.length})
                </h3>
                <button
                  onClick={handleClearCoords}
                  className="text-xs sm:text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                  Clear All
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

        {/* Right: Tonefield Canvas */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg transition-colors">
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">
            Tonefield Coordinate System
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
            Click anywhere on the tonefield to select coordinates
          </p>
          <TonefieldCanvas
            selectedCoords={selectedCoords}
            onCoordClick={handleCanvasClick}
            hitPointCoord={hitPointCoord}
          />

          {/* Reset button below canvas */}
          {selectedCoords.length > 0 && (
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {selectedCoords.length} coordinate{selectedCoords.length > 1 ? 's' : ''} selected
              </div>
              <button
                onClick={handleClearCoords}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Clear All Coordinates
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
