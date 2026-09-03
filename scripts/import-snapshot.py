"""Export allowlisted product fields only; never import/execute the SQL dump."""
import json, sys, importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser_file = ROOT / 'scripts' / 'sql-parser.py'
spec = importlib.util.spec_from_file_location('sql_parser', parser_file)
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)

source = Path(sys.argv[1]) if len(sys.argv)>1 else ROOT.parent / 'DataBe-DigitalOcean-v2.sql'
projection = json.loads((ROOT / 'shared/projection.json').read_text())
parser.ALLOWED = set(projection)
tables = parser.read_tables(source)
public = {table: [{key: row.get(key) for key in fields} for row in tables[table]] for table, fields in projection.items()}
# DSGeneric contributes only model metadata for actual comparison records.
keys = {(str(r['Make']).lower(),str(r['Model']).lower()) for t in ['WingsData','ReservesData'] for r in public[t]}
public['DSGeneric'] = [r for r in public['DSGeneric'] if (str(r['Brand']).lower(),str(r['Model']).lower()) in keys]
(ROOT / 'data').mkdir(exist_ok=True)
(ROOT / 'data/catalogue-rows.json').write_text(json.dumps(public,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({key:len(rows) for key,rows in public.items()}))
