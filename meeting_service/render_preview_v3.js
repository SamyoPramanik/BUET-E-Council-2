const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, 'utils', 'fonts', 'SonarBangla.ttf');
const fontBase64 = fs.existsSync(fontPath) 
    ? `data:font/ttf;base64,${fs.readFileSync(fontPath).toString('base64')}` 
    : '';

const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        @font-face { font-family: 'PrimaryFont'; src: url(${fontBase64}) format('truetype'); }
        body {
            font-family: 'PrimaryFont', sans-serif;
            font-size: 14px;
            line-height: 1.5;
            padding: 30px;
            background: #fff;
            color: #000;
        }
        .text-center { text-align: center; }
        .header-title { font-size: 19px; margin-bottom: 10px; font-weight: bold; }
        .sub-title { font-size: 16px; text-decoration: underline; margin-bottom: 20px; }
        .presentees-header { font-size: 15px; text-decoration: underline; margin-bottom: 15px; font-weight: bold; }
        .columns-container {
            column-count: 2;
            column-gap: 40px;
            column-fill: auto;
            font-size: 13px;
            margin-bottom: 30px;
        }
        .presentee-section {
            margin-bottom: 15px;
        }
        .section-title {
            font-weight: bold;
            margin-bottom: 5px;
            break-inside: avoid;
            break-after: avoid;
        }
        .presentee-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            break-inside: avoid;
        }
        .p-name { width: 75%; text-align: left; }
        .p-suffix { width: 25%; text-align: right; }
    </style>
</head>
<body>
    <div class="text-center header-title">বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়, ঢাকা</div>
    <div class="text-center sub-title">১৫ জুলাই ২০২৬ তারিখে অনুষ্ঠিত ৫২৫নং সভার কার্যবিবরণী</div>

    <div class="presentees-header">উপস্থিত সদস্যবৃন্দ</div>
    <div class="columns-container">
        <!-- Top leadership (VC and Pro VC) at top without any section header -->
        <div class="presentee-section">
            <div class="presentee-row">
                <div class="p-name">অধ্যাপক ড. সত্য প্রসাদ মজুমদার,<br/>উপাচার্য,<br/>বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়, ঢাকা</div>
                <div class="p-suffix">সভাপতি</div>
            </div>
            <div class="presentee-row">
                <div class="p-name">অধ্যাপক ড. আব্দুল হাসীব চৌধুরী,<br/>উপ-উপাচার্য,<br/>বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়, ঢাকা</div>
                <div class="p-suffix">সদস্য</div>
            </div>
        </div>

        <div class="presentee-section">
            <div class="section-title"><u>সকল ডিন</u></div>
            <div class="presentee-row">
                <div class="p-name">অধ্যাপক ড. মো: রফিকুল ইসলাম (ডিন, সিভিল ইঞ্জিনিয়ারিং অনুষদ)</div>
                <div class="p-suffix">সদস্য</div>
            </div>
        </div>

        <div class="presentee-section">
            <div class="section-title"><u>সকল বিভাগীয় প্রধান</u></div>
            <div class="presentee-row">
                <div class="p-name">অধ্যাপক ড. মো: মাহমুদুর রহমান (সিএসই বিভাগ)</div>
                <div class="p-suffix">সদস্য</div>
            </div>
        </div>

        <!-- Registrar and other admin officials merged into 'অন্যান্য সদস্য' -->
        <div class="presentee-section">
            <div class="section-title"><u>অন্যান্য সদস্য</u></div>
            <div class="presentee-row">
                <div class="p-name">অধ্যাপক ড. মো: নাজমুল ইসলাম, <br/>রেজিস্ট্রার</div>
                <div class="p-suffix">সদস্য</div>
            </div>
        </div>
    </div>
</body>
</html>
`;

(async () => {
    const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 850, height: 600 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready.then(() => true));
    const outPath = '/tmp/presentees_preview_v3.png';
    await page.screenshot({ path: outPath, fullPage: true });
    await browser.close();
    console.log('Saved preview screenshot to', outPath);
})();
