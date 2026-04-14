import React, { useState, useCallback } from 'react'
import { getRecommendedSettings, getWeatherInfo } from './utils/cameraSettings'

// ── Constants ────────────────────────────────────────────────────────────────
const FOCAL_OPTIONS = [
  { id: 'ultra_wide', label: '超廣角', mm: '10–20mm' },
  { id: 'wide',       label: '廣角',   mm: '24–35mm' },
  { id: 'standard',   label: '標準',   mm: '50mm'    },
  { id: 'mid',        label: '中焦',   mm: '85–135mm'},
  { id: 'tele',       label: '長焦',   mm: '150mm+'  },
]

const PARAM_CARDS = [
  { key: 'aperture',     icon: '◉',  label: '光圈',    unit: ''    },
  { key: 'shutterSpeed', icon: '⏱',  label: '快門速度', unit: ''   },
  { key: 'iso',          icon: '💡', label: 'ISO 感光度', unit: '' },
  { key: 'whiteBalance', icon: '🎨', label: '白平衡',   unit: ''   },
]

// ── Helper: format local time ─────────────────────────────────────────────────
function formatTime(date) {
  return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [locationStatus, setLocationStatus]   = useState('idle')
  const [coords, setCoords]                   = useState(null)
  const [weather, setWeather]                 = useState(null)
  const [weatherStatus, setWeatherStatus]     = useState('idle')
  const [weatherError, setWeatherError]       = useState(null)
  const [shootingType, setShootingType]       = useState('landscape')
  const [focalLength, setFocalLength]         = useState('wide')
  const [result, setResult]                   = useState(null)
  const [lastFetchTime, setLastFetchTime]     = useState(null)

  // ── Weather fetch ──────────────────────────────────────────────────────────
  const fetchWeather = useCallback(async (lat, lon) => {
    setWeatherStatus('loading')
    setWeatherError(null)
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=auto`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setWeather(data.current)
      setWeatherStatus('success')
      setLastFetchTime(new Date())
    } catch (e) {
      setWeatherStatus('error')
      setWeatherError(e.message)
    }
  }, [])

  // ── Get location ───────────────────────────────────────────────────────────
  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported')
      return
    }
    setLocationStatus('requesting')
    setResult(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords
        setCoords({ lat, lon })
        setLocationStatus('granted')
        fetchWeather(lat, lon)
      },
      err => {
        setLocationStatus(err.code === 1 ? 'denied' : 'error')
      },
      { timeout: 10000, maximumAge: 60000 }
    )
  }, [fetchWeather])

  // ── Retry weather only ────────────────────────────────────────────────────
  const handleRetryWeather = useCallback(() => {
    if (coords) fetchWeather(coords.lat, coords.lon)
  }, [coords, fetchWeather])

  // ── Offline mode (time-only) ───────────────────────────────────────────────
  const handleOfflineAnalyze = useCallback(() => {
    const localHour = new Date().getHours()
    setResult(getRecommendedSettings({
      weatherCode: 3,
      isDay: localHour >= 6 && localHour < 20 ? 1 : 0,
      localHour,
      shootingType,
      focalLength,
      offlineMode: true,
    }))
  }, [shootingType, focalLength])

  // ── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyze = useCallback(() => {
    if (!weather) return
    const localHour = new Date().getHours()
    setResult(getRecommendedSettings({
      weatherCode:  weather.weather_code,
      isDay:        weather.is_day,
      localHour,
      shootingType,
      focalLength,
    }))
  }, [weather, shootingType, focalLength])

  // ── Status badge ───────────────────────────────────────────────────────────
  const weatherBadge = {
    idle:    { text: '等待中',    cls: 'bg-slate-600 text-slate-300' },
    loading: { text: '載入中…',   cls: 'bg-blue-600 text-blue-100'   },
    success: { text: '已更新',    cls: 'bg-emerald-600 text-white'   },
    error:   { text: '失敗',      cls: 'bg-red-600 text-white'       },
  }[weatherStatus] ?? { text: weatherStatus, cls: 'bg-slate-600 text-slate-300' }

  const weatherInfo = weather ? getWeatherInfo(weather.weather_code) : null

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-slate-900 pb-8">
      {/* ── Header ── */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 px-5 pt-14 pb-7 border-b border-slate-700/60">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">📷</span>
            <h1 className="text-2xl font-bold tracking-tight">相機拍攝建議</h1>
          </div>
          <p className="text-slate-400 text-sm ml-12">依照當下位置、天氣與時間給出最佳拍攝參數</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-4">

        {/* ── Location & Weather Card ── */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="text-base">📍</span> 當前環境
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${weatherBadge.cls}`}>
              {weatherBadge.text}
            </span>
          </div>

          {/* Weather summary */}
          {weatherStatus === 'success' && weather && (
            <div className="mb-3 p-3 bg-slate-700/50 rounded-xl space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{weatherInfo?.emoji}</span>
                <div>
                  <p className="font-semibold text-white">{weatherInfo?.label}</p>
                  <p className="text-slate-400 text-xs">
                    {weather.temperature_2m}°C・風速 {weather.wind_speed_10m} km/h・
                    {weather.is_day ? '白天' : '夜晚'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 pt-1 border-t border-slate-600">
                <span>📍 {coords?.lat.toFixed(3)}, {coords?.lon.toFixed(3)}</span>
                <span className="ml-auto">🕐 {lastFetchTime && formatTime(lastFetchTime)} 更新</span>
              </div>
            </div>
          )}

          {/* Error states */}
          {locationStatus === 'denied' && (
            <div className="mb-3 p-3 bg-red-900/40 border border-red-700/50 rounded-xl text-sm text-red-300">
              位置存取被拒絕，請在瀏覽器設定中允許位置存取後重試
            </div>
          )}
          {locationStatus === 'error' && (
            <div className="mb-3 p-3 bg-red-900/40 border border-red-700/50 rounded-xl text-sm text-red-300">
              定位失敗，請確認網路與 GPS 訊號後重試
            </div>
          )}
          {locationStatus === 'unsupported' && (
            <div className="mb-3 p-3 bg-red-900/40 border border-red-700/50 rounded-xl text-sm text-red-300">
              此瀏覽器不支援位置服務，請使用現代瀏覽器並以 HTTPS 開啟
            </div>
          )}
          {weatherStatus === 'error' && locationStatus === 'granted' && (
            <div className="mb-3 p-3 bg-amber-900/40 border border-amber-700/50 rounded-xl text-sm text-amber-300">
              天氣資料取得失敗，請確認網路連線
              <button onClick={handleRetryWeather} className="ml-3 underline text-amber-200 hover:text-white">
                重試
              </button>
            </div>
          )}

          {/* Main action button */}
          {locationStatus !== 'granted' || weatherStatus !== 'success' ? (
            <button
              onClick={handleGetLocation}
              disabled={locationStatus === 'requesting' || weatherStatus === 'loading'}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all
                bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-900
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {locationStatus === 'requesting' || weatherStatus === 'loading'
                ? '🔄 取得中…'
                : locationStatus === 'granted'
                  ? '🔄 重新取得天氣'
                  : '📍 取得目前位置與天氣'}
            </button>
          ) : (
            <button
              onClick={handleGetLocation}
              className="w-full py-2 rounded-xl font-medium text-xs transition-all
                bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-300"
            >
              🔄 重新定位
            </button>
          )}

          {/* Offline fallback */}
          {(locationStatus === 'denied' || locationStatus === 'error' || locationStatus === 'unsupported') && (
            <button
              onClick={handleOfflineAnalyze}
              className="w-full mt-2 py-2 rounded-xl font-medium text-xs transition-all
                bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-400"
            >
              🕐 改用目前時間估算（離線模式）
            </button>
          )}
        </div>

        {/* ── Shooting Parameters Card ── */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-4">
          {/* Shooting type */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">拍攝類型</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'landscape', icon: '🏔️', label: '風景' },
                { id: 'portrait',  icon: '👤', label: '人像' },
              ].map(({ id, icon, label }) => (
                <button
                  key={id}
                  onClick={() => setShootingType(id)}
                  className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95
                    ${shootingType === id
                      ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                >
                  <span className="text-xl">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Focal length */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">鏡頭焦段</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              {FOCAL_OPTIONS.map(({ id, label, mm }) => (
                <button
                  key={id}
                  onClick={() => setFocalLength(id)}
                  className={`flex-shrink-0 px-3.5 py-2.5 rounded-xl text-center transition-all active:scale-95
                    ${focalLength === id
                      ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                >
                  <div className="text-sm font-semibold leading-tight">{label}</div>
                  <div className={`text-[10px] leading-tight mt-0.5 ${focalLength === id ? 'text-slate-800' : 'text-slate-500'}`}>
                    {mm}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Analyze Button ── */}
        <button
          onClick={weatherStatus === 'success' ? handleAnalyze : undefined}
          disabled={weatherStatus !== 'success'}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all
            ${weatherStatus === 'success'
              ? 'bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-900 shadow-xl shadow-amber-500/25'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
        >
          {weatherStatus === 'success' ? '🎯  分析拍攝建議' : '請先取得位置與天氣'}
        </button>

        {/* ── Result Card ── */}
        {result && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            {/* Result header */}
            <div className="bg-gradient-to-r from-amber-500/20 to-transparent border-b border-slate-700 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">{result.lightDescription}</p>
                <p className="text-slate-400 text-xs mt-0.5">{result.sceneName}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold
                ${shootingType === 'portrait'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                {shootingType === 'portrait' ? '👤 人像' : '🏔️ 風景'}
              </span>
            </div>

            {/* Parameter grid */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {PARAM_CARDS.map(({ key, icon, label }) => (
                <div key={key} className="bg-slate-700/60 rounded-xl p-3">
                  <span className="text-lg leading-none">{icon}</span>
                  <p className="text-xl font-bold text-white mt-1 leading-none">
                    {key === 'iso' ? `ISO ${result[key]}` : result[key]}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Tips */}
            {result.tips.length > 0 && (
              <div className="px-4 pb-4">
                <div className="bg-slate-700/40 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-400 mb-2">💡 拍攝提示</p>
                  <ul className="space-y-1.5">
                    {result.tips.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">·</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
