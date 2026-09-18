---
title: Who reviews all these papers?
date: 2026-09-18
summary: If AI makes research easier to produce, how do we make it easier to examine?
---

Imagine receiving a paper with a clear argument, polished writing, and convincing figures. You still have to work out whether the problem matters, whether the evidence supports the claims, and whether the system actually works. Producing those pages faster does not automatically make those questions easier to answer.

I have no objection to researchers using LLMs to write papers. I care about whether the work advances something and explains why that advance matters. What worries me is the imbalance: if agents help us produce more papers, who will do the additional work of reviewing them?

From a practical point of view, we need review systems built for people working with agents, and papers that make that collaboration possible.

## Give reviewers something they can check

When I think about reviewing a systems or security paper, I think about questions like these: Which experiment supports this claim? Does the implementation match the description? Can I reproduce the result? What happens if I change this assumption?

Agents could help answer these questions. But giving an agent a PDF and asking for a review leaves much of the useful work unspecified.

I would like a submission to provide two connected views of the research. One is the paper people read: the problem, the ideas, the evidence, and the limitations. The other is a structured record that helps an agent find and examine that evidence: claims linked to experiments, relevant code, data, execution instructions, and expected results.

For example, a paper might claim that its defense blocks a particular attack. A reviewer should be able to ask an agent to locate the relevant experiment, run it, and show what happened. The result should come back with enough detail for the reviewer to inspect it.

The review platform should support this process and preserve the checks, including failures and unresolved questions. Otherwise, every reviewer has to assemble their own tools and repeat the same setup work.

This matters because review takes time that researchers must find alongside their other responsibilities. Artifact evaluation adds another substantial commitment. I find it hard to imagine handling a much larger volume of submissions simply by asking the same people to contribute more unpaid hours. Useful automation should reduce the work required to reach an informed judgment.

## What would make an agent a better reviewer?

I am optimistic that agents could become much better at this, although I do not have a recipe for training them.

Existing human reviews seem like one source of feedback. So do more concrete outcomes: a suspected error that someone verifies, an experiment that contradicts a claim, or a result successfully reproduced under the stated conditions. These provide different kinds of evidence about whether the agent’s work was useful.

The coding analogy makes me hopeful. When there is a clear way to check an outcome, there is something to learn from. Research reviewing has some checks of that kind, alongside harder judgments about novelty, importance, and whether a question is worth pursuing.

Human reviews also contain mistakes and biases. Training on them could reproduce those weaknesses. That deserves attention, but the comparison should include the limitations of actual human review too. I would want to know which errors an agent helps us catch, which it introduces, and how much effort it takes to verify its findings.

We can start building the infrastructure while those questions remain open. An agent can be useful to a reviewer well before we would trust it to make every judgment.

## And if agents do the whole thing?

A [recent Dwarkesh discussion with John Schulman, Beren Millidge, and Charlie O’Neill](https://www.dwarkesh.com/p/john-beren-charlie) made me think further about this. Schulman describes research as a process of developing intuitions, designing experiments to test them, and gradually moving toward more realistic problems. Millidge raises the question of whether agents could eventually keep that process going on their own.

Review belongs inside that picture. It helps us decide whether an experiment supports a claim, whether a finding matters, and what deserves further investigation. If agents can propose ideas, conduct experiments, write papers, and critically examine one another’s work, perhaps they could sustain a research community of their own.

Where would that leave us?

I sometimes imagine people becoming something like miners: exploring a growing body of discoveries, testing the ones that seem promising, and finding ways to use them. Our experiences and needs would shape what we look for. A result could be technically impressive while having little relevance to the problems we care about.

That future is speculative. We would still need ways to establish whether the findings hold up outside the conversations that produced them. But it makes the immediate infrastructure question feel more consequential to me. The systems we build to help people review research today could also help us navigate research that moves faster than any person can follow.

For now, I want agents that help us investigate more carefully, and review systems that make that help useful. The larger question—what research becomes when agents can sustain the whole process—is one I am still thinking through.
