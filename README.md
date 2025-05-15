# 📋 Text Extractor GNOME Extension

A GNOME Shell extension that extracts text from clipboard images using [Tesseract OCR](https://github.com/tesseract-ocr/tesseract). Adds a panel button that performs OCR on clipboard images and copies the extracted text back to your clipboard.

> ⚠️ **Not yet published on GNOME Extensions site** — manual installation required.

![Screenshot](screenshot.png) *(optional: add screenshot path if available)*

## 🛠 Requirements

### System Requirements
- **Linux with GNOME Shell 42+**
- **X11 session** (Wayland not supported due to clipboard limitations)

### Dependencies
- Tesseract OCR (install via package manager):
  ```bash
  # Debian/Ubuntu
  sudo apt install tesseract-ocr
  
  # Arch Linux
  sudo pacman -S tesseract
  
  # Fedora
  sudo dnf install tesseract
### 📦 Dependencies
- GNOME Shell 42+
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)
  
  Install via terminal:
  ```bash
  sudo apt install tesseract-ocr

  ## 🌐 Supported OCR Languages & Adding New Languages

This extension uses Tesseract OCR with the following languages enabled by default:

| Language    | Tesseract Code | Notes                       |
|-------------|----------------|-----------------------------|
| English     | `eng`          | Most common Latin text       |
| Turkish     | `tur`          | Turkish language support     |
| Azerbaijani | `aze`          | Azerbaijani language support |
| Japanese    | `jpn`          | Japanese characters support  |

The OCR command used internally is:

```js
const command = `tesseract "${imagePath}" stdout -l eng+tur+aze+jpn`;
If you want to add a new language, simply install it using
sudo apt install tesseract-ocr-fra (for example, French),
and then make a small change in the code by modifying the line const command = `tesseract "${imagePath}" stdout -l eng+tur+aze+jpn`; to --> const command = `tesseract "${imagePath}" stdout -l eng+tur+aze+jpn+fra`;

📥 Installation

    Download or clone this extension’s source code.

    Copy the extension folder to your local GNOME Shell extensions directory:

cp -r <extension-folder-name> ~/.local/share/gnome-shell/extensions/

    Reload GNOME Shell (press Alt + F2, type r, and press Enter) or log out and back in.

    Enable the extension using GNOME Extensions app or gnome-extensions CLI.
