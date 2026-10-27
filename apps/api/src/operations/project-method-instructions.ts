export function expandInstructions(base: string, customization: { parameters: Record<string, string | number | boolean>; instructions: string }) {
  const parameters = Object.fromEntries(Object.entries(customization.parameters).sort(([a], [b]) => a.localeCompare(b)));
  return [base, Object.keys(parameters).length ? '\n商品参数（JSON 数据）\n' + JSON.stringify(parameters, null, 2) : '',
    customization.instructions ? '\n本商品补充方法\n' + customization.instructions : ''].filter(Boolean).join('\n');
}
