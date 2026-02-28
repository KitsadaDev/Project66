import os

path = r'C:\Users\canc9\OneDrive\Desktop\Pro-66\server\node_modules\.prisma\client\index.js'
if not os.path.exists(path):
    print("File not found")
    exit(1)

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Look for the specific broken part
target = 'isUpdatedAt\":false}{\"name\":\"status\"'
replacement = 'isUpdatedAt\":false},{\"name\":\"status\"'

if target in content:
    print("Found target!")
    new_content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully patched index.js")
else:
    print("Target NOT found in content")
    # Let's try to find it with fewer backslashes in case of odd reading
    target2 = 'isUpdatedAt":false}{"name":"status"'
    if target2 in content:
         print("Found target with single backslashes!")
         new_content = content.replace(target2, 'isUpdatedAt":false},{"name":"status"')
         with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
         print("Successfully patched index.js (alt)")
    else:
        # Final attempt: just look for the brace break
        print("Searching for brace break around menuType...")
        import re
        match = re.search(r'menuType.*?isUpdatedAt\\":false}{\\"name\\":\\"status\\"', content)
        if match:
             print("Found regex match!")
             new_parts = match.group(0).replace('isUpdatedAt\\":false}{\\"name\\":\\"status\\"', 'isUpdatedAt\\":false},{\\"name\\":\\"status\\"')
             new_content = content[:match.start()] + new_parts + content[match.end():]
             with open(path, 'w', encoding='utf-8') as f:
                 f.write(new_content)
             print("Successfully patched index.js (regex)")
        else:
            print("All attempts failed")
