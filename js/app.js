let reportData={}
let selectedFormat="image/jpeg"
let currentFileSize=0

const analysis=document.getElementById("analysis")
const dropText=document.getElementById("dropText")

function escapeHTML(str){
return str.replace(/[&<>"']/g,function(m){
return {
"&":"&amp;",
"<":"&lt;",
">":"&gt;",
'"':"&quot;",
"'":"&#039;"
}[m]
})
}

function cleanExifText(value){
if(!value) return ""
let text=value
if(Array.isArray(value)){
text=new TextDecoder("utf-16le").decode(new Uint8Array(value))
}
return text.toString().replace(/\u0000/g,"").replace(/\s+/g," ").trim()
}

const upload=document.getElementById("imageUpload")
const dropZone=document.getElementById("dropZone")
const result=document.getElementById("result")
const preview=document.getElementById("preview")
const metadataBox=document.getElementById("metadata")
const loading=document.getElementById("loading")

/* IMAGE TOOLS */

const imageTools=document.getElementById("imageTools")
const resizeWidth=document.getElementById("resizeWidth")
const resizeHeight=document.getElementById("resizeHeight")
const lockRatio=document.getElementById("lockRatio")

const qualitySlider=document.getElementById("qualitySlider")
const qualityValue=document.getElementById("qualityValue")
qualityValue.textContent = Math.round(qualitySlider.value * 100) + "%"

const resizeBtn=document.getElementById("resizeBtn")

const resizeCanvas=document.getElementById("resizeCanvas")
const resizeCtx=resizeCanvas.getContext("2d")

/* ── PHASE 1: FILE VALIDATION ─────────────────────────── */

function validateFile(file){

/* 1️⃣ File Type Check – robust against empty file.type */
if(!file.type || !file.type.startsWith("image/")){
alert("Please upload a valid image file.")
return false
}

/* 2️⃣ Max File Size – 20 MB */
if(file.size > 20*1024*1024){
alert("Maximum file size is 20 MB. Please upload a smaller image.")
return false
}

return true

}

/* FILE UPLOAD */

upload.addEventListener("change",e=>{
const files=e.target.files

if(files.length===1){
if(!validateFile(files[0])) return
analysis.innerHTML=""
analyzeImage(files[0])
}

if(files.length>1){

const layout = document.querySelector(".tool-layout")
if(layout) layout.style.display = "grid"

dropText.textContent = files.length + " images detected"
analyzeBulk(files)

}
})

/* DRAG & DROP */

dropZone.addEventListener("dragover",e=>{
e.preventDefault()
dropZone.classList.add("dragover")

if(dropText){
dropText.textContent="Release images to analyze"
}
})

dropZone.addEventListener("dragleave",()=>{
dropZone.classList.remove("dragover")

if(dropText){
dropText.textContent="Drop your images to start analysis"
}
})

dropZone.addEventListener("drop", e => {

e.preventDefault()
dropZone.classList.remove("dragover")

const files = e.dataTransfer.files

if(files.length === 1){
if(!validateFile(files[0])) return
analysis.innerHTML=""
analyzeImage(files[0])
}

if(files.length > 1){

const layout = document.querySelector(".tool-layout")
if(layout) layout.style.display = "grid"

dropText.textContent = files.length + " images detected"
analyzeBulk(files)

}

})

/* Drag & Drop Fallback – click to upload */
dropZone.addEventListener("click",()=>upload.click())

let cropMode=false
let currentImage=null

function resetResizeTool(){

resizeWidth.value=""
resizeHeight.value=""

lockRatio.checked=true

qualitySlider.value=0.8
qualityValue.textContent="80%"

selectedFormat="image/jpeg"

document.querySelectorAll(".convert-btn").forEach(b=>{
b.classList.remove("active")
})

document.querySelector('.convert-btn[data-format="image/jpeg"]').classList.add("active")

document.querySelectorAll(".preset").forEach(b=>{
b.classList.remove("active")
})

const resizeResult=document.getElementById("resizeResult")
if(resizeResult){
resizeResult.style.display="none"
}

cropMode=false

}

/* ── PHASE 2: RESET TOOL ──────────────────────────────── */

function resetTool(){

result.innerHTML=""
result.style.display="none"

preview.innerHTML=""
preview.style.display="none"

metadataBox.innerHTML=""
metadataBox.style.display="none"

analysis.innerHTML=""

const ratioCalcBox=document.getElementById("ratioCalc")
if(ratioCalcBox) ratioCalcBox.innerHTML=""

if(imageTools) imageTools.style.display="none"

const layout = document.querySelector(".tool-layout")
if(layout) layout.style.display="none"

upload.value=""
reportData={}
currentImage=null
currentFileSize=0

dropText.textContent="Drop your images to start analysis"

window.scrollTo({top:0,behavior:"smooth"})

}

let aspectRatioResize=1

qualitySlider.addEventListener("input",()=>{
qualityValue.textContent = Math.round(qualitySlider.value * 100) + "%"
})

/* SEO FILENAME CHECK */

function checkFilename(name){

let issues=[]

if(/^(img|dsc|image|photo)[-_]?\d+/i.test(name))
issues.push("Generic camera filename detected")

if(/[A-Z]/.test(name))
issues.push("Avoid uppercase letters")

if(/\s/.test(name))
issues.push("Avoid spaces – use hyphens")

if(name.length>60)
issues.push("Filename is very long")

if(!/-/.test(name))
issues.push("Use hyphens for better SEO")

if(!issues.length)
issues.push("✓ Filename looks SEO friendly")

let html=`<div id="seoFilename" style="margin:0 0 4px 0;">
<h3>Filename SEO</h3>`

issues.forEach(i=>{
html+=`<div class="analysis-row">${i}</div>`
})

html+="</div>"

/* Insert before ISO Paper Sizes h3 */
const isoHeading=Array.from(analysis.querySelectorAll("h3")).find(el=>el.textContent.trim()==="ISO Paper Sizes")
if(isoHeading){
isoHeading.insertAdjacentHTML("beforebegin", html)
}

}

function analyzeImage(file){

currentFileSize=file.size/1024/1024
resetResizeTool()

cropMode=false

const layout = document.querySelector(".tool-layout")
if(layout) layout.style.display = "grid"

/* ── PHASE 2: SPINNER ─── */
if(loading) loading.style.display="flex"
result.style.display="none"
result.innerHTML=""

metadataBox.innerHTML=""
metadataBox.style.display="none"

const img=new Image()
const url=URL.createObjectURL(file)

img.src=url

/* ── PHASE 1: img.onerror ─── */
img.onerror=function(){
if(loading) loading.style.display="none"
result.style.display="block"
result.innerHTML=`<div class="error-box">⚠ Image could not be processed. The file may be corrupted or unsupported.</div>`
}

img.onload=function(){

URL.revokeObjectURL(url)

/* Hide spinner */
if(loading) loading.style.display="none"

preview.style.display="block"
result.style.display="block"

let rotation=0

const w=img.width
const h=img.height
const fileSize=file.size/1024/1024
const megapixels=(w*h)/1000000
const megapixelsDisplay=megapixels.toFixed(2)

/* ENABLE IMAGE TOOLS */

currentImage=img
resizeWidth.value=w
resizeHeight.value=h
aspectRatioResize=w/h

if(imageTools) imageTools.style.display="block"

/* ORIENTATION */

let orientation="Landscape"
if(h>w) orientation="Portrait"
if(h===w) orientation="Square"

/* ASPECT RATIO */

function gcd(a,b){return b===0?a:gcd(b,a%b)}
const ratioW=Math.round(w/gcd(w,h))
const ratioH=Math.round(h/gcd(w,h))
let aspectRatio=`${ratioW}:${ratioH}`

const ratio=w/h

function approx(a,b,t=0.03){return Math.abs(a-b)<t}

if(approx(ratio,1)) aspectRatio="1:1"
else if(approx(ratio,3/2)) aspectRatio="3:2"
else if(approx(ratio,4/3)) aspectRatio="4:3"
else if(approx(ratio,16/9)) aspectRatio="16:9"
else if(approx(ratio,9/16)) aspectRatio="9:16"
else if(approx(ratio,4/5)) aspectRatio="4:5"

let ratioHint=""

if(aspectRatio==="1:1") ratioHint="✓ Ideal for Instagram posts"
else if(aspectRatio==="16:9") ratioHint="✓ Ideal for YouTube thumbnails"
else if(aspectRatio==="9:16") ratioHint="✓ Ideal for TikTok / Reels"
else if(aspectRatio==="4:5") ratioHint="✓ Ideal for Instagram portrait"
else if(aspectRatio==="3:2") ratioHint="✓ Common photo format"

/* ── PHASE 1: BLUR DETECTION – 600px sweet spot ─────── */

function detectBlur(image){

const canvas=document.createElement("canvas")
const ctx=canvas.getContext("2d")

let size=600
let rw=image.width
let rh=image.height

if(rw>size){
rh=rh*(size/rw)
rw=size
}

canvas.width=rw
canvas.height=rh

ctx.drawImage(image,0,0,rw,rh)

const data=ctx.getImageData(0,0,rw,rh).data

let sum=0,sumSq=0,count=0

for(let i=0;i<data.length;i+=32){

let gray=(data[i]+data[i+1]+data[i+2])/3
sum+=gray
sumSq+=gray*gray
count++

}

let mean=sum/count
return (sumSq/count)-(mean*mean)

}

const blurScore=detectBlur(img)

/* SHARPNESS */

let sharpness="GOOD"
let sharpClass="badge-good"

if(blurScore<40){sharpness="LOW DETAIL";sharpClass="badge-bad"}
else if(blurScore<120){sharpness="OK";sharpClass="badge-medium"}

/* PRINT SIZE */

function printSize(dpi){
let wi=w/dpi
let hi=h/dpi
return{wcm:(wi*2.54),hcm:(hi*2.54)}
}

const dpi300=printSize(300)

const a4WidthInch = 8.27
const a4HeightInch = 11.69

const dpiA4 = Math.round(Math.min(w/a4WidthInch, h/a4HeightInch))

let dpiLabel="Low"

if(dpiA4 >= 300) dpiLabel="Excellent"
else if(dpiA4 >= 240) dpiLabel="Good"
else if(dpiA4 >= 180) dpiLabel="OK for small prints"

let dpiClass="badge-bad"

if(dpiA4 >= 300) dpiClass="badge-good"
else if(dpiA4 >= 200) dpiClass="badge-medium"

/* PRINT QUALITY */

let printQuality="Low"
let printClass="badge-bad"

if(dpiA4 >= 300){
printQuality="Excellent"
printClass="badge-good"
}
else if(dpiA4 >= 240){
printQuality="Good"
printClass="badge-good"
}
else if(dpiA4 >= 180){
printQuality="OK"
printClass="badge-medium"
}
else{
printQuality="Small prints only"
printClass="badge-bad"
}

/* WEB SCORE */

let webScore=100
if(fileSize>5) webScore-=30
else if(fileSize>2) webScore-=15
if(w>4000) webScore-=10

let webClass=webScore<50?"badge-bad":webScore<75?"badge-medium":"badge-good"

/* QUALITY SCORE */

let resolutionScore = 0

if(megapixels >= 20) resolutionScore = 100
else if(megapixels >= 12) resolutionScore = 90
else if(megapixels >= 8) resolutionScore = 80
else if(megapixels >= 5) resolutionScore = 65
else if(megapixels >= 3) resolutionScore = 50
else resolutionScore = 35

let sharpnessScore = 0

if(blurScore > 150) sharpnessScore = 100
else if(blurScore > 100) sharpnessScore = 85
else if(blurScore > 60) sharpnessScore = 70
else if(blurScore > 30) sharpnessScore = 50
else sharpnessScore = 30

let dpiScore = 0

if(dpiA4 >= 300) dpiScore = 100
else if(dpiA4 >= 240) dpiScore = 85
else if(dpiA4 >= 200) dpiScore = 70
else if(dpiA4 >= 150) dpiScore = 50
else dpiScore = 30

let finalScore =
resolutionScore * 0.35 +
sharpnessScore * 0.35 +
dpiScore * 0.20 +
webScore * 0.10

let score = Math.round(finalScore)

/* ── PHASE 4: SCORE COLOUR CLASS ─────────────────────── */

let scoreClass=score<50?"score-bad":score<75?"score-medium":"score-good"

/* RETINA */

let retinaStatus=w<1600?"LOW FOR RETINA":"GOOD"
let retinaClass=w<1600?"badge-medium":"badge-good"

/* REPORT DATA */

reportData={
filename:file.name,
width:w,
height:h,
megapixels:megapixelsDisplay,
fileSize:fileSize.toFixed(2),
score:score,
printQuality:printQuality,
sharpness:sharpness,
webScore:webScore,
aspectRatio:aspectRatio
}

/* COLOR PROFILE DEFAULT */

let colorProfile="Unknown"
let colorStatus="badge-medium"

/* WEB SIZE */

let webWidth=1200
let webHeight=Math.round(webWidth/(w/h))

if(webWidth>w){webWidth=w;webHeight=h}

let compressionAdvice="No compression needed"
if(fileSize>3) compressionAdvice="Compress image for faster websites"
else if(fileSize>1) compressionAdvice="Minor compression recommended"

/* ANALYSIS */

let issues=[]
if(megapixels<5) issues.push("⚠ Image resolution is low for large prints")
if(fileSize>5) issues.push("⚠ File size is large for web use")
if(w<1080) issues.push("⚠ Image may be too small for social media")
if(!issues.length) issues.push("✓ Image quality looks good")

let issuesHtml="<h3>Analysis</h3>"
issues.forEach(i=>issuesHtml+=`<div class="analysis-row">${i}</div>`)

/* ── PHASE 4: BEST FOR BOX ─── */

let bestSummary=[]

if(webScore>=70) bestSummary.push("✓ Web")
if(w>=1080) bestSummary.push("✓ Social Media")
if(dpiA4>=200) bestSummary.push("✓ Small Prints")
if(dpiA4>=300) bestSummary.push("✓ Large Prints")
else if(dpiA4<200) bestSummary.push("⚠ Large Prints")

let bestSummaryHtml=""

if(bestSummary.length){
bestSummaryHtml=`
<div class="best-summary">
<div class="best-summary-title">Best for</div>
<div class="best-summary-items">${bestSummary.join(" • ")}</div>
</div>
`
}

/* BEST USE */

let bestUse=[]
if(w>=1080) bestUse.push("✓ Suitable for social media")
if(webScore>=70) bestUse.push("✓ Optimized for websites")
if(megapixels>=6) bestUse.push("✓ Good for small prints")
if(megapixels>=12) bestUse.push("✓ Suitable for high-quality prints")
if(aspectRatio==="1:1") bestUse.push("✓ Ideal for Instagram posts")
if(aspectRatio==="9:16") bestUse.push("✓ Ideal for TikTok / Reels")
if(aspectRatio==="16:9") bestUse.push("✓ Suitable for YouTube thumbnails")

let bestUseHtml="<h3>Best Use</h3>"
bestUse.forEach(i=>bestUseHtml+=`<div class="analysis-row">${i}</div>`)

preview.innerHTML=`
<img src="${img.src}" id="previewImage" alt="Preview of the image being analyzed">
<div class="image-info">
<div><b>Resolution</b> ${w} × ${h} px</div>
<div><b>Megapixels</b> ${megapixelsDisplay} MP</div>
<div><b>File size</b> ${fileSize.toFixed(2)} MB</div>
<div><b>Aspect ratio</b> ${aspectRatio}</div>
${ratioHint?`<div class="ratio-hint">${ratioHint}</div>`:""}
<div><b>Orientation</b> ${orientation}</div>
</div>
`

/* RATIO HINT FOR CALCULATOR */

function ratioUsageHint(r){
const hints={
"16:9":"Ideal for YouTube, video, presentations",
"9:16":"Ideal for TikTok, Reels, Stories",
"1:1":"Ideal for Instagram posts",
"4:5":"Ideal for Instagram portrait",
"4:3":"Classic photo & screen format",
"3:2":"Common DSLR photo format",
"3:4":"Portrait photo format",
"2:1":"Panoramic / cinematic",
"21:9":"Ultrawide cinematic format"
}
return hints[r] || ""
}

const ratioCalcBox=document.getElementById("ratioCalc")
if(ratioCalcBox){

const hint=ratioUsageHint(aspectRatio)

ratioCalcBox.innerHTML=`
<h3>Aspect Ratio Calculator</h3>
<div class="ratio-calculator">
<div class="ratio-display">
<div class="ratio-number" id="ratioNumber">${aspectRatio}</div>
<div class="ratio-sub">${w} × ${h} px</div>
</div>
<div class="ratio-inputs">
<div class="ratio-calc-row">
<label for="ratioInputW">Width</label>
<input type="number" id="ratioInputW" value="${w}" min="1">
<span class="unit">px</span>
</div>
<div class="ratio-calc-row">
<label for="ratioInputH">Height</label>
<input type="number" id="ratioInputH" value="${h}" min="1">
<span class="unit">px</span>
</div>
<div class="ratio-result" id="ratioResult">${aspectRatio}</div>
${hint?`<div class="ratio-usage-hint">${hint}</div>`:""}
</div>
</div>
`

}

let webLabel="Good"

if(webScore < 50) webLabel="Poor"
else if(webScore < 75) webLabel="OK"

result.innerHTML=`

<div class="score-card">

<div class="score-gauge">

<svg viewBox="0 0 200 120" class="gauge">

<path class="gauge-bg"
d="M10 110 A90 90 0 0 1 190 110" />

<path
id="gaugeFill"
class="gauge-fill"
d="M10 110 A90 90 0 0 1 190 110"
pathLength="100"
/>

</svg>

<div class="gauge-center" id="gaugeCenter"></div>

</div>

<div class="score-label">Overall Image Score</div>

<div class="score-info">
Based on resolution, sharpness, print DPI and web optimisation
</div>

${bestSummaryHtml}

<div class="score-actions">
<button id="copyReport">Copy report</button>
<button id="resetBtn" onclick="resetTool()">Analyze another image</button>
</div>

</div>

<div class="result-box">
<span>Print quality</span>
<span class="status-badge ${printClass}">
${printQuality}
</span>
</div>

<div class="result-box">
<span>Sharpness</span>
<span class="status-badge ${sharpClass}">
${sharpness}
</span>
</div>

<div class="result-box">
<span>Color profile</span>
<span class="status-badge ${colorStatus} color-profile-badge">
${colorProfile}
</span>
</div>

<div class="result-hint">
Important for accurate colors in web and print.
</div>

<div class="result-box">
<span>Max print size</span>
<span class="status-badge badge-good">
${dpi300.wcm.toFixed(1)} × ${dpi300.hcm.toFixed(1)} cm (300 DPI)
</span>
</div>

<div class="result-box">
<span>Print resolution</span>
<span class="status-badge ${dpiClass}">
${dpiA4} DPI (${dpiLabel})
</span>
</div>

<div class="result-box">
<span>Poster print size</span>
<span class="status-badge badge-medium">
${(w/200*2.54).toFixed(1)} × ${(h/200*2.54).toFixed(1)} cm (200 DPI)
</span>
</div>

<div class="result-box">
<span>Web optimisation score</span>
<span class="status-badge ${webClass}">
${webScore}/100 (${webLabel})
</span>
</div>

<div class="result-box">
<span>Recommended web size</span>
<span class="status-badge badge-good">
${webWidth} × ${webHeight} px
</span>
</div>

<div class="result-box">
<span>Compression</span>
<span class="status-badge badge-medium">
${compressionAdvice}
</span>
</div>

`

updateGauge(score)

function checkFormat(wcm,hcm){

let dpi200w=w/200*2.54
let dpi200h=h/200*2.54

if(dpi300.wcm>=wcm && dpi300.hcm>=hcm){
return `<span class="status-badge badge-good">GOOD</span>`
}

if(dpi200w>=wcm && dpi200h>=hcm){
return `<span class="status-badge badge-medium">OK</span>`
}

return `<span class="status-badge badge-bad">TOO SMALL</span>`

}

function socialCheck(wr,hr){

if(w>=wr && h>=hr){
return `<span class="status-badge badge-good">GOOD</span>`
}

return `<span class="status-badge badge-bad">TOO SMALL</span>`

}

analysis.innerHTML=`

${issuesHtml}
${bestUseHtml}

<h3>ISO Paper Sizes</h3>

<div class="format-row"><span>A4 (21 × 29.7 cm)</span>${checkFormat(21,29.7)}</div>
<div class="format-row"><span>A3 (29.7 × 42 cm)</span>${checkFormat(29.7,42)}</div>
<div class="format-row"><span>A2 (42 × 59.4 cm)</span>${checkFormat(42,59.4)}</div>

<h3>US Paper Sizes</h3>

<div class="format-row"><span>Letter (8.5 × 11 in)</span>${checkFormat(21.6,27.9)}</div>
<div class="format-row"><span>Legal (8.5 × 14 in)</span>${checkFormat(21.6,35.6)}</div>
<div class="format-row"><span>Tabloid (11 × 17 in)</span>${checkFormat(27.9,43.2)}</div>

<h3>Photo Prints</h3>

<div class="format-row"><span>4×6 in (10×15 cm)</span>${checkFormat(10,15)}</div>
<div class="format-row"><span>5×7 in (13×18 cm)</span>${checkFormat(13,18)}</div>
<div class="format-row"><span>8×10 in (20×25 cm)</span>${checkFormat(20,25)}</div>

<h3>Social Media Formats</h3>

<div class="format-row">
<span>Instagram Post (1080×1080)</span>
<div>
${socialCheck(1080,1080)}
<button class="resize-format" data-w="1080" data-h="1080">Generate</button>
</div>
</div>

<div class="format-row">
<span>Instagram Portrait (1080×1350)</span>
<div>
${socialCheck(1080,1350)}
<button class="resize-format" data-w="1080" data-h="1350">Generate</button>
</div>
</div>

<div class="format-row">
<span>Instagram Story / Reel (1080×1920)</span>
<div>
${socialCheck(1080,1920)}
<button class="resize-format" data-w="1080" data-h="1920">Generate</button>
</div>
</div>

<div class="format-row">
<span>TikTok Video (1080×1920)</span>
<div>
${socialCheck(1080,1920)}
<button class="resize-format" data-w="1080" data-h="1920">Generate</button>
</div>
</div>

<div class="format-row">
<span>Pinterest Pin (1000×1500)</span>
<div>
${socialCheck(1000,1500)}
<button class="resize-format" data-w="1000" data-h="1500">Generate</button>
</div>
</div>

<div class="format-row">
<span>Facebook Post (1200×630)</span>
<div>
${socialCheck(1200,630)}
<button class="resize-format" data-w="1200" data-h="630">Generate</button>
</div>
</div>

<div class="format-row">
<span>LinkedIn Post (1200×627)</span>
<div>
${socialCheck(1200,627)}
<button class="resize-format" data-w="1200" data-h="627">Generate</button>
</div>
</div>

<div class="format-row">
<span>YouTube Thumbnail (1280×720)</span>
<div>
${socialCheck(1280,720)}
<button class="resize-format" data-w="1280" data-h="720">Generate</button>
</div>
</div>

<div class="format-row">
<span>YouTube Banner (2560×1440)</span>
<div>
${socialCheck(2560,1440)}
<button class="resize-format" data-w="2560" data-h="1440">Generate</button>
</div>
</div>

`

checkFilename(file.name)

/* ── PHASE 1: EXIF try/catch ─────────────────────────── */

try{

EXIF.getData(file,function(){

const orientationTag=EXIF.getTag(this,"Orientation")

if(orientationTag===6) rotation=90
if(orientationTag===8) rotation=-90
if(orientationTag===3) rotation=180

const imgPreview=document.getElementById("previewImage")
if(imgPreview) imgPreview.style.transform=`rotate(${rotation}deg)`

/* COLOR PROFILE */

const colorSpace=EXIF.getTag(this,"ColorSpace")

if(colorSpace===1){
colorProfile="sRGB ✓ (best for web)"
colorStatus="badge-good"
}
else if(colorSpace===65535){
colorProfile="Adobe RGB ⚠"
colorStatus="badge-medium"
}
else{
colorProfile="Likely sRGB"
colorStatus="badge-good"
}

const badge=document.querySelector(".color-profile-badge")
if(badge){
badge.textContent=colorProfile
badge.className=`status-badge ${colorStatus} color-profile-badge`
}

/* METADATA */

const tags={
Camera:EXIF.getTag(this,"Model"),
Lens:EXIF.getTag(this,"LensModel"),
Date:EXIF.getTag(this,"DateTimeOriginal"),
DPI:EXIF.getTag(this,"XResolution"),
Author:EXIF.getTag(this,"Artist"),
Copyright:EXIF.getTag(this,"Copyright"),
Software:EXIF.getTag(this,"Software"),
Description:EXIF.getTag(this,"ImageDescription")
}

let metadata="<h3>Metadata</h3>"
let found=false

for(let key in tags){
let val=cleanExifText(tags[key])
if(val){
metadata+=`<b>${key}:</b> ${val}<br>`
found=true
}
}

if(!found){
metadata+="No metadata found in this image."
}

/* PRIVACY */

let privacyIssues=[]

if(EXIF.getTag(this,"Model"))
privacyIssues.push("⚠ Camera model included")

if(EXIF.getTag(this,"GPSLatitude"))
privacyIssues.push("⚠ GPS location included")

if(EXIF.getTag(this,"Artist") || EXIF.getTag(this,"Copyright"))
privacyIssues.push("⚠ Author metadata included")

if(!privacyIssues.length)
privacyIssues.push("✓ No sensitive metadata found")

let privacyHtml="<div class='metadata-privacy'><h3>Metadata privacy</h3>"

privacyIssues.forEach(i=>{
privacyHtml+=`<div class="analysis-row">${i}</div>`
})

privacyHtml+="</div>"

metadataBox.innerHTML=metadata+privacyHtml
metadataBox.style.display="block"

})

}catch(e){
console.log("EXIF error",e)
}

}

}

/* RESIZE */

resizeWidth.addEventListener("input",()=>{

cropMode=false

if(lockRatio.checked){
resizeHeight.value=Math.round(resizeWidth.value/aspectRatioResize)
}

})

resizeHeight.addEventListener("input",()=>{

cropMode=false

if(lockRatio.checked){
resizeWidth.value=Math.round(resizeHeight.value*aspectRatioResize)
}

})

const presetStatus=document.getElementById("presetStatus")

document.querySelectorAll(".preset").forEach(btn=>{

btn.addEventListener("click",()=>{

document.querySelectorAll(".preset").forEach(b=>{
b.classList.remove("active")
})

btn.classList.add("active")

const size=parseInt(btn.dataset.size)

resizeWidth.value=size
resizeHeight.value=Math.round(size/aspectRatioResize)

if(presetStatus){

presetStatus.textContent="✓ "+btn.textContent+" applied"
presetStatus.style.opacity="1"

setTimeout(()=>{
presetStatus.style.opacity="0"
},2000)

}

})

})

resizeBtn.addEventListener("click",()=>{

if(!currentImage) return

const width=parseInt(resizeWidth.value)
const height=parseInt(resizeHeight.value)

resizeCanvas.width=width
resizeCanvas.height=height

if(cropMode){

/* CROP TO FORMAT */

const imgRatio=currentImage.width/currentImage.height
const targetRatio=width/height

let sx=0
let sy=0
let sw=currentImage.width
let sh=currentImage.height

if(imgRatio>targetRatio){

sw=currentImage.height*targetRatio
sx=(currentImage.width-sw)/2

}else{

sh=currentImage.width/targetRatio
sy=(currentImage.height-sh)/2

}

resizeCtx.drawImage(
currentImage,
sx,sy,sw,sh,
0,0,width,height
)

}else{

/* NORMAL RESIZE */

resizeCtx.drawImage(currentImage,0,0,width,height)

}

const format=selectedFormat
const quality=parseFloat(qualitySlider.value)

resizeCanvas.toBlob(function(blob){

const url=URL.createObjectURL(blob)

const ext=format.split("/")[1]

const link=document.createElement("a")

link.href=url
link.download=`image-${width}x${height}.${ext}`

document.body.appendChild(link)
link.click()
document.body.removeChild(link)

setTimeout(()=>URL.revokeObjectURL(url),1000)

/* COMPRESSION INFO */

const newSize=blob.size/1024/1024

const saved=((currentFileSize - newSize) / currentFileSize * 100).toFixed(1)

let qualityLoss="Minimal"
if(quality < 0.5) qualityLoss="High"
else if(quality < 0.7) qualityLoss="Medium"
else if(quality < 0.9) qualityLoss="Minimal"
else qualityLoss="None"

const resizeResult=document.getElementById("resizeResult")

resizeResult.innerHTML=`
<div class="compression-row">
<span>Original size</span>
<span>${currentFileSize.toFixed(2)} MB</span>
</div>
<div class="compression-row">
<span>Compressed</span>
<span>${newSize.toFixed(2)} MB</span>
</div>
<div class="compression-row compression-saved">
<span>Saved</span>
<span>${saved}%</span>
</div>
<div class="compression-row">
<span>Quality loss</span>
<span>${qualityLoss}</span>
</div>
`

resizeResult.style.display="block"

},format,quality)

})

analysis.addEventListener("click",function(e){

if(!e.target.classList.contains("resize-format")) return

const w=e.target.dataset.w
const h=e.target.dataset.h

resetResizeTool()

resizeWidth.value=w
resizeHeight.value=h

lockRatio.checked=false
cropMode=true

document.querySelectorAll(".preset").forEach(b=>{
b.classList.remove("active")
})

window.scrollTo({
top:imageTools.offsetTop-40,
behavior:"smooth"
})

})

document.querySelectorAll(".convert-btn").forEach(btn=>{

btn.addEventListener("click",()=>{

document.querySelectorAll(".convert-btn").forEach(b=>{
b.classList.remove("active")
})

btn.classList.add("active")

selectedFormat=btn.dataset.format

})

})

function socialReport(w,h,wr,hr){
return (w>=wr && h>=hr) ? "✓" : "Too small"
}

function copyReport(){

if(!reportData.width) return

const text=`
IMAGE QUALITY REPORT
--------------------

File
----
Filename: ${reportData.filename}
Resolution: ${reportData.width} x ${reportData.height}
Megapixels: ${reportData.megapixels} MP
Aspect ratio: ${reportData.aspectRatio}
File size: ${reportData.fileSize} MB

Quality
-------
Quality score: ${reportData.score}/100
Sharpness: ${reportData.sharpness}

Print
-----
Print quality: ${reportData.printQuality}
Recommended print size: ${(reportData.width/300*2.54).toFixed(1)} x ${(reportData.height/300*2.54).toFixed(1)} cm (300 DPI)
Poster size: ${(reportData.width/200*2.54).toFixed(1)} x ${(reportData.height/200*2.54).toFixed(1)} cm (200 DPI)

Web Optimisation
----------------
Web optimisation score: ${reportData.webScore}/100

Social Media
------------
Instagram Post (1080x1080): ${socialReport(reportData.width,reportData.height,1080,1080)}
Instagram Portrait (1080x1350): ${socialReport(reportData.width,reportData.height,1080,1350)}
Instagram Story (1080x1920): ${socialReport(reportData.width,reportData.height,1080,1920)}
TikTok (1080x1920): ${socialReport(reportData.width,reportData.height,1080,1920)}
Facebook Post (1200x630): ${socialReport(reportData.width,reportData.height,1200,630)}
YouTube Thumbnail (1280x720): ${socialReport(reportData.width,reportData.height,1280,720)}
Pinterest Pin (1000x1500): ${socialReport(reportData.width,reportData.height,1000,1500)}
LinkedIn Post (1200x627): ${socialReport(reportData.width,reportData.height,1200,627)}

Recommendations
---------------
${reportData.webScore < 70 ? "⚠ Consider compressing the image for faster websites" : "✓ Web size looks good"}
${reportData.score > 80 ? "✓ High quality image" : "⚠ Image quality could be improved"}

Generated with Image Checker Tool
Free image analysis in your browser
`

navigator.clipboard.writeText(text)

const btn=document.getElementById("copyReport")

btn.textContent="Copied ✓"

setTimeout(()=>{
btn.textContent="Copy report"
},2000)

}

document.addEventListener("click",function(e){

if(e.target.id==="copyReport"){
copyReport()
}

if(e.target.id==="copyBatchReport"){
copyBatchReport()
}

})

function bulkPrintQuality(mp){

if(mp >= 12) return '<span class="badge-good">Excellent</span>'
if(mp >= 6) return '<span class="badge-medium">Good</span>'
if(mp >= 3) return '<span class="badge-medium">Small</span>'

return '<span class="badge-bad">Low</span>'

}

function bulkScore(w,h){

const mp=(w*h)/1000000

let score=0

if(mp>12) score=90
else if(mp>8) score=85
else if(mp>5) score=80
else if(mp>3) score=70
else if(mp>2) score=65
else if(mp>1) score=55
else score=40

return Math.round(score)

}

function bulkStatus(score){

if(score>=85) return `<span class="badge-good">Excellent</span>`
if(score>=65) return `<span class="badge-medium">Good</span>`
return `<span class="badge-bad">Low</span>`

}

function socialCheckBulk(w,h){

return{
insta: (w>=1080 && h>=1080) ? "✓" : "⚠",
story: (w>=1080 && h>=1920) ? "✓" : "⚠",
tiktok: (w>=1080 && h>=1920) ? "✓" : "⚠",
facebook: (w>=1200 && h>=630) ? "✓" : "⚠",
pinterest: (w>=1000 && h>=1500) ? "✓" : "⚠",
linkedin: (w>=1200 && h>=627) ? "✓" : "⚠",
youtube: (w>=1280 && h>=720) ? "✓" : "⚠"
}

}

function analyzeBulk(files){

/* Clear any previous single-image analysis */
preview.innerHTML=""
preview.style.display="none"

result.innerHTML=""
result.style.display="none"

metadataBox.innerHTML=""
metadataBox.style.display="none"

const ratioCalcBox=document.getElementById("ratioCalc")
if(ratioCalcBox) ratioCalcBox.innerHTML=""

if(imageTools) imageTools.style.display="none"

currentImage=null

let bestScore=0
let bestRow=null
let rows=[]

analysis.innerHTML=`
<div class="bulk-header">
<h3>Bulk Image Analysis (${files.length} images)</h3>
<button id="copyBatchReport">Copy report</button>
</div>

<table class="bulk-table">
<tr>
<th>Filename</th>
<th>MP</th>
<th>Resolution</th>
<th>Quality Score</th>
<th>Print</th>
<th>IG Post</th>
<th>IG Story</th>
<th>TikTok</th>
<th>Facebook</th>
<th>Pinterest</th>
<th>LinkedIn</th>
<th>YouTube</th>
</tr>
</table>
`

const table=analysis.querySelector(".bulk-table")

Array.from(files).forEach(file=>{

if(!file.type || !file.type.startsWith("image/")) return

const img=new Image()
const url=URL.createObjectURL(file)

img.onload=function(){

const w=img.width
const h=img.height
const mp=((w*h)/1000000).toFixed(2)
const printQuality = bulkPrintQuality(parseFloat(mp))

const score=bulkScore(w,h)
const status=bulkStatus(score)
const social=socialCheckBulk(w,h)

const row=document.createElement("tr")

row.innerHTML=`
<td class="filename-cell">
<div class="file-name">${escapeHTML(file.name)}</div>
</td>
<td>${mp}</td>
<td>${w}×${h}</td>
<td><strong>${score}</strong>/100 ${status}</td>
<td>${printQuality}</td>

<td>${social.insta === "✓" ? '<span class="badge-good">✓</span>' : '<span class="badge-medium">⚠</span>'}</td>

<td>${social.story === "✓" ? '<span class="badge-good">✓</span>' : '<span class="badge-medium">⚠</span>'}</td>

<td>${social.tiktok === "✓" ? '<span class="badge-good">✓</span>' : '<span class="badge-medium">⚠</span>'}</td>

<td>${social.facebook === "✓" ? '<span class="badge-good">✓</span>' : '<span class="badge-medium">⚠</span>'}</td>

<td>${social.pinterest === "✓" ? '<span class="badge-good">✓</span>' : '<span class="badge-medium">⚠</span>'}</td>

<td>${social.linkedin === "✓" ? '<span class="badge-good">✓</span>' : '<span class="badge-medium">⚠</span>'}</td>

<td>${social.youtube === "✓" ? '<span class="badge-good">✓</span>' : '<span class="badge-medium">⚠</span>'}</td>
`

table.appendChild(row)
rows.push(row)

if(score > bestScore){
bestScore = score
bestRow = row
}
row.dataset.score = score

URL.revokeObjectURL(url)

}

img.src=url

})

setTimeout(()=>{

let highest = 0
let best = null

rows.forEach(r=>{
const score=parseInt(r.dataset.score || 0)

if(score > highest){
highest = score
best = r
}
})

if(best){

best.style.background="#f0fff4"

const cell = best.children[0]

const indicator=document.createElement("div")
indicator.className="best-indicator"
indicator.textContent="⭐ Best image"

cell.appendChild(indicator)

}

},100)

}

function copyBatchReport(){

const rows = document.querySelectorAll(".bulk-table tr")

let text = "BULK IMAGE REPORT\n"
text += "------------------\n\n"

let bestScore = 0

rows.forEach((row,i)=>{
if(i===0) return
const score = parseInt(row.dataset.score || 0)
if(score > bestScore){ bestScore = score }
})

rows.forEach((row,i)=>{

if(i===0) return

const imageNumber = i
const rowScore = parseInt(row.dataset.score || 0)

const cols = row.querySelectorAll("td")

const name = cols[0].textContent
const mp = cols[1].textContent
const res = cols[2].textContent
const score = cols[3].textContent
const print = cols[4].textContent

const ig = cols[5].textContent === "✓" ? "✓ OK" : "⚠ Too small"
const story = cols[6].textContent === "✓" ? "✓ OK" : "⚠ Too small"
const tiktok = cols[7].textContent === "✓" ? "✓ OK" : "⚠ Too small"
const facebook = cols[8].textContent === "✓" ? "✓ OK" : "⚠ Too small"
const pinterest = cols[9].textContent === "✓" ? "✓ OK" : "⚠ Too small"
const linkedin = cols[10].textContent === "✓" ? "✓ OK" : "⚠ Too small"
const youtube = cols[11].textContent === "✓" ? "✓ OK" : "⚠ Too small"

text += `Image ${imageNumber}${rowScore === bestScore ? " ⭐ BEST IMAGE" : ""}\n`
text += "-------\n"
text += `Filename: ${name}\n`
text += `Resolution: ${res}\n`
text += `Megapixels: ${mp}\n`
text += `Score: ${score}\n`
text += `Print: ${print}\n\n`

text += `Instagram Post: ${ig}\n`
text += `Instagram Story: ${story}\n`
text += `TikTok: ${tiktok}\n`
text += `Facebook: ${facebook}\n`
text += `Pinterest: ${pinterest}\n`
text += `LinkedIn: ${linkedin}\n`
text += `YouTube: ${youtube}\n\n`

})

navigator.clipboard.writeText(text)

const btn=document.getElementById("copyBatchReport")

btn.textContent="Copied ✓"

setTimeout(()=>{
btn.textContent="Copy report"
},2000)

}

function updateGauge(score){

const fill = document.getElementById("gaugeFill")
const offset = 100 - score

fill.style.strokeDashoffset = offset

if(score < 50){
fill.style.stroke = "#ef4444"
}
else if(score < 75){
fill.style.stroke = "#f59e0b"
}
else{
fill.style.stroke = "#22c55e"
}

/* ── PHASE 4: SCORE COLOUR ─── */
const scoreClass = score < 50 ? "score-bad" : score < 75 ? "score-medium" : "score-good"

const center = document.getElementById("gaugeCenter")
center.innerHTML = `
<div class="gauge-title">Image Quality</div>
<div class="gauge-score ${scoreClass}">${score}%</div>
`

}

/* ── ASPECT RATIO CALCULATOR ─────────────────────────── */

function calcRatio(w,h){
function gcd(a,b){ return b===0 ? a : gcd(b,a%b) }
const r=gcd(Math.round(w),Math.round(h))
return Math.round(w/r)+":"+Math.round(h/r)
}

document.addEventListener("input",function(e){

if(e.target.id !== "ratioInputW" && e.target.id !== "ratioInputH") return

const inputW=document.getElementById("ratioInputW")
const inputH=document.getElementById("ratioInputH")
const ratioResult=document.getElementById("ratioResult")
const ratioUsage=document.querySelector(".ratio-usage-hint")

if(!inputW || !inputH || !ratioResult) return

const w=parseInt(inputW.value)
const h=parseInt(inputH.value)

if(w > 0 && h > 0){

const r=calcRatio(w,h)
ratioResult.textContent=r

if(ratioUsage){
const hint=ratioUsageHint(r)
ratioUsage.textContent=hint
ratioUsage.style.display=hint?"block":"none"
}

}

})