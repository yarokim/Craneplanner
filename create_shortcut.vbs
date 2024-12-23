Set WshShell = WScript.CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
Set oShellLink = WshShell.CreateShortcut("CranePlanner.lnk")
oShellLink.TargetPath = "http://10.200.19.106:5000"
oShellLink.IconLocation = WScript.Arguments(0)
oShellLink.Save
