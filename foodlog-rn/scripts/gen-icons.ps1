# Generates Foodlog brand icons: the three descending bars (the wordmark) in
# white, on a food-green gradient (icon/favicon) or transparent (adaptive/splash).
Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot "..\assets\images"
$dir = [System.IO.Path]::GetFullPath($dir)

function New-Bitmap([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  return @($bmp, $g)
}

function Add-RoundRect($path, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
}

# Draws the three descending bars, centered, filling ~fillFrac of the canvas.
function Draw-Mark($g, [int]$size, [double]$fillFrac) {
  $barCount = 3
  $totalW = $size * $fillFrac
  $gap = $totalW * 0.14
  $barW = ($totalW - $gap * ($barCount - 1)) / $barCount
  $barH = $size * ($fillFrac + 0.06)
  if ($barH -gt $size * 0.62) { $barH = $size * 0.62 }
  $startX = ($size - $totalW) / 2
  $y = ($size - $barH) / 2
  $r = $barW * 0.28
  $alphas = @(255, 150, 82)
  for ($i = 0; $i -lt $barCount; $i++) {
    $x = $startX + $i * ($barW + $gap)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    Add-RoundRect $path $x $y $barW $barH $r
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($alphas[$i], 255, 255, 255))
    $g.FillPath($brush, $path)
    $brush.Dispose(); $path.Dispose()
  }
}

function Save-Icon([int]$size, [string]$name, [bool]$greenBg, [double]$fillFrac) {
  $r = New-Bitmap $size
  $bmp = $r[0]; $g = $r[1]
  if ($greenBg) {
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $c1 = [System.Drawing.Color]::FromArgb(55, 176, 99)   # #37B063
    $c2 = [System.Drawing.Color]::FromArgb(13, 95, 43)    # #0D5F2B
    $lg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    Add-RoundRect $path 0 0 $size $size ($size * 0.225)
    $g.FillPath($lg, $path)
    $lg.Dispose(); $path.Dispose()
  }
  Draw-Mark $g $size $fillFrac
  $out = Join-Path $dir $name
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output "wrote $name ($size x $size)"
}

Save-Icon 1024 "icon.png" $true 0.5
Save-Icon 1024 "adaptive-foreground.png" $false 0.42
Save-Icon 1024 "splash-icon.png" $false 0.5
Save-Icon 196  "favicon.png" $true 0.5
Save-Icon 1024 "android-icon-foreground.png" $false 0.42
Write-Output "done -> $dir"
