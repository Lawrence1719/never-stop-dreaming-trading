// Category tree for frontend UI: main categories -> subcategories
export const CATEGORY_TREE: Record<string, string[]> = {
  'Food & Pantry': [
    'Canned goods',
    'Noodles & pasta',
    'Rice & grains',
    'Condiments & sauces',
    'Cooking ingredients',
    'Snacks & biscuits',
  ],
  Beverages: ['Water', 'Soft drinks', 'Juices', 'Coffee & tea', 'Energy drinks'],
  'Household Essentials': [
    'Cleaning supplies',
    'Laundry detergents',
    'Dishwashing liquid',
    'Trash bags',
    'Tissue & paper products',
  ],
  'Personal Care': [
    'Shampoo & conditioners',
    'Soap & body wash',
    'Toothpaste',
    'Deodorant',
    'Sanitary products',
  ],
  'Refrigerated & Frozen': ['Meat', 'Frozen goods', 'Dairy', 'Ice cream', 'Cold beverages'],
};

export const MAIN_CATEGORIES = Object.keys(CATEGORY_TREE);
