import numpy as np
import matplotlib.pyplot as plt


def main() -> None:
  np.random.seed(42)

  days = np.arange(1, 31)
  trend = np.cumsum(np.random.randn(30) * 2 + 5)

  category = ['A', 'B', 'C', 'D']
  bar_values = np.random.randint(20, 80, size=4)

  x_scatter = np.random.randn(100)
  y_scatter = 2.5 * x_scatter + np.random.randn(100) * 0.8

  hist_data = np.random.randn(500) * 5 + 60

  pie_values = np.array([35, 25, 20, 20])

  plt.style.use('dark_background')
  plt.rcParams['font.sans-serif'] = ['WenQuanYi Zen Hei'] # 设置中文字体
plt.rcParams['font.sans-serif'] = ['WenQuanYi Zen Hei'] # 设置中文字体
  fig, axes = plt.subplots(2, 3, figsize=(14, 8))
  (ax_line, ax_bar, ax_area,
   ax_scatter, ax_hist, ax_pie) = axes.flatten()

  # 1) 趋势图
  ax_line.plot(days, trend, color="#22c55e", linewidth=2)
  ax_line.set_title("趋势图：30 天累积指标", fontsize=11)
  ax_line.set_xlabel("天数")
  ax_line.set_ylabel("数值")

  # 2) 柱状图
  ax_bar.bar(category, bar_values, color="#38bdf8")
  ax_bar.set_title("柱状图：不同类别对比", fontsize=11)
  for i, v in enumerate(bar_values):
    ax_bar.text(i, v + 1, str(v), ha='center', va='bottom', fontsize=9)

  # 3) 简单面积图（看趋势区间）
  area_vals = np.abs(np.random.randn(30) * 3 + 10)
  ax_area.fill_between(days, area_vals, color="#0ea5e9", alpha=0.6)
  ax_area.plot(days, area_vals, color="#0ea5e9", linewidth=1.5)
  ax_area.set_title("面积图：某指标强度随时间", fontsize=11)
  ax_area.set_xlabel("天数")

  # 4) 散点图
  ax_scatter.scatter(x_scatter, y_scatter, s=20, alpha=0.7, color="#a855f7")
  ax_scatter.set_title("散点图：两个变量的关系", fontsize=11)
  ax_scatter.set_xlabel("变量 X")
  ax_scatter.set_ylabel("变量 Y")

  # 5) 直方图
  ax_hist.hist(hist_data, bins=20, color="#0ea5e9", alpha=0.85)
  ax_hist.set_title("直方图：分布情况", fontsize=11)
  ax_hist.set_xlabel("数值")
  ax_hist.set_ylabel("频数")

  # 6) 饼图
  ax_pie.pie(
    pie_values,
    labels=["产品A", "产品B", "产品C", "产品D"],
    autopct='%1.1f%%',
    startangle=140,
    colors=["#22c55e", "#f97316", "#6366f1", "#eab308"],
  )
  ax_pie.set_title("饼图：占比结构", fontsize=11)

  plt.tight_layout()
  output_path = "dashboard_charts.png"
  plt.savefig(output_path, dpi=200)
  print(f"Saved figure to {output_path}")


if __name__ == "__main__":
  main()

