#!/usr/bin/env python3
"""Generate IEEE-style figures for the AgentExam research paper.

Print-friendly grayscale, sans-serif labels (IEEE figure convention),
300 dpi, sized to fit a single two-column layout column (~3.35 in wide).
Writes figures/manifest.json with pixel dimensions for the docx builder.
"""
import json
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Rectangle
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures")
os.makedirs(OUT, exist_ok=True)

DPI = 300
EDGE = "#000000"
FILL = "#FFFFFF"
FILL_ALT = "#E9E9E9"
TXT = "#000000"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 7.5,
    "axes.linewidth": 0.7,
})

manifest = {}


def save(fig, name):
    path = os.path.join(OUT, name)
    fig.savefig(path, dpi=DPI, bbox_inches="tight", pad_inches=0.04,
                facecolor="white", edgecolor="none")
    plt.close(fig)
    with Image.open(path) as im:
        manifest[name] = {"w": im.width, "h": im.height}
    print(f"saved {name}: {manifest[name]['w']}x{manifest[name]['h']}px")


def box(ax, x, y, w, h, title, lines, fill=FILL, title_size=7.2, lw=0.9):
    ax.add_patch(Rectangle((x, y), w, h, facecolor=fill, edgecolor=EDGE,
                           linewidth=lw, zorder=2))
    if lines:
        ax.text(x + w / 2, y + h * 0.68, title, ha="center", va="center",
                fontsize=title_size, fontweight="bold", color=TXT, zorder=3)
        ax.text(x + w / 2, y + h * 0.26, "\n".join(lines), ha="center",
                va="center", fontsize=5.9, color=TXT, zorder=3, linespacing=1.3)
    else:
        ax.text(x + w / 2, y + h / 2, title, ha="center", va="center",
                fontsize=title_size, fontweight="bold", color=TXT, zorder=3)


def arrow(ax, x1, y1, x2, y2, lw=0.9):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>",
                                  mutation_scale=8, linewidth=lw,
                                  color=EDGE, zorder=1,
                                  shrinkA=0, shrinkB=0))


# ----------------------------------------------------------------------------
# Fig. 1 - Layered system architecture
# ----------------------------------------------------------------------------
def fig1():
    fig = plt.figure(figsize=(3.4, 3.9))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 11.2)
    ax.set_ylim(0, 12.4)
    ax.axis("off")

    W, X = 8.3, 0.6
    layers = [
        ("Presentation Layer", [
            "Single-page web client (React 19)",
            "14 role-aware views: dashboard, materials,",
            "exams, viva, practical, analytics, classrooms"], FILL),
        ("Application Layer", [
            "Next.js App Router route handlers",
            "27 REST endpoints: auth, materials, subjects,",
            "exams, viva, practical, classrooms, analytics"], FILL),
        ("Intelligence Layer", [
            "Hosted LLM + vision-language services",
            "RAG engine (BM25 retrieval + boosts)",
            "In-process job queue (max 2 concurrent)"], FILL_ALT),
        ("Data Layer", [
            "Prisma ORM over SQLite (13 entities)",
            "External document store (uploads)"], FILL),
    ]

    y_start = 4 * 2.55 + 3 * 0.9  # total stack height
    ax.set_ylim(-0.25, y_start + 0.45)
    y = y_start - 2.55
    tops = []
    for title, lines, fill in layers:
        box(ax, X, y, W, 2.55, title, lines, fill=fill)
        tops.append(y + 2.55)
        y -= (2.55 + 0.9)

    for ytop in tops[:-1]:
        ybot = ytop - 0.9
        arrow(ax, X + W / 2, ytop - 0.02, X + W / 2, ybot + 0.02)
        ax.text(X + W / 2 - 0.35, (ytop + ybot) / 2, "HTTP/JSON",
                ha="right", va="center", fontsize=5.6, color="#444444")

    # right-side annotations
    ax.text(10.35, 8.2, "JWT\nbearer\nauth", ha="center", va="center",
            fontsize=5.6, color="#444444", linespacing=1.2,
            bbox=dict(boxstyle="round,pad=0.25", fc="white", ec="#888888", lw=0.5))
    ax.text(10.35, 4.7, "status\npolling\n(3 s)", ha="center", va="center",
            fontsize=5.6, color="#444444", linespacing=1.2,
            bbox=dict(boxstyle="round,pad=0.25", fc="white", ec="#888888", lw=0.5))

    save(fig, "fig1_architecture.png")


# ----------------------------------------------------------------------------
# Fig. 2 - Asynchronous upload-driven processing pipeline (snake layout)
# ----------------------------------------------------------------------------
def fig2():
    fig = plt.figure(figsize=(3.4, 2.9))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 10.2)
    ax.set_ylim(0, 8.4)
    ax.axis("off")

    W, H = 3.1, 1.9
    xs = [0.2, 3.5, 6.8]
    r1y, r2y = 5.7, 1.0

    # Row 1 (top, left -> right): upload -> queue -> extraction
    box(ax, xs[0], r1y, W, H, "1. Upload",
        ["multipart form", "10 MB guard", "201 in ~0.3 s"], FILL_ALT)
    box(ax, xs[1], r1y, W, H, "2. Job queue",
        ["fire-and-forget", "max 2 concurrent", "retry x3 backoff"])
    box(ax, xs[2], r1y, W, H, "3. Extraction",
        ["pdftotext, mammoth", "VLM OCR fallback", "scanned PDFs"], FILL_ALT)

    # Row 2 (bottom, right -> left): detection -> RAG bank -> finalization
    box(ax, xs[2], r2y, W, H, "4. Detection",
        ["subject, units,", "topics, weightage,", "importance"])
    box(ax, xs[1], r2y, W, H, "5. RAG bank",
        ["grounded questions", "verbatim PYQ", "+ validation"], FILL_ALT)
    box(ax, xs[0], r2y, W, H, "6. Finalization",
        ["PYQ frequency", "study plan", "status PROCESSED"])

    # arrows
    arrow(ax, xs[0] + W, r1y + H / 2, xs[1], r1y + H / 2)   # 1 -> 2
    arrow(ax, xs[1] + W, r1y + H / 2, xs[2], r1y + H / 2)   # 2 -> 3
    arrow(ax, xs[2] + W / 2, r1y - 0.02, xs[2] + W / 2, r2y + H + 0.02)  # 3 -> 4 (down)
    arrow(ax, xs[2], r2y + H / 2, xs[1] + W, r2y + H / 2)   # 4 -> 5 (leftward)
    arrow(ax, xs[1], r2y + H / 2, xs[0] + W, r2y + H / 2)   # 5 -> 6 (leftward)

    save(fig, "fig2_pipeline.png")


# ----------------------------------------------------------------------------
# Fig. 3 - RAG flow
# ----------------------------------------------------------------------------
def fig3():
    steps = [
        ("Material corpus (per subject)", ["syllabus - notes - PYQ papers - lab manuals"], FILL),
        ("Chunking", ["900-char chunks, 120-char overlap"], FILL),
        ("Lexical index", ["tokenized, stop-word filtered"], FILL),
        ("BM25 scoring + boosts", ["syllabus x1.15 - fresh material x2.5"], FILL_ALT),
        ("Top-k context assembly", ["per-question / per-task evidence"], FILL),
        ("LLM generation", ["questions - viva - plans - reviews"], FILL_ALT),
        ("Validation + persistence", ["question bank - PYQ analytics - study plan"], FILL),
    ]
    H, GAP = 1.3, 0.55
    total = len(steps) * H + (len(steps) - 1) * GAP
    fig = plt.figure(figsize=(3.4, 3.9))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 10)
    ax.set_ylim(-0.25, total + 0.45)
    ax.axis("off")

    W, X = 8.4, 0.8
    y = total - H
    coords = []
    for title, lines, fill in steps:
        box(ax, X, y, W, H, title, lines, fill=fill)
        coords.append(y)
        y -= (H + GAP)
    for i in range(len(steps) - 1):
        ytop = coords[i]
        ybot = coords[i + 1] + H
        arrow(ax, X + W / 2, ytop - 0.02, X + W / 2, ybot + 0.02)
    save(fig, "fig3_rag.png")


# ----------------------------------------------------------------------------
# Fig. 4 - Question-bank composition (measured on live system)
# ----------------------------------------------------------------------------
def fig4():
    fig, ax = plt.subplots(figsize=(3.4, 2.5))
    subjects = ["Cloud Computing\n(CSE 021)", "Design & Analysis\nof Algorithms (CSE 356)"]
    ai_gen = [39, 14]
    pyq = [17, 18]

    x = [0, 1]
    w = 0.32
    b1 = ax.bar([i - w / 2 - 0.02 for i in x], ai_gen, width=w,
                color="#A6A6A6", edgecolor="black", linewidth=0.7,
                label="AI-generated")
    b2 = ax.bar([i + w / 2 + 0.02 for i in x], pyq, width=w,
                color="white", edgecolor="black", linewidth=0.7,
                hatch="///", label="PYQ-tagged")

    for bars in (b1, b2):
        for b in bars:
            ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 0.8,
                    f"{int(b.get_height())}", ha="center", va="bottom",
                    fontsize=7, color="black")

    ax.set_xticks(x)
    ax.set_xticklabels(subjects, fontsize=6.8)
    ax.set_ylabel("Questions in bank", fontsize=7.5)
    ax.set_ylim(0, 46)
    ax.tick_params(axis="y", labelsize=7)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", alpha=0.25, color="#CCCCCC", linewidth=0.5)
    ax.set_axisbelow(True)
    ax.legend(fontsize=6.8, frameon=False, loc="upper right")
    save(fig, "fig4_results.png")


# ----------------------------------------------------------------------------
# BM25 equation (mathtext)
# ----------------------------------------------------------------------------
def eq_bm25():
    fig = plt.figure(figsize=(3.4, 0.75))
    fig.text(0.5, 0.5,
             r"$\mathrm{score}(D,Q)=\sum_{i=1}^{n}\mathrm{IDF}(q_i)\cdot"
             r"\frac{f(q_i,D)\,(k_1+1)}"
             r"{f(q_i,D)+k_1\left(1-b+b\,\frac{|D|}{\mathrm{avgdl}}\right)}$",
             ha="center", va="center", fontsize=11)
    save(fig, "eq_bm25.png")


fig1()
fig2()
fig3()
fig4()
eq_bm25()

with open(os.path.join(OUT, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2)
print("manifest.json written")
