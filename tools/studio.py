"""VideoStudio command line.

    studio doctor                 check tools, disk, caches
    studio new "AI Agents"        create projects/NN_AI_Agents with all sub-folders
    studio status 01              show which stages are done / failed
"""
import argparse
import sys

from pipeline import doctor
from pipeline.config import setup_env
from pipeline.project import find_project, load_state, new_project


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    setup_env()
    ap = argparse.ArgumentParser(prog="studio")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor")
    sub.add_parser("new").add_argument("name")
    sub.add_parser("status").add_argument("project")
    a = ap.parse_args()

    if a.cmd == "doctor":
        return doctor.run()
    if a.cmd == "new":
        print(new_project(a.name))
        return 0
    if a.cmd == "status":
        project = find_project(a.project)
        stages = load_state(project).stages
        print(project.name)
        for name, rec in stages.items():
            print(f"  {rec.status:<6} {name:<14} {rec.seconds:>8.1f}s  {rec.error or ''}")
        if not stages:
            print("  no stages run yet")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
