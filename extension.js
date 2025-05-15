'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const CLIPBOARD_TYPE = St.ClipboardType.CLIPBOARD;
const IMAGE_MIME_TYPE = 'image/png';

var TextExtractorButton = GObject.registerClass(
    class TextExtractorButton extends PanelMenu.Button {
        _init() {
            super._init(0.0, "Text Extractor Button");

            this.buttonText = new St.Label({
                text: "Extract",
                y_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(this.buttonText);

            this.connect('button-press-event', (actor, event) => {
                if (event.get_button() === 1) {
                    this._extractTextFromClipboardImage();
                    return Clutter.EVENT_STOP;
                }
                return Clutter.EVENT_PROPAGATE;
            });
        }

        _logDebug(message) {
            log(`[TextExtractor][DEBUG] ${message}`);
        }

        _logError(message, error = null) {
            if (error) {
                logError(error, `[TextExtractor][ERROR] ${message}`);
            } else {
                log(`[TextExtractor][ERROR] ${message}`);
            }
        }

        _extractTextFromClipboardImage() {
            this._logDebug("Starting text extraction from clipboard");
            try {
                let clipboard = St.Clipboard.get_default();
                this._logDebug("Clipboard instance obtained");

                if (!this._testTesseract()) {
                    this._showNotification("Please install Tesseract OCR: sudo apt install tesseract-ocr", false);
                    return;
                }

                this._logDebug("Attempting to get image content");
                this._getClipboardImage(clipboard);
            } catch (e) {
                this._logError("Error initializing clipboard", e);
                this._showNotification("Clipboard error", false);
            }
        }

        _getClipboardImage(clipboard) {
            this._logDebug("Getting PNG image data from clipboard");

            clipboard.get_content(CLIPBOARD_TYPE, IMAGE_MIME_TYPE, (clip, content) => {
                try {
                    if (!content) {
                        this._logError("No content received");
                        this._showNotification("No image data found", false);
                        return;
                    }

                    const bytes = content.get_data();
                    if (!bytes || bytes.length === 0) {
                        this._logError("Empty image data");
                        this._showNotification("Image data is empty", false);
                        return;
                    }

                    if (!(bytes instanceof Uint8Array)) {
                        this._logError("Unexpected data format");
                        this._showNotification("Invalid image format", false);
                        return;
                    }

                    this._processImage(bytes);
                } catch (e) {
                    this._logError("Error getting image data", e);
                    this._showNotification("Error processing image", false);
                }
            });
        }

        _processImage(imageData) {
            try {
                this._logDebug("Creating temporary PNG file");
                const [success, tempPath] = this._createTempFile(imageData, 'png');

                if (!success || !tempPath) {
                    throw new Error("Failed to create temp file");
                }

                this._logDebug(`Temp file created: ${tempPath}`);
                this._runTesseract(tempPath);
            } catch (e) {
                this._logError("Image processing failed", e);
                this._showNotification("Failed to process image", false);
            }
        }

        _createTempFile(data, extension) {
            try {
                const [fd, tempPath] = GLib.file_open_tmp(`text-extractor-XXXXXX.${extension}`);
                const file = Gio.File.new_for_path(tempPath);
                const stream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);

                stream.write_all(data, null);
                stream.close(null);
                GLib.close(fd);

                return [true, tempPath];
            } catch (e) {
                this._logError("Temp file creation failed", e);
                return [false, null];
            }
        }

        _runTesseract(imagePath) {
            try {
                this._logDebug(`Running tesseract on ${imagePath}`);

                const command = `tesseract "${imagePath}" stdout -l eng+tur+aze+jpn`;
                this._logDebug(`Executing command: ${command}`);

                const [success, stdout, stderr, status] = GLib.spawn_command_line_sync(command);

                this._logDebug(`Tesseract status: ${status}`);
                if (stderr) {
                    this._logDebug(`Tesseract stderr: ${new TextDecoder().decode(stderr)}`);
                }

                try {
                    GLib.unlink(imagePath);
                    this._logDebug(`Deleted temp file: ${imagePath}`);
                } catch (e) {
                    this._logError("Failed to delete temp file", e);
                }

                if (!success || status !== 0) {
                    const error = stderr ? new TextDecoder().decode(stderr) : "Tesseract execution failed";
                    throw new Error(`Tesseract failed with status ${status}: ${error}`);
                }

                if (!stdout) {
                    throw new Error("No output from Tesseract");
                }

                const text = new TextDecoder().decode(stdout).trim();
                this._logDebug(`Extracted text: ${text}`);

                if (!text) {
                    throw new Error("No text found in image");
                }

                const clipboard = St.Clipboard.get_default();
                clipboard.set_text(CLIPBOARD_TYPE, text);
                this._logDebug("Text copied to clipboard");
                this._showNotification("Text successfully extracted", true);
            } catch (e) {
                this._logError("OCR failed", e);
                this._showNotification(`OCR Error: ${e.message}`, false);
            }
        }

        _testTesseract() {
            try {
                const [success, stdout, stderr, status] = GLib.spawn_command_line_sync("which tesseract");
                if (status !== 0 || !stdout) {
                    this._showNotification("Tesseract not found. Install with: sudo apt install tesseract-ocr", false);
                    return false;
                }
                return true;
            } catch (e) {
                this._logError("Tesseract test failed", e);
                return false;
            }
        }

        _showNotification(message, isSuccess) {
            this.menu.removeAll();

            const menuItem = new PopupMenu.PopupMenuItem(message, {
                style_class: 'text-extractor-menu-item'
            });

            menuItem.actor.style = `
                background-color: ${isSuccess ? 'rgba(0, 128, 0, 0.8)' : 'rgba(200, 0, 0, 0.8)'};
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-size: 14px;
                text-align: center;
            `;

            this.menu.addMenuItem(menuItem);

            this.menu.open();

            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                this.menu.close();
                return GLib.SOURCE_REMOVE;
            });
        }
    }
);

class TextExtractor {
    constructor() {
        this.button = null;
    }

    enable() {
        this.button = new TextExtractorButton();
        Main.panel.addToStatusArea('textExtractor', this.button);
    }

    disable() {
        this.button?.destroy();
        this.button = null;
    }
}

export default class TextExtractorExtension extends Extension {
    enable() {
        this._textExtractor = new TextExtractor();
        this._textExtractor.enable();
    }

    disable() {
        this._textExtractor?.disable();
    }
}

