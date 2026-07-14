<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'
import { categories } from '@/utils/helpers'
import dayjs from 'dayjs'

const router = useRouter()

// --- State ---
type ImportMode = 'image' | 'csv' | 'json'
const activeMode = ref<ImportMode>('image')

interface ParsedExpense {
  id: string
  amount: number
  category: string
  description: string
  date: string
  tags: string[]
  notes: string
  verified: boolean
  editing: boolean
}

const expenses = ref<ParsedExpense[]>([])
const ocrProgress = ref(0)
const ocrRunning = ref(false)
const uploading = ref(false)
const importing = ref(false)
const importResult = ref<{ success: number; fail: number } | null>(null)
const dragOver = ref(false)
const imagePreview = ref('')
const fileName = ref('')

// --- Helpers ---
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function todayStr(): string {
  return dayjs().format('YYYY-MM-DD')
}

// ========== 智能分类算法（基于用户商家库） ==========
function guessCategory(text: string): string {
  const lower = text.toLowerCase()
  
  // 分类规则（按优先级排序，第一个匹配到的优先）
  const rules: [string, string[]][] = [
    ['餐饮', [
      // 品牌商家
      '星巴克', '麦当劳', '肯德基', '瑞幸', '喜茶', '古茗', '蜜雪冰城', '书亦烧仙草', '奈雪', '霸王茶姬', '库迪',
      '华莱士', '必胜客', '汉堡王', '沙县', '兰州', '杨国福', '张亮', '绝味', '周黑鸭', '老乡鸡', '永和大王',
      '海底捞', '呷哺', '太二', '美团外卖', '饿了么', '朴朴', '叮咚', '茶百道', '沪上阿姨', '益禾堂',
      '正新鸡排', '紫燕百味鸡', '袁记云饺', '塔斯汀',
      // 通用关键词
      '外卖', '奶茶', '咖啡', '火锅', '烧烤', '面馆', '米粉', '快餐', '小吃', '甜品', '蛋糕',
      '餐厅', '食堂', '便利店', '水果', '生鲜', '菜', '饭', '餐', '食', '饮', '酒', '零食',
      '早餐', '午餐', '晚餐', '宵夜', '下午茶', '便当', '盒饭', '汉堡', '披萨', '寿司', '日料', '韩料', '西餐'
    ]],
    ['交通', [
      // 品牌商家
      '滴滴', '高德打车', '曹操出行', 'T3出行', '哈啰打车', '羊城通', '岭南通',
      '中国石化', '中国石油', '壳牌', '12306', '携程火车票', '飞猪机票',
      '南方航空', '东方航空', '吉祥航空', '哈啰电动车', '青桔', '美团单车', '一嗨租车', '神州租车',
      // 通用关键词
      '打车', '地铁', '公交', '加油', '油费', '停车', '过路费', '高速', '高铁', '火车', '飞机',
      '机票', '出租', '顺风车', '共享单车', '航空', '铁路', '租车'
    ]],
    ['购物', [
      // 品牌商家
      '淘宝', '天猫', '京东', '拼多多', '唯品会', '得物', '苏宁', '抖音商城', '快手小店', '1688',
      '永辉', '沃尔玛', '大润发', '华润万家', '美宜佳', '全家', '7-11', '罗森',
      '名创优品', '无印良品', '优衣库', 'ZARA', '安踏', '李宁', '耐克', '阿迪达斯',
      '周大福', '老凤祥', '小米商城', '华为商城', '苹果官网', '屈臣氏', '丝芙兰',
      // 通用关键词
      '购物', '商场', '超市', '百货', '网购', '闲鱼', '转转', '小红书',
      '衣服', '裤子', '鞋', '帽', '内衣', '外套', '手机', '电脑', '耳机', '平板', '笔记本'
    ]],
    ['住宿', [
      // 品牌商家
      '携程旅行', '飞猪旅行', '同程旅行', '美团酒店', '如家', '汉庭', '全季',
      '维也纳', '希尔顿', '万豪', '途家',
      // 通用关键词
      '酒店', '民宿', '住宿', '宾馆', '旅馆', 'Airbnb', 'Booking'
    ]],
    ['娱乐', [
      // 品牌商家
      '网易云音乐', 'QQ音乐', 'B站', 'bilibili', '腾讯视频', '爱奇艺', '优酷', '芒果TV',
      'Steam', '王者荣耀', '和平精英', '万达影城', '猫眼',
      // 通用关键词
      '电影', '游戏', 'KTV', '演出', '门票', '景区', '景点', '乐园', '影院', '剧院',
      '音乐', '剧本杀', '密室', '桌游', '棋牌', '网吧', '电玩', '健身房', '台球', '游乐园',
      '健身', '瑜伽', '游泳', '跑步', '骑行', '篮球', '足球', '滑雪'
    ]],
    ['医疗', [
      // 品牌商家
      '老百姓大药房', '益丰大药房', '国药大药房', '医院缴费', '体检中心', '爱尔眼科',
      '牙科诊所', '京东健康', '阿里健康', '医美',
      // 通用关键词
      '医院', '药店', '药房', '诊所', '体检', '牙科', '眼科', '挂号', '门诊', '住院',
      '手术', '药品', '保健品', '维生素', '口罩'
    ]],
    ['教育', [
      // 品牌商家
      '学而思', '新东方', '有道精品课', '腾讯课堂', '网易有道', '粉笔公考',
      // 通用关键词
      '驾校', '网课', '考研', '培训', '学费', '课程', '教育', '考试', '教材', '文具',
      '书店', '图书', '语言培训', '托福', '雅思', '公务员'
    ]],
    ['生活', [
      // 品牌商家
      '中国移动', '中国联通', '中国电信', '顺丰', '中通', '圆通', '申通', '韵达', '极兔',
      // 通讯
      '话费', '流量', '充值', '宽带', '通信',
      // 居住
      '房租', '水费', '电费', '燃气', '物业', '网费', '房贷', '装修', '家具', '家电',
      '维修', '保洁', '家政', '暖气', '供暖', '有线电视',
      // 快递物流
      '快递', '物流', '寄件', '取件',
      // 生活服务
      '洗衣', '家政', '开锁', '干洗'
    ]],
    ['宠物', [
      '猫粮', '狗粮', '宠物', '猫砂', '猫条', '疫苗', '驱虫', '宠物医院', '猫咖'
    ]],
  ]
  
  // 按权重匹配（第一个匹配到的优先）
  for (const [cat, keywords] of rules) {
    if (keywords.some(k => lower.includes(k))) return cat
  }
  
  return '其他'
}

// ========== 优化的金额解析算法 ==========
function parseAmount(s: string): number {
  // 清理OCR常见的字符错误
  let cleaned = s
    .replace(/[¥￥$]/g, '')     // 移除货币符号
    .replace(/[OoO]/g, '0')     // OCR: O -> 0
    .replace(/[lI|]/g, '1')     // OCR: l/I/| -> 1
    .replace(/[Ss]/g, '5')      // OCR: S -> 5 (谨慎使用)
    .replace(/[Bb]/g, '8')      // OCR: B -> 8 (谨慎使用)
    .replace(/[，,]/g, '')       // 移除千位分隔符
    .replace(/\s/g, '')         // 移除空格
  
  // 匹配金额模式：支持小数点和负数
  const m = cleaned.match(/-?\d+\.?\d{0,2}/)
  if (!m) return 0
  
  const num = parseFloat(m[0])
  return isNaN(num) ? 0 : Math.abs(num) // 返回绝对值
}

// ========== 优化的日期解析算法 ==========
function parseDate(s: string): string {
  const now = dayjs()
  
  // 相对日期
  if (/今[天日]/.test(s)) return now.format('YYYY-MM-DD')
  if (/昨[天日]/.test(s)) return now.subtract(1, 'day').format('YYYY-MM-DD')
  if (/前[天日]/.test(s)) return now.subtract(2, 'day').format('YYYY-MM-DD')
  if (/大前[天日]/.test(s)) return now.subtract(3, 'day').format('YYYY-MM-DD')
  
  // 完整日期：2024年3月15日 或 2024年03月15日
  let m = s.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  
  // 标准格式：2024-03-15 或 2024/03/15
  m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  
  // 中文格式：3月15日
  m = s.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/)
  if (m) {
    const month = parseInt(m[1])
    const day = parseInt(m[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return now.month(month - 1).date(day).format('YYYY-MM-DD')
    }
  }
  
  // 短格式：03-15 或 03/15 或 3-15
  m = s.match(/(\d{1,2})[-/](\d{1,2})/)
  if (m) {
    const month = parseInt(m[1])
    const day = parseInt(m[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return now.month(month - 1).date(day).format('YYYY-MM-DD')
    }
  }
  
  // 只有时间没有日期（如 "14:30"），返回今天
  return todayStr()
}

// ========== OCR文本清洗算法 ==========
function cleanOCRText(text: string): string {
  return text
    // 修复常见OCR错误
    .replace(/[¥￥]\s*/g, '¥')           // 统一货币符号
    .replace(/\s+/g, ' ')                // 合并多余空格
    .replace(/([0-9])\s+([0-9])/g, '$1$2') // 合并被空格分开的数字
    .replace(/o/g, (match, offset, str) => {
      // 上下文判断：如果在数字旁边，O -> 0
      const before = str[offset - 1] || ''
      const after = str[offset + 1] || ''
      if (/[0-9]/.test(before) || /[0-9]/.test(after)) return '0'
      return match
    })
}

// ========== 智能描述提取算法 ==========
function extractDescription(line: string, amountStr: string): string {
  // 移除金额部分
  let desc = line
    .replace(/[¥￥]?\s*-?\d+[,.]?\d*/g, '')
    .replace(/[-—–=]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  
  // 移除常见无意义前缀/后缀
  const noisePatterns = [
    /^(支出|消费|付款|支付|扣款|交易)\s*/i,
    /\s*(成功|完成|完成交易|交易成功)$/,
    /^\d+\s*/, // 移除开头的序号
  ]
  for (const pattern of noisePatterns) {
    desc = desc.replace(pattern, '')
  }
  
  // 清理特殊字符
  desc = desc.replace(/[【】\[\]{}]/g, '').trim()
  
  return desc || '消费记录'
}

function createExpense(amount: number, category: string, description: string, date: string, tags: string[] = []): ParsedExpense {
  return { id: genId(), amount, category, description, date, tags, notes: '', verified: false, editing: false }
}

// --- OCR (Image Mode) ---
// 百度 OCR 配置（从 localStorage 读取）
const baiduApiKey = ref(localStorage.getItem('baidu_api_key') || '8v6iG3EDWYCTm20zmgFMhloC')
const baiduSecretKey = ref(localStorage.getItem('baidu_secret_key') || 'HB1l9SeDXZc3QyAULAAvnogVAtFaaonO')
const showBaiduConfig = ref(false)
const tempApiKey = ref('')
const tempSecretKey = ref('')
const ocrEngine = ref<'baidu' | 'local'>(localStorage.getItem('ocr_engine') as any || 'baidu')

function saveBaiduConfig() {
  localStorage.setItem('baidu_api_key', tempApiKey.value)
  localStorage.setItem('baidu_secret_key', tempSecretKey.value)
  baiduApiKey.value = tempApiKey.value
  baiduSecretKey.value = tempSecretKey.value
  showBaiduConfig.value = false
  console.log('[OCR] 百度密钥已保存')
}

function openBaiduConfig() {
  tempApiKey.value = baiduApiKey.value
  tempSecretKey.value = baiduSecretKey.value
  showBaiduConfig.value = true
}

async function handleImageUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    console.error(`[导入-图片] 不支持的文件类型: ${file.type}`)
    return
  }
  console.log(`[导入-图片] 选择文件: ${file.name}, 大小: ${(file.size / 1024).toFixed(1)}KB, 类型: ${file.type}`)
  uploading.value = true
  fileName.value = file.name
  expenses.value = []

  const reader = new FileReader()
  reader.onload = async (e) => {
    imagePreview.value = e.target?.result as string
    uploading.value = false
    console.log(`[导入-图片] 图片加载完成, 开始OCR识别`)
    await runOCR(imagePreview.value)
  }
  reader.readAsDataURL(file)
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function runOCR(imageSrc: string) {
  ocrRunning.value = true
  ocrProgress.value = 0
  expenses.value = []

  try {
    if (ocrEngine.value === 'baidu' && baiduApiKey.value && baiduSecretKey.value) {
      // 使用百度 OCR
      console.log(`[导入-OCR] 使用百度 OCR 高精度版...`)
      ocrProgress.value = 10
      
      // 提取 base64 数据
      const base64Data = imageSrc.includes(',') ? imageSrc.split(',')[1] : imageSrc
      
      const res = await fetch(`${API_URL}/ocr/baidu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          apiKey: baiduApiKey.value,
          secretKey: baiduSecretKey.value,
          type: 'accurate',
        }),
      })
      
      ocrProgress.value = 80
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '百度 OCR 请求失败')
      }
      
      const data = await res.json()
      const text = data.text || ''
      console.log(`[导入-OCR] 百度 OCR 识别成功, ${data.wordsNum} 行, ${text.length} 字符`)
      console.log(`[导入-OCR] 识别结果预览:\n${text.substring(0, 500)}...`)
      parseOCRText(text)
    } else {
      // 本地 Tesseract.js（备用）
      console.log(`[导入-OCR] 使用本地 Tesseract.js...`)
      const Tesseract = await import('tesseract.js')
      const result = await Tesseract.recognize(imageSrc, 'chi_sim+eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            ocrProgress.value = Math.round((m.progress || 0) * 100)
          }
        },
      })
      const text = result.data.text
      console.log(`[导入-OCR] 本地识别完成, 文本长度: ${text.length}`)
      parseOCRText(text)
    }
  } catch (err) {
    console.error(`[导入-OCR] 识别失败:`, err)
  } finally {
    ocrRunning.value = false
    ocrProgress.value = 100
    console.log(`[导入-OCR] 最终识别出 ${expenses.value.length} 笔记录`)
  }
}

function parseOCRText(text: string) {
  // 先清洗OCR文本
  const cleanedText = cleanOCRText(text)
  const lines = cleanedText.split('\n').map(l => l.trim()).filter(Boolean)
  console.log(`[导入-解析] OCR文本行数: ${lines.length}`)
  
  const results: ParsedExpense[] = []
  const seenAmounts = new Set<string>() // 用于去重

  // 策略1：逐行解析（适用于大多数账单格式）
  for (const line of lines) {
    // 跳过明显的非消费行
    if (/^(总计|合计|余额|时间|日期|序号|#)/.test(line)) continue
    if (line.length < 3) continue // 太短的行跳过
    
    const amountMatch = line.match(/[¥￥]?\s*-?\d+[,.]?\d{0,2}/)
    if (amountMatch) {
      const amount = parseAmount(amountMatch[0])
      if (amount <= 0 || amount > 1000000) continue // 排除不合理金额
      
      // 去重：同一金额出现多次可能重复
      const amountKey = `${amount}-${line.length}`
      if (seenAmounts.has(amountKey)) continue
      seenAmounts.add(amountKey)
      
      const dateStr = parseDate(line)
      const desc = extractDescription(line, amountMatch[0])
      const category = guessCategory(desc)
      results.push(createExpense(amount, category, desc, dateStr))
    }
  }

  // 策略2：配对解析（适用于描述和金额分行的格式）
  if (results.length === 0 && lines.length >= 2) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const nextLine = lines[i + 1] || ''
      
      // 情况A：当前行有金额
      const amt1 = parseAmount(line)
      if (amt1 > 0 && amt1 < 1000000) {
        const desc = extractDescription(line, '')
        if (desc !== '消费记录') {
          results.push(createExpense(amt1, guessCategory(desc), desc, parseDate(line)))
          continue
        }
      }
      
      // 情况B：下一行有金额，当前行是描述
      const amt2 = parseAmount(nextLine)
      if (amt2 > 0 && amt2 < 1000000 && line.length > 2) {
        const desc = line.replace(/[¥￥]?\s*-?\d+[,.]?\d*/g, '').trim()
        if (desc && desc !== '消费记录') {
          results.push(createExpense(amt2, guessCategory(desc), desc, parseDate(line + ' ' + nextLine)))
          i++ // 跳过下一行
        }
      }
    }
  }

  // 最终去重（基于金额+描述）
  const finalSeen = new Set<string>()
  expenses.value = results.filter(e => {
    const key = `${e.amount}-${e.description.substring(0, 10)}`
    if (finalSeen.has(key)) return false
    finalSeen.add(key)
    return true
  })
  
  console.log(`[导入-解析] 最终识别出 ${expenses.value.length} 笔记录`)
}

function handleCSVUpload(file: File) {
  if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) return
  uploading.value = true
  fileName.value = file.name
  expenses.value = []
  imagePreview.value = ''

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    parseCSV(text)
    uploading.value = false
  }
  reader.readAsText(file, 'utf-8')
}

function parseCSV(text: string) {
  // 移除BOM字符（微信/支付宝导出的CSV常带BOM）
  const cleanText = text.replace(/^\uFEFF/, '')
  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean)
  console.log(`[导入-CSV] 总行数: ${lines.length}`)
  if (lines.length < 2) {
    console.warn(`[导入-CSV] 行数不足, 终止解析`)
    return
  }

  // 智能检测分隔符（逗号、制表符、分号）
  const firstLine = lines[0]
  const delimiter = firstLine.includes('\t') ? '\t' 
    : firstLine.includes(';') ? ';' 
    : ','
  console.log(`[导入-CSV] 检测到分隔符: ${delimiter === '\t' ? 'TAB' : delimiter === ';' ? '分号' : '逗号'}`)

  // 检测表头并映射列
  const headers = firstLine.split(delimiter).map(h => h.replace(/"/g, '').trim())
  console.log(`[导入-CSV] 表头: [${headers.join(', ')}]`)

  // 更智能的列匹配（支持更多格式）
  const findCol = (keywords: string[]) => {
    const idx = headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())))
    return idx
  }

  const colTime = findCol(['交易时间', '交易日期', '时间', '日期', 'time', 'date', '创建时间'])
  const colDesc = findCol(['商品', '商品说明', '说明', '描述', '商户', '商户全称', 'description', 'note', '用途', '备注'])
  const colType = findCol(['收/支', '收支', '类型', 'type', '交易类型'])
  const colAmount = findCol(['金额(元)', '金额', '交易金额', 'amount', '收支金额'])
  const colMethod = findCol(['支付方式', '支付', '方式', 'payment', '付款方式'])
  const colCategory = findCol(['分类', '类别', 'category', '交易分类'])

  console.log(`[导入-CSV] 列映射 - 时间:${colTime}, 描述:${colDesc}, 收支:${colType}, 金额:${colAmount}, 支付方式:${colMethod}, 分类:${colCategory}`)

  const results: ParsedExpense[] = []
  let skippedIncome = 0
  let skippedZero = 0
  let skippedInvalid = 0

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i], delimiter)
    if (cells.length < 2) continue

    // 跳过收入行
    if (colType >= 0) {
      const typeVal = (cells[colType] || '').trim()
      if (typeVal.includes('收') || typeVal.includes('income') || typeVal.includes('转入')) {
        skippedIncome++
        continue
      }
    }

    // 跳过无效行（如微信账单的统计行）
    if (/(总计|合计| summary|total)/i.test(cells.join(''))) continue

    // 解析金额
    let amount = colAmount >= 0 ? parseAmount(cells[colAmount]) : 0
    if (amount === 0) {
      for (const c of cells) {
        const a = parseAmount(c)
        if (a > 0 && a < 1000000) { amount = a; break }
      }
    }
    if (amount <= 0) { skippedZero++; continue }

    // 解析描述
    let desc = colDesc >= 0 ? (cells[colDesc] || '').trim() : ''
    if (!desc) desc = '账单导入'
    
    // 清理描述中的特殊字符
    desc = desc.replace(/[【】\[\]{}]/g, '').replace(/\s+/g, ' ').trim()

    // 解析日期
    const timeStr = colTime >= 0 ? (cells[colTime] || '').trim() : ''
    const date = timeStr ? parseDate(timeStr) : todayStr()

    // 解析分类（优先使用CSV中的分类列）
    let category = '其他'
    if (colCategory >= 0) {
      const csvCategory = (cells[colCategory] || '').trim()
      if (csvCategory && csvCategory !== '/') category = csvCategory
    }
    if (category === '其他') {
      const method = colMethod >= 0 ? (cells[colMethod] || '').trim() : ''
      category = guessCategory(desc + ' ' + method)
    }

    results.push(createExpense(amount, category, desc, date))
  }

  console.log(`[导入-CSV] 解析完成, 有效记录: ${results.length}, 跳过收入: ${skippedIncome}, 跳过金额为0: ${skippedZero}, 跳过无效: ${skippedInvalid}`)
  expenses.value = results
}

// 优化的CSV行解析（支持引号内的分隔符）
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // 跳过转义的引号
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === delimiter) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  
  result.push(current.trim())
  return result
}

// --- JSON Mode ---
function handleJSONUpload(file: File) {
  uploading.value = true
  fileName.value = file.name
  expenses.value = []
  imagePreview.value = ''

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      parseJSONData(data)
    } catch (err) {
      console.error('JSON parse failed:', err)
    }
    uploading.value = false
  }
  reader.readAsText(file, 'utf-8')
}

function parseJSONData(data: any) {
  const items = Array.isArray(data) ? data : (data.expenses || data.data || [])
  console.log(`[导入-JSON] 原始数据类型: ${Array.isArray(data) ? 'Array' : typeof data}, 解析后记录数: ${items.length}`)
  if (!Array.isArray(items)) {
    console.warn(`[导入-JSON] 无法解析为数组, 终止`)
    return
  }

  const results = items.map((item: any, i: number) => {
    const amount = parseFloat(item.amount) || 0
    const category = item.category || guessCategory(item.description || item.name || '')
    const description = item.description || item.name || item.desc || '导入记录'
    const date = item.date || item.time || item.created_at || todayStr()
    const tags = Array.isArray(item.tags) ? item.tags : []
    console.log(`  [${i + 1}] 金额: ¥${amount}, 分类: ${category}, 描述: ${description}, 日期: ${date}`)
    return createExpense(amount, category, description, parseDate(date), tags)
  }).filter((e: ParsedExpense) => e.amount > 0)
  
  console.log(`[导入-JSON] 解析完成, 有效记录: ${results.length}, 无效(金额为0): ${items.length - results.length}`)
  expenses.value = results
}

// --- File Input Handlers ---
function onFileInput(e: Event, mode: ImportMode) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (mode === 'image') handleImageUpload(file)
  else if (mode === 'csv') handleCSVUpload(file)
  else if (mode === 'json') handleJSONUpload(file)
  input.value = ''
}

// Drag & Drop
function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  if (activeMode.value === 'image') handleImageUpload(file)
  else if (activeMode.value === 'csv') handleCSVUpload(file)
  else if (activeMode.value === 'json') handleJSONUpload(file)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

// --- Expense Editing & Verification ---
function removeExpense(id: string) {
  console.log(`[导入-删除] 删除记录 ID: ${id}`)
  expenses.value = expenses.value.filter(e => e.id !== id)
  console.log(`[导入-删除] 剩余记录数: ${expenses.value.length}`)
}

function toggleEdit(item: ParsedExpense) {
  console.log(`[导入-编辑] 切换编辑状态, ID: ${item.id}, 当前状态: ${item.editing}`)
  item.editing = !item.editing
}

function verifyItem(item: ParsedExpense) {
  console.log(`[导入-校验] 校验通过, ID: ${item.id}, 金额: ¥${item.amount}, 分类: ${item.category}, 描述: ${item.description}`)
  item.verified = true
  item.editing = false
  console.log(`[导入-校验] 当前已校验: ${verifiedCount.value}, 待校验: ${unverifiedCount.value}`)
}

function unverifyItem(item: ParsedExpense) {
  console.log(`[导入-取消校验] 取消校验, ID: ${item.id}, 金额: ¥${item.amount}`)
  item.verified = false
  console.log(`[导入-取消校验] 当前已校验: ${verifiedCount.value}, 待校验: ${unverifiedCount.value}`)
}

function verifyAll() {
  console.log(`[导入-批量校验] 全部校验通过, 记录数: ${expenses.value.length}`)
  expenses.value.forEach((e, i) => {
    console.log(`  [${i + 1}] ID: ${e.id}, 金额: ¥${e.amount}, 分类: ${e.category}, 描述: ${e.description}`)
    e.verified = true
  })
  console.log(`[导入-批量校验] 完成, 已校验: ${verifiedCount.value}, 待校验: ${unverifiedCount.value}`)
}

function unverifyAll() {
  console.log(`[导入-重置校验] 重置所有校验状态, 记录数: ${expenses.value.length}`)
  expenses.value.forEach(e => { e.verified = false })
  console.log(`[导入-重置校验] 完成, 已校验: ${verifiedCount.value}, 待校验: ${unverifiedCount.value}`)
}

const verifiedCount = computed(() => expenses.value.filter(e => e.verified).length)
const unverifiedCount = computed(() => expenses.value.length - verifiedCount.value)
const allVerified = computed(() => expenses.value.length > 0 && expenses.value.every(e => e.verified))

// --- Import ---
async function importAll() {
  const toImport = expenses.value.filter(e => e.verified)
  console.log(`\n[导入-确认] 开始导入, 已校验记录数: ${toImport.length}, 总记录数: ${expenses.value.length}`)
  
  if (toImport.length === 0) {
    console.warn(`[导入-确认] 没有已校验的记录, 终止导入`)
    return
  }

  // 打印即将导入的记录详情
  toImport.forEach((item, i) => {
    console.log(`  [${i + 1}] 金额: ¥${item.amount}, 分类: ${item.category}, 日期: ${item.date}, 描述: ${item.description}${item.notes ? `, 备注: ${item.notes}` : ''}`)
  })

  importing.value = true
  importResult.value = null

  let success = 0
  let fail = 0

  for (let i = 0; i < toImport.length; i++) {
    const item = toImport[i]
    const desc = item.notes ? `${item.description} [备注:${item.notes}]` : item.description
    console.log(`[导入-提交] (${i + 1}/${toImport.length}) 提交记录, 金额: ¥${item.amount}, 分类: ${item.category}`)
    
    try {
      await api.addExpense({
        amount: item.amount,
        category: item.category,
        description: desc,
        date: item.date,
        tags: item.tags,
      })
      success++
      console.log(`[导入-成功] (${i + 1}/${toImport.length}) ID: ${item.id}`)
    } catch (err: any) {
      fail++
      console.error(`[导入-失败] (${i + 1}/${toImport.length}) ID: ${item.id}, 错误: ${err.message}`)
    }
  }

  console.log(`\n[导入-完成] 成功: ${success}, 失败: ${fail}, 总计: ${toImport.length}`)
  importResult.value = { success, fail }
  importing.value = false

  if (success > 0) {
    // 移除已导入的记录
    const beforeCount = expenses.value.length
    expenses.value = expenses.value.filter(e => !e.verified)
    console.log(`[导入-清理] 移除已导入记录, 之前: ${beforeCount}, 之后: ${expenses.value.length}`)
    setTimeout(() => {
      console.log(`[导入-跳转] 1.5秒后跳转到首页`)
      router.push('/')
    }, 1500)
  } else {
    console.warn(`[导入-异常] 没有成功导入的记录, 不跳转`)
  }
}

const totalAmount = computed(() => expenses.value.reduce((s, e) => s + e.amount, 0))

const modes: { key: ImportMode; label: string; icon: string }[] = [
  { key: 'image', label: '图片识别', icon: 'photo_camera' },
  { key: 'csv', label: 'CSV导入', icon: 'table_chart' },
  { key: 'json', label: 'JSON导入', icon: 'code' },
]
</script>

<template>
  <div class="min-h-screen bg-background max-w-[480px] mx-auto px-5 pt-4 pb-28">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <button @click="router.push('/settings')" class="p-2 rounded-xl hover:bg-surface transition">
        <span class="material-icons-round text-txt-secondary">arrow_back</span>
      </button>
      <h1 class="text-lg font-semibold text-txt">智能导入</h1>
      <div class="w-10"></div>
    </div>

    <!-- Mode Tabs -->
    <div class="flex bg-surface rounded-xl p-1 mb-6">
      <button
        v-for="m in modes"
        :key="m.key"
        @click="activeMode = m.key"
        class="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-medium transition-all"
        :class="activeMode === m.key
          ? 'bg-white text-primary shadow-sm'
          : 'text-txt-secondary'"
      >
        <span class="material-icons-round text-base">{{ m.icon }}</span>
        {{ m.label }}
      </button>
    </div>

    <!-- Upload Area -->
    <div
      @drop.prevent="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      class="bg-white rounded-2xl p-6 mb-6 transition-all duration-200"
      :class="dragOver ? 'ring-2 ring-primary ring-offset-2 shadow-lg' : 'shadow-sm'"
    >
      <!-- Image Mode -->
      <template v-if="activeMode === 'image'">
        <!-- OCR 引擎选择 -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="material-icons-round text-sm text-primary">tune</span>
            <span class="text-xs text-txt-secondary font-medium">识别引擎</span>
          </div>
          <div class="flex items-center gap-1 bg-surface rounded-xl p-0.5">
            <button
              @click="ocrEngine = 'baidu'; localStorage.setItem('ocr_engine', 'baidu')"
              class="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              :class="ocrEngine === 'baidu' ? 'bg-white text-primary shadow-sm' : 'text-txt-hint'"
            >百度云</button>
            <button
              @click="ocrEngine = 'local'; localStorage.setItem('ocr_engine', 'local')"
              class="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              :class="ocrEngine === 'local' ? 'bg-white text-primary shadow-sm' : 'text-txt-hint'"
            >本地</button>
          </div>
        </div>
        <!-- 百度 OCR 密钥状态 -->
        <div v-if="ocrEngine === 'baidu'" class="mb-4 p-3 bg-surface rounded-xl">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-icons-round text-sm" :class="baiduApiKey ? 'text-green-500' : 'text-orange-500'">
                {{ baiduApiKey ? 'check_circle' : 'warning' }}
              </span>
              <span class="text-xs" :class="baiduApiKey ? 'text-txt-secondary' : 'text-orange-600'">
                {{ baiduApiKey ? '百度 OCR 已配置' : '未配置百度 OCR 密钥' }}
              </span>
            </div>
            <button @click="openBaiduConfig" class="text-xs text-primary font-medium px-3 py-1 bg-primary/10 rounded-lg hover:bg-primary/20 transition">
              {{ baiduApiKey ? '修改' : '配置' }}
            </button>
          </div>
        </div>

        <div v-if="!imagePreview && !ocrRunning" class="flex flex-col items-center py-4">
          <span class="material-icons-round text-5xl text-primary/40 mb-3">receipt_long</span>
          <p class="text-sm text-txt-secondary mb-1">上传账单截图或收据照片</p>
          <p class="text-xs text-txt-hint mb-4">支持 JPG、PNG 格式</p>
          <div class="flex gap-3 mb-3">
            <label class="px-5 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium cursor-pointer hover:bg-primary/20 transition active:scale-95">
              <span class="material-icons-round text-base align-middle mr-1">photo_library</span>相册选择
              <input type="file" accept="image/*" class="hidden" @change="e => onFileInput(e, 'image')" />
            </label>
            <label class="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-light text-white rounded-xl text-sm font-medium cursor-pointer hover:shadow-lg transition active:scale-95 shadow-md shadow-primary/20">
              <span class="material-icons-round text-base align-middle mr-1">photo_camera</span>拍照识别
              <input type="file" accept="image/*" capture="environment" class="hidden" @change="e => onFileInput(e, 'image')" />
            </label>
          </div>
        </div>
        <div v-else-if="ocrRunning" class="text-center py-6">
          <span class="material-icons-round text-5xl text-primary animate-pulse mb-3">document_scanner</span>
          <p class="text-sm text-txt font-medium mb-2">正在识别文字...</p>
          <div class="w-full bg-surface rounded-full h-2 mb-2">
            <div class="bg-gradient-to-r from-primary to-primary-light h-2 rounded-full transition-all duration-300"
              :style="{ width: ocrProgress + '%' }"></div>
          </div>
          <p class="text-xs text-txt-hint">{{ ocrProgress }}%</p>
        </div>
        <div v-else class="space-y-3">
          <img :src="imagePreview" class="w-full rounded-xl max-h-48 object-contain bg-surface" />
          <div class="flex gap-2">
            <label class="flex-1 py-2.5 bg-surface text-txt-secondary rounded-xl text-sm font-medium cursor-pointer hover:bg-surface/80 transition text-center active:scale-95">
              <span class="material-icons-round text-base align-middle mr-1">photo_library</span>相册
              <input type="file" accept="image/*" class="hidden" @change="e => onFileInput(e, 'image')" />
            </label>
            <label class="flex-1 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium cursor-pointer hover:bg-primary/20 transition text-center active:scale-95">
              <span class="material-icons-round text-base align-middle mr-1">photo_camera</span>拍照
              <input type="file" accept="image/*" capture="environment" class="hidden" @change="e => onFileInput(e, 'image')" />
            </label>
          </div>
        </div>
      </template>

      <!-- CSV Mode -->
      <template v-if="activeMode === 'csv'">
        <div class="flex flex-col items-center py-4">
          <span class="material-icons-round text-5xl text-green-400/60 mb-3">upload_file</span>
          <p class="text-sm text-txt-secondary mb-1">上传微信/支付宝账单 CSV</p>
          <p class="text-xs text-txt-hint mb-4">自动识别常见格式的列头</p>
          <label class="px-5 py-2.5 bg-green-500/10 text-green-600 rounded-xl text-sm font-medium cursor-pointer hover:bg-green-500/20 transition active:scale-95">
            <span class="material-icons-round text-base align-middle mr-1">upload</span>选择 CSV 文件
            <input type="file" accept=".csv,text/csv" class="hidden" @change="e => onFileInput(e, 'csv')" />
          </label>
          <p v-if="fileName && activeMode === 'csv'" class="text-xs text-txt-hint mt-2">
            <span class="material-icons-round text-sm align-middle mr-1">description</span>{{ fileName }}
          </p>
        </div>
      </template>

      <!-- JSON Mode -->
      <template v-if="activeMode === 'json'">
        <div class="flex flex-col items-center py-4">
          <span class="material-icons-round text-5xl text-purple-400/60 mb-3">data_object</span>
          <p class="text-sm text-txt-secondary mb-1">上传 JSON 数据文件</p>
          <p class="text-xs text-txt-hint mb-4">格式: [{ amount, category, description, date }]</p>
          <label class="px-5 py-2.5 bg-purple-500/10 text-purple-600 rounded-xl text-sm font-medium cursor-pointer hover:bg-purple-500/20 transition active:scale-95">
            <span class="material-icons-round text-base align-middle mr-1">upload</span>选择 JSON 文件
            <input type="file" accept=".json,application/json" class="hidden" @change="e => onFileInput(e, 'json')" />
          </label>
          <p v-if="fileName && activeMode === 'json'" class="text-xs text-txt-hint mt-2">
            <span class="material-icons-round text-sm align-middle mr-1">description</span>{{ fileName }}
          </p>
        </div>
      </template>

      <!-- Drag hint -->
      <p class="text-center text-xs text-txt-hint mt-3">
        <span class="material-icons-round text-sm align-middle">drag_indicator</span>
        也可以直接拖拽文件到此区域
      </p>
    </div>

    <!-- Uploading indicator -->
    <div v-if="uploading && !ocrRunning" class="text-center py-4">
      <span class="material-icons-round text-3xl text-primary animate-spin">sync</span>
      <p class="text-sm text-txt-secondary mt-2">正在读取文件...</p>
    </div>

    <!-- Preview List -->
    <template v-if="expenses.length > 0">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-base font-semibold text-txt">识别结果</h2>
        <span class="text-sm text-txt-hint">{{ expenses.length }} 笔 · 合计 ¥{{ totalAmount.toFixed(2) }}</span>
      </div>

      <!-- 校验工具栏 -->
      <div class="bg-white rounded-2xl p-4 mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span class="text-xs text-txt-secondary">已校验 {{ verifiedCount }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
            <span class="text-xs text-txt-secondary">待校验 {{ unverifiedCount }}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            v-if="unverifiedCount > 0"
            @click="verifyAll"
            class="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition active:scale-95"
          >全部通过</button>
          <button
            v-if="verifiedCount > 0"
            @click="unverifyAll"
            class="px-3 py-1.5 text-xs font-medium bg-surface text-txt-secondary rounded-lg hover:bg-surface/80 transition active:scale-95"
          >重置</button>
        </div>
      </div>

      <div class="space-y-3 mb-6">
        <div
          v-for="item in expenses"
          :key="item.id"
          class="bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-200"
        >
          <!-- View mode -->
          <div v-if="!item.editing" class="flex items-center px-4 py-3.5 gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative"
              :style="{ backgroundColor: (categories.find(c => c.name === item.category)?.color || '#B8B5D0') + '18' }">
              <span class="material-icons-round text-lg"
                :style="{ color: categories.find(c => c.name === item.category)?.color || '#B8B5D0' }">
                {{ categories.find(c => c.name === item.category)?.icon || 'more_horiz' }}
              </span>
              <span v-if="item.verified" class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <span class="material-icons-round text-white" style="font-size: 10px;">check</span>
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="text-sm font-medium text-txt truncate">{{ item.description }}</p>
                <span v-if="item.verified" class="text-[10px] text-green-500 font-medium shrink-0">已校验</span>
                <span v-else class="text-[10px] text-orange-400 font-medium shrink-0">待校验</span>
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-txt-hint">{{ item.category }}</span>
                <span class="text-xs text-txt-hint">·</span>
                <span class="text-xs text-txt-hint">{{ item.date }}</span>
              </div>
              <p v-if="item.notes" class="text-xs text-primary mt-0.5 truncate">备注: {{ item.notes }}</p>
            </div>
            <p class="text-base font-semibold text-expense shrink-0">-¥{{ item.amount.toFixed(2) }}</p>
            <div class="flex items-center gap-1 shrink-0">
              <button v-if="!item.verified" @click="verifyItem(item)" class="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 transition" title="校验通过">
                <span class="material-icons-round text-sm text-green-500">check</span>
              </button>
              <button v-else @click="unverifyItem(item)" class="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 transition" title="取消校验">
                <span class="material-icons-round text-sm text-orange-400">undo</span>
              </button>
              <button @click="toggleEdit(item)" class="p-1.5 rounded-lg hover:bg-surface transition">
                <span class="material-icons-round text-sm text-txt-hint">edit</span>
              </button>
              <button @click="removeExpense(item.id)" class="p-1.5 rounded-lg hover:bg-red-50 transition">
                <span class="material-icons-round text-sm text-error">close</span>
              </button>
            </div>
          </div>

          <!-- Edit mode -->
          <div v-else class="p-4 space-y-3">
            <div class="flex items-center gap-2">
              <label class="text-xs text-txt-secondary w-12 shrink-0">金额</label>
              <input
                v-model.number="item.amount"
                type="number"
                step="0.01"
                class="flex-1 bg-surface rounded-lg px-3 py-2 text-sm text-txt outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-txt-secondary w-12 shrink-0">说明</label>
              <input
                v-model="item.description"
                class="flex-1 bg-surface rounded-lg px-3 py-2 text-sm text-txt outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-txt-secondary w-12 shrink-0">日期</label>
              <input
                v-model="item.date"
                type="date"
                class="flex-1 bg-surface rounded-lg px-3 py-2 text-sm text-txt outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-txt-secondary w-12 shrink-0">分类</label>
              <select
                v-model="item.category"
                class="flex-1 bg-surface rounded-lg px-3 py-2 text-sm text-txt outline-none focus:ring-1 focus:ring-primary"
              >
                <option v-for="cat in categories" :key="cat.name" :value="cat.name">{{ cat.name }}</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-txt-secondary w-12 shrink-0">备注</label>
              <input
                v-model="item.notes"
                placeholder="添加备注..."
                class="flex-1 bg-surface rounded-lg px-3 py-2 text-sm text-txt outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div class="flex gap-2 pt-1">
              <button @click="verifyItem(item)"
                class="flex-1 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-primary to-primary-light text-white active:scale-95 transition shadow-sm shadow-primary/20">
                <span class="material-icons-round text-sm align-middle mr-1">check</span>确认校验
              </button>
              <button @click="removeExpense(item.id)"
                class="py-2 px-4 rounded-xl text-sm font-medium bg-red-50 text-error active:scale-95 transition">
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Import Button -->
      <div v-if="unverifiedCount > 0" class="bg-orange-50 rounded-2xl p-4 mb-4 flex items-center gap-3">
        <span class="material-icons-round text-orange-400">info</span>
        <p class="text-sm text-orange-600">还有 <strong>{{ unverifiedCount }}</strong> 笔记录待校验，校验后才能导入</p>
      </div>
      <button
        @click="importAll"
        :disabled="importing || verifiedCount === 0"
        class="w-full py-4 text-white text-lg font-semibold rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
        :class="verifiedCount > 0 ? 'bg-gradient-to-r from-primary to-primary-light shadow-primary/30' : 'bg-gray-300'"
      >
        <span v-if="importing" class="material-icons-round text-xl align-middle mr-2 animate-spin">sync</span>
        <span v-else class="material-icons-round text-xl align-middle mr-2">file_download</span>
        {{ importing ? '导入中...' : verifiedCount > 0 ? `确认导入 (${verifiedCount} 笔已校验)` : '请先校验记录' }}
      </button>
    </template>

    <!-- Empty state -->
    <div v-if="!uploading && !ocrRunning && expenses.length === 0" class="text-center py-12">
      <span class="material-icons-round text-5xl text-txt-hint/30 mb-3">cloud_upload</span>
      <p class="text-sm text-txt-hint">请上传文件以开始导入</p>
    </div>

    <!-- Import Result -->
    <div
      v-if="importResult"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6"
    >
      <div class="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
        <span
          class="material-icons-round text-5xl mb-3"
          :class="importResult.fail === 0 ? 'text-green-500' : 'text-primary'"
        >
          {{ importResult.fail === 0 ? 'check_circle' : 'info' }}
        </span>
        <h3 class="text-lg font-semibold text-txt mb-2">导入完成</h3>
        <div class="space-y-1 mb-4">
          <p class="text-sm text-green-500">成功导入 {{ importResult.success }} 笔记录</p>
          <p v-if="importResult.fail > 0" class="text-sm text-error">失败 {{ importResult.fail }} 笔</p>
        </div>
        <p class="text-xs text-txt-hint mb-4">即将跳转到首页...</p>
        <button
          @click="router.push('/')"
          class="w-full py-3 bg-gradient-to-r from-primary to-primary-light text-white rounded-xl font-medium active:scale-95 transition"
        >
          返回首页
        </button>
      </div>
    </div>
  </div>

  <!-- 百度 OCR 密钥配置弹窗 -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showBaiduConfig" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
        <div class="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-txt">百度 OCR 配置</h3>
            <button @click="showBaiduConfig = false" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface transition">
              <span class="material-icons-round text-txt-hint">close</span>
            </button>
          </div>
          <div class="bg-blue-50 rounded-xl p-3 mb-4">
            <p class="text-xs text-blue-700 leading-relaxed">
              前往 <a href="https://ai.baidu.com" target="_blank" class="underline font-medium">百度AI开放平台</a> 注册账号，
              创建应用获取 <span class="font-mono font-medium">API Key</span> 和 <span class="font-mono font-medium">Secret Key</span>。
              通用文字识别每月 <span class="font-medium">1,000 次免费</span>。
            </p>
          </div>
          <div class="space-y-3 mb-4">
            <div>
              <label class="text-xs text-txt-secondary font-medium mb-1 block">API Key</label>
              <input v-model="tempApiKey" placeholder="请输入 API Key"
                class="w-full bg-surface rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30 transition" />
            </div>
            <div>
              <label class="text-xs text-txt-secondary font-medium mb-1 block">Secret Key</label>
              <input v-model="tempSecretKey" type="password" placeholder="请输入 Secret Key"
                class="w-full bg-surface rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30 transition" />
            </div>
          </div>
          <button @click="saveBaiduConfig"
            :disabled="!tempApiKey || !tempSecretKey"
            class="w-full py-3 rounded-xl font-medium text-white transition-all active:scale-95"
            :class="(tempApiKey && tempSecretKey) ? 'bg-gradient-to-r from-primary to-primary-light' : 'bg-gray-300 cursor-not-allowed'">
            保存配置
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
