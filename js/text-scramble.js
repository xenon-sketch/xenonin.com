
/**
 * TextScramble Class
 * Effect: Scrambles text with random characters before decoding to the final string.
 * Style: Sci-fi / Cyberpunk / Technical
 */
class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#________';
        this.update = this.update.bind(this);
    }

    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);

        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40);
            this.queue.push({ from, to, start, end });
        }

        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }

    update() {
        let output = '';
        let complete = 0;

        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];

            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="dud">${char}</span>`;
            } else {
                output += from;
            }
        }

        this.el.innerHTML = output;

        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }

    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

// Auto-initialize on elements with 'data-scramble' attribute
document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;

                // Avoid re-running if already done
                if (el.classList.contains('scramble-done')) return;

                const fx = new TextScramble(el);
                const originalText = el.innerText; // Store clean text

                // Clear and Start
                fx.setText(originalText).then(() => {
                    el.classList.add('scramble-done');
                });

                observer.unobserve(el);
            }
        });
    }, observerOptions);

    const elements = document.querySelectorAll('[data-scramble]');
    elements.forEach(el => observer.observe(el));
});

// CSS Injection for the 'dud' characters (faded look)
const style = document.createElement('style');
style.innerHTML = `
    .dud {
        color: #ff6b5b; /* Accent color opacity */
        opacity: 0.7;
    }
`;
document.head.appendChild(style);
