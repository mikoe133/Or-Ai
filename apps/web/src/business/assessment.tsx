import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { consumer } from "../api/consumer.js";
import { Page, Loading, Failure, Demo, useAction } from "./shared.js";
import { downloadSummary } from "./download.js";
import { ExperienceHost, ChoiceScene } from "../experience/host.js";
import { ReportHost } from "../experience/report-host.js";
import { confirmedCheckpoint } from "../experience/model.js";
type Questions = Awaited<ReturnType<typeof consumer.questions>>;
type Feedback = Awaited<ReturnType<typeof consumer.feedback>>;

function Statistics({ value }: { value: Feedback }) {
  return (
    <section className="biz-card consumer-statistics">
      <h3>其他参与者的反馈</h3>
      {[value.answers, value.results].map((distribution) => (
        <div key={distribution.denominator}>
          <p>
            {distribution.denominator === "other_valid_answers"
              ? "其他有效回答"
              : "其他有效完成答卷"}
            ：{distribution.sampleSize} 份
          </p>
          {distribution.state === "empty" ? (
            <p>暂时没有其他样本。</p>
          ) : distribution.state === "insufficient" ? (
            <p>
              样本不足，达到 {distribution.minimumSampleSize} 份后展示分布。
            </p>
          ) : (
            distribution.items.map((item) => (
              <div key={item.id} className="consumer-statistic-row"><p>
                {item.label}：{item.percentage.toFixed(1)}%（{item.count} 份）
              </p><div className="consumer-statistic-track" aria-hidden="true"><span style={{width: `${item.percentage}%`}} /></div></div>
            ))
          )}
        </div>
      ))}
      <small>回答与结论使用各自的分母，并排除自己的数据。</small>
    </section>
  );
}
function QuestionsBody({ value, id }: { value: Questions; id: string }) {
  const [params, setParams] = useSearchParams(),
    client = useQueryClient(),
    navigate = useNavigate(),
    action = useAction();
  const firstMissing = value.questions.findIndex(
    (question) =>
      !value.answers.some((answer) => answer.questionId === question.id),
  );
  const requested = value.questions.findIndex(
    (question) => question.id === params.get("question"),
  );
  const current =
      requested >= 0 ? requested : firstMissing >= 0 ? firstMissing : 0,
    question = value.questions[current]!;
  const saved = value.answers.find(
      (answer) => answer.questionId === question.id,
    ),
    [choice, setChoice] = useState(saved?.optionId ?? "");
  useEffect(() => {
    if (!params.has("question"))
      setParams({ question: question.id }, { replace: true });
  }, [params, question.id, setParams]);
  const dirty = choice !== (saved?.optionId ?? ""),
    complete = value.status === "completed";
  const feedbackKey = ["private", "feedback", id, question.id, value.revision];
  const feedback = useQuery<Feedback | null>({
    queryKey: feedbackKey,
    queryFn: ({ signal }) => consumer.feedback(id, question.id, signal),
    enabled: Boolean(saved),
    staleTime: Infinity,
  });
  async function save() {
    await action.run(
      () =>
        consumer.save(
          id,
          question.id,
          action.intent("save:" + question.id, {
            optionId: choice,
            expectedRevision: value.revision,
          }),
        ),
      (response) => {
        client.setQueryData<Feedback | null>(
          ["private", "feedback", id, question.id, response.attemptRevision],
          response.feedback,
        );
        client.setQueryData<Questions>(["private", "attempt", id], (old) => {
          if (!old) return old;
          const answers = [
            ...old.answers.filter(answer => answer.questionId !== question.id), response.answer,
          ];
          return {
                ...old,
                revision: response.attemptRevision,
                experience: old.experience ? { ...old.experience, checkpoint: response.checkpoint ??
                  confirmedCheckpoint(old.questions, answers, response.attemptRevision, question.id) } : undefined,
                answers,
              };
        });
      },
    );
  }
  return (
    <>
      <Demo show={value.isDemo} />
      <p>
        版本 {value.versionNumber} · 已保存 {value.answers.length}/
        {value.questions.length} 题
      </p>
      <progress
        aria-label="已保存进度"
        max={value.questions.length}
        value={value.answers.length}
      />
      {complete && <p role="status">测试已完成，请从我的报告查看结果。</p>}
      <div className="consumer-assessment-grid"><section className="consumer-question-panel" aria-label="当前题目">
      <ChoiceScene question={question} current={current} total={value.questions.length} choice={choice}
        disabled={action.busy || complete} dirty={dirty} busy={action.busy} onSelect={setChoice} onConfirm={() => void save()} />
      <p role="status">
        {dirty
          ? "当前选择尚未保存，未计入进度。"
          : saved
            ? "答案已保存。"
            : "请选择符合自己的选项。"}
      </p>
      {Boolean(action.error) && (
        <Failure
          error={action.error}
          retry={() =>
            void client.invalidateQueries({
              queryKey: ["private", "attempt", id],
            })
          }
        />
      )}
      </section><aside className="consumer-feedback-panel" aria-label="群体反馈">
      {saved &&
        (feedback.isPending ? (
          <p role="status">正在读取反馈，答案已保存。</p>
        ) : feedback.isError || feedback.data === null ? (
          <div className="biz-card">
            <p>统计暂不可用，答案已保存，可以继续作答。</p>
            <button
              disabled={feedback.isFetching}
              onClick={() => void feedback.refetch()}
            >
              重试统计
            </button>
          </div>
        ) : (
          feedback.data && <Statistics value={feedback.data} />
        ))}
      {!saved && <section className="biz-card consumer-feedback-empty"><h2>其他人怎么想</h2><p>先按自己的感受作答。保存当前题后，再看看其他参与者的回答。</p><small>统计会排除本次答卷。</small></section>}
      </aside></div>
      <div className="biz-row">
        <button
          disabled={action.busy || current === 0}
          onClick={() =>
            setParams({ question: value.questions[current - 1]!.id })
          }
        >
          上一题
        </button>
        {current < value.questions.length - 1 && (
          <button
            disabled={action.busy || !saved || dirty}
            onClick={() =>
              setParams({ question: value.questions[current + 1]!.id })
            }
          >
            下一题
          </button>
        )}
        {firstMissing >= 0 && (
          <button
            disabled={action.busy}
            onClick={() =>
              setParams({ question: value.questions[firstMissing]!.id })
            }
          >
            前往未完成题目
          </button>
        )}
      </div>
      <p>
        全部答案保存后，可生成一份报告。生成成功才消耗一次报告机会；报告仅供娱乐与自我观察。
      </p>
      <button
        disabled={action.busy || firstMissing >= 0 || dirty || complete}
        onClick={() =>
          void action.run(
            () =>
              consumer.submit(
                id,
                action.intent("submit", { expectedRevision: value.revision }),
              ),
            (report) => {
              client.setQueryData(["private", "report", report.id], report);
              void client.invalidateQueries({
                queryKey: ["private", "entitlements"],
              });
              navigate("/reports/" + report.id);
            },
          )
        }
      >
        生成报告
      </button>
      <Link to="/apps">返回我的应用</Link>
    </>
  );
}
export function AssessmentPage() {
  const { id = "" } = useParams(),
    [params] = useSearchParams();
  const result = useQuery({
    queryKey: ["private", "attempt", id],
    queryFn: ({ signal }) => consumer.questions(id, signal),
  });
  return (
    <Page title="探索自己" section="apps" view="assessment">
      {result.isPending ? (
        <Loading />
      ) : result.isError ? (
        <Failure error={result.error} retry={() => void result.refetch()} />
      ) : (
        <ExperienceHost key={id + ':' + (result.data.experience?.release.id ?? 'legacy')} attemptId={id} release={result.data.experience?.release}>
        <QuestionsBody
          key={
            id +
            ":" +
            (params.get("question") ?? "initial") +
            ":" +
            result.data.revision
          }
          id={id}
          value={result.data}
        />
        </ExperienceHost>
      )}
    </Page>
  );
}
export function ReportPage() {
  const { id = "" } = useParams(),
    [params] = useSearchParams(),
    client = useQueryClient(),
    navigate = useNavigate(),
    action = useAction(),
    [confirmed, setConfirmed] = useState(false);
  const result = useQuery({
      queryKey: ["private", "report", id],
      queryFn: ({ signal }) => consumer.report(id, signal),
    }),
    content = result.data?.content;
  return (
    <Page title={content?.productName ?? "我的报告"} section="reports" view="report">
      {result.isPending ? (
        <Loading />
      ) : result.isError ? (
        <Failure error={result.error} retry={() => void result.refetch()} />
      ) : (
        content && (
          <>
            <Demo show={content.isDemo} />
            <p>
              版本 {content.versionNumber} · 访问截至{" "}
              {new Date(result.data!.expiresAt).toLocaleString("zh-CN")}
            </p>
            <ReportHost content={content} presentation={result.data?.presentation} enhanced />
            <button
              disabled={action.busy}
              onClick={() => void action.run(() => downloadSummary(content))}
            >
              导出摘要卡
            </button>
            <p className="biz-note">
              摘要卡包含商品标题、结论、分数与声明，可先保存检查后再分享。
            </p>
            <details>
              <summary>删除这份报告</summary>
              <p>删除后无法恢复，也不会退还报告次数。</p>
              <label className="biz-option">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                我确认永久删除这份报告
              </label>
              <button
                disabled={!confirmed || action.busy}
                onClick={() =>
                  void action.run(
                    () =>
                      consumer.deleteReport(
                        id,
                        action.intent("delete:" + id, {}),
                      ),
                    async () => {
                      await client.cancelQueries({
                        queryKey: ["private", "report", id],
                      });
                      client.removeQueries({
                        queryKey: ["private", "report", id],
                      });
                      void client.invalidateQueries({ queryKey: ["private"] });
                      navigate(
                        "/reports?source=" +
                          (params.get("source") === "account"
                            ? "account"
                            : "anonymous"),
                        { replace: true },
                      );
                    },
                  )
                }
              >
                永久删除报告
              </button>
            </details>
            {Boolean(action.error) && <Failure error={action.error} />}
          </>
        )
      )}
      <Link
        to={
          "/reports?source=" +
          (params.get("source") === "account" ? "account" : "anonymous")
        }
      >
        返回报告列表
      </Link>
    </Page>
  );
}
