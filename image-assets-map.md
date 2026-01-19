# Xenon Industry Website - Image Assets Mapping

## Overview
This document provides a comprehensive mapping of all image assets required for the Xenon Industry website, organized using an Object-Oriented Programming (OOP) parent-child structure.

---

## Asset Class Hierarchy

### 📁 **AssetRoot (Parent)**
Base class for all website assets

---

### 📁 **BrandAssets (Child of AssetRoot)**
**Purpose:** Logo and brand identity images used across the website

#### Assets:
1. **Xenon Industries Logo.png**
   - **Status:** ✅ Exists
   - **Path:** `assets/Xenon Industries Logo.png`
   - **Size:** 17,549 bytes
   - **Usage Locations:**
     - Preloader (index.html, manga-series.html)
     - Navigation bar (all pages)
     - Hero section brand logo (index.html)
     - Footer (all pages)
   - **Parent Class:** BrandAssets
   - **CSS Classes:** `.preloader-logo-img`, `.nav-logo-img`, `.hero-brand-image`, `.footer-logo-img`
   - **Alt Text:** "Xenon Industries"

---

### 📁 **HeroAssets (Child of AssetRoot)**
**Purpose:** Background and header images for hero sections

#### Assets:
1. **header bg.png**
   - **Status:** ✅ Exists
   - **Path:** `assets/header bg.png`
   - **Size:** 860,815 bytes
   - **Usage Locations:**
     - Hero header background (index.html)
   - **Parent Class:** HeroAssets
   - **CSS Classes:** `.hero-image`
   - **Alt Text:** "Header background"

2. **herosub.png**
   - **Status:** ✅ Exists (Not currently used in HTML)
   - **Path:** `assets/herosub.png`
   - **Size:** 17,157 bytes
   - **Usage Locations:** None (Available for future use)
   - **Parent Class:** HeroAssets

---

### 📁 **ProductAssets (Child of AssetRoot)**
**Purpose:** Product card images for the products section

#### Assets:
1. **card-1.png**
   - **Status:** ❌ Missing
   - **Path:** `assets/card-1.png`
   - **Required For:** Starter Pack product card
   - **Usage Locations:**
     - Products Section - Starter Pack (index.html)
   - **Parent Class:** ProductAssets
   - **CSS Classes:** `.bento-image`
   - **Alt Text:** "Starter Pack"

2. **card-2.png**
   - **Status:** ❌ Missing
   - **Path:** `assets/card-2.png`
   - **Required For:** Pro Suite product card
   - **Usage Locations:**
     - Products Section - Pro Suite (index.html)
   - **Parent Class:** ProductAssets
   - **CSS Classes:** `.bento-image`
   - **Alt Text:** "Pro Suite"

3. **card-3.png**
   - **Status:** ❌ Missing
   - **Path:** `assets/card-3.png`
   - **Required For:** Collector Edition product card
   - **Usage Locations:**
     - Products Section - Collector Edition (index.html)
   - **Parent Class:** ProductAssets
   - **CSS Classes:** `.bento-image`
   - **Alt Text:** "Collector Edition"

---

### 📁 **GalleryAssets (Child of AssetRoot)**
**Purpose:** Gallery showcase images

#### Assets:
1. **gallery-1.png**
   - **Status:** ❌ Missing
   - **Path:** `assets/gallery-1.png`
   - **Required For:** Gallery showcase
   - **Usage Locations:**
     - Gallery Section - Card 1 (index.html)
   - **Parent Class:** GalleryAssets
   - **CSS Classes:** `.gallery-image`, `.gallery-card--1`
   - **Alt Text:** "Gallery item 1"
   - **Overlay Label:** "PikoBot Classic"

2. **gallery-2.png**
   - **Status:** ❌ Missing
   - **Path:** `assets/gallery-2.png`
   - **Required For:** Gallery showcase
   - **Usage Locations:**
     - Gallery Section - Card 2 (index.html)
   - **Parent Class:** GalleryAssets
   - **CSS Classes:** `.gallery-image`, `.gallery-card--2`
   - **Alt Text:** "Gallery item 2"
   - **Overlay Label:** "Expression Mode"

3. **gallery-3.png**
   - **Status:** ❌ Missing
   - **Path:** `assets/gallery-3.png`
   - **Required For:** Gallery showcase
   - **Usage Locations:**
     - Gallery Section - Card 3 (index.html)
   - **Parent Class:** GalleryAssets
   - **CSS Classes:** `.gallery-image`, `.gallery-card--3`
   - **Alt Text:** "Gallery item 3"
   - **Overlay Label:** "Focus Timer"

4. **gallery-4.png**
   - **Status:** ❌ Missing
   - **Path:** `assets/gallery-4.png`
   - **Required For:** Gallery showcase
   - **Usage Locations:**
     - Gallery Section - Card 4 (index.html)
   - **Parent Class:** GalleryAssets
   - **CSS Classes:** `.gallery-image`, `.gallery-card--4`
   - **Alt Text:** "Gallery item 4"
   - **Overlay Label:** "Night Mode"

5. **gallery-5.png**
   - **Status:** ❌ Missing
   - **Path:** `assets/gallery-5.png`
   - **Required For:** Gallery showcase
   - **Usage Locations:**
     - Gallery Section - Card 5 (index.html)
   - **Parent Class:** GalleryAssets
   - **CSS Classes:** `.gallery-image`, `.gallery-card--5`
   - **Alt Text:** "Gallery item 5"
   - **Overlay Label:** "Companion Mode"

---

### 📁 **FeatureAssets (Child of AssetRoot)**
**Purpose:** Feature showcase and Pico Z related images

#### Assets:
1. **picoz.png**
   - **Status:** ✅ Exists (Not currently used in HTML)
   - **Path:** `assets/picoz.png`
   - **Size:** 513,955 bytes
   - **Usage Locations:** None (Available for Pico Z section)
   - **Parent Class:** FeatureAssets
   - **Potential Use:** Pico Z visual/fallback image

---

## Summary Statistics

| Category | Total Assets | Existing | Missing |
|----------|--------------|----------|---------|
| **BrandAssets** | 1 | 1 | 0 |
| **HeroAssets** | 2 | 2 | 0 |
| **ProductAssets** | 3 | 0 | 3 |
| **GalleryAssets** | 5 | 0 | 5 |
| **FeatureAssets** | 1 | 1 | 0 |
| **TOTAL** | **12** | **4** | **8** |

---

## OOP Class Structure (Conceptual Code)

```javascript
// Base Parent Class
class AssetRoot {
    constructor(filename, path, status) {
        this.filename = filename;
        this.path = path;
        this.status = status; // 'exists' or 'missing'
        this.sizeBytes = null;
    }
    
    getFullPath() {
        return this.path;
    }
    
    checkStatus() {
        return this.status === 'exists';
    }
}

// Child Classes
class BrandAssets extends AssetRoot {
    constructor(filename, path, status, usageLocations, cssClasses) {
        super(filename, path, status);
        this.category = 'Brand';
        this.usageLocations = usageLocations;
        this.cssClasses = cssClasses;
    }
}

class HeroAssets extends AssetRoot {
    constructor(filename, path, status, altText) {
        super(filename, path, status);
        this.category = 'Hero';
        this.altText = altText;
    }
}

class ProductAssets extends AssetRoot {
    constructor(filename, path, status, productName, altText) {
        super(filename, path, status);
        this.category = 'Product';
        this.productName = productName;
        this.altText = altText;
    }
}

class GalleryAssets extends AssetRoot {
    constructor(filename, path, status, overlayLabel, altText) {
        super(filename, path, status);
        this.category = 'Gallery';
        this.overlayLabel = overlayLabel;
        this.altText = altText;
    }
}

class FeatureAssets extends AssetRoot {
    constructor(filename, path, status, featureName) {
        super(filename, path, status);
        this.category = 'Feature';
        this.featureName = featureName;
    }
}
```

---

## Asset Instances

```javascript
// Brand Assets
const xenonLogo = new BrandAssets(
    'Xenon Industries Logo.png',
    'assets/Xenon Industries Logo.png',
    'exists',
    ['Preloader', 'Navigation', 'Hero', 'Footer'],
    ['.preloader-logo-img', '.nav-logo-img', '.hero-brand-image', '.footer-logo-img']
);

// Hero Assets
const headerBg = new HeroAssets(
    'header bg.png',
    'assets/header bg.png',
    'exists',
    'Header background'
);

const heroSub = new HeroAssets(
    'herosub.png',
    'assets/herosub.png',
    'exists',
    'Hero sub-image'
);

// Product Assets
const card1 = new ProductAssets(
    'card-1.png',
    'assets/card-1.png',
    'missing',
    'Starter Pack',
    'Starter Pack'
);

const card2 = new ProductAssets(
    'card-2.png',
    'assets/card-2.png',
    'missing',
    'Pro Suite',
    'Pro Suite'
);

const card3 = new ProductAssets(
    'card-3.png',
    'assets/card-3.png',
    'missing',
    'Collector Edition',
    'Collector Edition'
);

// Gallery Assets
const gallery1 = new GalleryAssets(
    'gallery-1.png',
    'assets/gallery-1.png',
    'missing',
    'PikoBot Classic',
    'Gallery item 1'
);

const gallery2 = new GalleryAssets(
    'gallery-2.png',
    'assets/gallery-2.png',
    'missing',
    'Expression Mode',
    'Gallery item 2'
);

const gallery3 = new GalleryAssets(
    'gallery-3.png',
    'assets/gallery-3.png',
    'missing',
    'Focus Timer',
    'Gallery item 3'
);

const gallery4 = new GalleryAssets(
    'gallery-4.png',
    'assets/gallery-4.png',
    'missing',
    'Night Mode',
    'Gallery item 4'
);

const gallery5 = new GalleryAssets(
    'gallery-5.png',
    'assets/gallery-5.png',
    'missing',
    'Companion Mode',
    'Gallery item 5'
);

// Feature Assets
const picozImage = new FeatureAssets(
    'picoz.png',
    'assets/picoz.png',
    'exists',
    'Pico Z'
);

// All Assets Collection
const allAssets = [
    xenonLogo, headerBg, heroSub,
    card1, card2, card3,
    gallery1, gallery2, gallery3, gallery4, gallery5,
    picozImage
];
```

---

## Required Actions

### Missing Assets to Create/Add:
1. ❌ `card-1.png` - Starter Pack product image
2. ❌ `card-2.png` - Pro Suite product image  
3. ❌ `card-3.png` - Collector Edition product image
4. ❌ `gallery-1.png` - PikoBot Classic gallery image
5. ❌ `gallery-2.png` - Expression Mode gallery image
6. ❌ `gallery-3.png` - Focus Timer gallery image
7. ❌ `gallery-4.png` - Night Mode gallery image
8. ❌ `gallery-5.png` - Companion Mode gallery image

### Unused Assets (Available for Integration):
1. ✅ `herosub.png` - Can be used in hero section
2. ✅ `picoz.png` - Can be used in Pico Z section as fallback

---

## Best Practices

1. **Naming Convention:** Use lowercase with hyphens (kebab-case) for consistency
2. **File Formats:** PNG for logos and transparency, JPG for photos/backgrounds
3. **Optimization:** Compress images to reduce file size without quality loss
4. **Alt Text:** Always provide descriptive alt text for accessibility
5. **Responsive:** Consider @2x and @3x versions for high-DPI displays
6. **Loading:** Implement lazy loading for images below the fold

---

**Last Updated:** 2026-01-17
**Version:** 1.0
