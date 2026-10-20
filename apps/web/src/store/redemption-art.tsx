const redeemSource = '/assets/redemption/guided-redemption-content.svg';
const successSource = '/assets/redemption/guided-redemption-success-content.svg';

// External fragments reference the original vector groups without changing the source assets.
export function RedemptionArt({ kind }: { kind: 'ticket' | 'medal' | 'orb' }) {
  const art = {
    ticket: { source: redeemSource, id: '可编辑玻璃兑换券', width: 347, height: 280, viewBox: '0 76 347 280' },
    medal: { source: successSource, id: '可编辑玻璃成功徽章', width: 136, height: 136, viewBox: '28 31 136 136' },
    orb: { source: successSource, id: '可编辑玻璃悬浮球与底座', width: 347, height: 282, viewBox: '0 256 347 282' },
  }[kind];
  return <svg className={`redemption-art redemption-art-${kind}`} width={art.width} height={art.height} viewBox={art.viewBox} aria-hidden="true"><use href={`${art.source}#${encodeURIComponent(art.id)}`} /></svg>;
}

export function RedemptionIcon({ kind, size = 24 }: { kind: 'info' | 'clipboard' | 'check' | 'chart' | 'step-check'; size?: number }) {
  const icon = {
    info: { source: redeemSource, id: '提示图标', viewBox: '32 509 24 24' },
    clipboard: { source: redeemSource, id: '粘贴图标', viewBox: '528 279 23 23' },
    check: { source: successSource, id: '状态图标', viewBox: '513 229 18 18' },
    chart: { source: redeemSource, id: '信息标签 · 5 个维度', viewBox: '473 112 19 19' },
    'step-check': { source: successSource, id: '已完成勾号', viewBox: '9 13 26 26' },
  }[kind];
  return <svg className="redemption-icon" width={size} height={size} viewBox={icon.viewBox} aria-hidden="true"><use href={`${icon.source}#${encodeURIComponent(icon.id)}`} /></svg>;
}

export function RedemptionTipIcon({ success, index }: { success: boolean; index: number }) {
  const tip = (success ? [
    { label: '按第一反应作答', y: 78 }, { label: '约 3 分钟完成', y: 135 }, { label: '完成后查看报告', y: 192 },
  ] : [
    { label: '在购买平台完成购买', y: 379 }, { label: '在订单中查看兑换码', y: 437 }, { label: '复制后粘贴到这里', y: 495 },
  ])[index];
  if (!tip) return null;
  return <svg className="redemption-tip-art" width="44" height="44" viewBox={`27 ${tip.y} 44 44`} aria-hidden="true"><use href={`${success ? successSource : redeemSource}#${encodeURIComponent('提示 · ' + tip.label)}`} /></svg>;
}
