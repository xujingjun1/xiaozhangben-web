import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

export function formatDate(date: string | Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

export function formatDateShort(date: string | Date): string {
  const now = dayjs()
  const target = dayjs(date)
  const diff = now.diff(target.startOf('day'), 'day')
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff === 2) return '前天'
  if (now.year() === target.year()) return target.format('M月D日')
  return target.format('YYYY年M月D日')
}

export function formatMoney(amount: number): string {
  if (amount === Math.round(amount) && amount < 10000) return `¥${amount}`
  return `¥${amount.toFixed(2)}`
}

export function formatMoneyClean(amount: number): string {
  return amount.toFixed(2)
}

export function formatMoneyCompact(amount: number): string {
  if (amount >= 10000) return `¥${(amount / 10000).toFixed(1)}万`
  if (amount >= 1000) return `¥${(amount / 1000).toFixed(1)}k`
  return formatMoney(amount)
}

export function getWeekdayName(date: string | Date): string {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return names[dayjs(date).day()]
}

export function getGreeting(): string {
  const hour = dayjs().hour()
  if (hour < 6) return '夜深了，注意休息'
  if (hour < 9) return '早安，新的一天'
  if (hour < 12) return '上午好，今天花了多少？'
  if (hour < 14) return '中午好，午饭记账了吗？'
  if (hour < 18) return '下午好，继续加油'
  if (hour < 21) return '晚上好，来记一笔吧'
  return '晚安，今天过得怎么样？'
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export interface CategoryInfo {
  name: string
  icon: string
  color: string
}

export const categories: CategoryInfo[] = [
  { name: '餐饮', icon: 'restaurant', color: '#FF6B6B' },
  { name: '交通', icon: 'directions_bus', color: '#74B9FF' },
  { name: '购物', icon: 'shopping_bag', color: '#FFB347' },
  { name: '住宿', icon: 'hotel', color: '#82CCDD' },
  { name: '娱乐', icon: 'sports_esports', color: '#A29BFE' },
  { name: '医疗', icon: 'local_hospital', color: '#FF6B9D' },
  { name: '教育', icon: 'school', color: '#3DC1D3' },
  { name: '生活', icon: 'home', color: '#55E6C1' },
  { name: '宠物', icon: 'pets', color: '#B8E994' },
  { name: '其他', icon: 'more_horiz', color: '#B8B5D0' },
]

export const defaultTags = [
  { name: '加班餐', emoji: '🌃' },
  { name: '周末', emoji: '🎉' },
  { name: '朋友聚会', emoji: '👥' },
  { name: '网购', emoji: '📦' },
  { name: '出差', emoji: '✈️' },
  { name: '约会', emoji: '💕' },
  { name: '家庭', emoji: '🏠' },
  { name: '学习', emoji: '📚' },
  { name: '健身', emoji: '💪' },
  { name: '美食探店', emoji: '🍴' },
  { name: '节日', emoji: '🎄' },
  { name: '必需品', emoji: '✅' },
]

export function getCategoryInfo(name: string): CategoryInfo {
  return categories.find(c => c.name === name) || categories[categories.length - 1]
}
