"""pending: output/images_pending.txt = what is still missing after a preview render (user rule 2026-11-10).

Written (kept as an all-done prompt list when nothing is missing) on every `studio run` / `studio assets`. It lists each asset that
still needs a file: id, scene, time, prompt, and the exact path the file must end up in (`drop/<id>.png`),
plus the steps that bring them into the timeline. The user keeps it with the project and hands it back later.
"""
from pathlib import Path

from .project import ref, upload_target


def write(va, project: Path) -> Path | None:
    out = project / "output" / "images_pending.txt"
    todo = [a for a in va.assets if a.status in ("prompt_ready", "needed", "failed")]
    num = ref(project) if "x" in project.name else project.name.split("_")[0]
    if not todo:  # keep the file (user wants the prompts to stay): list every prompt as a reference
        done = [a for a in va.assets if a.prompt.text]
        lines = [f"ALL IMAGES ARE IN: {project.name}  (nothing pending; {len(done)} prompts kept for reference/re-generation)", ""]
        for a in done:
            lines += [f"{a.id}  scene {', '.join(map(str, a.scenes))}  {a.name}", f"  prompt : {a.prompt.text}", ""]
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text("\n".join(lines), "utf-8")
        return out
    lines = [f"PENDING IMAGES: {project.name}  ({len(todo)} of {len(va.assets)} assets have no file yet)", "",
             f"Project folder : {project}",
             f"Put each file  : {upload_target(project, todo[0].id + '.png').parent}   (e.g. {upload_target(project, todo[0].id + '.png').name})", "",
             "Steps when the images exist:",
             f"  1. Kaggle (automatic): kaggle/images.cmd {num}   -> downloads them into the drop folder above",
             f"     (or generate them yourself from the prompts below and drop the files there)",
             f"  2. studio.cmd assets {num}              -> matches the files, processes them, updates the timeline",
             f"  3. Check the timeline:  studio.cmd ui   (http://127.0.0.1:8790, Timeline page)",
             f"  4. studio.cmd run {num} --format 9:16   -> re-renders only the scenes that got images (preview)",
             f"  5. After you approve:  studio.cmd run {num} --final --format 9:16", "", "=" * 70]
    for a in todo:
        tm = ", ".join(f"{t['start']:.1f}-{t['end']:.1f}s" for t in a.timestamps) or "-"
        o = a.output
        lines += ["", f"{a.id}  scene {', '.join(map(str, a.scenes))}  ({tm})  status: {a.status}",
                  f"  name   : {a.name}",
                  f"  save as: {upload_target(project, a.id + '.' + (o.format or 'png'))}   (final size {o.width}x{o.height})",
                  f"  tool   : {a.prompt.tool or '-'}   aspect {a.prompt.aspect_ratio or '-'}",
                  f"  prompt : {a.prompt.text or '(none yet, ask Claude to write it)'}"]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", "utf-8")
    return out
