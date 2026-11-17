' Upload-path sheet watcher: runs `studio.cmd sheet --watch` with no window.
' A new thumbnail in input/ or a new final in output/ reaches the Google Sheet within ~30 s.
' Log: tools\.cache\sheet_watch.log. Stop it: Task Manager > python.exe, or restart the PC.
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
q = Chr(34)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = dir
sh.Run "cmd /c " & q & q & dir & "\studio.cmd" & q & " sheet --watch >> " & q & dir & "\tools\.cache\sheet_watch.log" & q & " 2>&1" & q, 0, False
