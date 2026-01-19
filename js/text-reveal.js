
/**
 * Text Reveal Animation
 * Effect: Words fade in from a blur, one by one.
 * Dependencies: GSAP, ScrollTrigger
 */

document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(ScrollTrigger);

    const revealElements = document.querySelectorAll('[data-reveal="blur-word"]');

    revealElements.forEach((element) => {
        // Simple word splitter that preserves spaces/layout reasonably well
        const text = element.innerText;
        const words = text.split(" ");

        element.innerHTML = "";

        words.forEach((word) => {
            const span = document.createElement("span");
            span.textContent = word + " "; // Add space back
            span.style.display = "inline-block";
            span.style.opacity = "0"; // Initial state
            element.appendChild(span);
        });

        const spans = element.querySelectorAll("span");

        gsap.fromTo(
            spans,
            {
                autoAlpha: 0,
                y: 20,
                filter: "blur(12px)",
            },
            {
                autoAlpha: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 1.5,
                stagger: 0.05,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: element,
                    start: "top 90%",
                    end: "top 50%", // Reveal over this distance
                    scrub: 1.5, // Smooth lag/parallax feel
                },
            }
        );
    });
});
