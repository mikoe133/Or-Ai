// Content from the adopted Figma homepage. These are design previews, not
// published products or authoritative prices from the catalog service.
export const categories = [
  { id: 'relationships', name: '关系情感', icon: 'heart', tone: 'ivory', headline: '看见彼此的相处方式', description: '协作、沟通与关系边界' },
  { id: 'work', name: '职场工作', icon: 'briefcase', tone: 'periwinkle', headline: '给隐形劳动一份说明', description: '工作分工与职场边界' },
  { id: 'self', name: '自我探索', icon: 'sparkles', tone: 'lavender', headline: '找到你的生活倾向', description: '情绪、期待与自我观察' },
  { id: 'life', name: '生活消费', icon: 'bag', tone: 'teal', headline: '读懂每一次心动消费', description: '习惯、选择与消费动机' },
  { id: 'fun', name: '趣味娱乐', icon: 'smile', tone: 'blush', headline: '给日常一点轻松灵感', description: '社交电量与生活关键词' },
] as const;

export type CategoryId = typeof categories[number]['id'];
export type Tone = 'lavender' | 'teal' | 'periwinkle' | 'blush';
export interface PreviewProduct {
  id: string;
  name: string;
  category: CategoryId;
  tone: Tone;
  hook: string;
  details: string;
  price: string;
  featured: boolean;
}

export const products: readonly PreviewProduct[] = [
  { id: 'partner', name: '伴侣协作体检', category: 'relationships', tone: 'lavender', hook: '发现隐藏的协作模式', details: '16 道题 · 五维协作画像', price: '9.9', featured: true },
  { id: 'work', name: '职场隐形加班体检', category: 'work', tone: 'teal', hook: '看见工作中的隐形付出', details: '15 道题 · 职场边界观察', price: '9.9', featured: true },
  { id: 'expectation', name: '关系脑补倾向', category: 'self', tone: 'periwinkle', hook: '分清真实线索与内心剧本', details: '18 道题 · 事实与期待分辨', price: '9.9', featured: true },
  { id: 'social', name: '社交电量说明书', category: 'fun', tone: 'blush', hook: '找到适合你的社交节奏', details: '16 道题 · 社交恢复方式', price: '9.9', featured: true },
  { id: 'boundaries', name: '好说话成本账单', category: 'relationships', tone: 'blush', hook: '看见每一次好说话的成本', details: '边界观察 · 16 道题', price: '9.9', featured: false },
  { id: 'friendship', name: '友情供需报告', category: 'relationships', tone: 'lavender', hook: '观察友情里的付出与回应', details: '互惠关系 · 15 道题', price: '9.9', featured: false },
  { id: 'shopping', name: '消费人设测试', category: 'life', tone: 'teal', hook: '读懂每一次心动消费', details: '消费动机 · 12 道题', price: '9.9', featured: false },
  { id: 'keywords', name: '本周生活关键词', category: 'fun', tone: 'periwinkle', hook: '给本周一点轻松灵感', details: '娱乐抽签 · 日常行动提示', price: '6.9', featured: false },
];

export const coverFor = (product: PreviewProduct) => `/assets/store/featured-${product.tone}.png`;

export function filterProducts(query: string, category: string, favorites?: readonly string[]) {
  const words = query.trim().toLocaleLowerCase('zh-CN').split(/\s+/).filter(Boolean);
  return products.filter(product => {
    if (category !== 'all' && product.category !== category) return false;
    if (favorites && !favorites.includes(product.id)) return false;
    const label = categories.find(item => item.id === product.category)!.name;
    const searchable = `${product.name} ${product.hook} ${product.details} ${label}`.toLocaleLowerCase('zh-CN');
    return words.every(word => searchable.includes(word));
  });
}

const favoritesKey = 'meetmyworld:preview-favorites:v1';

export function readFavorites(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(favoritesKey) ?? '[]');
    return Array.isArray(saved) ? products.filter(product => saved.includes(product.id)).map(product => product.id) : [];
  } catch { return []; }
}

export function saveFavorites(ids: readonly string[]): boolean {
  try { localStorage.setItem(favoritesKey, JSON.stringify(ids)); return true; }
  catch { return false; }
}
