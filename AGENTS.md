# SouravInsights's AGENT.md

- When writing something intended for human consumption, (spec docs, comment, commit message, reply to prompt) use as few words as possible. Pick every word meticulously to reduce the volume to a strict minimum. Be down to the point. Less is more.
- Avoid superlatives and praise. Stop telling me I am absolutely right. Give me the cold hard truth.
- Use examples when possible. Propose ASCII drawings or better, mermaid diagrams to explain complete systems.
- No over-engineering. Every feature, abstraction, or safeguard must be justified by a current requirement or an observed failure — never an imagined future one.
- If what I build drifts from a spec — or the spec is silent and I pick an interpretation — say so in the chat, and update the spec in the same change. Code and spec must never disagree silently.

When you write a commit message, follow these 7 rules:
Rule 1: Separate the subject line from the body with a single blank line.
Rule 2: Limit the subject line to 50 characters (72 is the absolute hard limit).
Rule 3: Capitalize the first letter of the subject line.
Rule 4: Do not end the subject line with a period.
Rule 5: Use the imperative mood in the subject line (e.g., "Fix bug," "Add feature," 
        not "Fixed" or "Adds"). Test formula: It must complete the sentence: "If applied,
        this commit will [your subject line here]".
Rule 6: Wrap the body text manually at 72 characters to prevent Git formatting issues.
Rule 7: Use the body to explain what and why vs. how. Assume the code explains the how;
        the message must explain the context and reasoning. 