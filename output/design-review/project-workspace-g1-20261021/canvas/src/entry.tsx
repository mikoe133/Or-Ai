import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, version as reactVersion } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { version as reactDomVersion } from 'react-dom';
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, MiniMap, Panel, Handle, Position,
  MarkerType, applyNodeChanges, useReactFlow, type Node, type NodeProps, type Edge, type Connection,
  type NodeChange, type OnConnectEnd, type OnReconnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './flow.css';
import { GraphStore, moduleLayout, visibleModules } from './model.ts';
import type { CanvasHandlers, Domain, Fixture, GraphState, PlanModule, Validation } from './types.ts';

declare global {
  interface Window {
    projectFixture: Fixture;
    g1Canvas: typeof bridge;
    g1DesignSelect?: (key: string) => void;
    g1DesignNotify?: (message: string) => void;
  }
}
const fixture = window.projectFixture;
const store = new GraphStore(fixture, new URLSearchParams(location.search).get('size') === '40' ? 40 : 5);
const purposeLabels: Record<string, string> = { assessment_design: '题目设计', report_writing: '报告写作', cover_design: '图片设计',
  copywriting: '引流文案', scene_design: '场景设计', report_presentation: '报告呈现', video_production: '视频制作' };
const domainLabels: Record<Domain, string> = { assessment: '题目与报告', cover: '图片', copy: '文案', experience: '网页体验', video: '视频' };
const domainMarks: Record<Domain, string> = { assessment: '01', cover: '02', copy: '03', experience: '04', video: '05' };
const short = (id: string) => id.slice(0, 8);
let handlers: CanvasHandlers = { onSelect: key => window.g1DesignSelect?.(key), onNotify: message => window.g1DesignNotify?.(message) };
function notify(message: string) { handlers.onNotify(message); }
function selected(key: string) { handlers.onSelect(key); store.select(key); }
const useGraph = () => useSyncExternalStore(store.subscribe, store.getSnapshot);
type DialogState = null | { kind: 'add'; afterId?: string; position?: { x: number; y: number } } |
  { kind: 'connect'; source?: string; target?: string; edgeId?: string } | { kind: 'edge'; edge: CanvasEdge };
let setDialog: (value: DialogState) => void = () => {};
let scene = 'work';
let fitCanvas: (() => void) | undefined;
let viewportApi: ReturnType<typeof useReactFlow<CanvasNode, CanvasEdge>> | undefined;

type NodeData = {
  kind: 'plan' | 'module' | 'method' | 'output' | 'collection' | 'note';
  title: string; subtitle?: string; module?: PlanModule; moduleId?: string; selectKey: string;
  status?: string; warning?: boolean; expanded?: boolean; readOnly?: boolean;
  methodCount?: number; outputCount?: number; digest?: string; badge?: string;
  horizontal?: boolean;
};
type CanvasNode = Node<NodeData>;
type EdgeData = { relation: 'dependency' | 'membership' | 'method' | 'provenance'; title: string; readOnly: boolean; sourceModuleId?: string; targetModuleId?: string };
type CanvasEdge = Edge<EdgeData>;

const ModuleNode = memo(function ModuleNode({ data, selected: isSelected }: NodeProps<CanvasNode>) {
  const module = data.module!;
  return <article className={`flow-module ${isSelected ? 'is-selected' : ''}`} data-module-key={module.moduleKey}>
    <Handle type="target" position={data.horizontal ? Position.Left : Position.Top} id="dependency-in" isConnectable={!data.readOnly} className="dependency-port" aria-label={`${module.definition.title}的上游依赖端口`} />
    <Handle type="target" position={Position.Top} id="membership-in" style={{ left: '24%' }} isConnectable={false} className="reference-port" />
    <header className="flow-module-heading"><span className="flow-domain-mark">{domainMarks[module.definition.domain]}</span><span>{domainLabels[module.definition.domain]}</span><span className="flow-required">{module.definition.required ? '必需' : '可选'}</span></header>
    <h3>{module.definition.title}</h3><p className="flow-status"><i className={data.warning ? 'warning-dot' : ''} />{data.status}</p>
    <footer><span>{data.methodCount} 方法 <b>·</b> {data.outputCount} 产物</span><button className="nodrag nopan flow-expand" onClick={event => { event.stopPropagation(); store.expand(data.expanded ? null : module.id); }} aria-expanded={data.expanded} aria-label={`${data.expanded ? '收起' : '展开'}${module.definition.title}依据`}>{data.expanded ? '收起' : '展开'} <span>{data.expanded ? '−' : '+'}</span></button></footer>
    <div className="flow-module-tools nodrag nopan"><button aria-label={`在${module.definition.title}后添加节点`} disabled={data.readOnly} onClick={event => { event.stopPropagation(); setDialog({ kind: 'add', afterId: module.id }); }}>＋ 后续节点</button><button aria-label={`连接${module.definition.title}的下游模块`} disabled={data.readOnly} onClick={event => { event.stopPropagation(); setDialog({ kind: 'connect', source: module.id }); }}>连接 ↘</button></div>
    <Handle type="source" position={data.horizontal ? Position.Right : Position.Bottom} id="dependency-out" isConnectable={!data.readOnly} className="dependency-port" aria-label={`${module.definition.title}的下游依赖端口`} />
    <Handle type="source" position={Position.Right} style={{ top: '74%' }} id="method-out" isConnectable={false} className="reference-port" />
  </article>;
});
const PlanNode = memo(function PlanNode({ data }: NodeProps<CanvasNode>) {
  return <article className="flow-plan"><span className="flow-plan-icon">▱</span><div><strong>{data.title}</strong><small>{data.subtitle}</small></div><span className="flow-locked">v1</span><Handle type="source" position={data.horizontal ? Position.Right : Position.Bottom} id="membership-out" isConnectable={false} className="reference-port" /></article>;
});
const DetailNode = memo(function DetailNode({ data, selected: isSelected }: NodeProps<CanvasNode>) {
  return <article className={`flow-detail ${isSelected ? 'is-selected' : ''}`}>
    <Handle type="target" position={Position.Left} id="reference-in" isConnectable={false} className="reference-port" />
    <div className="flow-detail-kind">{data.kind === 'method' ? '⌘ 固定方法' : '▤ 产物记录'}<span>只读</span></div>
    <strong>{data.title}</strong><p>{data.subtitle}</p><small className={data.warning ? 'flow-warning' : ''}>{data.badge}</small>
    {data.kind === 'method' && <Handle type="source" position={Position.Right} id="provenance-out" isConnectable={false} className="reference-port" />}
  </article>;
});
const CollectionNode = memo(function CollectionNode({ data }: NodeProps<CanvasNode>) {
  return <div className="flow-collection-label"><span>{data.title}</span><small>固定方法与产物来源 · 只读</small><button className="nodrag nopan" aria-label="收起依据分组" onClick={event => { event.stopPropagation(); store.expand(null); }}>×</button></div>;
});
const Note = memo(function Note({ data }: NodeProps<CanvasNode>) {
  return <article className="flow-note"><span>备注 · 演示节点</span><p>{data.title}</p><small>不参与模块依赖</small></article>;
});
// Stable component identities prevent remounting every time a node is dragged.
const nodeTypes = { module: ModuleNode, plan: PlanNode, method: DetailNode, output: DetailNode, collection: CollectionNode, note: Note };

function moduleStatus(module: PlanModule) {
  if (module.proposed) return { status: '待完善 · 演示节点', warning: true };
  if (scene === 'failures' && ['images', 'experience'].includes(module.moduleKey)) return { status: '需要处理 · 状态示例', warning: true };
  if (scene === 'upload' && ['images', 'experience'].includes(module.moduleKey)) return { status: '上传 / 校验中 · 示例', warning: true };
  if (scene === 'returned' && module.moduleKey === 'copy') return { status: '退回修改 · 状态示例', warning: true };
  if (['review', 'retained', 'published'].includes(scene)) return { status: module.moduleKey === 'video' ? '可选 · 未制作' : scene === 'review' ? '待审核 · 状态示例' : '已留存 · 状态示例', warning: false };
  const record = fixture.inspection.modules.find(row => row.moduleKey === module.moduleKey);
  return record?.originals === 'recorded_not_revalidated' ? { status: '草稿原件已有保存记录', warning: false } : { status: module.moduleKey === 'video' ? '等待输入 · 可选' : '缺少网页原包', warning: true };
}
function buildGraph(state: GraphState) {
  const modules = visibleModules(state), ids = new Set(modules.map(module => module.id));
  const horizontal = !matchMedia('(max-width:820px)').matches;
  const layout = moduleLayout(modules, state.dependencies, horizontal ? 'horizontal' : 'vertical');
  const center = modules.length ? modules.reduce((sum, module) => sum + layout[module.id]!.x, 0) / modules.length : 370;
  const planPosition = horizontal ? { x: 20, y: modules.reduce((sum, module) => sum + layout[module.id]!.y, 0) / (modules.length || 1) + 46 } : { x: center, y: 0 };
  const nodes: CanvasNode[] = [{ id: 'plan:' + fixture.plan.id, type: 'plan', position: state.positions['plan:' + fixture.plan.id] ?? planPosition,
    data: { kind: 'plan', horizontal, title: '制作计划 v1', subtitle: `共同设定 v1 · ${state.modules.length} 个模块`, selectKey: 'plan' },
    draggable: true, deletable: false, selected: state.selectedKey === 'plan', style: { width: 260 } }];
  const edges: CanvasEdge[] = [];
  for (const module of modules) {
    const id = 'module:' + module.id, methods = fixture.methods.filter(method => method.planModuleId === module.id);
    const record = fixture.productions.find(record => record.planModuleId === module.id);
    nodes.push({ id, type: 'module', position: state.positions[id] ?? layout[module.id]!, deletable: false,
      data: { kind: 'module', title: module.definition.title, module, moduleId: module.id, selectKey: 'module:' + module.moduleKey,
        ...moduleStatus(module), horizontal, readOnly: !store.isEditing(), expanded: state.expandedId === module.id,
        methodCount: methods.length, outputCount: record?.outputs.length ?? 0 },
      selected: state.selectedKey === 'module:' + module.moduleKey, style: { width: 260 } });
    edges.push({ id: 'membership:' + module.id, source: 'plan:' + fixture.plan.id, target: id,
      sourceHandle: 'membership-out', targetHandle: 'membership-in', type: 'smoothstep', deletable: false, reconnectable: false,
      data: { relation: 'membership', title: '归属固定计划', readOnly: true }, className: 'edge-membership', style: { stroke: '#4f4a60', strokeWidth: 1, strokeDasharray: '3 6', opacity: .65 }, zIndex: 0 });
  }
  for (const edge of state.dependencies) if (ids.has(edge.source) && ids.has(edge.target)) edges.push({ ...edge,
    source: 'module:' + edge.source, target: 'module:' + edge.target, sourceHandle: 'dependency-out', targetHandle: 'dependency-in',
    type: 'smoothstep', deletable: false, reconnectable: store.isEditing(), interactionWidth: 24,
    data: { relation: 'dependency', title: '模块依赖', readOnly: !store.isEditing(), sourceModuleId: edge.source, targetModuleId: edge.target },
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#bea5ec' }, className: 'edge-dependency',
    style: { stroke: '#bea5ec', strokeWidth: 1.8 }, zIndex: 1,
  });
  const expanded = modules.find(module => module.id === state.expandedId);
  if (expanded) {
    const moduleNode = nodes.find(node => node.id === 'module:' + expanded.id)!;
    const methods = fixture.methods.filter(method => method.planModuleId === expanded.id);
    const record = fixture.productions.find(record => record.planModuleId === expanded.id), outputs = record?.outputs ?? [];
    const groupId = 'collection:' + expanded.id, groupHeight = 62 + Math.max(methods.length, outputs.length, 1) * 122;
    nodes.push({ id: groupId, type: 'collection', position: state.positions[groupId] ?? { x: moduleNode.position.x + 340, y: moduleNode.position.y - 12 },
      data: { kind: 'collection', title: expanded.definition.title + ' / 固定依据', moduleId: expanded.id, selectKey: 'module:' + expanded.moduleKey },
      style: { width: 650, height: groupHeight, background: '#181a24e8', border: '1px solid #454053', borderRadius: 8 }, draggable: true, selectable: false, deletable: false, zIndex: 2 });
    methods.forEach((method, index) => {
      const id = 'method:' + method.id;
      nodes.push({ id, type: 'method', parentId: groupId, extent: 'parent', position: state.positions[id] ?? { x: 20, y: 56 + index * 122 }, deletable: false,
        data: { kind: 'method', title: purposeLabels[method.purpose]!, subtitle: `库 v${method.version.number} · 草稿 r${method.sourceRevision}`,
          badge: `快照 ${short(method.id)}`, moduleId: expanded.id, selectKey: id, digest: method.digest }, selected: state.selectedKey === id, style: { width: 260 }, zIndex: 3 });
      edges.push({ id: 'method-reference:' + method.id, source: moduleNode.id, target: id, sourceHandle: 'method-out', targetHandle: 'reference-in',
        type: 'smoothstep', deletable: false, reconnectable: false, data: { relation: 'method', title: '固定方法引用', readOnly: true },
        style: { stroke: '#8f9daf', strokeWidth: 1.4, strokeDasharray: '2 4' }, className: 'edge-method', zIndex: 4 });
    });
    outputs.forEach((output, index) => {
      const id = 'output:' + output.id, slot = expanded.definition.outputs.find(slot => slot.outputKey === output.outputKey);
      nodes.push({ id, type: 'output', parentId: groupId, extent: 'parent', position: state.positions[id] ?? { x: 370, y: 56 + index * 122 }, deletable: false,
        data: { kind: 'output', title: slot?.label ?? output.outputKey, subtitle: output.file ? `原件 · ${output.file.byteSize} B` : output.purpose === 'authoring' ? '制作清单 · 非网页原包' : '结构化原件 · v1',
          badge: output.purpose === 'authoring' ? '仍需导入制作原包' : '已有保存记录', warning: output.purpose === 'authoring', moduleId: expanded.id, selectKey: id },
        selected: state.selectedKey === id, style: { width: 260 }, zIndex: 3 });
      for (const method of methods) if (record?.methods.some(selection => selection.snapshotId === method.id)) edges.push({
        id: 'provenance:' + method.id + ':' + output.id, source: 'method:' + method.id, target: id, sourceHandle: 'provenance-out', targetHandle: 'reference-in',
        type: 'smoothstep', deletable: false, reconnectable: false, data: { relation: 'provenance', title: '外部制作来源申报', readOnly: true },
        style: { stroke: '#a5b5ac', strokeWidth: 1.3, strokeDasharray: '7 4' }, className: 'edge-provenance', zIndex: 4,
      });
    });
    if (!methods.length && !outputs.length) nodes.push({ id: 'note:empty:' + expanded.id, type: 'note', parentId: groupId,
      position: { x: 20, y: 62 }, draggable: false, deletable: false, data: { kind: 'note', title: '还没有固定方法和产物。新节点只保存在当前演示草稿中。', selectKey: 'module:' + expanded.moduleKey }, style: { width: 300 } });
  }
  for (const note of state.notes) nodes.push({ id: note.id, type: 'note', position: state.positions[note.id] ?? note.position, deletable: false,
    data: { kind: 'note', title: note.title, selectKey: note.id }, style: { width: 240 } });
  return { nodes, edges };
}

function FlowSurface() {
  const state = useGraph(), flow = useReactFlow<CanvasNode, CanvasEdge>();
  const graph = buildGraph(state), [nodes, setNodes] = useState(graph.nodes), [edges, setEdges] = useState(graph.edges);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const initialized = useRef(false), sceneAtRender = scene;
  const reconnectId = useRef<string | undefined>(undefined);
  useEffect(() => { setNodes(graph.nodes); setEdges(graph.edges.map(edge => ({ ...edge, selected: edge.id === selectedEdge }))); }, [state, sceneAtRender, selectedEdge]);
  const fit = useCallback(() => { void flow.fitView({ padding: .07, duration: 220, maxZoom: 1, minZoom: .18 }); }, [flow]);
  useEffect(() => { viewportApi = flow; fitCanvas = fit; return () => { viewportApi = undefined; fitCanvas = undefined; }; }, [flow, fit]);
  useEffect(() => {
    if (!initialized.current) return;
    const timer = setTimeout(fit, 100); return () => clearTimeout(timer);
  }, [state.expandedId, state.focusId]);
  const validConnection = useCallback((connection: Connection | CanvasEdge) => {
    if (connection.sourceHandle !== 'dependency-out' || connection.targetHandle !== 'dependency-in') return false;
    return store.check(connection.source.replace(/^module:/, ''), connection.target.replace(/^module:/, ''), reconnectId.current).valid;
  }, []);
  const connect = useCallback((connection: Connection) => {
    const result = store.connect(connection.source.replace(/^module:/, ''), connection.target.replace(/^module:/, ''));
    notify(result.valid ? '依赖已加入当前演示草稿，正式计划未改动。' : result.message);
  }, []);
  const reconnect: OnReconnect<CanvasEdge> = useCallback((edge, connection) => {
    const result = store.connect(connection.source.replace(/^module:/, ''), connection.target.replace(/^module:/, ''), edge.id);
    notify(result.valid ? '依赖已调整，仅保存在当前页面。' : result.message);
  }, []);
  const connectEnd: OnConnectEnd = useCallback((event, connection) => {
    if (connection.isValid || !store.isEditing() || connection.fromHandle?.type !== 'source') return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('.react-flow__pane') && connection.fromNode?.id.startsWith('module:')) {
      const pointer = 'changedTouches' in event ? event.changedTouches[0] : event;
      setDialog({ kind: 'add', afterId: connection.fromNode.id.slice(7), position: flow.screenToFlowPosition({ x: pointer.clientX, y: pointer.clientY }) });
    } else if (event.target.closest('.react-flow__node')) notify('此连线不允许。请连接模块依赖端口，并避免自依赖或循环。');
  }, [flow]);
  const onNodesChange = useCallback((changes: NodeChange<CanvasNode>[]) => {
    // Plan identities and provenance cannot be removed with canvas gestures.
    setNodes(current => applyNodeChanges(changes.filter(change => change.type !== 'remove'), current));
  }, []);
  const currentEdge = edges.find(edge => edge.id === selectedEdge);
  return <div className="flow-stage" data-plan-revision={fixture.plan.id}>
    <ReactFlow<CanvasNode, CanvasEdge> nodes={nodes} edges={edges} nodeTypes={nodeTypes} colorMode="dark"
      onNodesChange={onNodesChange} onNodeDragStop={(_, node) => store.setPosition(node.id, node.position)}
      onConnect={connect} isValidConnection={validConnection} onReconnect={reconnect} onConnectEnd={connectEnd}
      onReconnectStart={(_, edge) => { reconnectId.current = edge.id; }} onReconnectEnd={() => { reconnectId.current = undefined; }}
      onNodeClick={(_, node) => { setSelectedEdge(null); selected(node.data.selectKey); }}
      onEdgeClick={(_, edge) => { setSelectedEdge(edge.id); }} onPaneClick={() => setSelectedEdge(null)}
      onInit={() => { initialized.current = true; setTimeout(fit, 90); }}
      deleteKeyCode={null} minZoom={.15} maxZoom={1.8} fitView onlyRenderVisibleElements
      connectOnClick nodesFocusable edgesFocusable panOnScroll zoomOnScroll={false} zoomOnPinch panOnDrag
      connectionLineStyle={{ stroke: '#bea5ec', strokeWidth: 2 }} connectionRadius={28} snapToGrid snapGrid={[10,10]}
      ariaLabelConfig={{ 'controls.zoomIn.ariaLabel': '放大画布', 'controls.zoomOut.ariaLabel': '缩小画布', 'controls.fitView.ariaLabel': '适应全部节点', 'controls.interactive.ariaLabel': '切换画布交互' }}>
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#373342" />
      <Controls position="bottom-left" showInteractive={false} />
      <MiniMap position="bottom-right" pannable zoomable nodeColor={node => node.type === 'module' ? '#7b6598' : '#484451'} maskColor="rgba(14,14,21,.72)" ariaLabel="项目关系缩略图" />
      <Panel position="top-left" className="flow-legend"><span><i className="legend-dependency" />模块依赖 <b>可编辑</b></span><span><i className="legend-method" />方法引用 <b>只读</b></span><span><i className="legend-provenance" />产物来源 <b>只读</b></span></Panel>
      <Panel position="top-right" className="flow-view-tools">{state.focusId && <span>聚焦 {visibleModules(state).length} / {state.modules.length}</span>}<button className="nodrag nopan" onClick={() => { store.clearLayout(); fit(); }}>整理布局</button><button className="nodrag nopan" onClick={() => { store.expand(null); store.focus(null); fit(); }}>全部 {state.modules.length} 模块</button></Panel>
      <Panel position="bottom-center" className="flow-hint">拖动节点 / 空白处平移 <span>·</span> 双指缩放 <span>·</span> 点选端口也能连接</Panel>
      {currentEdge && <Panel position="bottom-center" className="flow-edge-popover"><span>{currentEdge.data?.title} <small>{currentEdge.data?.readOnly ? '只读依据' : '演示草稿'}</small></span><button onClick={() => setDialog({ kind: 'edge', edge: currentEdge })}>查看关系</button>{!currentEdge.data?.readOnly && <button onClick={() => setDialog({ kind: 'connect', source: currentEdge.data?.sourceModuleId, target: currentEdge.data?.targetModuleId, edgeId: currentEdge.id })}>调整</button>}<button aria-label="取消选中关系" onClick={() => setSelectedEdge(null)}>×</button></Panel>}
    </ReactFlow>
  </div>;
}

function DialogHub() {
  const state = useGraph(), [dialog, updateDialog] = useState<DialogState>(null);
  setDialog = updateDialog;
  const ref = useRef<HTMLDialogElement>(null), [error, setError] = useState('');
  const [kind, setKind] = useState<'module' | 'note'>('module'), [title, setTitle] = useState(''), [domain, setDomain] = useState<Domain>('copy');
  const [source, setSource] = useState(''), [target, setTarget] = useState(''), [required, setRequired] = useState(true);
  useLayoutEffect(() => {
    if (!dialog) return;
    setError(''); setKind('module'); setTitle(''); setRequired(true);
    setSource(dialog.kind === 'add' ? dialog.afterId ?? '' : dialog.kind === 'connect' ? dialog.source ?? '' : '');
    setTarget(dialog.kind === 'connect' ? dialog.target ?? '' : '');
    ref.current?.showModal();
    return () => ref.current?.close();
  }, [dialog]);
  if (!dialog) return null;
  const close = () => updateDialog(null);
  const report = (result: Validation, message: string) => {
    if (!result.valid) { setError(result.message); return false; }
    close(); notify(message); return true;
  };
  const labelFor = (id?: string) => state.modules.find(module => module.id === id)?.definition.title ?? '固定节点';
  const options = state.modules.map(module => <option key={module.id} value={module.id}>{module.definition.title}{module.proposed ? ' · 演示新增' : ''}</option>);
  return <dialog ref={ref} className="flow-dialog" aria-labelledby="flow-dialog-title" onCancel={close} onClose={close}>
    <form onSubmit={event => {
      event.preventDefault();
      if (dialog.kind === 'connect') {
        report(store.connect(source, target, dialog.edgeId), '模块依赖已更新到演示草稿，正式计划未改变。');
      } else if (dialog.kind === 'add') {
        const result = store.add({ kind, title, domain, required, afterId: source || undefined, position: dialog.position });
        if (report(result, '节点已加入当前演示草稿，刷新可恢复。') && result.id) {
          if (result.key) selected('module:' + result.key);
          else notify('备注已加入画布，不参与模块依赖。');
        }
      }
    }}>
      <header><span>计划 v1 / 演示草稿 r{state.draftRevision}</span><button type="button" aria-label="关闭画布操作" onClick={close}>×</button></header>
      <h2 id="flow-dialog-title">{dialog.kind === 'add' ? '添加节点' : dialog.kind === 'connect' ? dialog.edgeId ? '调整模块依赖' : '连接模块' : dialog.edge.data?.title}</h2>
      {dialog.kind === 'edge' ? <>
        <div className="flow-relationship-summary"><span>{dialog.edge.data?.relation === 'dependency' ? `${labelFor(dialog.edge.data.sourceModuleId)} → ${labelFor(dialog.edge.data.targetModuleId)}` : dialog.edge.data?.title}</span><small>{dialog.edge.data?.readOnly ? '来自固定计划 / 方法 / 制作来源，只读关联。可以移动节点位置，不能重接或删除依据。' : '上游 → 下游。编辑只影响当前页面的演示草稿，固定版本继续保留。'}</small></div>
        <p className="flow-version-id">计划修订 {fixture.plan.id}</p>
      </> : <>
        {dialog.kind === 'add' && <><label>节点类型<select aria-label="节点类型" value={kind} onChange={event => { setKind(event.target.value as 'module' | 'note'); if (event.target.value === 'note') setSource(''); }}><option value="module">交付模块</option><option value="note">备注节点</option></select></label><label>名称<input aria-label="节点名称" autoFocus value={title} maxLength={80} placeholder={kind === 'module' ? '例如：系列配图' : '写下与这份计划有关的提醒'} onChange={event => setTitle(event.target.value)} required /></label>{kind === 'module' && <label>专业领域<select aria-label="专业领域" value={domain} onChange={event => setDomain(event.target.value as Domain)}>{Object.entries(domainLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}</>}
        {(dialog.kind === 'connect' || kind === 'module') && <label>{dialog.kind === 'add' ? '上游依赖（可选）' : '上游模块'}<select aria-label="上游模块" value={source} required={dialog.kind === 'connect'} onChange={event => setSource(event.target.value)}><option value="">{dialog.kind === 'add' ? '暂不连接上游' : '选择上游模块'}</option>{options}</select></label>}
        {dialog.kind === 'connect' && <><div className="flow-direction">↓ 下游使用上游输入</div><label>下游模块<select aria-label="下游模块" value={target} required onChange={event => setTarget(event.target.value)}><option value="">选择下游模块</option>{options}</select></label></>}
        {dialog.kind === 'add' && kind === 'module' && <label className="flow-checkbox"><input type="checkbox" checked={required} onChange={event => setRequired(event.target.checked)} />必需交付模块 <small>当前 {state.modules.length} / 40</small></label>}
        <p className="flow-dialog-note">只编辑当前演示草稿。方法引用与产物来源保持只读；不会保存到正式业务。</p>
      </>}
      {error && <p className="flow-form-error" role="alert">{error}</p>}
      <footer><button type="button" onClick={close}>返回画布</button>{dialog.kind !== 'edge' && <button className="primary" type="submit">{dialog.kind === 'add' ? '添加到画布' : '确认连接'}</button>}{dialog.kind === 'edge' && !dialog.edge.data?.readOnly && <button className="flow-remove" type="button" onClick={() => report(store.removeDependency(dialog.edge.id), '已移除当前演示草稿中的依赖。')}>移除此依赖</button>}</footer>
    </form>
  </dialog>;
}

let root: Root | null = null, host: HTMLElement | null = null;
const dialogHost = document.createElement('div'); dialogHost.id = 'flow-dialog-root'; document.body.append(dialogHost); createRoot(dialogHost).render(<DialogHub />);
function refreshSurface() { if (root) root.render(<ReactFlowProvider><FlowSurface key={scene} /></ReactFlowProvider>); }
const bridge = {
  store,
  mount(element: HTMLElement, callbacks: CanvasHandlers) {
    handlers = callbacks;
    if (host === element && root) return;
    this.unmount(); host = element; root = createRoot(element); refreshSurface();
  },
  unmount() { root?.unmount(); root = null; host = null; },
  setScene(next: string) { if (scene !== next) { scene = next; store.setEditing(next === 'work'); refreshSurface(); } else store.setEditing(next === 'work'); },
  select(key: string) { store.select(key); },
  reveal(key: string) {
    setTimeout(() => {
      if (!viewportApi) return;
      let id = key;
      if (key === 'plan') id = 'plan:' + fixture.plan.id;
      if (key.startsWith('module:')) {
        const module = store.getSnapshot().modules.find(module => module.moduleKey === key.slice(7));
        if (module) id = 'module:' + module.id;
      }
      const node = viewportApi.getInternalNode(id);
      if (node) void viewportApi.setCenter(node.internals.positionAbsolute.x + (node.measured.width ?? 260) / 2,
        node.internals.positionAbsolute.y + (node.measured.height ?? 120) / 2, { zoom: viewportApi.getZoom(), duration: 180 });
    }, 120);
  },
  openAdd(afterId?: string) { if (store.isEditing()) setDialog({ kind: 'add', afterId }); else notify('当前状态只读，请切换到“制作中”演示。'); },
  openConnect(source?: string) { if (store.isEditing()) setDialog({ kind: 'connect', source }); else notify('当前状态只读，请切换到“制作中”演示。'); },
  fit() { fitCanvas?.(); },
  focus(key: string) {
    const state = store.getSnapshot();
    let module = state.modules.find(module => 'module:' + module.moduleKey === key);
    const method = fixture.methods.find(method => 'method:' + method.id === key);
    if (method) module = state.modules.find(module => module.id === method.planModuleId);
    if (key.startsWith('output:')) module = state.modules.find(module => fixture.productions.some(record => record.planModuleId === module.id && record.outputs.some(output => 'output:' + output.id === key)));
    if (module) { store.focus(module.id); if (method || key.startsWith('output:')) store.expand(module.id); }
    else store.focus(null);
    setTimeout(() => fitCanvas?.(), 100);
  },
  exportDraft() {
    const bytes = JSON.stringify(store.exportDraft(), null, 2), url = URL.createObjectURL(new Blob([bytes], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'g1-design-draft-r' + store.getSnapshot().draftRevision + '.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  reset() { store.reset(); notify('已恢复原始设计示例，固定版本始终未改动。'); fitCanvas?.(); },
  versions: { react: reactVersion, reactDom: reactDomVersion, reactFlow: '12.12.0', license: 'MIT', pro: false },
  getViewport() { return viewportApi?.getViewport(); },
};
store.onDraftChange = () => document.dispatchEvent(new CustomEvent('g1:graph-change'));
window.g1Canvas = bridge;
