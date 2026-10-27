import type { Dependency, Fixture, GraphState, PlanModule, Domain, Validation } from './types.ts';

export const MAX_MODULES = 40;
const purposes: Record<Domain, string[]> = {
  assessment: ['assessment_design', 'report_writing'], cover: ['cover_design'], copy: ['copywriting'],
  experience: ['scene_design', 'report_presentation'], video: ['video_production'],
};
const invalid = (code: string, message: string): Validation => ({ valid: false, code, message });
export function dependencyId(source: string, target: string) { return `dependency:${source}:${target}`; }
export function validateDependency(
  modules: PlanModule[], edges: Dependency[], source: string, target: string, planRevisionId: string, excludedId?: string,
): Validation {
  const upstream = modules.find(module => module.id === source), downstream = modules.find(module => module.id === target);
  if (!upstream || !downstream) return invalid('INVALID_NODE', '依赖只能连接当前计划中的交付模块。');
  if (upstream.planRevisionId !== planRevisionId || downstream.planRevisionId !== planRevisionId)
    return invalid('CROSS_PLAN', '不能连接不同计划修订的模块。');
  if (source === target) return invalid('SELF', '模块不能依赖自身。');
  const remaining = edges.filter(edge => edge.id !== excludedId);
  if (remaining.some(edge => edge.source === source && edge.target === target))
    return invalid('DUPLICATE', '这两个模块已经存在相同的依赖关系。');
  // Adding upstream -> downstream is cyclic if upstream is reachable from downstream.
  const visited = new Set<string>(), queue = [target];
  while (queue.length) {
    const current = queue.pop()!;
    if (current === source) return invalid('CYCLE', '此连线会形成循环依赖，请调整上游或下游。');
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of remaining) if (edge.source === current) queue.push(edge.target);
  }
  return { valid: true };
}

export class GraphStore {
  readonly fixture: Fixture;
  private readonly baseline: GraphState;
  private state: GraphState;
  private listeners = new Set<() => void>();
  private editing = true;
  private editingDraft: GraphState | null = null;
  onDraftChange?: () => void;
  constructor(fixture: Fixture, scale = 5) {
    this.fixture = fixture;
    const modules = structuredClone(fixture.plan.modules).map(module => ({ ...module, planRevisionId: fixture.plan.id }));
    const dependencies: Dependency[] = [];
    for (const module of modules) for (const key of module.definition.dependsOn) {
      const source = modules.find(row => row.moduleKey === key)!;
      dependencies.push({ id: dependencyId(source.id, module.id), source: source.id, target: module.id,
        planRevisionId: fixture.plan.id, relation: 'dependency' });
    }
    if (scale === 40) {
      for (let index = modules.length; index < MAX_MODULES; index++) {
        const source = modules[index % fixture.plan.modules.length]!;
        const key = `scale-${index + 1}`, stable = `scale-module-${index + 1}`;
        modules.push({ ...structuredClone(source), id: stable, moduleId: stable, moduleKey: key, proposed: true,
          definition: { ...structuredClone(source.definition), moduleKey: key, title: `扩展物料 ${String(index + 1).padStart(2, '0')}`,
            dependsOn: [source.moduleKey], outputs: Array.from({ length: 8 }, (_, slot) => ({
              outputKey: `slot-${slot + 1}`, label: `交付槽位 ${slot + 1}`, kind: 'image', required: slot === 0,
            })) } });
        dependencies.push({ id: dependencyId(source.id, stable), source: source.id, target: stable,
          planRevisionId: fixture.plan.id, relation: 'dependency' });
      }
    }
    this.state = { modules, dependencies, notes: [], draftRevision: 0, expandedId: null,
      focusId: scale === 40 ? modules.find(module => module.moduleKey === 'copy')!.id : null,
      positions: {}, selectedKey: 'plan' };
    this.baseline = structuredClone(this.state);
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<GraphState>, draft = false) {
    this.state = { ...this.state, ...patch, draftRevision: this.state.draftRevision + (draft ? 1 : 0) };
    for (const listener of this.listeners) listener();
    if (draft) this.onDraftChange?.();
  }
  setEditing(value: boolean) {
    if (this.editing === value) return;
    if (!value) { this.editingDraft = this.state; this.state = structuredClone(this.baseline); }
    else { this.state = this.editingDraft ?? structuredClone(this.baseline); this.editingDraft = null; }
    this.editing = value;
    for (const listener of this.listeners) listener();
    this.onDraftChange?.();
  }
  isEditing() { return this.editing; }
  select(selectedKey: string) { if (this.state.selectedKey !== selectedKey) this.update({ selectedKey }); }
  expand(id: string | null) { this.update({ expandedId: id }); }
  focus(id: string | null) { this.update({ focusId: id }); }
  setPosition(id: string, position: { x: number; y: number }) {
    this.update({ positions: { ...this.state.positions, [id]: position } });
  }
  clearLayout() { this.update({ positions: {} }); }
  reset() { if (!this.editing) return; this.state = structuredClone(this.baseline); for (const listener of this.listeners) listener(); this.onDraftChange?.(); }
  check(source: string, target: string, excludedId?: string): Validation {
    if (!this.editing) return invalid('READ_ONLY', '这个历史状态只读。请切换到“制作中”演示修改。');
    if (excludedId && !this.state.dependencies.some(edge => edge.id === excludedId))
      return invalid('READ_ONLY', '固定方法引用和产物来源不能重新连接。');
    return validateDependency(this.state.modules, this.state.dependencies, source, target, this.fixture.plan.id, excludedId);
  }
  connect(source: string, target: string, excludedId?: string): Validation {
    const validation = this.check(source, target, excludedId);
    if (!validation.valid) return validation;
    const dependencies = [...this.state.dependencies.filter(edge => edge.id !== excludedId), {
      id: dependencyId(source, target), source, target, planRevisionId: this.fixture.plan.id, relation: 'dependency' as const,
    }];
    this.updateDependencies(dependencies);
    return validation;
  }
  removeDependency(id: string): Validation {
    if (!this.editing) return invalid('READ_ONLY', '历史状态只读，不能修改关系。');
    if (!this.state.dependencies.some(edge => edge.id === id)) return invalid('READ_ONLY', '方法引用与产物来源是只读依据，不能删除。');
    this.updateDependencies(this.state.dependencies.filter(edge => edge.id !== id));
    return { valid: true };
  }
  private updateDependencies(dependencies: Dependency[]) {
    const modules = this.state.modules.map(module => ({ ...module, definition: { ...module.definition,
      dependsOn: dependencies.filter(edge => edge.target === module.id).map(edge => this.state.modules.find(row => row.id === edge.source)!.moduleKey),
    } }));
    this.update({ modules, dependencies }, true);
  }
  add(input: { kind: 'module' | 'note'; title: string; domain?: Domain; required?: boolean; afterId?: string; position?: { x: number; y: number } }): Validation & { id?: string; key?: string } {
    if (!this.editing) return invalid('READ_ONLY', '历史状态只读，不能添加节点。');
    const title = input.title.trim();
    if (!title || title.length > 80) return invalid('TITLE', '请填写 1–80 字的节点名称。');
    if (input.kind === 'note') {
      if (input.afterId) return invalid('INVALID_NODE', '备注不参与模块依赖，请添加交付模块来连接上游。');
      if (this.state.notes.length >= 20) return invalid('LIMIT', '这个演示最多保留 20 个备注。');
      const id = 'note:' + crypto.randomUUID();
      this.update({ notes: [...this.state.notes, { id, title, planRevisionId: this.fixture.plan.id, position: input.position ?? { x: 680, y: 80 } }] }, true);
      return { valid: true, id };
    }
    if (this.state.modules.length >= MAX_MODULES) return invalid('LIMIT', '每个计划最多 40 个模块。可继续查看或连接现有模块。');
    if (!input.domain || !purposes[input.domain]) return invalid('DOMAIN', '请选择模块的专业领域。');
    const upstream = input.afterId ? this.state.modules.find(module => module.id === input.afterId) : null;
    if (input.afterId && (!upstream || upstream.planRevisionId !== this.fixture.plan.id)) return invalid('CROSS_PLAN', '上游模块不属于当前计划。');
    const id = crypto.randomUUID(), key = 'draft-' + id.slice(0, 8);
    const module: PlanModule = { id, moduleId: id, moduleKey: key, digest: '', planRevisionId: this.fixture.plan.id, proposed: true,
      definition: { moduleKey: key, title, domain: input.domain, required: input.required ?? true, purpose: '待补充模块目的',
        dependsOn: upstream ? [upstream.moduleKey] : [], methodPurposes: [...purposes[input.domain]], target: { form: 'web', runtime: null }, outputs: [] } };
    const dependencies = upstream ? [...this.state.dependencies, { id: dependencyId(upstream.id, id), source: upstream.id, target: id,
      planRevisionId: this.fixture.plan.id, relation: 'dependency' as const }] : this.state.dependencies;
    const position = input.position ? { ['module:' + id]: input.position } : {};
    this.update({ modules: [...this.state.modules, module], dependencies, positions: { ...this.state.positions, ...position }, focusId: id }, true);
    return { valid: true, id, key };
  }
  exportDraft() {
    return { kind: 'g1_design_draft', schemaVersion: 1, basePlanRevisionId: this.fixture.plan.id,
      basePlanDigest: this.fixture.plan.digest, baseRevision: this.fixture.plan.revision,
      draftRevision: this.state.draftRevision, persisted: false, modules: structuredClone(this.state.modules),
      dependencies: structuredClone(this.state.dependencies), notes: structuredClone(this.state.notes) };
  }
}

export function visibleModules(state: GraphState) {
  if (state.expandedId) return state.modules.filter(module => module.id === state.expandedId);
  if (!state.focusId) return state.modules;
  const ids = new Set([state.focusId]);
  const neighbors = [...state.dependencies.filter(edge => edge.target === state.focusId), ...state.dependencies.filter(edge => edge.source === state.focusId)];
  for (const edge of neighbors) {
    if (ids.size >= 5) break;
    ids.add(edge.source); ids.add(edge.target);
  }
  return state.modules.filter(module => ids.has(module.id));
}

export function moduleLayout(modules: PlanModule[], edges: Dependency[], direction: 'horizontal' | 'vertical' = 'horizontal') {
  const ranks = new Map<string, number>(), ids = new Set(modules.map(module => module.id));
  const visit = (id: string): number => {
    if (ranks.has(id)) return ranks.get(id)!;
    const parents = edges.filter(edge => edge.target === id && ids.has(edge.source));
    const rank = parents.length ? 1 + Math.max(...parents.map(edge => visit(edge.source))) : 0;
    ranks.set(id, rank); return rank;
  };
  for (const module of modules) visit(module.id);
  const groups = new Map<number, PlanModule[]>();
  for (const module of modules) { const rank = ranks.get(module.id)!; groups.set(rank, [...(groups.get(rank) ?? []), module]); }
  const positions: Record<string, { x: number; y: number }> = {};
  for (const [rank, rows] of groups) rows.forEach((row, index) => {
    positions[row.id] = direction === 'horizontal'
      ? { x: 350 + rank * 340, y: (index - (rows.length - 1) / 2) * 245 + 260 }
      : { x: (index - (rows.length - 1) / 2) * 340 + 370, y: 140 + rank * 220 };
  });
  return positions;
}
