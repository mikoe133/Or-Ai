import { memo,useEffect,useMemo,useRef,useState } from 'react';
import { ReactFlow,ReactFlowProvider,Background,BackgroundVariant,Controls,MiniMap,Panel,Handle,Position,MarkerType,useReactFlow,applyNodeChanges,
  type Node,type NodeProps,type Edge,type NodeChange,type Connection,type OnConnectEnd,type OnReconnect } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ProjectWorkspaceData } from './project-api.js';
import { moduleSummary,projectDomains,projectPurposes,projectLayout,visibleProjectModules } from './project-model.js';
import type { ProjectPlanning } from './project-planning.js';

type Data={kind:'plan'|'module'|'method'|'output';title:string;subtitle:string;label:string;warning?:boolean;required?:boolean;moduleId?:string;methods?:number;outputs?:number;expanded?:boolean;expand?:()=>void;
  editable?:boolean;add?:()=>void;connect?:()=>void};
type CanvasNode=Node<Data>;
const ModuleNode=memo(function ModuleNode({data,selected}:NodeProps<CanvasNode>){
  return <article className={'pw-flow-module'+(selected?' is-selected':'')}>
    <Handle type="target" position={Position.Left} id="in" isConnectable={data.editable}/><Handle type="target" position={Position.Top} id="member" isConnectable={false} isConnectableStart={false} isConnectableEnd={false}/>
    <header><span className="pw-node-mark">▱</span><span>{data.subtitle}</span><small>{data.required?'必需':'可选'}</small></header>
    <h3>{data.title}</h3><p className={data.warning?'pw-warning':''}><i/>{data.label}</p>
    <footer><span>{data.methods} 方法 · {data.outputs} 产物</span><button type="button" className="nodrag nopan" aria-label={`${data.expanded?'收起':'展开'}${data.title}依据`}
      aria-expanded={data.expanded} onClick={e=>{e.stopPropagation();data.expand?.();}}>{data.expanded?'收起 −':'展开 ＋'}</button></footer>
    {data.editable&&<div className="pw-flow-module-tools nodrag nopan"><button disabled={!data.add} aria-label={`在${data.title}后添加节点`} onClick={e=>{e.stopPropagation();data.add?.();}}>＋ 后续节点</button>
      <button aria-label={`连接${data.title}的下游模块`} onClick={e=>{e.stopPropagation();data.connect?.();}}>连接 ↘</button></div>}
    <Handle type="source" position={Position.Right} id="out" isConnectable={data.editable}/><Handle type="source" position={Position.Bottom} id="method" isConnectable={false} isConnectableStart={false} isConnectableEnd={false}/>
  </article>;
});
const DetailNode=memo(function DetailNode({data,selected}:NodeProps<CanvasNode>){return <article className={'pw-flow-detail'+(selected?' is-selected':'')}>
  <Handle type="target" position={Position.Left} id="ref" isConnectable={false} isConnectableStart={false} isConnectableEnd={false}/><span>{data.kind==='method'?'⌘ 固定方法':data.kind==='plan'?'▱ 固定计划':'▤ 产物'}</span>
  <strong>{data.title}</strong><p>{data.subtitle}</p><small className={data.warning?'pw-warning':''}>{data.label}</small>
  <Handle type="source" position={Position.Right} id="source" isConnectable={false} isConnectableStart={false} isConnectableEnd={false}/>
</article>;});
const nodeTypes={module:ModuleNode,plan:DetailNode,method:DetailNode,output:DetailNode};
type Props={data:ProjectWorkspaceData;selected:string;select:(key:string)=>void;expanded:string|null;expand:(id:string|null)=>void;focus:string|null;search:string;editor:ProjectPlanning};
export function ProjectGraph(props:Props){return <ReactFlowProvider><Surface {...props}/></ReactFlowProvider>;}
function Surface({data,selected,select,expanded,expand,focus,search,editor}:Props){
  const flow=useReactFlow<CanvasNode>(),plan=data.plan!,visible=visibleProjectModules(plan.modules,focus,search),reconnecting=useRef<{source:string;target:string}|undefined>(undefined),
    editing=editor.active&&editor.canEdit&&!editor.conflict&&!editor.uncertain&&!editor.action.busy,
    canLayout=editor.canEdit&&!editor.conflict&&!editor.uncertain&&!editor.action.busy;
  const graph=useMemo(()=>{
    const layout=projectLayout(visible),nodes:CanvasNode[]=[],edges:Edge[]=[],ids=new Set(visible.map(m=>m.id)),planId='plan';
    nodes.push({id:planId,type:'plan',position:editor.positions.plan??{x:0,y:100},data:{kind:'plan',title:plan.plan.title,subtitle:`${editor.planDirty?'未保存规划 · 基于':'计划 '}r${plan.revision} · ${plan.modules.length} 个模块`,label:`设定 r${data.profile?.revision??'—'}`},style:{width:250},deletable:false});
    for(const module of visible){
      const summary=moduleSummary(data,module),nodeId='module:'+module.id;
      nodes.push({id:nodeId,type:'module',position:editor.positions['module:'+module.moduleKey]??layout[module.id]!,data:{kind:'module',title:module.definition.title,subtitle:projectDomains[module.definition.domain],label:module.id.startsWith('draft:')?'未保存模块':summary.label,
        warning:summary.warning,required:module.definition.required,moduleId:module.id,methods:summary.methods.length,outputs:summary.record?.outputs.length??0,expanded:expanded===module.id,expand:()=>expand(expanded===module.id?null:module.id),
        editable:editing,add:plan.modules.length<40?()=>editor.openAdd(module.moduleKey):undefined,connect:()=>editor.openConnect(module.moduleKey)},style:{width:260},deletable:false});
      edges.push({id:'member:'+module.id,source:planId,target:nodeId,sourceHandle:'source',targetHandle:'member',type:'smoothstep',style:{stroke:'#4f4a60',strokeDasharray:'3 6',strokeWidth:1},focusable:false,reconnectable:false,deletable:false});
      for(const key of module.definition.dependsOn){const source=plan.modules.find(m=>m.moduleKey===key);if(source&&ids.has(source.id))edges.push({id:'dependency:'+source.id+':'+module.id,
        source:'module:'+source.id,target:nodeId,sourceHandle:'out',targetHandle:'in',type:'smoothstep',ariaLabel:`${source.definition.title}是${module.definition.title}的输入依赖`,
        reconnectable:editing,markerEnd:{type:MarkerType.ArrowClosed,color:'#bea5ec'},style:{stroke:'#bea5ec',strokeWidth:1.6}});}
    }
    const module=visible.find(m=>m.id===expanded);
    if(module){const {methods,record}=moduleSummary(data,module),start=Math.max(300,...Object.values(layout).map(p=>p.x))+370,outputX=start+330;
      methods.forEach((method,i)=>{const id='method:'+method.id;nodes.push({id,type:'method',position:{x:start,y:70+i*145},style:{width:260},deletable:false,draggable:false,
        data:{kind:'method',title:projectPurposes[method.purpose]??method.purpose,subtitle:method.version.manifest.name+' · v'+method.version.number,
          label:record?.methods.some(m=>m.snapshotId===method.id)?'已用于此产物':'已固定 · 尚未用于此产物',moduleId:module.id}});
        edges.push({id:'method-ref:'+method.id,source:'module:'+module.id,target:id,sourceHandle:'method',targetHandle:'ref',type:'smoothstep',reconnectable:false,deletable:false,style:{stroke:'#8f9daf',strokeDasharray:'2 4'}});});
      record?.outputs.slice(0,8).forEach((output,i)=>{const id='output:'+output.id;nodes.push({id,type:'output',position:{x:outputX,y:70+i*145},style:{width:260},deletable:false,draggable:false,
        data:{kind:'output',title:module.definition.outputs.find(o=>o.outputKey===output.outputKey)?.label??output.outputKey,
          subtitle:output.file?output.file.fileName:output.purpose==='authoring'?'体验制作清单':'结构化内容',
          label:output.purpose==='authoring'?'制作清单 · 另需原件':output.purpose==='preview'?'预览文件':'已保存原件记录',warning:output.purpose!=='original',moduleId:module.id}});
        for(const method of methods.filter(m=>record.methods.some(s=>s.snapshotId===m.id)))edges.push({id:'provenance:'+method.id+':'+output.id,source:'method:'+method.id,target:id,
          sourceHandle:'source',targetHandle:'ref',type:'smoothstep',reconnectable:false,deletable:false,style:{stroke:'#a5b5ac',strokeDasharray:'7 4',strokeWidth:1.2}});
      });
    }
    return {nodes,edges};
  },[data,selected,expanded,focus,search,editor.positions,editing,editor.planDirty]);
  const [nodes,setNodes]=useState<CanvasNode[]>(graph.nodes);
  useEffect(()=>{setNodes(graph.nodes.map(n=>({...n,selected:n.id===selected,ariaLabel:n.data.title+'，'+n.data.label})));},[graph,selected]);
  useEffect(()=>{const t=setTimeout(()=>void flow.fitView({padding:.14,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:150,minZoom:.025,maxZoom:1}),100);return()=>clearTimeout(t);},[expanded,focus,search,plan.id,visible.length]);
  const change=(changes:NodeChange<CanvasNode>[])=>setNodes(current=>applyNodeChanges(changes,current));
  const moduleKey=(node:string)=>plan.modules.find(m=>'module:'+m.id===node)?.moduleKey;
  const previous=(edge:Edge)=>{const source=moduleKey(edge.source),target=moduleKey(edge.target);return edge.id.startsWith('dependency:')&&source&&target?{source,target}:undefined;};
  const valid=(connection:Connection|Edge)=>{const source=moduleKey(connection.source),target=moduleKey(connection.target);
    return connection.sourceHandle==='out'&&connection.targetHandle==='in'&&!!source&&!!target&&editor.valid(source,target,reconnecting.current);};
  const connect=(connection:Connection)=>{const source=moduleKey(connection.source),target=moduleKey(connection.target);if(source&&target)editor.connect(source,target);};
  const reconnect:OnReconnect=(edge,connection)=>{const source=moduleKey(connection.source),target=moduleKey(connection.target),old=previous(edge);if(source&&target&&old)editor.connect(source,target,old);};
  const connectEnd:OnConnectEnd=(event,state)=>{
    if(state.isValid||!editing||state.fromHandle?.id!=='out'||reconnecting.current)return;
    const source=state.fromNode?moduleKey(state.fromNode.id):undefined;if(!source)return;
    if(event.target instanceof Element&&event.target.closest('.react-flow__pane')){
      const point='changedTouches' in event?event.changedTouches[0]:event;if(point)editor.openAdd(source,flow.screenToFlowPosition({x:point.clientX,y:point.clientY}));
    }else editor.setNotice('此依赖不允许，请连接当前模块端口并避免自依赖或循环。');
  };
  return <div className="pw-flow" aria-label="项目关系画布">
    <ReactFlow<CanvasNode> nodes={nodes} edges={graph.edges} nodeTypes={nodeTypes} onNodesChange={change} onNodeClick={(_e,n)=>select(n.id)}
      onNodeDragStop={(_e,n)=>{const key=n.id==='plan'?'plan':moduleKey(n.id);if(key)editor.move(n.id==='plan'?'plan':'module:'+key,n.position);}}
      nodesDraggable={canLayout} nodesConnectable={editing} edgesReconnectable={editing} deleteKeyCode={null}
      onConnect={connect} isValidConnection={valid} onConnectEnd={connectEnd} onReconnect={reconnect}
      onReconnectStart={(_event,edge)=>{reconnecting.current=previous(edge);}} onReconnectEnd={()=>{reconnecting.current=undefined;}}
      onEdgeClick={(_event,edge)=>{const old=previous(edge);if(editing&&old)editor.openConnect(old.source,old.target,old);else editor.reference(old?'固定计划依赖':edge.id.startsWith('member:')?'计划归属':edge.id.startsWith('provenance:')?'产物来源':'固定方法引用');}}
      connectOnClick connectionRadius={28}
      onInit={()=>void flow.fitView({padding:.14,minZoom:.025,maxZoom:1})} minZoom={.025} maxZoom={1.8} colorMode="dark"
      aria-label="固定计划、依赖、方法与产物关系" onlyRenderVisibleElements>
      <Background variant={BackgroundVariant.Dots} color="#393342" gap={22} size={1}/><Controls showInteractive={false}/>
      <MiniMap pannable zoomable nodeColor={n=>n.type==='module'?'#827096':'#494554'} maskColor="#10101899"/>
      <Panel position="top-left" className="pw-legend"><span><i/>模块依赖{editing?' · 可编辑':''}</span><span><i className="pw-method-line"/>固定方法 · 只读</span><span><i className="pw-output-line"/>产物来源 · 只读</span></Panel>
      {canLayout&&<Panel position="top-right"><button className="nodrag nopan" onClick={()=>{editor.arrange();void flow.fitView({padding:.14,minZoom:.025,maxZoom:1});}}>整理布局</button></Panel>}
      <Panel position="bottom-center" className="pw-canvas-hint">拖动布局 · 滚轮缩放 · 双击放大</Panel>
    </ReactFlow>
  </div>;
}
