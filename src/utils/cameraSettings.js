// ──────────────────────────────────────────────
//  Weather Code → Label / Emoji
// ──────────────────────────────────────────────
const WEATHER_LABELS = {
  0:  { label: '晴空',          emoji: '☀️' },
  1:  { label: '晴時多雲',      emoji: '🌤️' },
  2:  { label: '多雲',          emoji: '⛅' },
  3:  { label: '陰天',          emoji: '☁️' },
  45: { label: '霧',            emoji: '🌫️' },
  48: { label: '霧凇',          emoji: '🌫️' },
  51: { label: '毛毛雨',        emoji: '🌦️' },
  53: { label: '毛毛雨',        emoji: '🌦️' },
  55: { label: '毛毛雨(強)',    emoji: '🌦️' },
  61: { label: '小雨',          emoji: '🌧️' },
  63: { label: '中雨',          emoji: '🌧️' },
  65: { label: '大雨',          emoji: '🌧️' },
  71: { label: '小雪',          emoji: '🌨️' },
  73: { label: '中雪',          emoji: '🌨️' },
  75: { label: '大雪',          emoji: '❄️' },
  77: { label: '冰晶',          emoji: '❄️' },
  80: { label: '陣雨',          emoji: '🌦️' },
  81: { label: '陣雨(中)',      emoji: '🌧️' },
  82: { label: '大陣雨',        emoji: '⛈️' },
  95: { label: '雷雨',          emoji: '⛈️' },
  96: { label: '雷雨夾冰雹',    emoji: '⛈️' },
  99: { label: '雷雨夾大冰雹',  emoji: '⛈️' },
}

export function getWeatherInfo(code) {
  return WEATHER_LABELS[code] ?? { label: `天氣 (${code})`, emoji: '🌡️' }
}

// ──────────────────────────────────────────────
//  Shutter Speed Utilities
// ──────────────────────────────────────────────
const SHUTTER_STOPS = [
  1/4000, 1/3200, 1/2500, 1/2000, 1/1600,
  1/1250, 1/1000, 1/800,  1/640,  1/500,
  1/400,  1/320,  1/250,  1/200,  1/160,
  1/125,  1/100,  1/80,   1/60,   1/50,
  1/40,   1/30,   1/25,   1/20,   1/15,
  1/13,   1/10,   1/8,    1/6,    1/5,
  1/4,    0.3,    0.4,    0.5,    0.6,
  0.8,    1,      1.3,    1.6,    2,
  3,      4,      5,      6,      8,
  10,     13,     15,     20,     25,     30,
]

function parseShutter(str) {
  if (str === 'BULB') return Infinity
  if (str.includes('/')) {
    const [n, d] = str.split('/').map(Number)
    return n / d
  }
  return parseFloat(str)
}

function formatShutter(sec) {
  if (!isFinite(sec) || sec > 30) return 'BULB'
  if (sec >= 1) return Number.isInteger(sec) ? `${sec}s` : `${sec.toFixed(1)}s`
  return `1/${Math.round(1 / sec)}`
}

/** Return the slowest stop that is still at-or-faster than targetSec */
function ceilToStop(targetSec) {
  const faster = SHUTTER_STOPS.filter(s => s <= targetSec)
  return faster.length ? faster[faster.length - 1] : SHUTTER_STOPS[0]
}

// ──────────────────────────────────────────────
//  Light Classification
// ──────────────────────────────────────────────
function classifyLight(weatherCode, isDay, localHour) {
  // Night always wins over weather code
  if (isDay === 0) {
    return (localHour >= 22 || localHour < 6) ? 'deep_night' : 'night'
  }

  // Severe weather overrides before checking sky clarity
  if (weatherCode >= 95) return 'thunder'
  if (weatherCode === 45 || weatherCode === 48) return 'fog'
  if (
    (weatherCode >= 51 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82)
  ) return 'rain'
  if (weatherCode >= 71 && weatherCode <= 77) return 'snow'

  // Golden hour window (rough global approximation)
  const isGolden =
    (localHour >= 6 && localHour <= 8) ||
    (localHour >= 17 && localHour <= 19)
  if (weatherCode <= 3 && isGolden) return 'golden_hour'

  if (weatherCode === 0) return 'bright_sun'
  return 'overcast'
}

// ──────────────────────────────────────────────
//  Base Settings Table
// ──────────────────────────────────────────────
const BASE = {
  bright_sun:  { aperture: 'f/16',  shutter: '1/100', iso: 100,  wb: '日光 5200K',  lightLabel: '晴空大太陽' },
  golden_hour: { aperture: 'f/8',   shutter: '1/250', iso: 100,  wb: '陰天 6000K',  lightLabel: '黃金時段'   },
  overcast:    { aperture: 'f/5.6', shutter: '1/200', iso: 200,  wb: '陰天 6500K',  lightLabel: '陰天散射光' },
  fog:         { aperture: 'f/4',   shutter: '1/125', iso: 400,  wb: '陰天 6500K',  lightLabel: '霧景'       },
  rain:        { aperture: 'f/4',   shutter: '1/500', iso: 400,  wb: '陰天 6500K',  lightLabel: '雨天'       },
  thunder:     { aperture: 'f/5.6', shutter: '1/500', iso: 400,  wb: '自動 AWB',    lightLabel: '雷雨'       },
  snow:        { aperture: 'f/8',   shutter: '1/250', iso: 200,  wb: '陰天 6500K',  lightLabel: '雪景'       },
  night:       { aperture: 'f/2.8', shutter: '1/60',  iso: 1600, wb: '自動 AWB',    lightLabel: '夜晚'       },
  deep_night:  { aperture: 'f/1.8', shutter: 'BULB',  iso: 3200, wb: '自動 AWB',    lightLabel: '深夜'       },
}

// ──────────────────────────────────────────────
//  Minimum Handheld Shutter (reciprocal rule)
// ──────────────────────────────────────────────
const FOCAL_MIN_SHUTTER = {
  ultra_wide: 1 / 30,
  wide:       1 / 60,
  standard:   1 / 60,
  mid:        1 / 250,
  tele:       1 / 250,
}

const FOCAL_LABEL = {
  ultra_wide: '超廣角',
  wide:       '廣角',
  standard:   '標準',
  mid:        '中焦',
  tele:       '長焦',
}

const BRAND_TIPS = {
  sony: {
    portrait:  ['開啟「即時眼部追蹤（Real-time Eye AF）」，對焦準確率大幅提升',
                'Creative Look 推薦「FL（Film Look）」或「IN（Instant）」讓膚色更自然'],
    landscape: ['高對比場景開啟「D-Range Optimizer（DRO）Level 3–5」避免高光過爆',
                'Creative Look 推薦「SH（Soft High-key）」或「VV2（Vivid 2）」呈現自然風景色'],
  },
  canon: {
    portrait:  ['Dual Pixel CMOS AF 提供穩定人臉追蹤，可搭配「臉部+追蹤」AF 模式',
                'Picture Style 設為「人像」，膚色更溫暖細緻'],
    landscape: ['Picture Style 設為「風景」提升天空藍與草地飽和度',
                '高動態範圍場景可使用 Canon Log 保留更多細節供後製'],
  },
  nikon: {
    portrait:  ['3D 追蹤 AF 可持續鎖定移動中的人物，適合動態人像',
                'Picture Control 設為「人像」柔化皮膚質感，減少雜訊顆粒感'],
    landscape: ['Active D-Lighting 保留暗部細節，避免逆光場景剪影過重',
                'Picture Control 設為「風景」加強天空藍與植被綠的色彩表現'],
  },
  fujifilm: {
    portrait:  ['底片模擬推薦「PRO Neg. Hi」或「Classic Chrome」，直出人像質感優秀',
                '開啟「臉部/眼睛偵測 AF」搭配「人臉優先」對焦，合焦率更高'],
    landscape: ['底片模擬推薦「Velvia（正片）」讓色彩鮮豔飽滿；追求自然感選「Provia/Standard」',
                '直出 JPEG 底片模擬效果已十分完整，不一定需要後製 RAW'],
  },
}

// ──────────────────────────────────────────────
//  Main Export
// ──────────────────────────────────────────────
/**
 * @param {{
 *   weatherCode: number,
 *   isDay: number,        // 0 | 1
 *   localHour: number,    // 0-23
 *   shootingType: 'landscape' | 'portrait',
 *   focalLength: 'ultra_wide'|'wide'|'standard'|'mid'|'tele',
 *   brand?: 'sony'|'canon'|'nikon'|'fujifilm'|'other',
 *   offlineMode?: boolean
 * }} params
 */
export function getRecommendedSettings({
  weatherCode,
  isDay,
  localHour,
  shootingType,
  focalLength,
  brand = 'other',
  offlineMode = false,
}) {
  // ── 1. Determine lighting token ──────────────
  const lightToken = offlineMode
    ? (() => {
        if (localHour >= 22 || localHour < 5) return 'deep_night'
        if (localHour < 6 || localHour >= 20) return 'night'
        if ((localHour >= 6 && localHour <= 8) || (localHour >= 17 && localHour <= 19))
          return 'golden_hour'
        return 'overcast'
      })()
    : classifyLight(weatherCode, isDay, localHour)

  const base = { ...BASE[lightToken] }

  // ── 2. Shooting type overrides ───────────────
  if (shootingType === 'portrait') {
    base.aperture = (lightToken === 'night' || lightToken === 'deep_night') ? 'f/1.8' : 'f/2.8'
  } else {
    // Landscape: slightly narrower at golden hour for more DOF
    if (lightToken === 'golden_hour') base.aperture = 'f/11'
  }

  // ── 3. Focal length reciprocal rule ──────────
  const minSec = FOCAL_MIN_SHUTTER[focalLength]
  const baseSec = parseShutter(base.shutter)
  let reciprocalAdjusted = false

  if (isFinite(baseSec) && baseSec > minSec) {
    base.shutter = formatShutter(ceilToStop(minSec))
    reciprocalAdjusted = true
  }

  // ── 4. Compose tips ──────────────────────────
  const tips = []

  if (lightToken === 'night' || lightToken === 'deep_night') {
    tips.push('夜景建議使用三腳架，搭配快門線或 2 秒自拍延遲，避免手震')
    if (lightToken === 'deep_night')
      tips.push('BULB 快門可自由控制曝光時間，適合星軌、光繪等長曝創作')
    if (shootingType === 'portrait')
      tips.push('夜間人像可搭配閃燈或持續燈補光，前景清晰同時保留背景氛圍')
  }

  if (lightToken === 'golden_hour') {
    tips.push('黃金時段側光強調地形立體感，配合長影子創造戲劇性構圖')
    if (shootingType === 'landscape')
      tips.push('建議搭配 CPL 偏光鏡，壓暗天空並加強雲彩色彩層次')
  }

  if (lightToken === 'bright_sun' && shootingType === 'portrait') {
    tips.push('強烈直射光在臉部造成陰影，建議以反光板或離機閃燈填補暗部')
    tips.push('尋找樹蔭或建築遮蔭，散射光對人像膚色更友善')
    tips.push('大光圈（f/2.8）搭配 ND 減光鏡，可在強光下維持散景效果')
  }

  if (lightToken === 'overcast' && shootingType === 'portrait') {
    tips.push('陰天均勻散射光是人像攝影的理想自然光，膚色細緻無硬影')
  }

  if (lightToken === 'rain') {
    tips.push('雨天拍攝務必做好相機防水；慢快門搭配三腳架可拍出絲絨感雨絲')
  }

  if (lightToken === 'snow') {
    tips.push('雪景建議曝光補償 +1 至 +2 EV，避免白雪曝光不足而顯灰')
    tips.push('低溫加速電池耗電，建議攜帶備用電池並放置保暖')
  }

  if (lightToken === 'fog') {
    tips.push('霧景使用點測光或中央重點測光，避免大面積白霧干擾曝光')
    tips.push('霧中前後景的層次對比極佳，善用景深強調空間深度')
  }

  if (lightToken === 'thunder') {
    tips.push('雷雨天氣安全第一，建議從室內透過玻璃拍攝')
    tips.push('B 快門搭配三腳架可捕捉閃電，使用遙控快門線保持安全距離')
  }

  if (lightToken === 'bright_sun' && shootingType === 'landscape') {
    tips.push('晴天 16 法則：光圈 f/16、快門 = 1/ISO，是日光下的曝光基準')
  }

  if (focalLength === 'ultra_wide' && shootingType === 'landscape') {
    tips.push('超廣角 f/11–f/16 獲得最大景深；邊角暗角可在後製中校正')
  }

  if ((focalLength === 'mid' || focalLength === 'tele') && shootingType === 'portrait') {
    tips.push('中長焦（85mm+）在舒適距離下捕捉自然表情，背景壓縮效果優美')
  }

  if (reciprocalAdjusted || focalLength === 'mid' || focalLength === 'tele') {
    if (lightToken !== 'night' && lightToken !== 'deep_night') {
      tips.push('長焦段建議開啟鏡頭／機身防震（IS/VR/IBIS），或搭配三腳架確保銳利度')
    }
  }

  if (shootingType === 'portrait') {
    tips.push('對焦點請選擇眼睛，開啟眼部偵測 AF 大幅提升合焦率')
  }

  return {
    aperture:     base.aperture,
    shutterSpeed: base.shutter,
    iso:          base.iso,
    whiteBalance: base.wb,
    tips:         [...new Set(tips)].slice(0, 4),
    brandTips:    BRAND_TIPS[brand]?.[shootingType] ?? [],
    lightToken,
    lightDescription: base.lightLabel,
    sceneName: `${base.lightLabel}・${shootingType === 'portrait' ? '人像' : '風景'}・${FOCAL_LABEL[focalLength]}`,
  }
}
