export type Domain = 'assessment' | 'cover' | 'copy' | 'experience' | 'video';
export interface PlanModule {
  id: string;
  moduleId: string;
  moduleKey: string;
  digest: string;
  planRevisionId?: string;
  proposed?: boolean;
  definition: {
    moduleKey: string; title: string; domain: Domain; required: boolean; purpose: string;
    dependsOn: string[]; methodPurposes: string[]; target: { form: string; runtime: unknown };
    outputs: { outputKey: string; label: string; kind: string; required: boolean }[];
  };
}
export interface Method {
  id: string; planModuleId: string; purpose: string; sourceRevision: number; digest: string;
  version: { number: number; manifest: { name: string; instructions: string } };
}
export interface Output {
  id: string; outputKey: string; purpose: string; file: null | { fileName: string; byteSize: number; checksum: string };
}
export interface Fixture {
  product: { id: string; name: string };
  plan: { id: string; revision: number; digest: string; modules: PlanModule[] };
  methods: Method[];
  productions: { id: string; planModuleId: string; outputs: Output[]; methods: { snapshotId: string }[] }[];
  inspection: { modules: { moduleKey: string; originals: string }[] };
}
export interface Dependency {
  id: string; source: string; target: string; planRevisionId: string; relation: 'dependency';
}
export interface NoteNode { id: string; title: string; position: { x: number; y: number }; planRevisionId: string }
export interface GraphState {
  modules: PlanModule[]; dependencies: Dependency[]; notes: NoteNode[];
  draftRevision: number; expandedId: string | null; focusId: string | null;
  positions: Record<string, { x: number; y: number }>; selectedKey: string;
}
export type Validation = { valid: true } | { valid: false; code: string; message: string };
export interface CanvasHandlers { onSelect(key: string): void; onNotify(message: string): void }
