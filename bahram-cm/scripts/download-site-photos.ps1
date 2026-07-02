# دانلود عکس‌های `public/media/site-photos/` از اینترنت.
# مطابق proxy.pac (SOCKS … ; PROXY 10.185.73.83:8080) از HTTP پروکسی روی پورت ۸۰۸۰ استفاده می‌کند.
$ErrorActionPreference = "Continue"
$proxyUri = "http://10.185.73.83:8080"
$webRoot = Split-Path $PSScriptRoot -Parent
$dir = Join-Path $webRoot "public\media\site-photos"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

# لینک‌ها با `ixlib=rb-4.0.3` (CDN Unsplash)؛ در صورت 404 همان نام فایل را با URL دیگر عوض کن.
$hdr = @{ "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
$q = "ixlib=rb-4.0.3&auto=format&fit=crop"
$map = [ordered]@{
  "portrait-founder.jpg"     = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?$q&w=1600&q=80"
  "square-studio.jpg"        = "https://images.unsplash.com/photo-1497366216548-37526070297c?$q&w=1200&q=80"
  "landscape-session.jpg"    = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?$q&w=1600&q=80"
  "social-01.jpg"            = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?$q&w=900&q=80"
  "social-02.jpg"            = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?$q&w=900&q=80"
  "social-03.jpg"            = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?$q&w=900&q=80"
  "social-04.jpg"            = "https://images.unsplash.com/photo-1531482615713-2afd69097998?$q&w=900&q=80"
  "social-05.jpg"            = "https://images.unsplash.com/photo-1556761175-b413da4baf72?$q&w=900&q=80"
  "social-06.jpg"            = "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?$q&w=900&q=80"
  "manifesto-portrait-a.jpg" = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?$q&w=1200&q=80"
  "manifesto-portrait-b.jpg" = "https://images.unsplash.com/photo-1580489944761-15a19d654956?$q&w=1200&q=80"
  "manifesto-landscape.jpg"  = "https://images.unsplash.com/photo-1524758631624-e2822e304c36?$q&w=1600&q=80"
  "cta-portrait.jpg"         = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?$q&w=1200&q=80"
  "cta-square.jpg"           = "https://images.unsplash.com/photo-1553877522-43269d4ea984?$q&w=900&q=80"
  "testimonial-01.jpg"       = "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?$q&w=1200&q=80"
  "testimonial-02.jpg"       = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?$q&w=1200&q=80"
  "testimonial-03.jpg"       = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?$q&w=1200&q=80"
  "Academy-story.jpg"         = "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?$q&w=900&q=80"
  "Academy-accent.jpg"        = "https://images.unsplash.com/photo-1551434678-e076c223a692?$q&w=900&q=80"
  "square-backstage.jpg"     = "https://images.unsplash.com/photo-1519389950473-47ba0277781c?$q&w=900&q=80"
  "course-backstage.jpg"     = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?$q&w=900&q=80"
  "story-step-01.jpg"        = "https://images.unsplash.com/photo-1552664730-d307ca884978?$q&w=1400&q=80"
  "story-step-02.jpg"        = "https://images.unsplash.com/photo-1553877522-43269d4ea984?$q&w=1400&q=80"
  "story-step-03.jpg"        = "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?$q&w=1400&q=80"
  "story-step-04.jpg"        = "https://images.unsplash.com/photo-1507679799987-c73779587ccf?$q&w=1400&q=80"
}

$failed = @()
foreach ($name in $map.Keys) {
  $url = $map[$name]
  $dest = Join-Path $dir $name
  Write-Host "Downloading $name ..."
  try {
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -Proxy $proxyUri -Headers $hdr
  } catch {
    Write-Host "FAIL ${name}: $_"
    $failed += $name
  }
}

if ($failed.Count -gt 0) {
  Write-Host "Finished with $($failed.Count) failure(s): $($failed -join ', ')"
  exit 1
}
Write-Host "OK: $($map.Count) files in $dir"
exit 0
