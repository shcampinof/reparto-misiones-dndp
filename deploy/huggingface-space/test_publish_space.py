import importlib.util
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location("publisher", Path(__file__).with_name("publish-space.py"))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class PublisherTests(unittest.TestCase):
    def run_publication(self, runtimes):
        api = Mock()
        api.repo_info.return_value = SimpleNamespace(sdk="docker", sha="previous")
        api.upload_folder.return_value = SimpleNamespace(oid="uploaded")
        api.get_space_runtime.side_effect = runtimes
        with tempfile.TemporaryDirectory() as package:
            with patch.object(publisher, "HfApi", return_value=api), patch.object(
                publisher.sys, "argv", ["publisher", "--space-id", publisher.CANONICAL_SPACE_ID, "--package", package]
            ), patch.object(publisher.time, "sleep"):
                result = publisher.main()
        return result, api

    def test_does_not_confirm_previous_running_revision(self):
        result, api = self.run_publication([
            SimpleNamespace(stage="RUNNING", raw={"sha": "previous"}),
            SimpleNamespace(stage="RUNNING", raw={"sha": "uploaded"}),
        ])
        self.assertEqual(result, 0)
        self.assertEqual(api.get_space_runtime.call_count, 2)
        self.assertEqual(api.upload_folder.call_args.kwargs["parent_commit"], "previous")

    def test_build_error_is_not_reported_as_success(self):
        result, _ = self.run_publication([SimpleNamespace(stage="BUILD_ERROR", raw={"sha": "uploaded"})])
        self.assertEqual(result, 1)


if __name__ == "__main__":
    unittest.main()
