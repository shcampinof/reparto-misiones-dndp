import argparse
import sys
import time
from pathlib import Path

from huggingface_hub import HfApi


def main() -> int:
    parser = argparse.ArgumentParser(description="Publica el paquete saneado en un Docker Space existente.")
    parser.add_argument("--space-id", required=True, help="Identificador owner/space")
    parser.add_argument("--package", default=".space-package", help="Directorio saneado")
    parser.add_argument("--timeout", type=int, default=900, help="Espera máxima del build en segundos")
    args = parser.parse_args()

    package = Path(args.package).resolve()
    if not package.is_dir():
        parser.error(f"No existe el paquete: {package}")

    api = HfApi()
    info = api.repo_info(args.space_id, repo_type="space")
    if not info.private:
        raise RuntimeError("El Space debe ser privado antes de publicar")
    if info.sdk != "docker":
        raise RuntimeError("El Space existente no usa el SDK Docker")

    commit = api.upload_folder(
        folder_path=str(package),
        repo_id=args.space_id,
        repo_type="space",
        path_in_repo=".",
        delete_patterns="*",
        commit_message="Deploy SIGIP-DP institutional presentation",
    )
    print(f"Commit remoto: {commit.oid}")

    deadline = time.monotonic() + args.timeout
    last_stage = None
    while time.monotonic() < deadline:
        stage = str(api.get_space_runtime(args.space_id).stage)
        if stage != last_stage:
            print(f"Estado: {stage}", flush=True)
            last_stage = stage
        if stage == "RUNNING":
            return 0
        if stage in {"BUILD_ERROR", "RUNTIME_ERROR", "CONFIG_ERROR"}:
            return 1
        time.sleep(10)

    print("Se agotó el tiempo de espera del build", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
