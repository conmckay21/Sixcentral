import sys
p = sys.argv[1]
s = open(p).read()

# import
old_imp = "import { Chip, SectionTitle } from '@/components/ui';"
new_imp = "import { Chip, SectionTitle } from '@/components/ui';\nimport AlertsCard from '@/components/AlertsCard';"
assert old_imp in s, "ui import not found"
s = s.replace(old_imp, new_imp)

# render: after the big read Pressable closes, before <SectionTitle>Latest</SectionTitle>
old_latest = "        <SectionTitle>Latest</SectionTitle>"
new_latest = "        <AlertsCard />\n\n        <SectionTitle>Latest</SectionTitle>"
assert old_latest in s, "Latest section title not found"
s = s.replace(old_latest, new_latest, 1)

open(p, 'w').write(s)
print("index.tsx patched")
