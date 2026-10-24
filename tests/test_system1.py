import unittest
from backend.core.engine_system1 import System1Engine

class TestSystem1Engine(unittest.TestCase):
    def test_adaptive_patch_budget(self):
        engine = System1Engine.__new__(System1Engine)
        
        # Test code bug budget (target <= 1120 patches)
        patches, (w, h) = engine.compute_patch_budget(1920, 1080, "code_bug_or_terminal")
        self.assertLessEqual(patches, 1120)
        self.assertEqual(w % 16, 0, "Width must be a multiple of 16")
        self.assertEqual(h % 16, 0, "Height must be a multiple of 16")

        # Test receipt budget (target <= 280 patches)
        patches_receipt, (rw, rh) = engine.compute_patch_budget(800, 1200, "receipt_or_invoice")
        self.assertLessEqual(patches_receipt, 280)
        self.assertEqual(rw % 16, 0, "Width must be a multiple of 16")
        self.assertEqual(rh % 16, 0, "Height must be a multiple of 16")

if __name__ == "__main__":
    unittest.main()
