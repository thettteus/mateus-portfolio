import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Stop Using the Best Model for Everything — Mateus P. S.',
  description:
    'An AI workflow is not only the model. It also has validation, retries, budgets, permissions, tools, and real consequences when something goes wrong. On designing an AI stack around cost, risk, and complexity.',
  alternates: {
    canonical: 'https://mateusps.vercel.app/writing/stop-using-the-best-model-for-everything',
  },
  openGraph: {
    title:
      'Stop using the best model for everything: designing an AI stack around cost, risk, and complexity',
    description:
      'The strongest model has plenty of work to do. It just should not be responsible for everything.',
    url: 'https://mateusps.vercel.app/writing/stop-using-the-best-model-for-everything',
    type: 'article',
    authors: ['Mateus Pereira da Silva'],
  },
};

const COST_FORMULA = `effective cost =
  inference
  + retries
  + validation
  + escalation
  + operational overhead
  + human intervention
  ---------------------------------
  successfully completed tasks`;

const PROFILE_EXTRACTION = `TaskProfile(
    kind="purchase_order_extraction",
    risk="medium",
    capabilities={"structured_output"},
    context_size="small",
    validation="schema_and_reference_check",
)`;

const PROFILE_REPO_CHANGE = `TaskProfile(
    kind="repository_change",
    risk="high",
    capabilities={"code", "tool_use", "long_context"},
    context_size="large",
    validation="tests_and_diff_review",
)`;

const ROUTER = `def execute(task, payload):
    profile = task_classifier.profile(task, payload)

    if deterministic_registry.can_handle(profile):
        return deterministic_registry.execute(profile, payload)

    policy = policy_store.get(profile.kind, profile.risk)

    candidates = model_registry.match(
        capabilities=profile.capabilities,
        context_tokens=profile.context_tokens,
    )

    candidates = router.rank(
        candidates,
        profile=profile,
        policy=policy,
        historical_results=metrics.history(profile.kind),
    )

    for attempt, model in enumerate(candidates, start=1):
        if attempt > policy.max_attempts:
            break

        if budget.would_exceed(policy.max_cost_usd):
            break

        result = inference.run(
            model=model,
            payload=payload,
            timeout_ms=policy.max_latency_ms,
        )

        evaluation = evaluator.evaluate(
            profile=profile,
            payload=payload,
            result=result,
        )

        telemetry.record(
            task_kind=profile.kind,
            model=model,
            cost=result.cost,
            latency=result.latency,
            evaluation=evaluation,
        )

        if not evaluation.accepted:
            continue

        if policy.requires_human_approval:
            return review_queue.submit(task, result, evaluation)

        return result.output

    raise ExecutionPolicyExhausted(profile.kind)`;

const METRICS_GOOD = `small model
success rate:       99.4%
p95 latency:        430 ms
cost per success:   $0.0018
escalation rate:    0.6%`;

const METRICS_BAD = `small model
success rate:       41%
retry rate:         38%
escalation rate:    71%

strong model
success rate:       86%
retry rate:         9%`;

const CAPABILITIES = `extract_purchase_order
classify_support_request
review_code_change
generate_customer_summary`;

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}

export default function Article() {
  return (
    <main className="article-page">
      <article className="article">
        <Link className="article-back" href="/#writing">
          <span aria-hidden="true">←</span> Mateus P. S.
        </Link>

        <header className="article-head">
          <span className="article-kicker">Essay · 2026</span>
          <h1>
            Stop using the best model for everything: designing an AI stack around cost, risk, and
            complexity
          </h1>
          <p className="article-dek">
            The strongest model has plenty of work to do. It just should not be responsible for
            everything.
          </p>
          <span className="article-by">Mateus P. S.</span>
        </header>

        <div className="article-body">
          <p>Why not use the best model on every AI task? It should perform better, right?</p>
          <p>
            That is true if we look only at the model. But an AI workflow is not only the model. It
            also has inputs, validation, retries, budgets, permissions, tools, people reviewing the
            output, and real consequences when something goes wrong.
          </p>
          <p>
            Imagine building a bridge. You need a strong design, cost estimate, prototype,
            construction and tests. Having the best architect available does not mean that architect
            should calculate every number, buy every material and inspect every bolt. Each part has a
            different role.
          </p>
          <p>
            I arrived at the same conclusion while building{' '}
            <Ext href="https://github.com/thettteus/workflow-execution-engine">WEE</Ext>, a workflow
            execution engine for engineering processes.
          </p>
          <p>
            The end-to-end workflow I validated has 21 steps. Seven are AI workers; the other
            fourteen are deterministic tools. The workers review code, find relevant files, propose
            changes and inspect the result. WEE handles repository access, files, tests, retries,
            branching, artifacts, budgets and the pull request flow.
          </p>
          <p>
            I could move more of that into prompts and write less orchestration code at first. But it
            would make execution harder to control and explain later.
          </p>
          <p>
            A failed test has a known set of next actions. An exhausted budget means stop. Invalid
            output gets rejected. Permissions are enforced by the application.
          </p>
          <p>I do not need an agent to reason about those things.</p>
          <p>
            That distinction changed how I think about model selection too. Ticket classification and
            a multi-file code change may both use an LLM, but they have different failure modes,
            validation requirements and costs when they fail. Sending both to the strongest available
            model is usually a default, not a design decision.
          </p>

          <h2>Price per token is not the real cost</h2>

          <p>Inference has become much cheaper.</p>
          <p>
            The{' '}
            <Ext href="https://hai.stanford.edu/ai-index/2025-ai-index-report">
              Stanford AI Index 2025
            </Ext>{' '}
            reports that the cost of querying a model with GPT-3.5-level performance on MMLU fell
            from $20 to $0.07 per million tokens between November 2022 and October 2024.
          </p>
          <p>
            This is a capability comparison, not the price history of one specific model. Smaller
            models improved, hardware improved and inference became more efficient. Provider pricing
            also makes it clear that models from the same generation can have very different input
            and output costs.
          </p>
          <p>Still, price per token is not the number I would optimize for.</p>
          <p>
            A cheaper model can fail validation, retry, escalate to a stronger model and still end in
            human review. By the end, the “cheap” route may cost more and take longer. But if a
            smaller model already handles a bounded task reliably, a frontier model is just
            unnecessary capacity.
          </p>
          <p>The more useful metric is cost per successful task:</p>

          <pre>
            <code>{COST_FORMULA}</code>
          </pre>

          <p>
            A <Ext href="https://arxiv.org/abs/2603.21389">study on task-specific efficiency</Ext>{' '}
            reported 91.7% accuracy for Qwen2.5 0.5B on IMDB review classification. The 72B version
            scored 88.6% on the same task. The larger models did much better on mathematical
            reasoning in the same study.
          </p>
          <p>
            I would not use that result to claim that smaller models are better. It supports a
            narrower point: if a task is constrained and already well solved, more general capability
            may not improve the outcome.
          </p>
          <p>
            PrismML’s <Ext href="https://prismml.com/news/bonsai-27b">Bonsai 27B</Ext> is another
            useful example. It is a 1-bit model at roughly 3.9 GB, and the{' '}
            <Ext href="https://huggingface.co/prism-ml/Bonsai-27B-mlx-1bit">published results</Ext>{' '}
            show it retaining 89.5% of the FP16 model’s average score across 15 benchmarks.
          </p>
          <p>
            Whether that remaining loss matters is a product decision. A small local model can be a
            good fit for offline software or workloads where data must stay local. It is probably not
            the right tradeoff if small accuracy losses create expensive financial reconciliation.
          </p>
          <p>
            The question is not “is this model cheap?” It is “is it cheap enough for this task, with
            this validation and this failure cost?”
          </p>

          <h2>Make the non-AI parts deterministic first</h2>

          <p>Before choosing a smaller model, I check whether the task needs a model at all.</p>
          <p>
            Schema validation, permission checks, deterministic calculations, known queries and state
            transitions should be software. This is one reason WEE has seven AI workers and fourteen
            deterministic tools. The model is there for ambiguity and judgment; everything
            predictable stays in code.
          </p>
          <p>That also gives failures a clear meaning.</p>
          <p>
            If tests fail, the workflow has a test failure. If output does not match the expected
            schema, it has a validation failure. If it reaches its cost limit, it stops because of
            policy. I would rather have these concrete events than a single generic “agent failed”
            status.
          </p>
          <p>
            Once that separation exists, routing does not need to be particularly clever at the
            beginning. It needs to understand the work.
          </p>
          <p>A purchase-order extraction can be described like this:</p>

          <pre>
            <code>{PROFILE_EXTRACTION}</code>
          </pre>

          <p>A repository change has different requirements:</p>

          <pre>
            <code>{PROFILE_REPO_CHANGE}</code>
          </pre>

          <p>
            These task definitions belong to the product. Model names will change.{' '}
            <code>purchase_order_extraction</code> will still mean roughly the same thing.
          </p>
          <p>
            The policy can then define limits that make sense for that task: maximum cost, latency,
            attempts, and whether a person needs to approve the output. One task may allow $0.08, 12
            seconds and two attempts. Another may justify $1.50, 60 seconds, three attempts and human
            approval.
          </p>
          <p>The routing code can remain simple:</p>

          <pre>
            <code>{ROUTER}</code>
          </pre>

          <p>
            I would not call this solved code. Retrying operations that can write data raises
            idempotency questions. Provider failures, cancellation, rate limits and concurrency need
            their own treatment.
          </p>
          <p>
            But the boundary matters: product policy decides what is acceptable, the evaluator
            decides whether the result passed, and the inference provider runs the model. Keeping
            these responsibilities separate makes the model replaceable later.
          </p>

          <h2>Validate the output, not the model’s confidence</h2>

          <p>
            I would not use a model’s self-reported confidence as the main reason to accept or
            escalate a result. The application often has stronger evidence.
          </p>
          <p>
            An extraction either passes its schema or it does not. Referenced IDs can be checked. SQL
            can be parsed and executed read-only. Code can compile, run tests and pass static
            analysis. A retrieved answer can be checked against the documents it cites.
          </p>
          <p>
            These checks are not perfect, but they are about the result the product needs. For tasks
            without an objective check, an evaluation set with representative examples and human
            criteria is still more useful than trying outputs in a playground until one model feels
            stronger.
          </p>
          <p>
            Research suggests that routing can work when it is tied to task quality.{' '}
            <Ext href="https://arxiv.org/abs/2305.05176">FrugalGPT</Ext> evaluated cascades that
            selected models based on the request and estimated answer quality. In some experiments,
            it matched the best individual model with cost reductions of up to 98%.
          </p>
          <p>
            <Ext href="https://proceedings.iclr.cc/paper_files/paper/2025/hash/5503a7c69d48a2f86fc00b3dc09de686-Abstract-Conference.html">
              RouteLLM
            </Ext>
            , published at ICLR 2025, used preference data to route between a stronger and cheaper
            model. The authors reported more than a twofold cost reduction without substantial
            quality loss in the scenarios they tested.
          </p>
          <p>
            Those results are useful evidence. They are not a production forecast for every system.
          </p>
          <p>
            For example, if <code>invoice_line_item_extraction</code> starts looking like this:
          </p>

          <pre>
            <code>{METRICS_GOOD}</code>
          </pre>

          <p>then the smaller route is probably the right default for that task.</p>
          <p>
            If <code>multi_file_bug_fix</code> looks like this:
          </p>

          <pre>
            <code>{METRICS_BAD}</code>
          </pre>

          <p>
            starting with the cheaper model is mostly ceremony. It may have a lower token price and
            still lose once retries and escalation are included.
          </p>
          <p>This is where production data should replace architectural instinct.</p>
          <p>
            I also want to know <em>why</em> a task escalated. <code>schema_validation_failed</code>,{' '}
            <code>tool_call_failed</code>, <code>test_suite_failed</code>,{' '}
            <code>provider_timeout</code>, and <code>human_review_required</code> tell me different
            things.
          </p>
          <p>
            If purchase-order extraction moves from a 4% escalation rate to 18%, I have somewhere to
            investigate. The prompt may have changed. The provider may behave differently. Customers
            may be uploading a new format. One field may suddenly be causing most failures.
          </p>
          <p>“AI spend went up” is not enough to act on.</p>

          <h2>The model should be replaceable</h2>

          <p>
            A hosted frontier model can make complete economic sense at low volume. Self-hosting adds
            GPU provisioning, upgrades, monitoring, idle capacity and engineering time. Local models
            may improve privacy, latency or offline support, while creating memory, hardware
            compatibility, distribution, update and battery constraints.
          </p>
          <p>Those costs belong in the same decision.</p>
          <p>
            Gartner{' '}
            <Ext href="https://www.gartner.com/en/newsroom/press-releases/2025-04-09-gartner-predicts-by-2027-organizations-will-use-small-task-specific-ai-models-three-times-more-than-general-purpose-large-language-models">
              predicts that by 2027
            </Ext>{' '}
            organizations will use small, task-specific AI models at least three times more than
            general-purpose LLMs. I read this as a prediction of specialization, not the end of large
            models.
          </p>
          <p>
            For that to work, product logic cannot be tied to model names throughout the codebase.
            The product should ask for capabilities:
          </p>

          <pre>
            <code>{CAPABILITIES}</code>
          </pre>

          <p>
            Today, a capability may use a hosted frontier model. Later, it may use a smaller API
            model, a local model or deterministic software.
          </p>
          <p>
            For each run, I still want task type, policy and prompt versions, model version, input
            size, cost, latency, validations, retries, escalation reason and final result. That is
            enough to explain most decisions when someone needs to understand why the system behaved
            in a certain way.
          </p>
          <p>
            Building WEE reinforced a simple architectural preference: use software where the system
            can give guarantees. Use models where the task needs judgment. Spend more capability when
            the task and the cost of failure justify it.
          </p>
          <p className="article-close">
            The strongest model has plenty of work to do. It just should not be responsible for
            everything.
          </p>

          <hr />

          <h2>References</h2>

          <ul className="article-refs">
            <li>
              <Ext href="https://github.com/thettteus/workflow-execution-engine">
                WEE — Workflow Execution Engine
              </Ext>
              .
            </li>
            <li>
              Stanford HAI.{' '}
              <Ext href="https://hai.stanford.edu/ai-index/2025-ai-index-report">
                The 2025 AI Index Report
              </Ext>
              .
            </li>
            <li>
              Chen, Lingjiao; Zaharia, Matei; Zou, James.{' '}
              <Ext href="https://arxiv.org/abs/2305.05176">
                FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving
                Performance
              </Ext>
              .
            </li>
            <li>
              Ong, Isaac et al.{' '}
              <Ext href="https://proceedings.iclr.cc/paper_files/paper/2025/hash/5503a7c69d48a2f86fc00b3dc09de686-Abstract-Conference.html">
                RouteLLM: Learning to Route LLMs from Preference Data
              </Ext>
              .
            </li>
            <li>
              Cao, Jerry et al.{' '}
              <Ext href="https://arxiv.org/abs/2603.21389">
                Task-Specific Efficiency Analysis: When Small Language Models Outperform Larger
                Models
              </Ext>
              .
            </li>
            <li>
              Gartner.{' '}
              <Ext href="https://www.gartner.com/en/newsroom/press-releases/2025-04-09-gartner-predicts-by-2027-organizations-will-use-small-task-specific-ai-models-three-times-more-than-general-purpose-large-language-models">
                Organizations Will Use Small, Task-Specific AI Models Three Times More Than
                General-Purpose LLMs
              </Ext>
              .
            </li>
            <li>
              PrismML. <Ext href="https://prismml.com/news/bonsai-27b">Announcing Bonsai 27B</Ext>.
            </li>
            <li>
              OpenAI. <Ext href="https://developers.openai.com/api/docs/pricing">API pricing</Ext>.
            </li>
          </ul>
        </div>

        <footer className="article-foot">
          <Link className="article-back" href="/#writing">
            <span aria-hidden="true">←</span> Back to writing
          </Link>
        </footer>
      </article>
    </main>
  );
}
