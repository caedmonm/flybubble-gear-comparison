"""Read only allowlisted product tables from an Access-to-MySQL dump.

Never executes SQL and never exports customer, supplier or credential tables.
"""
import re
from pathlib import Path

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

def read_tables(path, projection):
    sql = Path(path).read_text(encoding='utf-8-sig')
    result = {}
    for table, fields in projection.items():
        name = re.escape(table)
        schema = re.search(r'CREATE TABLE `' + name + r'` \(([\s\S]*?)\) ENGINE=', sql)
        if not schema:
            raise ValueError(f'{table}: missing table definition')
        columns = set(re.findall(r'^\s*`([^`]+)`', schema[1], re.M))
        missing = set(fields) - columns
        if missing:
            raise ValueError(f'{table}: missing required columns: {", ".join(sorted(missing))}')
        records = []
        # Export batches end at COMMIT; quoted semicolons are not delimiters.
        pattern = r'INSERT INTO `' + name + r'` \(([^\n]+)\) VALUES\s*\n([\s\S]*?);(?=\s*\n(?:COMMIT;|INSERT INTO|$))'
        for match in re.finditer(pattern, sql):
            columns = re.findall(r'`([^`]+)`', match[1])
            missing = set(fields) - set(columns)
            if missing:
                raise ValueError(f'{table}: INSERT missing required columns: {", ".join(sorted(missing))}')
            indexes = [(field, columns.index(field)) for field in fields]
            for row in values(match[2]):
                if len(row) != len(columns): raise ValueError(f'{table}: column mismatch')
                records.append({field: row[index] for field, index in indexes})
        expected = re.search(r'^-- Table: ' + name + r' \| Source rows: (\d+)\s*$', sql, re.M)
        if expected and len(records) != int(expected[1]):
            raise ValueError(f'{table}: expected {expected[1]} rows, parsed {len(records)}')
        result[table] = records
    return result
