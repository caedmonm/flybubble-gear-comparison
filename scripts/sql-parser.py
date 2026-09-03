"""Read only allowlisted product tables from an Access-to-MySQL dump.

Never executes SQL and never exports customer, supplier or credential tables.
"""
import re
from pathlib import Path

ALLOWED = {'WingsData', 'ReservesData', 'DSGeneric'}

def values(text):
    i, n = 0, len(text)
    while i < n:
        if text[i] != '(':
            i += 1
            continue
        i += 1
        row = []
        while i < n:
            while text[i].isspace(): i += 1
            if text[i] == "'":
                i += 1
                value = []
                while i < n:
                    c = text[i]
                    if c == "'":
                        if i + 1 < n and text[i + 1] == "'":
                            value.append("'"); i += 2; continue
                        i += 1; break
                    if c == '\\':
                        i += 1
                        value.append({'n': '\n', 'r': '\r', 't': '\t', '0': '\0'}.get(text[i], text[i]))
                    else: value.append(c)
                    i += 1
                row.append(''.join(value))
            else:
                start = i
                while text[i] not in ',)': i += 1
                token = text[start:i].strip()
                row.append(None if token == 'NULL' else float(token) if '.' in token or 'e' in token.lower() else int(token))
            while text[i].isspace(): i += 1
            end = text[i] == ')'
            i += 1
            if end: break
        yield row

def read_tables(path):
    sql = Path(path).read_text(encoding='utf-8-sig')
    result = {}
    for table in ALLOWED:
        records = []
        # Export batches end at COMMIT; quoted semicolons are not delimiters.
        pattern = r'INSERT INTO `' + table + r'` \(([^\n]+)\) VALUES\s*\n([\s\S]*?);(?=\s*\n(?:COMMIT;|INSERT INTO|$))'
        for match in re.finditer(pattern, sql):
            columns = re.findall(r'`([^`]+)`', match[1])
            for row in values(match[2]):
                if len(row) != len(columns): raise ValueError(f'{table}: column mismatch')
                records.append(dict(zip(columns, row)))
        result[table] = records
    return result
