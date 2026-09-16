"""Synthetic fixtures only: no private database export is needed for these tests."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    'sql_parser', Path(__file__).resolve().parents[1] / 'scripts/sql-parser.py')
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)


class ExportCompatibilityTests(unittest.TestCase):
    projection = {'WingsData': ['Make', 'Model', 'Size', 'Certification']}

    def export(self, legacy=False):
        key = '  `_access_row_id` BIGINT NOT NULL,\n' if legacy else ''
        primary = '`_access_row_id`' if legacy else '`Make`, `Model`, `Size`'
        extra_column = '`_access_row_id`,' if legacy else ''
        extra_value = '1,' if legacy else ''
        return f"""-- Table: WingsData | Source rows: 1
CREATE TABLE `WingsData` (
{key}  `Make` VARCHAR(50) NOT NULL,
  `Model` VARCHAR(50) NOT NULL,
  `Size` VARCHAR(30) NOT NULL,
  `Certification` {'VARCHAR(255)' if legacy else 'TEXT'} NULL,
  `Cost` DOUBLE NULL,
  PRIMARY KEY ({primary})
) ENGINE=InnoDB;
START TRANSACTION;
INSERT INTO `WingsData` ({extra_column}`Size`,`Model`,`Cost`,`Make`,`Certification`) VALUES
({extra_value}'M','Pilot''s wing; (test)',123,'Example','EN B');
COMMIT;
CREATE TABLE `Unrelated` (`private` TEXT) ENGINE=InnoDB;
INSERT INTO `Unrelated` (`private`) VALUES
('not public');
COMMIT;
"""

    def parse(self, sql):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'export.sql'
            source.write_text(sql, encoding='utf-8-sig')
            return parser.read_tables(source, self.projection)

    def test_legacy_and_native_keys_produce_identical_public_rows(self):
        expected = {'WingsData': [{'Make': 'Example', 'Model': "Pilot's wing; (test)",
                                  'Size': 'M', 'Certification': 'EN B'}]}
        self.assertEqual(self.parse(self.export(legacy=True)), expected)
        self.assertEqual(self.parse(self.export()), expected)

    def test_missing_table_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'missing table definition'):
            self.parse(self.export().replace('CREATE TABLE `WingsData`', 'CREATE TABLE `Renamed`'))

    def test_missing_schema_column_is_rejected_instead_of_becoming_null(self):
        with self.assertRaisesRegex(ValueError, 'missing required columns: Certification'):
            self.parse(self.export().replace('`Certification` TEXT', '`Renamed` TEXT'))

    def test_missing_insert_column_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'INSERT missing required columns: Certification'):
            self.parse(self.export().replace('`Make`,`Certification`', '`Make`,`Renamed`'))

    def test_incomplete_export_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'expected 2 rows, parsed 1'):
            self.parse(self.export().replace('Source rows: 1', 'Source rows: 2'))

    def test_empty_table_with_required_schema_is_valid(self):
        sql = self.export().split('START TRANSACTION;')[0].replace('Source rows: 1', 'Source rows: 0')
        self.assertEqual(self.parse(sql), {'WingsData': []})


if __name__ == '__main__':
    unittest.main()
