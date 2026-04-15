// ──────────────────────────────────────────────
//  Nominatim Reverse Geocoding
// ──────────────────────────────────────────────

/**
 * Fetch location info from Nominatim OpenStreetMap API.
 * Returns { locationType, placeLabel } or throws on error.
 */
export async function fetchLocationInfo(lat, lon) {
  const url =
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CameraAdvisor/1.0 (personal use)' },
  })
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)
  const data = await res.json()
  const locationType = classifyLocationType(data)
  const placeLabel = extractPlaceLabel(data)
  return { locationType, placeLabel }
}

// ──────────────────────────────────────────────
//  Location Type Classification
// ──────────────────────────────────────────────

const LOCATION_LABELS = {
  coastal:   '海岸',
  mountain:  '山岳',
  forest:    '森林',
  waterside: '水邊',
  urban:     '城市',
  rural:     '田野',
  general:   '一般',
}

export function getLocationLabel(locationType) {
  return LOCATION_LABELS[locationType] ?? '一般'
}

export function classifyLocationType(nominatimResult) {
  const addr = nominatimResult?.address ?? {}
  const type = nominatimResult?.type ?? ''

  // ── Coastal ──────────────────────────────────
  if (addr.sea || addr.coastline || addr.beach || type === 'coastline' || type === 'beach')
    return 'coastal'

  // ── Mountain ─────────────────────────────────
  if (addr.peak || addr.mountain_pass || addr.mountain_range || type === 'peak' || type === 'mountain_pass')
    return 'mountain'

  // ── Forest / Nature reserve ───────────────────
  if (
    addr.wood || addr.forest || addr.nature_reserve || addr.national_park ||
    type === 'forest' || type === 'wood' || type === 'nature_reserve'
  ) return 'forest'

  // ── Waterside ─────────────────────────────────
  if (
    addr.lake || addr.river || addr.stream || addr.reservoir || addr.waterway || addr.water ||
    type === 'water' || type === 'river' || type === 'lake'
  ) return 'waterside'

  // ── Urban ─────────────────────────────────────
  // Urban wins only when no natural feature is present
  if (addr.city || addr.town || addr.city_district) return 'urban'

  // ── Rural ─────────────────────────────────────
  if (addr.village || addr.hamlet || addr.farm || addr.farmland) return 'rural'

  return 'general'
}

function extractPlaceLabel(nominatimResult) {
  const addr = nominatimResult?.address ?? {}
  return (
    addr.village  ||
    addr.town     ||
    addr.suburb   ||
    addr.city     ||
    addr.county   ||
    addr.state    ||
    addr.country  ||
    '當前位置'
  )
}

// ──────────────────────────────────────────────
//  Composition Tips
// ──────────────────────────────────────────────

const COMPOSITION_TIPS = {
  coastal: {
    landscape: [
      '地平線置於三分法上/下三分線，避免正中央分割畫面',
      'ND 減光鏡長曝（5–30s）讓海浪呈現絲絨感，需搭配三腳架',
      '尋找礁石、漂流木或浪花當前景，增加畫面層次與縱深',
    ],
    portrait: [
      '以遼闊海天作簡潔背景，人物置於三分法交叉點',
      '逆光（面向海面）拍出輪廓光，補光板或閃燈填補臉部陰影',
      '俯身低角度拍攝，讓沙灘延伸線條帶領視線至主體',
    ],
  },
  mountain: {
    landscape: [
      '加入花海、石頭或小屋等前景元素，拉出空間縱深感',
      '山稜線做引導線帶領視線由近至遠進入畫面',
      '超廣角仰拍可強調山體雄偉壓迫感，前景放大、天空縮短',
    ],
    portrait: [
      '將主體置於山巒背景前，注意山頂不要從頭頂「長出」',
      '廣角拍攝人與山的比例對比，渺小感展現壯闊氛圍',
      '霧氣繚繞時加入人物剪影，虛實對比增添神秘感',
    ],
  },
  forest: {
    landscape: [
      '尋找 S 型小路或蜿蜒溪流當曲線引導線，製造流動感',
      '仰拍穿過樹隙，日出後 1 小時丁達爾光（耶穌光）最佳',
      '善用林間明暗對比，前景暗、深處光源製造空間縱深',
    ],
    portrait: [
      '以斑駁樹影做背景，避免背後雜亂的樹枝分散注意力',
      '把人物安排在光束照射的亮點上，製造自然高光',
      '用樹幹做框架構圖，從縫隙望向主體形成視覺聚焦',
    ],
  },
  waterside: {
    landscape: [
      '無風清晨水面最平靜，地平線置中可拍出完美倒影構圖',
      '慢快門（1/4–2s）搭配三腳架，水流呈現絲絨絲帶感',
      'CPL 偏光鏡消除水面反光，讓水色更清透、水底可見',
    ],
    portrait: [
      '水面反光做前景，人物置於中景形成前後景層次',
      '橋梁、步道或河岸做引導線，視線自然延伸至主體',
      '讓水面佔畫面下方 1/3，增加環境氛圍與空間感',
    ],
  },
  urban: {
    landscape: [
      '幾何構圖：建築線條、格柵、玻璃反射創造視覺秩序感',
      '框架構圖：用拱門、橋洞、窗框將遠景框在畫面內',
      '藍調時段（日落後 10–20 分鐘）室內燈光剛亮起，色溫最迷人',
    ],
    portrait: [
      '低角度仰拍讓背景建築有壓迫感，凸顯人物主體',
      '街道消失線做引導線，人物站在視覺焦點的消失點前',
      '尋找彩色塗鴉牆面或霓虹燈做背景，與人物形成色彩對比',
    ],
  },
  rural: {
    landscape: [
      '廣角捕捉天空佔 2/3 的構圖，強調遼闊開放的空間感',
      '田壟、電線桿或籬笆做水平引導線，凸顯鄉村的靜謐節奏',
      '黃金時段側光讓農作物的質感與立體感最豐富',
    ],
    portrait: [
      '農田或小路做背景，人物置於三分法交叉點',
      '選擇簡潔的麥田或草地背景，避免雜草遮擋主體',
      '廣角拍攝人物與環境全景，展現鄉村生活的氛圍感',
    ],
  },
  general: {
    landscape: [
      '三分法：主體（地平線、主角物件）放在三分線上，非正中央',
      '尋找前景/中景/背景三個層次，為畫面建立空間縱深',
      '尋找引導線（道路、牆壁、欄杆）引導視線至主體',
    ],
    portrait: [
      '尋找簡潔單色背景，以長焦大光圈虛化雜亂環境',
      '黃金螺旋構圖：主體眼睛落在螺旋中心，視線方向留白',
      '主體眼部與畫面上方三分線齊平，整體比例最自然',
    ],
  },
}

export function getCompositionTips(locationType, shootingType) {
  const type = COMPOSITION_TIPS[locationType] ?? COMPOSITION_TIPS.general
  return type[shootingType] ?? type.landscape
}
