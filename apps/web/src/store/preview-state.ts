// Public examples for exercising the Figma UI. No scoring rules or real answers.
export const assessmentQuestions = [
  { topic: '日常分工', title: '面对共同的生活安排，你通常会怎么做？', options: ['主动和对方一起商量', '先听听对方的想法', '先做好自己的部分', '视当时的情况决定'] },
  { topic: '承诺兑现', title: '答应对方的事情有了变化时，你通常会？', options: ['提前说明，一起调整安排', '尽量按原来的约定完成', '等对方问起时再解释', '先处理变化，之后再说'] },
  { topic: '共同决策', title: '需要一起做一个重要选择时，你们通常会？', options: ['分别说出想法，再一起决定', '由更了解这件事的人决定', '轮流决定，尊重彼此偏好', '暂时搁置，等想清楚再说'] },
  { topic: '沟通修复', title: '有了小分歧之后，你更习惯哪种回应？', options: ['先听对方的感受', '直接讨论解决办法', '先缓一缓，再找时间聊', '用一个行动表达关心'] },
  { topic: '日常分工', title: '当家里有事情需要处理时，你们通常会怎么分工？', options: ['我先发现，也常常是我来安排', '说好分工后，各自完成', '谁看见谁处理，彼此补位', '很少讨论，临时再说'] },
  { topic: '边界尊重', title: '对方希望独处一会儿时，你通常会？', options: ['留出空间，也确认需要什么', '约好之后再一起做点事情', '先陪在附近，等对方开口', '各自安排自己的时间'] },
  { topic: '日常分工', title: '一项共同任务一直没有完成时，你更倾向于？', options: ['一起重新确认分工', '主动把剩下的部分做完', '提醒对方跟进自己的部分', '先调整任务的优先顺序'] },
  { topic: '承诺兑现', title: '忙碌时要记住两个人的约定，你们通常会？', options: ['把约定写进共同日程', '相互提醒重要的事情', '各自记住负责的部分', '临近时间再确认安排'] },
  { topic: '共同决策', title: '你们对周末安排有不同想法时，通常会？', options: ['找到双方都愿意的安排', '这次听对方，下次听自己', '保留一部分各自的时间', '临时决定，保持灵活'] },
  { topic: '沟通修复', title: '对方表达疲惫时，你的第一反应更接近？', options: ['先听听发生了什么', '问问能帮忙分担什么', '陪伴一会儿，让对方放松', '给对方安静休息的空间'] },
  { topic: '边界尊重', title: '想保持自己的兴趣和节奏时，你通常会？', options: ['提前说明，约好各自的时间', '邀请对方了解自己的兴趣', '自然安排，再分享经历', '根据共同安排灵活调整'] },
  { topic: '日常分工', title: '两个人都很忙时，共同事务通常怎么处理？', options: ['列出任务，重新分配', '谁有空就先处理一些', '先完成最重要的事情', '等忙完后集中一起处理'] },
  { topic: '承诺兑现', title: '一件约好的事按时完成后，你通常会？', options: ['主动告诉对方进展', '把结果放到共同记录里', '等一起用到时再分享', '顺便聊聊下一步安排'] },
  { topic: '共同决策', title: '你们共同购买一件日常用品时，更常见的是？', options: ['一起比较，再决定', '由使用更多的人选择', '先确认预算，再各自挑选', '根据眼前需要尽快决定'] },
  { topic: '沟通修复', title: '想重新开启一段没有聊完的对话时，你通常会？', options: ['约一个双方方便的时间', '先回应上次没说清的感受', '从一个轻松的日常话题开始', '直接提出具体的解决建议'] },
  { topic: '边界尊重', title: '回看最近的相处，你最想一起确认什么？', options: ['怎样让分工更清楚', '怎样及时回应彼此', '怎样保留个人空间', '怎样延续已经舒服的节奏'] },
] as const;

export interface AssessmentPreview {
  version: 1;
  answers: (number | null)[];
  current: number;
  completed: boolean;
}
const storageKey = 'meetmyworld:assessment-preview:v1';
export const newAssessmentPreview = (): AssessmentPreview => ({ version: 1, answers: assessmentQuestions.map(() => null), current: 0, completed: false });

export function readAssessmentPreview(): AssessmentPreview {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (!value || typeof value !== 'object') return newAssessmentPreview();
    const state = value as Partial<AssessmentPreview>;
    if (state.version !== 1 || !Array.isArray(state.answers) || state.answers.length !== assessmentQuestions.length
      || !state.answers.every(answer => answer === null || (Number.isInteger(answer) && answer >= 0 && answer < 4))
      || !Number.isInteger(state.current) || state.current! < 0 || state.current! >= assessmentQuestions.length) return newAssessmentPreview();
    return { version: 1, answers: state.answers, current: state.current!, completed: state.completed === true && state.answers.every(answer => answer !== null) };
  } catch { return newAssessmentPreview(); }
}

export function saveAssessmentPreview(state: AssessmentPreview): boolean {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); return true; }
  catch { return false; }
}
