import unittest
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "check_coverage_ratchet.py"

spec = importlib.util.spec_from_file_location("check_coverage_ratchet", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CoverageRatchetTests(unittest.TestCase):
    def test_comparison_allows_small_drift_and_rejects_large_drop(self):
        baseline = {"line": 75.5, "branch": 35.6}
        current = {"line": 75.4, "branch": 35.3}
        result = module.compare_againsts_baseline(current, baseline)
        self.assertEqual(result["status"], "pass")

        current = {"line": 74.9, "branch": 35.6}
        result = module.compare_againsts_baseline(current, baseline)
        self.assertEqual(result["status"], "fail")
        self.assertIn("line", result["message"])

        current = {"line": 76.6, "branch": 35.6}
        result = module.compare_againsts_baseline(current, baseline)
        self.assertEqual(result["status"], "fail")
        self.assertIn("update", result["message"])


if __name__ == "__main__":
    unittest.main()
