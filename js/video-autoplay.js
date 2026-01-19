const XenonVideo = {
    players: {},
    apiReady: false,
    queuedActions: {}, // Per-player queue

    init() {
        // Detect origin for YouTube API stability
        this.origin = window.location.origin;

        if (window.YT && window.YT.Player) {
            this.onAPIReady();
        } else {
            // Load YouTube API if not present
            if (!document.getElementById('yt-api-script')) {
                const tag = document.createElement('script');
                tag.id = 'yt-api-script';
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            }
        }
    },

    onAPIReady() {
        this.apiReady = true;
        // console.log("XenonVideo: YouTube API Ready"); // Removed as per instruction

        // Initialize any already existing iframes
        document.querySelectorAll('.youtube-video, iframe[id*="Video"], iframe[id*="youtube"]').forEach(iframe => {
            this.initPlayer(iframe.id);
        });

        // Process any actions that were queued before API was ready - REMOVED, now per-player
        // while (this.queuedActions.length > 0) {
        //     const action = this.queuedActions.shift();
        //     this[action.func](...action.args);
        // }
    },

    initPlayer(id) {
        if (!id || this.players[id]) return;

        this.players[id] = { ready: false, instance: null };

        try {
            this.players[id].instance = new YT.Player(id, {
                events: {
                    'onReady': (event) => {
                        console.log(`XenonVideo: ${id} ready`);
                        this.players[id].ready = true;
                        this.flushQueue(id);
                    },
                    // 'onError': (event) => { // Removed as per instruction
                    //     console.error(`XenonVideo: Player ${id} error`, event.data);
                    // }
                }
            });
        } catch (e) {
            console.error(`XenonVideo: Init failed for ${id}`, e);
        }
    },

    queueAction(id, func, args) {
        if (!this.queuedActions[id]) this.queuedActions[id] = [];
        this.queuedActions[id].push({ func, args });
    },

    flushQueue(id) {
        if (this.queuedActions[id]) {
            while (this.queuedActions[id].length > 0) {
                const action = this.queuedActions[id].shift();
                // Ensure the player instance is available before calling the function
                if (this.players[id] && this.players[id].instance) {
                    // Call the actual player method, not XenonVideo's wrapper
                    // This assumes the queued function names match YT.Player methods
                    // For 'play', 'unmute', etc., we need to map them to instance methods
                    switch (action.func) {
                        case 'play':
                            this.players[id].instance.playVideo();
                            break;
                        case 'unmute':
                            this.players[id].instance.unMute();
                            this.players[id].instance.setVolume(100);
                            break;
                        // Add other cases if more actions are queued
                        default:
                            console.warn(`XenonVideo: Unknown queued action for player ${id}: ${action.func}`);
                            break;
                    }
                }
            }
        }
    },

    play(id) {
        if (!this.players[id] || !this.players[id].ready) {
            this.queueAction(id, 'play', [id]);
            // Fallback for immediate play attempts (e.g., before API is fully ready or player is initialized)
            const iframe = document.getElementById(id);
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            }
            return;
        }
        this.players[id].instance.playVideo();
    },

    pause(id) {
        if (this.players[id] && this.players[id].ready) {
            this.players[id].instance.pauseVideo();
        } else {
            const iframe = document.getElementById(id);
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
        }
    },

    unmute(id) {
        if (!this.players[id] || !this.players[id].ready) {
            this.queueAction(id, 'unmute', [id]);
            // Fallback for immediate unmute attempts
            const iframe = document.getElementById(id);
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
                iframe.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
            }
            return;
        }
        this.players[id].instance.unMute();
        this.players[id].instance.setVolume(100);
    },

    mute(id) {
        if (this.players[id] && this.players[id].ready) {
            this.players[id].instance.mute();
        } else {
            const iframe = document.getElementById(id);
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
            }
        }
    }
};

// Global callback for YouTube API
window.onYouTubeIframeAPIReady = () => {
    XenonVideo.onAPIReady();
};

document.addEventListener('DOMContentLoaded', () => {
    XenonVideo.init();
});
