// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Chatbot icon click handler
const chatbotIcon = document.querySelector('.chatbot-icon');
chatbotIcon.addEventListener('click', () => {
    // Add your chatbot functionality here
    alert('AI Chatbot is coming soon!');
});

// Navigation animation on scroll
let prevScrollpos = window.pageYOffset;
window.onscroll = function() {
    const currentScrollPos = window.pageYOffset;
    if (prevScrollpos > currentScrollPos) {
        document.querySelector('.glass-nav').style.top = "0";
    } else {
        document.querySelector('.glass-nav').style.top = "-100px";
    }
    prevScrollpos = currentScrollPos;
} 