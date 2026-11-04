# 把 tools/lang/*.json（{ "中文": ["English", "日本語"] }）合并成 src/lang/en.js 和 ja.js
import json, glob
en, ja = {}, {}
for f in sorted(glob.glob('tools/lang/*.json')):
    for k, (e, j) in json.load(open(f, encoding='utf-8')).items():
        en[k] = e; ja[k] = j
for name, d in [('en', en), ('ja', ja)]:
    open(f'src/lang/{name}.js', 'w', encoding='utf-8').write('/* 由 tools/build_lang.py 生成，请改 tools/lang/*.json */\nexport default ' + json.dumps(d, ensure_ascii=False, indent=0) + ';\n')
print(len(en), 'keys')
