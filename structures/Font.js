const { registerFont } = require('canvas');
const weights = {
	100: 'thin',
	200: 'extraLight',
	300: 'light',
	400: 'normal',
	500: 'medium',
	600: 'semiBold',
	700: 'bold',
	800: 'extraBold',
	900: 'heavy',
	950: 'extraBlack'
};
const fallbacks = ['Symbola', 'Noto-CJK'];

module.exports = class Font {
	constructor(path, filename, metadata) {
		this.path = path;
		this.name = variants[filename] || metadata.name || filename;
		this.filename = filename;
		this.style = metadata.style === 'regular' ? 'normal' : metadata.style || 'normal';
		this.weight = weights[metadata.weight] || metadata.weight || 'normal';
		this.type = metadata.type;
		this.registered = false;
		this.fallbacks = fallbacks.filter(fallback => fallback !== this.filenameNoExt);
	}

	register() {
		if (this.registered) return null;
		this.registered = true;
		return registerFont(this.path, { family: this.filenameNoExt, style: this.style, weight: this.weight });
	}

	toCanvasString(size, fallbacks = true) {
		const shouldFall = fallbacks ? `, ${this.fallbacks.join(', ')}` : '';
		return `${this.style} ${this.weight} ${size}px ${this.filenameNoExt}${shouldFall}`;
	}

	get filenameNoExt() {
		return this.filename.replace(/(\.(otf|ttf))$/, '');
	}

	get isVariant() {
		return variants[this.filename];
	}

	get isFallback() {
		return fallbacks.includes(this.filenameNoExt);
	}
};
