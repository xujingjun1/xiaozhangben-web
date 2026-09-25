import dayjs from 'dayjs'

// 调试日志：仅在开发环境输出。
// 此前这些日志会打进生产包，逐条打印用户账单（金额/分类/描述/日期），
// 对一款有隐私说明的记账应用不合适，故统一收口。
const DEV = import.meta.env.DEV
const debugLog = (...args: unknown[]) => { if (DEV) console.log(...args) }
const debugWarn = (...args: unknown[]) => { if (DEV) console.warn(...args) }

export type ImportMode = 'image' | 'csv' | 'json'

export interface ParsedExpense {
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

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function todayStr(): string {
  return dayjs().format('YYYY-MM-DD')
}

// ========== 智能分类算法（基于用户商家库） ==========
export function guessCategory(text: string): string {
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
export function parseAmount(s: string): number {
  const hasDigit = /\d/.test(s)
  let cleaned = s
    .replace(/[¥￥$]/g, '')     // 移除货币符号
    .replace(/[，,]/g, '')       // 移除千位分隔符
    .replace(/\s/g, '')         // 移除空格

  // 只有原字符串包含数字时，才做 OCR 字母/数字纠错，避免把纯文本误识别成金额
  if (hasDigit) {
    cleaned = cleaned
      .replace(/[Oo]/g, '0')    // OCR: O -> 0
      .replace(/[lI|]/g, '1')   // OCR: l/I/| -> 1
      .replace(/[Ss]/g, '5')    // OCR: S -> 5
      .replace(/[Bb]/g, '8')    // OCR: B -> 8
  }

  // 匹配金额模式：支持小数点和负数
  const m = cleaned.match(/-?\d+\.?\d{0,2}/)
  if (!m) return 0

  const num = parseFloat(m[0])
  return isNaN(num) ? 0 : Math.abs(num) // 返回绝对值
}

// ========== 优化的日期解析算法 ==========
function buildDate(year: number, month: number, day: number): string | null {
  const d = dayjs(new Date(year, month - 1, day))
  return d.year() === year && d.month() === month - 1 && d.date() === day
    ? d.format('YYYY-MM-DD')
    : null
}

export function parseDate(s: string): string {
  const now = dayjs()
  
  // 相对日期
  if (/今[天日]/.test(s)) return now.format('YYYY-MM-DD')
  if (/昨[天日]/.test(s)) return now.subtract(1, 'day').format('YYYY-MM-DD')
  if (/前[天日]/.test(s)) return now.subtract(2, 'day').format('YYYY-MM-DD')
  if (/大前[天日]/.test(s)) return now.subtract(3, 'day').format('YYYY-MM-DD')
  
  // 完整日期：2024年3月15日 或 2024年03月15日
  let m = s.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (m) {
    const d = buildDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]))
    if (d) return d
  }
  
  // 标准格式：2024-03-15 或 2024/03/15
  m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) {
    const d = buildDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]))
    if (d) return d
  }
  
  // 中文格式：3月15日
  m = s.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/)
  if (m) {
    const d = buildDate(now.year(), parseInt(m[1]), parseInt(m[2]))
    if (d) return d
  }
  
  // 短格式：03-15 或 03/15 或 3-15
  m = s.match(/(\d{1,2})[-/](\d{1,2})/)
  if (m) {
    const d = buildDate(now.year(), parseInt(m[1]), parseInt(m[2]))
    if (d) return d
  }
  
  // 只有时间没有日期（如 "14:30"），返回今天
  return todayStr()
}

// ========== OCR文本清洗算法 ==========
export function cleanOCRText(text: string): string {
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
export function extractDescription(line: string): string {
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
  desc = desc.replace(/[【】[\]{}]/g, '').trim()
  
  return desc || '消费记录'
}

export function createExpense(amount: number, category: string, description: string, date: string, tags: string[] = []): ParsedExpense {
  return { id: genId(), amount, category, description, date, tags, notes: '', verified: false, editing: false }
}


export function parseOCRText(text: string): ParsedExpense[] {
  // 先清洗OCR文本
  const cleanedText = cleanOCRText(text)
  const lines = cleanedText.split('\n').map(l => l.trim()).filter(Boolean)
  debugLog(`[导入-解析] OCR文本行数: ${lines.length}`)
  
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
      const desc = extractDescription(line)
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
        const desc = extractDescription(line)
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
  return results.filter(e => {
    const key = `${e.amount}-${e.description.substring(0, 10)}`
    if (finalSeen.has(key)) return false
    finalSeen.add(key)
    return true
  })
}


export function parseCSV(text: string): ParsedExpense[] {
  // 移除BOM字符（微信/支付宝导出的CSV常带BOM）
  const cleanText = text.replace(/^\uFEFF/, '')
  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean)
  debugLog(`[导入-CSV] 总行数: ${lines.length}`)
  if (lines.length < 2) {
    debugWarn(`[导入-CSV] 行数不足, 终止解析`)
    return []
  }

  // 智能检测分隔符（逗号、制表符、分号）
  const firstLine = lines[0]
  const delimiter = firstLine.includes('\t') ? '\t' 
    : firstLine.includes(';') ? ';' 
    : ','
  debugLog(`[导入-CSV] 检测到分隔符: ${delimiter === '\t' ? 'TAB' : delimiter === ';' ? '分号' : '逗号'}`)

  // 检测表头并映射列
  const headers = firstLine.split(delimiter).map(h => h.replace(/"/g, '').trim())
  debugLog(`[导入-CSV] 表头: [${headers.join(', ')}]`)

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

  debugLog(`[导入-CSV] 列映射 - 时间:${colTime}, 描述:${colDesc}, 收支:${colType}, 金额:${colAmount}, 支付方式:${colMethod}, 分类:${colCategory}`)

  const results: ParsedExpense[] = []
  let skippedIncome = 0
  let skippedZero = 0
  const skippedInvalid = 0

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
    desc = desc.replace(/[【】[\]{}]/g, '').replace(/\s+/g, ' ').trim()

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

  debugLog(`[导入-CSV] 解析完成, 有效记录: ${results.length}, 跳过收入: ${skippedIncome}, 跳过金额为0: ${skippedZero}, 跳过无效: ${skippedInvalid}`)
  return results
}

// 优化的CSV行解析（支持引号内的分隔符）
export function parseCSVLine(line: string, delimiter: string = ','): string[] {
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


export function parseJSONData(data: any): ParsedExpense[] {
  const items = Array.isArray(data) ? data : (data.expenses || data.data || [])
  debugLog(`[导入-JSON] 原始数据类型: ${Array.isArray(data) ? 'Array' : typeof data}, 解析后记录数: ${items.length}`)
  if (!Array.isArray(items)) {
    debugWarn(`[导入-JSON] 无法解析为数组, 终止`)
    return []
  }

  const results = items.map((item: any, i: number) => {
    const amount = parseFloat(item.amount) || 0
    const category = item.category || guessCategory(item.description || item.name || '')
    const description = item.description || item.name || item.desc || '导入记录'
    const date = item.date || item.time || item.created_at || todayStr()
    const tags = Array.isArray(item.tags) ? item.tags : []
    debugLog(`  [${i + 1}] 金额: ¥${amount}, 分类: ${category}, 描述: ${description}, 日期: ${date}`)
    return createExpense(amount, category, description, parseDate(date), tags)
  }).filter((e: ParsedExpense) => e.amount > 0)
  
  debugLog(`[导入-JSON] 解析完成, 有效记录: ${results.length}, 无效(金额为0): ${items.length - results.length}`)
  return results
}

