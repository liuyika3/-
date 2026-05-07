#Requires -Version 5.1
<#
  本仓库专用 GitHub SSH：使用 ~/.ssh/id_ed25519_dmoes（避免旧 id_ed25519 权限过宽被 OpenSSH 拒绝）。

  第一次使用前：
  1) 运行本脚本，复制输出的公钥；
  2) 打开 https://github.com/settings/keys → New SSH key（或仓库 Settings → Deploy keys 勾选 Allow write access）粘贴保存；
  3) 再运行一次本脚本末尾的 ssh -T / git push。
#>
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$key = Join-Path $env:USERPROFILE '.ssh\id_ed25519_dmoes'
$keyPub = "$key.pub"

if (-not (Test-Path $key)) {
  Write-Host '正在生成专用密钥 id_ed25519_dmoes ...' -ForegroundColor Cyan
  ssh-keygen -t ed25519 -f $key -N '""' -C 'dmoes-liuyika3'
  icacls $key /inheritance:r | Out-Null
  icacls $key /grant:r 'NT AUTHORITY\SYSTEM:R' | Out-Null
  icacls $key /grant:r "$($env:USERDOMAIN)\$($env:USERNAME):(R)" | Out-Null
}

Set-Location $repoRoot
$keyUnix = ($key -replace '\\', '/').Replace('//', '/')
$sshCmd = "ssh -i $keyUnix -o IdentitiesOnly=yes"
git config core.sshCommand $sshCmd
git remote set-url origin 'git@github.com:liuyika3/-.git'

Write-Host "`n=== 公钥（整行复制到 GitHub）===" -ForegroundColor Green
Get-Content $keyPub
Write-Host "`n本仓库已设置: git config core.sshCommand" -ForegroundColor DarkGray
Write-Host $sshCmd

Write-Host "`n测试连接（成功应出现 Hi liuyika3! ...）..." -ForegroundColor Cyan
ssh -i $key -o IdentitiesOnly=yes -T git@github.com 2>&1

Write-Host "`n推送 main：" -ForegroundColor Cyan
git push -u origin main
