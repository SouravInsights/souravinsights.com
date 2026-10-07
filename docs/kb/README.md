# The Insights Knowledge Base — how it works

A plain-language walkthrough of the agent + RAG pipeline behind `souravinsights.com/curated-links`.
No prior background assumed.

**In one line:** we convert each saved link into numbers that represent its meaning, then
answer questions by finding the closest numbers — instead of matching keywords.

## Read in order

| Page | What it covers |
| :--- | :--- |
| [`01-concepts.md`](./01-concepts.md) | The six ideas, from zero (embedding, chunk, vector search, RAG, tool calling, agent) |
| [`02-extraction.md`](./02-extraction.md) | How a link becomes searchable text — the part that decides quality |
| [`03-retrieval-and-agent.md`](./03-retrieval-and-agent.md) | How a question finds the right passages and gets answered |
| [`04-evals.md`](./04-evals.md) | How we prove it works — the numbers |
| [`05-failure-modes.md`](./05-failure-modes.md) | What can go wrong, and the fix |

The formal spec is at [`../spec/insights-agent.md`](../spec/insights-agent.md); the critique
at [`../review/insights-agent-review.md`](../review/insights-agent-review.md).

## The whole system in one picture

```mermaid
flowchart TD
    YOU(["You post a link in Discord"]) --> INTAKE
    subgraph INTAKE["intake · Trigger.dev (already built)"]
        direction LR
        SYNC["check it's alive"] --> GATE["drop dead ones"]
    end
    INTAKE --> DB[("links — Postgres<br/>the master list")]
    DB -->|"links not yet read"| KB
    subgraph KB["building the searchable text · offline, once"]
        direction LR
        EX["read the page"] --> CK["split into passages"] --> EM["embed each passage"]
    end
    KB --> CH[("link_chunks — pgvector<br/>passages + their vectors")]
    CH -->|"the vectors"| ASK
    subgraph ASK["answering · live, per question"]
        direction LR
        Q["find the nearest passages"] --> AG["the model writes an answer from them"]
    end
    ASK --> ANS(["answer + real links cited"])
```

## Why there are three stages

Each stage is a separate job, run at a separate time.

| Stage | When it runs | Cost | Why separate |
| :--- | :--- | :--- | :--- |
| Intake | when you post a link | ~free | only adds to a list (already built) |
| Build | once, then when a page changes | cents | slow, can fail per page, must be rerunnable |
| Ask | per question | ~$0.001 | must be fast, cheap, and must never break the page |

## Why the split matters

Adding a link is a different job from reading it, and reading it is different from answering
a question. Keeping them apart is what lets a single bad page fail on its own, keeps a
question fast, and lets the whole searchable store be rebuilt any time without touching the
page people are browsing.
