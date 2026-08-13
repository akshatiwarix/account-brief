# Account Brief — how it works, in plain English

No code in this document. If you have never opened this repo and never will, this is the one file to read.

---

## The problem, stated once

You want a page about a company before a sales call. Every tool that offers this works the same way: it grabs some text about the company, hands it to a language model, and prints what comes back.

The result reads beautifully. You cannot tell which parts are true.

That is not a small flaw. A brief with one fabricated number in it is worse than no brief, because you will act on it. And the sentences most likely to be invented are the specific, useful-sounding ones — the headcount, the pricing, the name of the person who just joined.

## The four ways it goes wrong

**The footnotes are decoration.** A tool puts a link after a sentence and calls the sentence sourced. Nobody ever checks that the sentence is actually in the page it links to.

**The company's own advertising becomes "research".** Most writing about a company is by that company. When a brief says *"they are the leading platform for compliance"* because the homepage says so, it has retyped an ad and put a letterhead on it.

**Disagreements get hidden.** The careers page says 200 employees. The funding announcement four months later says 340. A model will confidently write one number and never mention the other — but the fact that the two sources disagree is often the most useful thing on the page.

**Silence gets filled.** Ask twelve questions about a company you only have two documents for, and you get twelve answers. The eight it could not know are padding, and padding is where the lies live.

## What this project does instead

The brief is the visible output. **The thing actually being built is a gate** — a checkpoint every sentence has to pass before you are allowed to read it.

Here is the whole pipeline, in order.

### 1. Decide what to ask, before asking anything

Twelve fixed questions in five groups — what they sell, who they sell to, how big they are, how they go to market, what changed recently, what outsiders complain about, and so on.

Each question declares which *kinds* of page can answer it. "What shape is their pricing?" can be answered by a pricing page or a press release, and by nothing else.

So before any model is involved, the tool already knows what it cannot answer. If a company has no pricing page and no press release, the pricing question is marked unanswerable and **never sent anywhere**. That costs nothing and it means a gap is a computed fact rather than something you notice later by reading a suspiciously thin page.

This is the opposite of how these tools normally work. Absence is only visible if the question existed first.

### 2. Ask for quotes, not summaries

The model gets the company's documents and the questions that some document could answer. For every claim it makes, it must supply four things:

- a one-sentence restatement,
- **a quote, copied character-for-character out of the document**,
- which document the quote came from,
- and **which company the claim is about**.

That last one matters more than it looks. Company pages are full of other companies — competitors, customers, investors. A sentence about a competitor is a fact about the competitor.

### 3. Check every quote against the document

This is the gate.

The tool takes the quote and looks for it in the document the model named. Not approximately — exactly, after a short list of harmless equivalences: curly quotes count as straight quotes, an em dash counts as a hyphen, and any run of spaces, tabs or newlines counts as one space. Those are the things a model changes without changing meaning, and there are about a dozen of them.

Anything else is a miss. A single altered word is a miss. A quote stitched together from two sentences is a miss.

**A claim whose quote is not found is thrown away.** It does not get softened, hedged, or marked "unverified" — it is gone, and it cannot be cited.

There is deliberately no "close enough" score anywhere in this. A similarity threshold sounds reasonable and is exactly the mechanism that lets a rewritten sentence pass as a quotation. That is the one failure this project exists to prevent, so the setting does not exist to be loosened.

Two things follow, and they are the reason the checking is worth doing properly:

- The tool knows the **exact character positions** of the quote. So in the app, clicking a citation opens the source page scrolled to those characters, highlighted. The citation is a location, not a link.
- If the model quotes from the wrong document, the quote is not there, and the claim dies. Naming the source is not a formality.

The model gets **one** retry, and it is shown precisely which quotes were not found. A retry that just says "try again" gets the same answer back.

### 4. Throw away claims about the wrong company

A quote can be perfect and the claim still wrong.

One company in the test set has a careers page that discusses a competitor at length — *"[Competitor] has more than 30,000 teams on its platform and employs around 900 people."* That sentence is genuinely in the document. Its quote checks out. It is also not a fact about the company being researched.

Checking quotes cannot catch this. Checking subjects can, and the tool refuses any claim whose subject is not the company on the page. **Most grounding systems check the quote and not the subject, and this is the hole that leaves.**

### 5. Throw away plans pretending to be news

"What changed recently?" has one job. A press release announcing that a company *intends to* open an office next year is not a change — it is an intention, and it is often announced twice: once as a plan, once as a fact.

Statements about the future are labelled as such and are removed from the "what changed" section before any sentence is written about them. Elsewhere they are allowed, but they must read as plans: *says it plans to…*, *expects to…*

### 6. Throw away sources too old to stand behind

Different facts age at different speeds. What a company sells barely changes in eighteen months. How many people it employs changes constantly.

So each question carries its own shelf life, and there are three outcomes:

- **Fresh** — the sentence renders normally.
- **Aging** — past its shelf life but not absurd. The sentence renders with a date attached: *"As of February 2025, pricing started at $2,400 per robot."*
- **Too old** — past three times the shelf life. Dropped.

The middle case is the useful invention. Knowing what their pricing was eighteen months ago is genuinely worth having. Being *told* that is their pricing, with the date quietly removed, is how you walk into a call with a number that has moved.

### 7. Report disagreements and refuse to settle them

When two surviving claims answer the same question with numbers in the same unit that differ by more than 10%, that is a conflict.

Both survive. Both render. Both dates are shown. **Nothing picks a winner.**

Two obvious rules are both wrong: "trust the newest" and "trust the outside source". The test set contains one conflict of each kind precisely so neither rule can quietly creep in.

The unit part matters as much as the number part. One company reports "more than 4,000 customers" and "42,000 seats under contract" — ten times apart, and not a disagreement at all, because they count different things. A checker that compares numbers without comparing units flags that, and once the "conflicting" warning starts appearing where nothing is wrong, you learn to ignore it — including where it matters.

### 8. Write sentences that can only rest on what survived

Now, and only now, a model writes the prose.

It is given the surviving claims. **It is not given the documents.** It physically cannot quote something the gate already threw away, because it has not read it.

Every sentence must list which claims it used. A sentence citing nothing is dropped — that is the pure form of the thing this project exists to stop: a sentence that reads as sourced, with footnote markers that look real and nothing behind them.

### 9. Fix the verb

The last check is about honesty of voice.

If every source behind a sentence is the company describing itself, that sentence may not be stated as fact. It has to read *"positions itself as…"*, *"states that…"*, *"reports…"*.

If the model forgets, the tool **does not delete the sentence** — the information is true, the company really does say this. It rewrites it, prefixing the attribution, and marks the sentence as repaired so you can see that happened.

The result reads a bit stiffly in places. That is the intended trade: a stiff sentence you cannot mistake for a fact beats a fluent one you can.

## What you see in the app

Three panes.

**Left** — the ten companies, each labelled with the trap it carries, and a coverage meter showing two numbers: how many of the twelve questions the sources *could* answer, and how many ended up with a supported sentence. The gap between them is honest information.

**Middle** — the brief. Sections, questions, and sentences with citation chips. Markers where they belong: **conflicting**, **aging**, **attribution repaired**, **inference**.

**Right** — two tabs.

- *Sources*: click any citation and the document opens, scrolled to the highlighted characters.
- *Rejected*: everything thrown away, grouped by reason, with counts and an explanation of each reason.

**The rejected pane is the most important screen in the app.** A brief with no rejected pane is indistinguishable from one produced by a model that was simply asked nicely to be careful. Showing what was caught is the only way to demonstrate that anything is catching.

When nothing was rejected, it says so, rather than disappearing.

## The ten companies, and what each one is for

| Company | The trap | What it demonstrates |
|---|---|---|
| Ledgerloop | Rich and clean | The happy path — all twelve questions answered |
| Cadence Freight | 200 people in April, 340 in June | Both render, neither wins, one carries a date |
| Palewind | 4,000 customers, 42,000 seats | Different units are not a disagreement |
| Tinbox | Pricing page eighteen months old; a 2022 announcement | "As of February 2025", then a hard drop |
| Verdanta | Only its own pages, no outside sources | The complaints question stays honestly empty |
| Sparkfold | Careers page about a competitor | Right quote, wrong company |
| Meterwise | Key numbers in table rows and captions | Whitespace folding earns its keep |
| Northroad | Everything is a plan | The "what changed" section stays empty |
| Quillhaus | Two documents only | Half the questions unanswerable, known in advance |
| Brightsill | Claims 900 customers, press reports 430 | A disagreement that crosses sides |

## The honest caveats

**The companies are invented.** All ten, and every document. Every domain ends in `.example`, and nothing quotes a real company. The traps had to be built — no real set of pages happens to contain all ten at once.

The cost is real: you cannot click a citation through to a live page and check it against the internet. The answer is the paste panel — bring five real pages and watch the gate run on text it has never seen.

**Two model calls per brief.** One to extract, one to write. The free tier for the model used here allows twenty requests a day, so ten companies is a day's entire allowance. That constraint shaped the design rather than being hidden by it.

**The tool is quiet on things it cannot check.** A quote can exist in a document and still not support the claim built on it — the words are there, the logic is a stretch. Catching that is a harder problem (it needs a test suite of its own) and it is named as the next thing to build rather than pretended away.

**One section is not cited at all.** The last one — who probably owns this problem, and what the opening should be — reasons over the cited claims rather than quoting a document. It is labelled as inference everywhere it appears, including in the export.

## The one-sentence version

Every sentence in the brief points at specific characters in a specific document, checked by code rather than promised by a prompt — and the sentences that could not do that are shown to you instead of quietly rewritten into something vaguer.
