import { expect, test } from '@playwright/test'

/** 与 vite 内嵌路由一致：dmoes 根下的 减脂教练业务展示 */
const JOVIDA_INDEX =
  '/__embed/%E5%87%8F%E8%84%82%E6%95%99%E7%BB%83%E4%B8%9A%E5%8A%A1%E5%B1%95%E7%A4%BA/index.html'

test.describe('减脂教练业务展示 embed', () => {
  test('减脂教练业务展示：SPARE 大括号与外食子页三图可加载', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 })
    await page.goto(JOVIDA_INDEX)

    await expect(page.locator('.spare-tree')).toBeVisible()
    await expect(page.locator('a.brace-node')).toHaveCount(5)

    const eating =
      '/__embed/%E5%87%8F%E8%84%82%E6%95%99%E7%BB%83%E4%B8%9A%E5%8A%A1%E5%B1%95%E7%A4%BA/modules/e-out-eating-system.html'
    await page.goto(eating)
    const imgs = page.locator('figure img')
    await expect(imgs).toHaveCount(3)
    for (let i = 0; i < 3; i++) {
      const w = await imgs.nth(i).evaluate((el: HTMLImageElement) => el.naturalWidth)
      expect(w, `waishe img ${i} should load`).toBeGreaterThan(0)
    }
  })

  test('窄屏：SPARE 树与标题可读', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(JOVIDA_INDEX)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('.spare-tree')).toBeVisible()
    await expect(page.locator('a.brace-node').first()).toBeVisible()
  })
})
