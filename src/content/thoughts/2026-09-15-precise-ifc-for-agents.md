---
title: Why precise information-flow control is still hard for agents
date: 2026-09-15
summary: An agent can enforce restrictions on its context without knowing exactly what its words reveal. Closing that gap takes more than a better dependency score.
---

An agent should be able to use private information without passing all of it to every tool it calls. A scheduling agent might need both my appointment time and my email address when talking to a clinic. A reminder service might be allowed to receive only the time. Both interactions are legitimate. The difficulty is keeping the information from the first conversation from slipping into the second.

Information-flow control, or IFC, governs where information may go after a program reads it. Labels carry restrictions such as “only the user and the clinic may receive this.”

## What I want to do

I want to track sensitive information through the messages an agent generates. If a reply depends on the appointment time but not the email, I want its label to reflect that distinction. The agent could then reuse that reply with a recipient allowed to know only the time.

My starting point is a policy specifying which sensitive items each recipient may receive. Before each generation, the runtime supplies the permitted data and filters the history. The next step is to estimate which of those items influenced the resulting message.

One simple experiment is *leave-one-out generation*: generate a baseline message, remove one sensitive item, and generate again. Repeat for each item. If removing the appointment time changes the answer while removing the email does not, that gives us evidence about their different roles. A semantic similarity function could score those changes, and the scores could inform candidate dependency labels.

This is an exploratory proposal. I do not yet have an implementation or evidence that these labels justify safe release. The difficult step is going from “this test detected little influence” to “the runtime may remove this restriction.” Deliberately releasing information that remains protected—*declassification*—would need separate policy authorization.

For a comparison with FIDES, RTBAS, and related work, see the [appendix](#appendix-how-this-relates-to-existing-work).

## Natural language mixes the things we want to separate

In ordinary code, [IFC analyses](https://www.cs.cornell.edu/andru/papers/jsac/sm-jsac03.pdf) can follow assignments and other operations to propagate labels, although they can still overtaint. With LLMs, we need useful propagation rules for a generation that mixes many inputs into natural language.

Consider a prompt containing records, instructions, tool results, and conversation history. Ask an LLM to write the reminder.

The output might mention only the time. Yet a sensitive input could also affect a choice of words, an omission, or the decision to call a particular tool. The fact that the email address does not appear in the message does not establish independence from it.

We can conservatively give the output every restriction attached to its inputs. That makes the rule straightforward to enforce, but it can overtaint a harmless reminder. In a long-running conversation, these restrictions accumulate: *label creep*. Eventually, useful communication may require clearing context, blocking an action, or asking for permission.

Natural language can still carry labels. The problem is that it does not supply a trustworthy account of its own dependencies. Even with access to a model’s computation, tracking every numerical dependency need not tell us which facts a sentence conveys. By “precise,” I mean getting closer to those relevant dependencies while retaining a defensible security guarantee.

<figure class="flow-figure" aria-labelledby="ifc-figure-caption">
  <div class="flow-case">
    <h3>Generate with both inputs</h3>
    <p class="flow-path">Time + email <span aria-hidden="true">→</span> LLM <span aria-hidden="true">→</span> “Tuesday, 3 pm.”</p>
    <p>Conservative label: time + email. The email restriction may be unnecessary.</p>
  </div>
  <div class="flow-case">
    <h3>Remove email before generation</h3>
    <p class="flow-path">Time only <span aria-hidden="true">→</span> fresh LLM call <span aria-hidden="true">→</span> “Tuesday, 3 pm.”</p>
    <p>This call has no access to the email, assuming it is absent from all other inputs and state.</p>
  </div>
  <div class="flow-case">
    <h3>Compare the two messages</h3>
    <p class="flow-path">“Tuesday, 3 pm.” <span aria-hidden="true">↔</span> “Tuesday, 3 pm.”</p>
    <p>Matching outputs in these runs do not prove that the original message is independent of the email.</p>
  </div>
  <figcaption id="ifc-figure-caption">Same words, different evidence. A schematic example; these are not experimental results.</figcaption>
</figure>

## Where the estimate can fail

**History can preserve the secret.** Removing an email field does nothing if an earlier message already copied or paraphrased it. A meaningful intervention must account for those derivatives too.

**Inputs can substitute for each other.** Two records might contain the same appointment time. Removing either alone may change nothing, even though the answer relies on the information they share. Testing each item’s absence is not the same as establishing independence from the information itself.

**Similarity can miss the important difference.** Two long messages that differ only in an account number can be semantically very similar. Conversely, harmless rephrasing can produce a large difference. Randomness in generation adds another source of variation. A score needs a security interpretation, not just a threshold that looks reasonable on examples.

**One message is only part of the observation.** A recipient may learn from repeated replies, tool choices, or information combined across agents. For a stochastic model, a guarantee must address possible outputs and their probabilities under stated assumptions. A few matching samples cannot establish that protected inputs leave the recipient’s observations unchanged. Token likelihoods may be useful evidence, but a likelihood difference is not automatically a bound on leaked bits.

## The cost of checking dependencies

With **n sensitive items in the permitted context**, basic leave-one-out requires **n + 1 generations per message**: one baseline and n comparisons. For 100 items, that is 101 generations. Repeating each condition r times to study variability costs r(n + 1) generations.

The exponential case comes from checking **every subset** of those items: 2<sup>n</sup> contexts, including the full and empty sets. For 20 items, that is already 1,048,576 contexts. Leave-one-out avoids this search, but it also misses interactions such as redundant sources. Testing all subsets would still not, by itself, cover every alternative secret value or possible generated output.

Call count is only part of the cost. Each comparison may carry a long conversation. Without reuse, n comparisons over a context containing n fixed-size items can require quadratic total input-token volume, even though the number of calls is linear. Repeating this at every agent step compounds the expense.

Caching a shared prefix, screening candidate items, and sampling combinations are directions worth testing. Parallel calls can reduce waiting time without reducing total work. Smaller models might make comparisons cheaper, but their dependency estimates would need validation against the model whose output we want to label.

## What I want an agent OS to make possible

An agent operating system could make the boundaries explicit: what each agent instance may read, what history it retains, and where its results may go. Separate instances for different recipients could limit unnecessary mixing. Shared memory and returned results would still need rules; spawning a fresh agent does not explain how to combine its answer with another agent’s protected knowledge.

I want an agent that can use rich private context and communicate narrowly, with guarantees that hold across later interactions. The research question is what evidence would justify reusing a message under a less restrictive label, and how to obtain that evidence at a cost an agent can afford.

---

## Appendix: How this relates to existing work

**FIDES** keeps labeled values behind variable references and exposes selected information through a quarantined LLM, including schema-constrained outputs. This reduces how much sensitive or untrusted content enters the planner. Within an LLM call, however, output labels still conservatively inherit the context’s restrictions. Its specified policies guarantee integrity noninterference and a weaker confidentiality property, *explicit secrecy*, which allows leaks through data-dependent control flow. Typed outputs can support more permissive policies, but even a Boolean can disclose a protected fact. My reading is that FIDES improves control over information entering and leaving a computation; it does not recover exact semantic dependencies inside arbitrary generated text. [FIDES, §§4–5](https://arxiv.org/html/2505.23643v2#S4).

**RTBAS** uses an LLM judge or attention-based screener to estimate relevant history regions. It joins their labels, then redacts regions whose labels exceed that bound **before** generating the next action. This ordering matters: it does not simply trust a prediction that an exposed secret was unused. Selecting an unnecessarily restrictive label can cause needless confirmation; excluding a needed region can hurt task completion. Its final label bounds the context available to generation, rather than certifying precisely what the generated message reveals. The redactor also follows label compatibility, not an exact list of semantically necessary inputs. [RTBAS, §7](https://arxiv.org/html/2502.08966v2#S7).

Both systems make useful progress on label creep. The remaining gap is clearest when we ask to retain a message written with broad access, then reuse it with a recipient who has narrower permissions.

There is relevant precedent in [*Permissive Information-Flow Analysis for Large Language Models*, §3.4](https://arxiv.org/html/2410.03055v2#S3.SS4). It estimates a more permissive label, then regenerates the returned answer using only the corresponding context. Its safety argument rests on that restricted generation. That suggests a useful role for dependency estimates in my setting too: helping choose a context from which to generate safely. It leaves open the stronger ambition of certifying an already-generated message.
