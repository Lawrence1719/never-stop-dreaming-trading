import re
import glob

# Files to extract sql from
files = [
    'docs/PRODUCTS.md',
    'docs/CART.md',
    'docs/WISHLIST.md',
    'docs/ORDER_ITEMS.md'
]

sql_content = ""

for file in files:
    try:
        with open(file, 'r') as f:
            content = f.read()
            # extract sql blocks
            matches = re.findall(r'```sql\n(.*?)```', content, re.DOTALL)
            for match in matches:
                sql_content += match + "\n\n"
    except FileNotFoundError:
        pass

with open('missing_tables.sql', 'w') as f:
    f.write(sql_content)

