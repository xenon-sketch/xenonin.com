// XENON INDUSTRY - SECURITY ENHANCEMENTS
// Deter site inspection and right-clicking

(function () {
    // Disable right-click
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Disable common keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && (e.key === 'U' || e.key === 'S'))
        ) {
            e.preventDefault();
            return false;
        }
    });

    // Detect DevTools using a getter on a regex or object
    const devtools = {
        isOpen: false,
        orientation: undefined
    };

    const threshold = 160;
    const emitEvent = (state, orientation) => {
        if (state) {
            // If DevTools is open, we can redirect or clear body for maximum deterrent
            // For now, just keep adding debugger traps
            setInterval(() => {
                debugger;
            }, 100);
        }
    };

    setInterval(() => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        const orientation = widthThreshold ? 'vertical' : 'horizontal';

        if (!(heightThreshold && widthThreshold) &&
            ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || widthThreshold || heightThreshold)) {
            if (!devtools.isOpen || devtools.orientation !== orientation) {
                emitEvent(true, orientation);
            }
            devtools.isOpen = true;
            devtools.orientation = orientation;
        } else {
            if (devtools.isOpen) {
                emitEvent(false, undefined);
            }
            devtools.isOpen = false;
            devtools.orientation = undefined;
        }
    }, 500);

    // Initial debugger trap
    setInterval(() => {
        if (devtools.isOpen) {
            (function () {
                debugger;
            }());
        }
    }, 1000);

})();

console.log("%c Protected by Xenon Industry Security", "color: #00f2fe; font-size: 20px; font-weight: bold;");
