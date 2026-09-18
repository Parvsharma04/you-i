# Google Play Store asset checklist

Tick each item when the asset is ready and exported to `apps/mobile/assets/store/`.

## App icon

- [ ] **512 × 512 px** PNG or JPEG
  - 32-bit PNG with alpha recommended
  - Max 1 MB
  - Source: `apps/mobile/assets/images/icon.png` (1024 × 1024) — downscale and ensure safe area

## Feature graphic

- [ ] **1024 × 500 px** PNG or JPEG
  - Max 1 MB
  - Keep text/logos inside the center 924 × 500 px safe area; edges may be cropped
  - No transparency

## Phone screenshots

Google Play requires **at least 2** phone screenshots and allows up to **8**.

- [ ] Screenshot 1 — **1080 × 1920 px** (9:16) portrait
- [ ] Screenshot 2 — **1080 × 1920 px** (9:16) portrait
- [ ] Screenshot 3 — **1080 × 1920 px** (9:16) portrait (optional)
- [ ] Screenshot 4 — **1080 × 1920 px** (9:16) portrait (optional)
- [ ] Screenshot 5 — **1080 × 1920 px** (9:16) portrait (optional)
- [ ] Screenshot 6 — **1080 × 1920 px** (9:16) portrait (optional)
- [ ] Screenshot 7 — **1080 × 1920 px** (9:16) portrait (optional)
- [ ] Screenshot 8 — **1080 × 1920 px** (9:16) portrait (optional)

Acceptable range: 320 px – 3840 px on the shortest side, aspect ratio between 9:16 and 16:9.

## 7-inch tablet screenshots (optional)

- [ ] Up to **8** screenshots at **1080 × 1920 px** or larger, aspect ratio 9:16 – 16:9

## 10-inch tablet screenshots (optional)

- [ ] Up to **8** screenshots at **1080 × 1920 px** or larger, aspect ratio 9:16 – 16:9

## In-app assets already configured

These do not go to Play Console but are required for the build:

- [ ] Adaptive icon foreground — `apps/mobile/assets/images/android-icon-foreground.png`
- [ ] Adaptive icon background colour — `#E6F4FE`
- [ ] Adaptive icon monochrome layer — `apps/mobile/assets/images/android-icon-monochrome.png`
- [ ] Splash screen light — `apps/mobile/assets/images/splash-icon.png` on `#208AEF`
- [ ] Splash screen dark — `apps/mobile/assets/images/splash-icon.png` on `#0F172A`

## App metadata

- [ ] Short description (80 characters max)
- [ ] Full description (4000 characters max)
- [ ] Privacy policy URL
- [ ] Content rating questionnaire
- [ ] Data safety form (only `INTERNET`, `VIBRATE`, and `WRITE_EXTERNAL_STORAGE` declared)
