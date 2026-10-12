"""
plot_figures.py
Generates clean, high-resolution empirical figures using Pillow
for inclusion in research paper and experiment reports.
"""

import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path(__file__).resolve().parent.parent
RESULTS_DIR = BASE_DIR / "results"
FIG_DIR = BASE_DIR / "figures"
FIG_DIR.mkdir(parents=True, exist_ok=True)

# Colors
C_DARK = (33, 37, 41)
C_PRIMARY = (46, 125, 50)
C_ACCENT = (230, 81, 0)
C_BLUE = (25, 118, 210)
C_LIGHT_GRAY = (240, 240, 240)
C_GRID = (210, 210, 210)
C_WHITE = (255, 255, 255)

def create_bar_chart(title, categories, values1, label1, values2=None, label2=None, output_path=None, y_max=1.0, unit=""):
    width, height = 900, 500
    img = Image.new("RGB", (width, height), C_WHITE)
    draw = ImageDraw.Draw(img)

    # Title
    draw.text((40, 30), title, fill=C_DARK)

    # Chart bounds
    margin_left = 80
    margin_right = 60
    margin_top = 80
    margin_bottom = 80
    plot_w = width - margin_left - margin_right
    plot_h = height - margin_top - margin_bottom

    # Y-axis grid
    for i in range(5):
        y_val = (i / 4.0) * y_max
        y_pos = margin_top + plot_h - int((i / 4.0) * plot_h)
        draw.line([(margin_left, y_pos), (margin_left + plot_w, y_pos)], fill=C_GRID, width=1)
        val_str = f"{y_val:.2f}{unit}" if y_max <= 1.0 else f"{int(y_val)}{unit}"
        draw.text((margin_left - 65, y_pos - 8), val_str, fill=C_DARK)

    # Draw bars
    num_cats = len(categories)
    cat_width = plot_w / num_cats

    for i, cat in enumerate(categories):
        cx = margin_left + i * cat_width
        if values2 is not None:
            bw = cat_width * 0.35
            # Bar 1
            h1 = int((values1[i] / y_max) * plot_h)
            b1_x0 = cx + cat_width * 0.12
            b1_y0 = margin_top + plot_h - h1
            draw.rectangle([b1_x0, b1_y0, b1_x0 + bw, margin_top + plot_h], fill=C_PRIMARY)

            # Bar 2
            h2 = int((values2[i] / y_max) * plot_h)
            b2_x0 = b1_x0 + bw + 6
            b2_y0 = margin_top + plot_h - h2
            draw.rectangle([b2_x0, b2_y0, b2_x0 + bw, margin_top + plot_h], fill=C_ACCENT)

            # Labels
            draw.text((b1_x0, b1_y0 - 18), f"{values1[i]:.2f}", fill=C_PRIMARY)
            draw.text((b2_x0, b2_y0 - 18), f"{values2[i]:.2f}", fill=C_ACCENT)
        else:
            bw = cat_width * 0.5
            h1 = int((values1[i] / y_max) * plot_h)
            b1_x0 = cx + cat_width * 0.25
            b1_y0 = margin_top + plot_h - h1
            draw.rectangle([b1_x0, b1_y0, b1_x0 + bw, margin_top + plot_h], fill=C_PRIMARY)
            val_txt = f"{values1[i]:.1f}{unit}" if isinstance(values1[i], float) else f"{values1[i]}{unit}"
            draw.text((b1_x0 + 4, b1_y0 - 18), val_txt, fill=C_PRIMARY)

        # X label
        draw.text((cx + 10, margin_top + plot_h + 15), cat, fill=C_DARK)

    # Legend
    if values2 is not None:
        draw.rectangle([margin_left, 55, margin_left + 16, 67], fill=C_PRIMARY)
        draw.text((margin_left + 22, 53), label1, fill=C_DARK)
        draw.rectangle([margin_left + 160, 55, margin_left + 176, 67], fill=C_ACCENT)
        draw.text((margin_left + 182, 53), label2, fill=C_DARK)

    img.save(output_path)
    print(f"Generated figure: {output_path.name}")

def main():
    with open(RESULTS_DIR / "e1_architecture_benchmark.json") as f:
        e1 = json.load(f)

    with open(RESULTS_DIR / "e3_domain_shift.json") as f:
        e3 = json.load(f)

    with open(RESULTS_DIR / "e5_weather_hierarchy.json") as f:
        e5 = json.load(f)

    # Fig 1: Architecture Accuracy Comparison
    arch_names = [a["name"].split(" ")[0] for a in e1["architectures"]]
    known_accs = [a["cropKnownAccuracy"] for a in e1["architectures"]]
    unknown_accs = [a["cropUnknownAccuracy"] for a in e1["architectures"]]
    create_bar_chart(
        "Figure 1: Edge Neural Network Accuracy (Crop-Known vs Crop-Unknown)",
        arch_names,
        known_accs,
        "Crop-Known (Logit Mask)",
        unknown_accs,
        "Crop-Unknown (All Classes)",
        FIG_DIR / "fig1_architecture_accuracy.png",
        y_max=0.6,
    )

    # Fig 2: Architecture Inference Latency
    latencies = [a["latencyMsPerImage"] for a in e1["architectures"]]
    create_bar_chart(
        "Figure 2: Edge Neural Network Inference Latency on CPU (ms/image)",
        arch_names,
        latencies,
        "Latency (ms)",
        output_path=FIG_DIR / "fig2_architecture_latency.png",
        y_max=250.0,
        unit="ms",
    )

    # Fig 3: Domain Shift (PlantVillage vs PlantDoc)
    domain_cats = ["PlantVillage (Lab)", "PlantDoc (Field)"]
    domain_known = [e3["datasets"]["plantvillage"]["cropKnownAccuracy"], e3["datasets"]["plantdoc"]["cropKnownAccuracy"]]
    domain_unknown = [e3["datasets"]["plantvillage"]["cropUnknownAccuracy"], e3["datasets"]["plantdoc"]["cropUnknownAccuracy"]]
    create_bar_chart(
        "Figure 3: Lab-to-Field Domain Generalization Benchmark",
        domain_cats,
        domain_known,
        "Crop-Known Accuracy",
        domain_unknown,
        "Crop-Unknown Accuracy",
        FIG_DIR / "fig3_domain_shift.png",
        y_max=0.6,
    )

    # Fig 4: Weather Hierarchy Latencies
    w_tiers = ["Live Open-Meteo", "IDB Cache", "Seasonal Normal"]
    w_lats = [t["latencyMs"] for t in e5["hierarchyTiers"]]
    create_bar_chart(
        "Figure 4: Weather Context Retrieval Latency Across Hierarchy (ms)",
        w_tiers,
        w_lats,
        "Retrieval Latency (ms)",
        output_path=FIG_DIR / "fig4_weather_hierarchy_latency.png",
        y_max=700.0,
        unit="ms",
    )

    # Fig 5: E8 Degradation Robustness (Baseline vs M1-Robust across JPEG Qualities)
    if (RESULTS_DIR / "e8_image_robustness.json").exists():
        with open(RESULTS_DIR / "e8_image_robustness.json") as f:
            e8 = json.load(f)
        q_cats = [f"Q={q}" for q in e8["jpegQualityCurve"]["qualityLevels"]]
        base_q = e8["jpegQualityCurve"]["baselineAccuracy"]
        rob_q = e8["jpegQualityCurve"]["robustAccuracy"]
        create_bar_chart(
            "Figure 5: Image Compression Robustness (M1 Baseline vs M1-Robust)",
            q_cats,
            base_q,
            "M1 Baseline",
            rob_q,
            "M1-Robust",
            FIG_DIR / "fig5_robustness_jpeg_curve.png",
            y_max=0.5,
        )

    # Fig 6: E10 Non-blocking Latency Invariant across 5 Weather Network Conditions
    if (RESULTS_DIR / "e10_nonblocking_proof.json").exists():
        with open(RESULTS_DIR / "e10_nonblocking_proof.json") as f:
            e10 = json.load(f)
        state_names = ["Fast (150ms)", "Slow (10s)", "Err 500", "Rate 429", "Offline"]
        mean_lats = [s["meanLatencyMs"] for s in e10["weatherStates"]]
        create_bar_chart(
            "Figure 6: Edge AI Diagnosis Latency Independence Across Network States (ms)",
            state_names,
            mean_lats,
            "Diagnosis Latency (ms)",
            output_path=FIG_DIR / "fig6_latency_independence.png",
            y_max=100.0,
            unit="ms",
        )

if __name__ == "__main__":
    main()
