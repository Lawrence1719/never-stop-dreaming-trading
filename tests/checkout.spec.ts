import { test, expect } from '@playwright/test';

test.describe('Checkout Flow Smoke Test', () => {
  test('should navigate to a product and start checkout', async ({ page }) => {
    // 1. Go to home/products page
    await page.goto('/products');
    
    // 2. Click on the first product
    const firstProduct = page.locator('a[href^="/products/"]').first();
    await expect(firstProduct).toBeVisible();
    await firstProduct.click();
    
    // 3. Verify we are on the product detail page
    await expect(page).toHaveURL(/\/products\/.+/);
    
    // 4. Click Buy Now (shortcuts the cart)
    const buyNowButton = page.locator('button:has-text("Buy Now")');
    await expect(buyNowButton).toBeVisible();
    await buyNowButton.click();
    
    // 5. Verify redirect to login (since smoke test is unauthenticated)
    // or redirect to checkout if guest checkout was allowed
    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);
    
    console.log('✅ Basic navigation to checkout verified (blocked by auth as expected)');
  });

  test('should verify protected admin routes redirect to login', async ({ page }) => {
    // This tests the new Middleware implementation
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
    console.log('✅ Middleware auth guard verified');
  });
});
