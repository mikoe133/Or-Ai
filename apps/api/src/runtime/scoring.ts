import { ReportContentSchema } from '@orai/contracts';
import { ProductConfigurationSchema, type ProductConfiguration } from '@orai/contracts/admin';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';

interface Fraction { numerator: bigint; denominator: bigint }
const gcd = (a: bigint, b: bigint): bigint => b === 0n ? a : gcd(b, a % b);
function fraction(numerator: bigint, denominator = 1n): Fraction {
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}
const add = (a: Fraction, b: Fraction) => fraction(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
const multiply = (value: Fraction, weight: number) => fraction(value.numerator * BigInt(weight), value.denominator);
const divide = (value: Fraction, weight: number) => fraction(value.numerator, value.denominator * BigInt(weight));
function decimal(value: number): Fraction {
  const [coefficient, exponent = '0'] = value.toString().split('e');
  const [whole, digits = ''] = coefficient!.split('.');
  const numerator = BigInt(whole! + digits), scale = digits.length - Number(exponent);
  return scale >= 0 ? fraction(numerator, 10n ** BigInt(scale)) : fraction(numerator * 10n ** BigInt(-scale));
}
const compare = (a: Fraction, b: Fraction) => a.numerator * b.denominator - b.numerator * a.denominator;
const display = (value: Fraction) => Number((value.numerator * 200n + value.denominator) / (2n * value.denominator)) / 100;

export function scoreAnswers(input: ProductConfiguration, answers: readonly { questionId: string; optionId: string }[],
  metadata: { productName: string; versionNumber: number; isDemo: boolean }) {
  const configuration = parseInput(ProductConfigurationSchema, input, 'INVALID_CONFIGURATION');
  const questions = new Map(configuration.questions.map(question => [question.id, question]));
  const choices = new Map<string, string>();
  for (const answer of answers) {
    const question = questions.get(answer.questionId);
    if (!question || choices.has(answer.questionId) || !question.options.some(option => option.id === answer.optionId)) {
      throw new ApiException('VALIDATION_ERROR', '回答与当前版本题目不一致', 400);
    }
    choices.set(answer.questionId, answer.optionId);
  }
  if (choices.size !== questions.size) throw new ApiException('ANSWERS_INCOMPLETE', '请先完成全部题目', 400);
  let total = fraction(0n), dimensionWeights = 0, missing = false;
  const dimensions = configuration.dimensions.map(dimension => {
    let weighted = fraction(0n), weights = 0, applicableAnswers = 0;
    for (const question of configuration.questions.filter(value => value.dimensionId === dimension.id)) {
      const option = question.options.find(value => value.id === choices.get(question.id))!;
      if (option.notApplicable) continue;
      const points = question.options.flatMap(value => value.points === null ? [] : [value.points]);
      const minimum = Math.min(...points), maximum = Math.max(...points);
      const normalized = fraction(BigInt(option.points! - minimum) * 100n, BigInt(maximum - minimum));
      weighted = add(weighted, multiply(normalized, question.weight)); weights += question.weight; applicableAnswers++;
    }
    const insufficient = applicableAnswers < dimension.minApplicableAnswers;
    if (insufficient) missing = true;
    const score = insufficient ? null : divide(weighted, weights);
    if (score) { total = add(total, multiply(score, dimension.weight)); dimensionWeights += dimension.weight; }
    return { id: dimension.id, label: dimension.label, score: score ? display(score) : null, applicableAnswers,
      requiredAnswers: dimension.minApplicableAnswers, missingReason: insufficient ? dimension.missingReason : null };
  });
  const overall = missing ? null : divide(total, dimensionWeights);
  const band = overall ? configuration.bands.find(value => compare(overall, decimal(value.min)) >= 0n &&
    (compare(overall, decimal(value.max)) < 0n || value.max === 100 && compare(overall, decimal(100)) === 0n))! : undefined;
  const result = band ? configuration.resultTypes.find(value => value.id === band.resultTypeId)! : configuration.report.insufficient;
  const template = band ? configuration.report.templates.find(value => value.resultTypeId === band.resultTypeId)! : configuration.report.insufficient;
  return ReportContentSchema.parse({ schemaVersion: 1, ...metadata, resultTypeId: result.id, resultLabel: result.label,
    totalScore: overall ? display(overall) : null, dimensions, explanation: template.explanation,
    suggestion: template.suggestion, disclaimer: configuration.report.disclaimer });
}
