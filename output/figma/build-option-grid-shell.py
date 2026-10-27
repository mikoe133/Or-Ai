from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
greeting = '''<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="108" viewBox="0 0 1440 108">
<defs><linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#11131B"/><stop offset=".65" stop-color="#11121A"/><stop offset="1" stop-color="#242131"/></linearGradient><linearGradient id="capsule" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2B2D38"/><stop offset="1" stop-color="#232631"/></linearGradient></defs>
<rect id="问候栏布局边界" width="1440" height="108" fill="#FFFFFF" fill-opacity=".001"/>
<path id="问候栏暗色表面" d="M1440 0H44C20 0 0 24 0 54S24 108 54 108H1440Z" fill="url(#bar)"/>
<path id="导航下沿与问候栏曲线" d="M1440 .75H44C20 .75 .75 24 .75 54S24 107.25 54 107.25H1340" fill="none" stroke="#A7A4B8" stroke-opacity=".35" stroke-width="1.25"/>
<g id="探索者问候胶囊" transform="translate(24 31)">
<rect id="问候胶囊玻璃" width="192" height="48" rx="24" fill="url(#capsule)" stroke="#444450" stroke-opacity=".3"/>
<g id="探索者头像" transform="translate(12 9)"><circle cx="15" cy="15" r="15" fill="#D8AFE9"/><g transform="translate(5 4) scale(.83)" fill="none" stroke="#392447" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></g></g>
<text id="问候标题" x="53" y="20" font-family="Noto Sans SC" font-size="14" font-weight="600" fill="#F7F3FB">你好，探索者</text>
<text id="问候副标题" x="53" y="37" font-family="Noto Sans SC" font-size="11" fill="#A8A3B4">今天，也多了解自己一点</text>
</g></svg>'''
(ROOT / 'option-grid-greeting.svg').write_text(greeting)

atmosphere = (ROOT / 'guided-redemption-atmosphere.svg').read_text()
atmosphere = atmosphere.replace('x="73.2" y="73.2" width="244" height="905"', 'x="73.2" y="181.2" width="244" height="797"')
atmosphere = re.sub(r'<g id="玻璃面板双描边".*?</g>', '', atmosphere, flags=re.S)
atmosphere = atmosphere.replace('<defs>', '<rect id="背景布局边界" width="1440" height="1024" fill="#FFFFFF" fill-opacity=".001"/><defs>')
# Replace the native panel's solid fill with the same material below content.
# Fade the final 14px of the surface so it cannot imply a full-height outer line.
atmosphere = atmosphere.replace('</defs>', '''<linearGradient id="panel-right-fade" x1="0" y1="0" x2="1" y2="0">
<stop stop-color="#191B24" stop-opacity=".88"/>
<stop offset=".98919753" stop-color="#191B24" stop-opacity=".88"/>
<stop offset="1" stop-color="#191B24" stop-opacity="0"/>
</linearGradient></defs>''')
atmosphere = atmosphere.replace('</svg>', '<rect id="面板底色 · 右缘透明过渡" x="72" y="180" width="1296" height="799.4" rx="28" fill="url(#panel-right-fade)"/></svg>')
(ROOT / 'option-grid-atmosphere.svg').write_text(atmosphere)

contours = (ROOT / 'adopted-tinted-double-contours.svg').read_text()
contours = contours.replace('fill-opacity="0"', 'fill-opacity=".001"')
contours = contours.replace('stop-opacity=".88"', 'stop-opacity="1"').replace('stop-opacity=".8"', 'stop-opacity=".95"').replace('stop-opacity=".64"', 'stop-opacity=".9"')
contours = contours.replace('stroke-width="5" stroke-opacity=".15"', 'stroke-width="7" stroke-opacity=".2"').replace('stroke-width="5" stroke-opacity=".13"', 'stroke-width="7" stroke-opacity=".2"')
# The right outer rim occupies only the lower 45% of the workspace.
# Its line, wide reflection and glass band all fade to zero at y620.
contours = re.sub(r'<linearGradient id="outer-right".*?</linearGradient>', '''<linearGradient id="outer-right" gradientUnits="userSpaceOnUse" x1="0" y1="620" x2="0" y2="980">
      <stop stop-color="#CBD8EC" stop-opacity="0"/>
      <stop offset=".15" stop-color="#CBD8EC" stop-opacity=".025"/>
      <stop offset=".4" stop-color="#D6E2EF" stop-opacity=".14"/>
      <stop offset=".68" stop-color="#E2E6F5" stop-opacity=".46"/>
      <stop offset=".9" stop-color="#ECE3F3" stop-opacity=".8"/>
      <stop offset="1" stop-color="#EFE1F2" stop-opacity="1"/>
    </linearGradient>''', contours, flags=re.S)
contours = re.sub(r'<linearGradient id="right-band".*?</linearGradient>', '''<linearGradient id="right-band" gradientUnits="userSpaceOnUse" x1="0" y1="620" x2="0" y2="944">
      <stop stop-color="#D4C5E4" stop-opacity="0"/>
      <stop offset=".25" stop-color="#D4C5E4" stop-opacity=".018"/>
      <stop offset=".6" stop-color="#D4C5E4" stop-opacity=".11"/>
      <stop offset="1" stop-color="#D4C5E4" stop-opacity=".4"/>
    </linearGradient>''', contours, flags=re.S)
contours = contours.replace('x="1354" y="380" width="14" height="564"', 'x="1354" y="620" width="14" height="324"')
contours = contours.replace('M1368 380V952Q1368 980 1340 980', 'M1368 620V952Q1368 980 1340 980')
contours = contours.replace('<g id="Outer-open-contour" fill="none">', '''<g id="Outer-open-contour" fill="none">
    <path id="面板顶沿与右侧圆角" d="M94 180H1332Q1354 180 1354 202" stroke="#C0B8D0" stroke-opacity=".3" stroke-width="1.2"/>
    <g id="外侧玻璃边柔光" stroke-width="15" stroke-opacity=".045">
      <path id="左侧外沿柔光" d="M78 208Q72 226 72 244V952Q72 980 100 980" stroke="url(#outer-left)"/>
      <path id="底部外沿柔光" d="M100 980H1340" stroke="url(#bottom-tint)"/>
      <path id="右侧外沿柔光 · 下半部渐隐" d="M1368 620V952Q1368 980 1340 980" stroke="url(#outer-right)"/>
    </g>
    <path id="内側玻璃边反光" d="M94 212Q86 228 86 250V944Q86 966 108 966H1332Q1354 966 1354 944V202" stroke="url(#inner-left)" stroke-width="5" stroke-opacity=".17"/>''')
(ROOT / 'option-grid-double-contours.svg').write_text(contours)
print('Created greeting, atmosphere and editable double-contour SVG layers.')
