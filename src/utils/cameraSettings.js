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
  if (isDay === 0) {
    return (localHour >= 22 || localHour < 6) ? 'deep_night' : 'night'
  }
  if (weatherCode >= 95) return 'thunder'
  if (weatherCode === 45 || weatherCode === 48) return 'fog'
  if (
    (weatherCode >= 51 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82)
  ) return 'rain'
  if (weatherCode >= 71 && weatherCode <= 77) return 'snow'

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

const SHOOTING_TYPE_LABEL = {
  landscape: '風景',
  portrait:  '人像',
  stage:     '舞台/演唱會',
  sports:    '運動/體育',
  street:    '街拍',
  wildlife:  '生態/野鳥',
}

const BRAND_TIPS = {
  sony: {
    portrait:  ['開啟「即時眼部追蹤（Real-time Eye AF）」，對焦準確率大幅提升',
                'Creative Look 推薦「FL（Film Look）」或「IN（Instant）」讓膚色更自然'],
    landscape: ['高對比場景開啟「D-Range Optimizer（DRO）Level 3–5」避免高光過爆',
                'Creative Look 推薦「SH（Soft High-key）」或「VV2（Vivid 2）」呈現自然風景色'],
    stage:     ['開啟靜音快門（電子快門）避免快門聲干擾表演現場',
                'Real-time Tracking AF 可持續鎖定舞台上移動的表演者'],
    sports:    ['Real-time Tracking AF 搭配連拍最高速模式，高效追蹤快速移動主體',
                'SteadyShot IBIS 搭配長焦段可減少追蹤時的手震'],
    street:    ['紀實街拍推薦「Creative Look IN（即時感）」，色彩生動傳遞街頭氛圍',
                'ZV 或 A7C 系列機身輕巧低調，適合街拍不引人注意'],
    wildlife:  ['動物眼部追蹤 AF（Bird/Animal Eye AF）可精準鎖定野鳥眼睛',
                'HLG 模式保留高對比野外場景細節，後製彈性更大'],
  },
  canon: {
    portrait:  ['Dual Pixel CMOS AF 提供穩定人臉追蹤，可搭配「臉部+追蹤」AF 模式',
                'Picture Style 設為「人像」，膚色更溫暖細緻'],
    landscape: ['Picture Style 設為「風景」提升天空藍與草地飽和度',
                '高動態範圍場景可使用 Canon Log 保留更多細節供後製'],
    stage:     ['DPAF 全像素雙核對焦在低光舞台仍可精準追蹤表演者',
                '靜音連拍模式（電子快門）降低快門聲，減少對演出的干擾'],
    sports:    ['Servo AF 搭配 AI 運動場景辨識（RF 系統），自動追蹤特定運動項目的運動員',
                '高速連拍（最高 20fps）提升捕捉動作頂點的成功率'],
    street:    ['Picture Style「自動」在各種街頭光線下均能呈現自然色彩',
                'M 系列無反機身小巧，搭配 22mm 定焦鏡低調拍攝城市人文'],
    wildlife:  ['動物追蹤 AF 可識別鳥類、貓狗、昆蟲等多種生物，精準鎖定眼睛',
                'Wildlife 連拍模式優化追蹤性能，大幅提升飛鳥合焦率'],
  },
  nikon: {
    portrait:  ['3D 追蹤 AF 可持續鎖定移動中的人物，適合動態人像',
                'Picture Control 設為「人像」柔化皮膚質感，減少雜訊顆粒感'],
    landscape: ['Active D-Lighting 保留暗部細節，避免逆光場景剪影過重',
                'Picture Control 設為「風景」加強天空藍與植被綠的色彩表現'],
    stage:     ['3D 追蹤 AF 在複雜舞台燈光下仍可持續追蹤表演者',
                '靜音快門模式（電子前簾快門）減少對演出的機械聲干擾'],
    sports:    ['3D 追蹤搭配「Sport」場景模式可高速連拍並維持追蹤精度',
                'Active D-Lighting 自動拯救高對比運動場景中的暗部細節'],
    street:    ['Picture Control「Flat」保留最大後製空間，適合街拍後製調色',
                'Zfc 等輕量系列翻轉螢幕方便低角度街拍構圖'],
    wildlife:  ['鳥類偵測 AF（Bird Detection AF）可自動切換至鳥眼追蹤',
                '長焦搭配 VR 防震（4–5.5 EV）有效抑制手震，提高野鳥清晰度'],
  },
  fujifilm: {
    portrait:  ['底片模擬推薦「PRO Neg. Hi」或「Classic Chrome」，直出人像質感優秀',
                '開啟「臉部/眼睛偵測 AF」搭配「人臉優先」對焦，合焦率更高'],
    landscape: ['底片模擬推薦「Velvia（正片）」讓色彩鮮豔飽滿；追求自然感選「Provia/Standard」',
                '直出 JPEG 底片模擬效果已十分完整，不一定需要後製 RAW'],
    stage:     ['底片模擬推薦「Eterna Cinema」，在人工光源下保留豐富色調層次',
                '舞台人工光建議手動設定白平衡，或後製微調 RAW 色溫避免偏色'],
    sports:    ['底片模擬推薦「Provia/Standard」保持自然色彩，適合動態運動紀實',
                'Boost 模式大幅提升 AF 響應速度與連拍性能，建議運動場合開啟'],
    street:    ['底片模擬推薦「Classic Chrome」或「ACROS」，直出濃厚街拍質感',
                'X100 或 X-E 系列復古外觀，融入街頭低調拍攝人文'],
    wildlife:  ['底片模擬推薦「Provia」搭配飽和度增豔，呈現野生動物鮮豔羽毛色彩',
                'AF-C 模式搭配「區域追蹤」或「全區」，野鳥追蹤成功率更高'],
  },
}

// ──────────────────────────────────────────────
//  Main Export
// ──────────────────────────────────────────────
/**
 * @param {{
 *   weatherCode: number,
 *   isDay: number,
 *   localHour: number,
 *   shootingType: 'landscape'|'portrait'|'stage'|'sports'|'street'|'wildlife',
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
  } else if (shootingType === 'landscape') {
    if (lightToken === 'golden_hour') base.aperture = 'f/11'
  } else if (shootingType === 'stage') {
    // Indoor stage: artificial light, need wide aperture and freeze performers
    base.aperture = 'f/1.8'
    base.shutter  = '1/250'
    base.iso      = 3200
    base.wb       = '自動 AWB'
  } else if (shootingType === 'sports' || shootingType === 'wildlife') {
    // Freeze fast motion; weather still influences ISO baseline
    base.aperture = (lightToken === 'bright_sun' || lightToken === 'golden_hour') ? 'f/5.6' : 'f/4'
    base.shutter  = '1/1000'
    base.iso      = Math.max(400, base.iso)
  } else if (shootingType === 'street') {
    // Zone-focus friendly: moderate aperture, handheld-safe shutter
    if (lightToken !== 'night' && lightToken !== 'deep_night') {
      base.aperture = 'f/8'
      base.shutter  = '1/250'
    }
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
    if (lightToken !== 'night' && lightToken !== 'deep_night'
        && shootingType !== 'sports' && shootingType !== 'wildlife') {
      tips.push('長焦段建議開啟鏡頭／機身防震（IS/VR/IBIS），或搭配三腳架確保銳利度')
    }
  }

  if (shootingType === 'portrait') {
    tips.push('對焦點請選擇眼睛，開啟眼部偵測 AF 大幅提升合焦率')
  }

  if (shootingType === 'stage') {
    tips.push('舞台通常禁止閃燈，善用大光圈定焦鏡與高 ISO 應對舞台暗光')
    tips.push('連拍模式捕捉表演者動作頂點，後製再挑選最佳表情')
    tips.push('舞台燈光多變，以自動白平衡為主，後製微調色溫')
    if (focalLength !== 'standard' && focalLength !== 'mid')
      tips.push('舞台建議 50–135mm 焦段；超廣角易包含過多雜亂背景')
  }

  if (shootingType === 'sports') {
    tips.push('提前研究賽事規則，預判運動員移動路徑，提前構圖等候時機')
    tips.push('連拍搭配追蹤 AF，目標動作頂點（起跳、揮棒、衝刺瞬間）')
    if (lightToken === 'bright_sun')
      tips.push('晴天可用曝光補償 -0.3EV，避免白色運動服過曝')
    if (focalLength !== 'mid' && focalLength !== 'tele')
      tips.push('運動建議 85mm+ 長焦，安全距離外捕捉精彩細節')
  }

  if (shootingType === 'street') {
    tips.push('光圈 f/8 搭配超焦距技巧，快速構圖無需再次對焦')
    tips.push('下午 4–6 點斜陽光線最具街拍氛圍，長影子強化構圖戲劇感')
    tips.push('街拍避免使用閃燈，自然光更能融入場景且不打擾路人')
  }

  if (shootingType === 'wildlife') {
    tips.push('清晨與傍晚是野生動物最活躍的時段，光線品質也最佳')
    tips.push('穿著低調服色，動作輕柔，減少對野生動物的干擾')
    tips.push('開啟 AI 動物眼部追蹤 AF，捕捉飛鳥瞬間合焦率大幅提升')
    if (focalLength !== 'tele' && focalLength !== 'mid')
      tips.push('野生動物建議 150mm+ 長焦，保持安全距離且不驚嚇動物')
  }

  return {
    aperture:         base.aperture,
    shutterSpeed:     base.shutter,
    iso:              base.iso,
    whiteBalance:     base.wb,
    tips:             [...new Set(tips)].slice(0, 4),
    brandTips:        BRAND_TIPS[brand]?.[shootingType] ?? [],
    lightToken,
    lightDescription: base.lightLabel,
    sceneName:        `${base.lightLabel}・${SHOOTING_TYPE_LABEL[shootingType] ?? shootingType}・${FOCAL_LABEL[focalLength]}`,
  }
}
